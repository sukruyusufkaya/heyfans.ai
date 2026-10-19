import { afterAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { AiTwin, Conversation, ConversationMemory, CreatorEarning, CreatorProfile, Message, UserPreferences, Wallet, WalletLedgerEntry } from "@/models";
import { sendChatMessage, openConversation } from "@/services/conversations/chat";
import { getOrCreateTwin, grantConsent, publishTwin, reviewTwinVersion, revokeConsent, submitTwinForReview, updateTwinDraft } from "@/services/ai-twins/lifecycle";
import { creditWallet } from "@/services/wallet/wallet";
import { createCustomRequest, creatorUpdateRequest, fanUpdateRequest } from "@/services/experiences/custom-requests";
import { makeLiveCreator, makeUser, readStream } from "./helpers";

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

describe("AI ikizi sohbeti", () => {
  it("günlük ücretsiz mesaj → sonra kredi; AI yanıtı etiketli ve mock işaretli; hak ediş oluşur", async () => {
    const c = await makeLiveCreator();
    const fan = await makeUser();
    await creditWallet({ userId: fan, amount: 10, type: "bonus", description: "x", idempotencyKey: `t:chat:${fan}` });
    const { conversation } = await openConversation(fan, c.username);
    const s1 = await readStream(await sendChatMessage({ userId: fan, conversationId: conversation._id.toString(), text: "Merhaba!", idempotencyKey: "msg-0001" }));
    expect(s1[0]).toMatchObject({ type: "meta", charged: 0, billing: "free_daily" });
    expect(s1.at(-1)).toMatchObject({ type: "done", isMock: true });
    const s2 = await readStream(await sendChatMessage({ userId: fan, conversationId: conversation._id.toString(), text: "Nasılsın?", idempotencyKey: "msg-0002" }));
    expect(s2[0]).toMatchObject({ type: "meta", charged: 2, billing: "credits", balance: 8 });
    const ai = await Message.find({ conversationId: conversation._id, senderType: "ai" }).lean();
    expect(ai).toHaveLength(2);
    expect(ai.every((m) => m.ai?.label === "ai_generated" && m.ai.isMock)).toBe(true);
    expect(await CreatorEarning.countDocuments({ creatorId: new mongoose.Types.ObjectId(c.creatorId), sourceType: "chat" })).toBe(1);
  });

  it("aynı idempotency anahtarıyla ikinci gönderim reddedilir (çift ücret yok)", async () => {
    const c = await makeLiveCreator();
    const fan = await makeUser();
    const { conversation } = await openConversation(fan, c.username);
    await readStream(await sendChatMessage({ userId: fan, conversationId: conversation._id.toString(), text: "Selam", idempotencyKey: "dup-key-01" }));
    await expect(sendChatMessage({ userId: fan, conversationId: conversation._id.toString(), text: "Selam", idempotencyKey: "dup-key-01" })).rejects.toThrow(/zaten/);
  });

  it("kriz mesajı modele gitmeden güvenli yanıt alır ve ücretlendirilmez", async () => {
    const c = await makeLiveCreator();
    const fan = await makeUser();
    const { conversation } = await openConversation(fan, c.username);
    const events = await readStream(await sendChatMessage({ userId: fan, conversationId: conversation._id.toString(), text: "yaşamak istemiyorum", idempotencyKey: "crisis-01" }));
    expect(events[0]).toMatchObject({ charged: 0 });
    expect(events.at(-1)).toMatchObject({ type: "done", safetyAction: "crisis" });
  });

  it("başka kullanıcının sohbetine mesaj gönderilemez", async () => {
    const c = await makeLiveCreator();
    const fan = await makeUser();
    const intruder = await makeUser();
    const { conversation } = await openConversation(fan, c.username);
    await expect(sendChatMessage({ userId: intruder, conversationId: conversation._id.toString(), text: "x", idempotencyKey: "intr-0001" })).rejects.toThrow(/bulunamadı/);
  });

  it("AI hafızası izinsiz tutulmaz; izinle yalnız ilgili creator kapsamına yazılır", async () => {
    const a = await makeLiveCreator();
    const b = await makeLiveCreator();
    const fan = await makeUser();
    await creditWallet({ userId: fan, amount: 20, type: "bonus", description: "x", idempotencyKey: `t:mem:${fan}` });
    const conv1 = (await openConversation(fan, a.username)).conversation;
    await readStream(await sendChatMessage({ userId: fan, conversationId: conv1._id.toString(), text: "Benim adım Deniz ve kahve severim", idempotencyKey: "mem-0001" }));
    expect(await ConversationMemory.countDocuments({ userId: new mongoose.Types.ObjectId(fan) })).toBe(0);
    await UserPreferences.updateOne({ userId: new mongoose.Types.ObjectId(fan) }, { $set: { aiMemoryEnabled: true, personalizationConsent: true } }, { upsert: true });
    await Conversation.updateOne({ _id: conv1._id }, { $set: { memoryEnabled: true } });
    await readStream(await sendChatMessage({ userId: fan, conversationId: conv1._id.toString(), text: "Benim adım Deniz", idempotencyKey: "mem-0002" }));
    const mems = await ConversationMemory.find({ userId: new mongoose.Types.ObjectId(fan) }).lean();
    expect(mems.length).toBeGreaterThan(0);
    expect(mems.every((m) => m.creatorId.toString() === a.creatorId)).toBe(true);
    expect(mems.some((m) => m.creatorId.toString() === b.creatorId)).toBe(false);
  });
});

describe("AI ikizi yaşam döngüsü", () => {
  it("rıza olmadan incelemeye gönderilemez; onay → yayın; rıza geri çekilince ikiz kapanır", async () => {
    const creatorUser = await makeUser(["fan", "creator"]);
    await CreatorProfile.create({ userId: new mongoose.Types.ObjectId(creatorUser), username: `lc${Date.now().toString(36)}`, displayName: "Döngü", status: "approved", verification: { identity: "verified", social: "verified" } });
    await getOrCreateTwin(creatorUser);
    await updateTwinDraft(creatorUser, { persona: { displayName: "Döngü", greeting: "Merhaba!" } });
    await expect(submitTwinForReview(creatorUser)).rejects.toThrow(/rıza/);
    await grantConsent(creatorUser, "ai_twin_persona");
    await submitTwinForReview(creatorUser, "ilk");
    let { twin } = await getOrCreateTwin(creatorUser);
    expect(twin.status).toBe("pending_review");
    await expect(publishTwin(creatorUser)).rejects.toThrow();
    const { AiTwinVersion } = await import("@/models");
    const v = await AiTwinVersion.findOne({ twinId: twin._id, status: "pending_review" }).lean();
    await reviewTwinVersion({ id: creatorUser, adminRole: "creator_manager" }, v!._id.toString(), "approve", "Uygun");
    await publishTwin(creatorUser);
    ({ twin } = await getOrCreateTwin(creatorUser));
    expect(twin.status).toBe("live");
    await revokeConsent(creatorUser, "ai_twin_persona");
    const after = await AiTwin.findById(twin._id).lean();
    expect(after!.status).toBe("revoked");
    expect(after!.features.chat).toBe(false);
  });
});

describe("AI ikizi sürüm yeniden gönderimi", () => {
  it("incelemedeyken yeni sürüm gönderilirse eskisi geçersiz olur; onaylıyken de yeniden gönderilebilir", async () => {
    const creatorUser = await makeUser(["fan", "creator"]);
    await CreatorProfile.create({ userId: new mongoose.Types.ObjectId(creatorUser), username: `rs${Date.now().toString(36)}`, displayName: "Yeniden", status: "approved", verification: { identity: "verified", social: "verified" } });
    await getOrCreateTwin(creatorUser);
    await updateTwinDraft(creatorUser, { persona: { displayName: "Yeniden", greeting: "Selam!" } });
    await grantConsent(creatorUser, "ai_twin_persona");
    await submitTwinForReview(creatorUser, "v1");
    await updateTwinDraft(creatorUser, { persona: { greeting: "Güncel selam!" } });
    await submitTwinForReview(creatorUser, "v2");
    const { AiTwinVersion } = await import("@/models");
    const { twin } = await getOrCreateTwin(creatorUser);
    const versions = await AiTwinVersion.find({ twinId: twin._id }).sort({ version: 1 }).lean();
    expect(versions.map((v) => v.status)).toEqual(["superseded", "pending_review"]);
    expect(versions[1]!.snapshot.persona.greeting).toBe("Güncel selam!");
    expect(twin.status).toBe("pending_review");
    await reviewTwinVersion({ id: creatorUser, adminRole: "creator_manager" }, versions[1]!._id.toString(), "approve", "Uygun");
    await submitTwinForReview(creatorUser, "v3");
    expect((await getOrCreateTwin(creatorUser)).twin.status).toBe("pending_review");
  });
});

describe("özel talepler", () => {
  it("talep kredi bloke eder; ret iade eder; tamamlama hak ediş üretir", async () => {
    const c = await makeLiveCreator();
    const fan = await makeUser();
    await creditWallet({ userId: fan, amount: 500, type: "bonus", description: "x", idempotencyKey: `t:req:${fan}` });
    const r1 = await createCustomRequest(fan, { username: c.username, type: "message", title: "Kutlama mesajı", details: "Arkadaşım için doğum günü mesajı", priceCredits: 100 });
    expect((await Wallet.findOne({ userId: new mongoose.Types.ObjectId(fan) }).lean())!.balance).toBe(400);
    await creatorUpdateRequest(c.userId, r1._id.toString(), "reject", { note: "Uygun değil" });
    expect((await Wallet.findOne({ userId: new mongoose.Types.ObjectId(fan) }).lean())!.balance).toBe(500);

    const r2 = await createCustomRequest(fan, { username: c.username, type: "message", title: "İkinci talep", details: "Bu sefer motivasyon mesajı lütfen", priceCredits: 150 });
    await creatorUpdateRequest(c.userId, r2._id.toString(), "approve");
    await creatorUpdateRequest(c.userId, r2._id.toString(), "start");
    await creatorUpdateRequest(c.userId, r2._id.toString(), "complete", { note: "Teslim edildi" });
    expect(await CreatorEarning.countDocuments({ creatorId: new mongoose.Types.ObjectId(c.creatorId), sourceType: "custom_request" })).toBe(1);
    await expect(fanUpdateRequest(fan, r2._id.toString(), "cancel")).rejects.toThrow();
    const ledger = await WalletLedgerEntry.find({ userId: new mongoose.Types.ObjectId(fan) }).lean();
    expect(ledger.reduce((a, e) => a + e.amount, 0)).toBe(350);
  });
});
