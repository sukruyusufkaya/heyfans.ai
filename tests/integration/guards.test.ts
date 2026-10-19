import { afterAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { AiUsageRecord, PlatformSettings } from "@/models";
import { openConversation, sendChatMessage } from "@/services/conversations/chat";
import { startCheckout } from "@/services/billing/checkout";
import { getPlatformSettings } from "@/services/platform/settings";
import { makeLiveCreator, makeUser } from "./helpers";

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

describe("platform korumaları", () => {
  it("bakım modunda sohbet ve ödeme başlatma durur; kapatılınca devam eder", async () => {
    const c = await makeLiveCreator();
    const fan = await makeUser();
    const { conversation } = await openConversation(fan, c.username);
    await getPlatformSettings();
    await PlatformSettings.updateOne({ key: "global" }, { $set: { "maintenance.enabled": true, "maintenance.message": "Bakım testi" } });
    await expect(sendChatMessage({ userId: fan, conversationId: conversation._id.toString(), text: "Selam", idempotencyKey: "maint-0001" })).rejects.toThrow(/Bakım testi/);
    await expect(startCheckout({ id: fan, email: "m@test.local", name: "M" }, { type: "credit_pack", packKey: "credits_100" })).rejects.toThrow(/Bakım testi/);
    await PlatformSettings.updateOne({ key: "global" }, { $set: { "maintenance.enabled": false } });
    await expect(startCheckout({ id: fan, email: "m@test.local", name: "M" }, { type: "credit_pack", packKey: "credits_100" })).resolves.toBeTruthy();
  });

  it("aylık AI bütçesi dolunca AI çağrıları durur (test sağlayıcı maliyeti sayılmaz)", async () => {
    const c = await makeLiveCreator();
    const fan = await makeUser();
    const { conversation } = await openConversation(fan, c.username);
    await PlatformSettings.updateOne({ key: "global" }, { $set: { "ai.monthlyBudgetMicroUsd": 1_000_000 } });
    await AiUsageRecord.create({ kind: "chat", provider: "openai-compatible", model: "x", costMicroUsd: 1_200_000, isMock: false });
    await expect(sendChatMessage({ userId: fan, conversationId: conversation._id.toString(), text: "Selam", idempotencyKey: "budget-001" })).rejects.toThrow(/bütçe/);
    await PlatformSettings.updateOne({ key: "global" }, { $set: { "ai.monthlyBudgetMicroUsd": 0 } });
  });
});
