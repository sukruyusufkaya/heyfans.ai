import "server-only";
import { randomUUID } from "node:crypto";
import { connectDb, withTransaction } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { oid } from "@/lib/validation/common";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { Gift, GiftCatalogItem, type IGift } from "@/models/monetization";
import { recordCreditEarning } from "@/services/billing/earnings";
import { assertNotSample } from "@/services/creators/sample";
import { notify } from "@/services/notifications/notifications";
import { debitWallet } from "@/services/wallet/wallet";

export async function listGiftCatalog() {
  await connectDb();
  return GiftCatalogItem.find({ isActive: true }).sort({ order: 1 }).lean();
}

/** Hediye (katalogdan) veya bahşiş (serbest kredi) gönderir: kredi düşümü + kayıt + creator hak edişi, tek transaction. */
export async function sendGift(userId: string, input: { username: string; kind: "gift" | "tip"; giftKey?: string; credits?: number; message?: string; anonymous?: boolean; clientKey?: string }) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ username: input.username.toLowerCase(), status: "approved" }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("İçerik üreticisi bulunamadı.");
  if (creator.userId.equals(oid(userId))) throw new AppError("Kendine hediye gönderemezsin.", "self_gift");
  assertNotSample(creator);
  let credits: number;
  let label: string;
  if (input.kind === "gift") {
    const item = await GiftCatalogItem.findOne({ key: input.giftKey, isActive: true }).lean();
    if (!item) throw new NotFoundError("Hediye bulunamadı.");
    credits = item.credits;
    label = `${item.name} hediyesi`;
  } else {
    credits = Math.floor(input.credits ?? 0);
    if (credits < 5 || credits > 50_000) throw new AppError("Bahşiş 5 ile 50.000 kredi arasında olmalı.", "invalid_tip");
    label = `${credits} kredi bahşiş`;
  }
  const key = `gift:${userId}:${input.clientKey ?? randomUUID()}`;
  const gift = await withTransaction(async (session) => {
    const entry = await debitWallet({ userId, amount: credits, type: input.kind === "gift" ? "gift_sent" : "tip_sent", description: `${creator.displayName} için ${label}`, idempotencyKey: key, creatorId: creator._id, refType: "Gift" }, session);
    const existing = await Gift.findOne({ ledgerEntryId: entry._id }).session(session).lean<IGift>();
    if (existing) return existing;
    const [g] = await Gift.create(
      [{ kind: input.kind, senderId: oid(userId), creatorId: creator._id, giftKey: input.kind === "gift" ? input.giftKey : null, credits, message: input.message?.slice(0, 300) ?? null, isAnonymous: Boolean(input.anonymous), ledgerEntryId: entry._id }],
      { session },
    );
    await recordCreditEarning({ creatorId: creator._id, sourceType: input.kind === "gift" ? "gift" : "tip", credits, ledgerEntryId: entry._id, description: label }, session);
    await notify(creator.userId.toString(), { type: "gift", title: input.kind === "gift" ? "Yeni hediye aldın 🎁" : "Yeni bahşiş aldın", body: `${label}${input.message ? ` — "${input.message.slice(0, 80)}"` : ""}`, link: "/studio/earnings" }, session);
    return g!.toObject() as IGift;
  });
  return gift;
}

export async function listSentGifts(userId: string, limit = 50) {
  await connectDb();
  const rows = await Gift.find({ senderId: oid(userId) }).sort({ createdAt: -1 }).limit(limit).lean<IGift[]>();
  const creators = await CreatorProfile.find({ _id: { $in: rows.map((r) => r.creatorId) } }, { displayName: 1, username: 1, avatarUrl: 1 }).lean();
  const map = new Map(creators.map((c) => [c._id.toString(), c]));
  return rows.map((r) => ({ gift: r, creator: map.get(r.creatorId.toString()) ?? null }));
}
