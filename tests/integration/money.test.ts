import { afterAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { ContentAccessGrant, CreatorEarning, PaymentTransaction, PaymentWebhookEvent, Subscription, Wallet, WalletLedgerEntry } from "@/models";
import { MockPaymentProvider } from "@/lib/payments/provider";
import { creditWallet, debitWallet, reverseLedgerEntry } from "@/services/wallet/wallet";
import { processPaymentWebhook, refundTransaction, startCheckout } from "@/services/billing/checkout";
import { completeMockPayment } from "@/services/billing/mock";
import { decideContentAccess } from "@/services/content/access";
import { makeLiveCreator, makeUser } from "./helpers";

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

describe("cüzdan defteri", () => {
  it("eşzamanlı harcamalar bakiyeyi negatife düşüremez (çift harcama yok)", async () => {
    await connectDb();
    const userId = await makeUser();
    await creditWallet({ userId, amount: 10, type: "bonus", description: "test", idempotencyKey: `t:bonus:${userId}` });
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => debitWallet({ userId, amount: 3, type: "spend_message", description: "m", idempotencyKey: `t:spend:${userId}:${i}` })),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled").length;
    expect(ok).toBe(3); // 10 / 3 = 3 başarılı
    const w = await Wallet.findOne({ userId }).lean();
    expect(w!.balance).toBe(1);
    const sum = await WalletLedgerEntry.aggregate([{ $match: { userId: w!.userId } }, { $group: { _id: null, s: { $sum: "$amount" } } }]);
    expect(sum[0].s).toBe(1); // defter toplamı = bakiye
  });

  it("aynı idempotency anahtarı ikinci kez uygulanmaz", async () => {
    const userId = await makeUser();
    await creditWallet({ userId, amount: 50, type: "bonus", description: "x", idempotencyKey: `t:dup:${userId}` });
    await creditWallet({ userId, amount: 50, type: "bonus", description: "x", idempotencyKey: `t:dup:${userId}` });
    expect((await Wallet.findOne({ userId }).lean())!.balance).toBe(50);
  });

  it("defter kayıtları değiştirilemez; ters kayıt yalnız bir kez", async () => {
    const userId = await makeUser();
    await creditWallet({ userId, amount: 20, type: "bonus", description: "x", idempotencyKey: `t:imm:${userId}` });
    const spend = await debitWallet({ userId, amount: 5, type: "spend_message", description: "m", idempotencyKey: `t:imm:spend:${userId}` });
    await expect(WalletLedgerEntry.updateOne({ _id: spend._id }, { $set: { amount: 0 } })).rejects.toThrow(/değişmez/);
    await reverseLedgerEntry(spend._id, "test");
    await reverseLedgerEntry(spend._id, "test");
    expect((await Wallet.findOne({ userId }).lean())!.balance).toBe(20);
  });
});

