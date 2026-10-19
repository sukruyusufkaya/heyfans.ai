import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose, { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { CreatorProfile } from "@/models";
import { priceItem } from "@/services/billing/checkout";
import { getCallAvailability } from "@/services/calls/calls";
import { resolveBilling } from "@/services/conversations/chat";
import { platformCounters } from "@/services/creators/public";
import { SAMPLE_PURCHASE_MESSAGE } from "@/services/creators/sample";
import { createCustomRequest } from "@/services/experiences/custom-requests";
import { sendGift } from "@/services/experiences/gifts";
import { creditWallet } from "@/services/wallet/wallet";
import { makeLiveCreator, makeUser } from "./helpers";

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

describe("örnek profiller (isSample): satın alma sunucuda kapalı", () => {
  let sample: Awaited<ReturnType<typeof makeLiveCreator>>;
  let fan: string;
  let before: Awaited<ReturnType<typeof platformCounters>>;

  beforeAll(async () => {
    await connectDb();
    sample = await makeLiveCreator(`ornek${Date.now().toString(36)}`);
    before = await platformCounters();
    await CreatorProfile.updateOne({ _id: sample.creatorId }, { $set: { isSample: true } });
    fan = await makeUser();
    await creditWallet({ userId: fan, amount: 500, type: "bonus", description: "test", idempotencyKey: `t:sample:${fan}` });
  });

  it("abonelik ve içerik satın alma fiyatlanamaz", async () => {
    await expect(priceItem(fan, { type: "plan", planId: sample.planId, interval: "month" })).rejects.toMatchObject({ code: "sample_profile" });
    await expect(priceItem(fan, { type: "content", contentId: sample.paidContentId })).rejects.toMatchObject({ code: "sample_profile" });
  });

  it("hediye/bahşiş ve özel talep reddedilir, kredi düşmez", async () => {
    await expect(sendGift(fan, { username: sample.username, kind: "tip", credits: 20 })).rejects.toMatchObject({ code: "sample_profile" });
    await expect(
      createCustomRequest(fan, { username: sample.username, type: "photo", title: "Özel fotoğraf", details: "Kadıköy sahilinde bir kare rica ediyorum.", priceCredits: 50 }),
    ).rejects.toMatchObject({ code: "sample_profile" });
    const { Wallet } = await import("@/models");
    expect((await Wallet.findOne({ userId: new Types.ObjectId(fan) }).lean())!.balance).toBe(500);
  });

  it("sohbet: günlük ücretsiz hak açık, kredili sohbet kapalı", async () => {
    const twin = { pricing: { messageCredits: 2, voicePerMinuteCredits: 20, videoPerMinuteCredits: 40, freeMessagesPerDay: 0 }, draft: undefined } as unknown as Parameters<typeof resolveBilling>[2];
    const uid = new Types.ObjectId(fan);
    await expect(resolveBilling(uid, { _id: new Types.ObjectId(sample.creatorId), isSample: true }, twin)).rejects.toMatchObject({ code: "sample_profile" });
    // Aynı koşulda gerçek creator → kredili mod
    await expect(resolveBilling(uid, { _id: new Types.ObjectId(sample.creatorId), isSample: false }, twin)).resolves.toMatchObject({ mode: "credits", credits: 2 });
    const withFree = { ...twin, pricing: { ...twin.pricing, freeMessagesPerDay: 3 } } as typeof twin;
    await expect(resolveBilling(uid, { _id: new Types.ObjectId(sample.creatorId), isSample: true }, withFree)).resolves.toMatchObject({ mode: "free_daily", credits: 0 });
  });

  it("ücretli görüşme kullanılamaz", async () => {
    const a = await getCallAvailability(fan, sample.username, "voice");
    expect(a.available).toBe(false);
    expect(a.reasons).toContain(SAMPLE_PURCHASE_MESSAGE);
  });

  it("platform sayaçları örnek profilleri saymaz", async () => {
    const after = await platformCounters();
    expect(after.creators).toBe(before.creators - 1);
    expect(after.liveTwins).toBe(before.liveTwins - 1);
    expect(after.users).toBe(before.users); // örnek profil kullanıcısı düşüldü, yeni hayran eklendi
  });
});
