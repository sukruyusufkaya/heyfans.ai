import "server-only";
import type { ClientSession, Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { CreatorEarning, EARNING_SOURCES, type ICreatorEarning } from "@/models/monetization";
import { getPlatformSettings } from "@/services/platform/settings";
import { reverseSplit, splitCreditSpend, splitDirectPayment, type EarningSplit } from "./revenue";

type Source = (typeof EARNING_SOURCES)[number];

async function insertEarning(
  data: {
    creatorId: string | Types.ObjectId;
    sourceType: Source;
    split: EarningSplit;
    currency: string;
    description: string;
    idempotencyKey: string;
    transactionId?: Types.ObjectId | null;
    ledgerEntryId?: Types.ObjectId | null;
    reversesEarningId?: Types.ObjectId | null;
    isDemo?: boolean;
  },
  session?: ClientSession,
) {
  await connectDb();
  const existing = await CreatorEarning.findOne({ idempotencyKey: data.idempotencyKey }).session(session ?? null).lean<ICreatorEarning>();
  if (existing) return existing;
  const settings = await getPlatformSettings();
  const [doc] = await CreatorEarning.create(
    [
      {
        creatorId: oid(data.creatorId),
        sourceType: data.sourceType,
        transactionId: data.transactionId ?? null,
        ledgerEntryId: data.ledgerEntryId ?? null,
        grossMinor: data.split.grossMinor,
        processingFeeMinor: data.split.processingFeeMinor,
        taxMinor: data.split.taxMinor,
        netMinor: data.split.netMinor,
        platformFeeMinor: data.split.platformFeeMinor,
        creatorShareMinor: data.split.creatorShareMinor,
        shareBps: data.split.shareBps,
        currency: data.currency,
        availableAt: new Date(Date.now() + settings.revenue.holdDays * 86400_000),
        reversesEarningId: data.reversesEarningId ?? null,
        description: data.description,
        idempotencyKey: data.idempotencyKey,
        isDemo: data.isDemo ?? false,
      },
    ],
    { session },
  );
  return doc!.toObject() as ICreatorEarning;
}

/** Doğrudan ödemeden (abonelik, içerik satışı) hak ediş. */
export async function recordPaymentEarning(
  input: { creatorId: Types.ObjectId; sourceType: Source; grossMinor: number; currency: string; transactionId: Types.ObjectId; description: string; isDemo?: boolean },
  session?: ClientSession,
) {
  const settings = await getPlatformSettings();
  const split = splitDirectPayment(input.grossMinor, settings.revenue);
  return insertEarning({ ...input, split, idempotencyKey: `earning:tx:${input.transactionId.toString()}` }, session);
}

/** Kredi harcamasından (sohbet, hediye, bahşiş, görüşme, özel talep) hak ediş. */
export async function recordCreditEarning(
  input: { creatorId: Types.ObjectId | string; sourceType: Source; credits: number; ledgerEntryId: Types.ObjectId; description: string; isDemo?: boolean },
  session?: ClientSession,
) {
  const settings = await getPlatformSettings();
  const split = splitCreditSpend(input.credits, settings.credits.valueMinor, settings.revenue);
  return insertEarning(
    { creatorId: input.creatorId, sourceType: input.sourceType, split, currency: "TRY", description: input.description, ledgerEntryId: input.ledgerEntryId, idempotencyKey: `earning:ledger:${input.ledgerEntryId.toString()}`, isDemo: input.isDemo },
    session,
  );
}

/** İade/geri alma: orijinal hak edişin orantılı negatif ters kaydı. */
export async function reverseEarning(original: ICreatorEarning, refundGrossMinor: number, reason: string, session?: ClientSession) {
  const split = reverseSplit(
    {
      grossMinor: original.grossMinor,
      processingFeeMinor: original.processingFeeMinor,
      taxMinor: original.taxMinor,
      netMinor: original.netMinor,
      creatorShareMinor: original.creatorShareMinor,
      platformFeeMinor: original.platformFeeMinor,
      shareBps: original.shareBps,
    },
    refundGrossMinor,
  );
  return insertEarning(
    {
      creatorId: original.creatorId,
      sourceType: original.sourceType,
      split,
      currency: original.currency,
      description: `Ters kayıt: ${reason}`.slice(0, 300),
      transactionId: original.transactionId ?? null,
      reversesEarningId: original._id,
      idempotencyKey: `earning:reverse:${original._id.toString()}:${refundGrossMinor}`,
    },
    session,
  );
}

/**
 * Creator bakiye özeti (kuruş). Defter değişmez olduğu için ödeme talepleri hak ediş kayıtlarını
 * işaretlemez; kullanılabilir bakiye = olgunlaşmış hak edişler − etkin/ödenmiş ödeme talepleri.
 */
export async function earningsBalance(creatorId: string) {
  await connectDb();
  const { PayoutRequest } = await import("@/models/monetization");
  const now = new Date();
  const cid = oid(creatorId);
  const [[agg], payouts] = await Promise.all([
    CreatorEarning.aggregate<{ total: number; matured: number; pending: number }>([
      { $match: { creatorId: cid } },
      {
        $group: {
          _id: null,
          total: { $sum: "$creatorShareMinor" },
          matured: { $sum: { $cond: [{ $lte: ["$availableAt", now] }, "$creatorShareMinor", 0] } },
          pending: { $sum: { $cond: [{ $gt: ["$availableAt", now] }, "$creatorShareMinor", 0] } },
        },
      },
    ]),
    PayoutRequest.aggregate<{ _id: string; sum: number }>([
      { $match: { creatorId: cid, status: { $in: ["requested", "approved", "processing", "paid"] } } },
      { $group: { _id: "$status", sum: { $sum: "$amount.amountMinor" } } },
    ]),
  ]);
  const reserved = payouts.reduce((a, p) => a + p.sum, 0);
  const paidOut = payouts.find((p) => p._id === "paid")?.sum ?? 0;
  return {
    total: agg?.total ?? 0,
    available: Math.max(0, (agg?.matured ?? 0) - reserved),
    pending: agg?.pending ?? 0,
    inPayout: reserved - paidOut,
    paidOut,
  };
}