describe("ödeme akışı (mock sağlayıcı, imzalı webhook)", () => {
  it("kredi paketi: ödeme yalnız webhook ile kesinleşir ve bir kez işlenir", async () => {
    const userId = await makeUser();
    const user = { id: userId, email: "a@test.local", name: "A" };
    const { redirectUrl, transactionId } = await startCheckout(user, { type: "credit_pack", packKey: "credits_100" }, "k1");
    expect(redirectUrl).toMatch(/^\/checkout\/test\//);
    const before = await PaymentTransaction.findById(transactionId).lean();
    expect(before!.status).toBe("pending");
    expect((await Wallet.findOne({ userId }).lean())?.balance ?? 0).toBe(0);
    const sessionId = before!.providerSessionId!;
    await completeMockPayment(userId, sessionId, "succeed");
    await completeMockPayment(userId, sessionId, "succeed"); // tekrar → etkisiz
    const after = await PaymentTransaction.findById(transactionId).lean();
    expect(after!.status).toBe("succeeded");
    expect((await Wallet.findOne({ userId }).lean())!.balance).toBe(100);
  });

  it("geçersiz imzalı webhook reddedilir; aynı olay iki kez işlenmez", async () => {
    const userId = await makeUser();
    const { transactionId } = await startCheckout({ id: userId, email: "b@test.local", name: "B" }, { type: "credit_pack", packKey: "credits_250" }, "k2");
    const tx = await PaymentTransaction.findById(transactionId).lean();
    const body = JSON.stringify({ id: "evt_fixed_1", type: "payment.succeeded", sessionId: tx!.providerSessionId, amountMinor: tx!.amount.amountMinor, currency: "TRY" });
    await expect(processPaymentWebhook("mock", new Headers({ "x-mock-signature": "t=1,v1=deadbeef" }), body)).rejects.toThrow();
    const provider = new MockPaymentProvider(process.env.PAYMENT_WEBHOOK_SECRET!);
    const sig = provider.sign(body);
    const r1 = await processPaymentWebhook("mock", new Headers({ "x-mock-signature": sig }), body);
    const r2 = await processPaymentWebhook("mock", new Headers({ "x-mock-signature": sig }), body);
    expect(r1.duplicate).toBe(false);
    expect(r2.duplicate).toBe(true);
    expect(await PaymentWebhookEvent.countDocuments({ eventId: "evt_fixed_1" })).toBe(1);
    expect((await Wallet.findOne({ userId }).lean())!.balance).toBe(250);
  });

  it("tutarı oynanmış webhook işlenmez", async () => {
    const userId = await makeUser();
    const { transactionId } = await startCheckout({ id: userId, email: "c@test.local", name: "C" }, { type: "credit_pack", packKey: "credits_100" }, "k3");
    const tx = await PaymentTransaction.findById(transactionId).lean();
    const body = JSON.stringify({ id: "evt_tamper", type: "payment.succeeded", sessionId: tx!.providerSessionId, amountMinor: 1, currency: "TRY" });
    const sig = new MockPaymentProvider(process.env.PAYMENT_WEBHOOK_SECRET!).sign(body);
    await expect(processPaymentWebhook("mock", new Headers({ "x-mock-signature": sig }), body)).rejects.toThrow(/Tutar/);
    expect((await PaymentTransaction.findById(transactionId).lean())!.status).toBe("pending");
  });

  it("içerik satın alma: erişim backend'de açılır, creator hak edişi oluşur, iade erişimi kapatır", async () => {
    const c = await makeLiveCreator();
    const userId = await makeUser();
    const viewer = { id: userId, roles: ["fan"] };
    const content = { _id: new mongoose.Types.ObjectId(c.paidContentId) };
    const item = await (await import("@/models")).ContentItem.findById(content._id).lean();
    expect((await decideContentAccess(viewer, item!)).allowed).toBe(false);
    const { transactionId } = await startCheckout({ id: userId, email: "d@test.local", name: "D" }, { type: "content", contentId: c.paidContentId }, "k4");
    const tx = await PaymentTransaction.findById(transactionId).lean();
    await completeMockPayment(userId, tx!.providerSessionId!, "succeed");
    expect((await decideContentAccess(viewer, item!)).allowed).toBe(true);
    const earning = await CreatorEarning.findOne({ transactionId: tx!._id }).lean();
    expect(earning!.creatorShareMinor).toBeGreaterThan(0);
    expect(earning!.creatorShareMinor).toBeLessThan(7_900);
    await refundTransaction({ id: userId, adminRole: "finance_manager" }, transactionId, 7_900, "Test iadesi");
    expect((await decideContentAccess(viewer, item!)).allowed).toBe(false);
    const reversal = await CreatorEarning.findOne({ reversesEarningId: earning!._id }).lean();
    expect(reversal!.creatorShareMinor).toBe(-earning!.creatorShareMinor);
    expect(await ContentAccessGrant.countDocuments({ userId, revokedAt: { $ne: null } })).toBe(1);
  });

  it("abonelik: aboneye özel içerik açılır, tek etkin abonelik", async () => {
    const c = await makeLiveCreator();
    const userId = await makeUser();
    const { transactionId } = await startCheckout({ id: userId, email: "e@test.local", name: "E" }, { type: "plan", planId: c.planId, interval: "month" }, "k5");
    const tx = await PaymentTransaction.findById(transactionId).lean();
    await completeMockPayment(userId, tx!.providerSessionId!, "succeed");
    const subs = await Subscription.find({ userId }).lean();
    expect(subs).toHaveLength(1);
    expect(subs[0]!.status).toBe("active");
    const item = await (await import("@/models")).ContentItem.findById(c.subsContentId).lean();
    expect((await decideContentAccess({ id: userId, roles: ["fan"] }, item!)).allowed).toBe(true);
  });

  it("creator kendi içeriğini/planını satın alamaz", async () => {
    const c = await makeLiveCreator();
    await expect(startCheckout({ id: c.userId, email: "f@test.local", name: "F" }, { type: "plan", planId: c.planId, interval: "month" })).rejects.toThrow(/Kendi/);
  });
});
