import "server-only";
import type { ClientSession, Types } from "mongoose";
import { connectDb, withTransaction } from "@/lib/db/mongo";
import { AppError, InsufficientCreditsError } from "@/lib/errors";
import { oid } from "@/lib/validation/common";
import { Wallet, WalletLedgerEntry, type IWalletLedgerEntry, type LedgerType } from "@/models/monetization";

export interface LedgerInput {
  userId: string | Types.ObjectId;
  amount: number; // pozitif tamsayı; yön fonksiyona göre belirlenir
  type: LedgerType;
  description: string;
  idempotencyKey: string;
  creatorId?: string | Types.ObjectId | null;
  refType?: string | null;
  refId?: string | Types.ObjectId | null;
  actorId?: string | Types.ObjectId | null;
  reversesEntryId?: Types.ObjectId | null;
  isDemo?: boolean;
}

const SPEND_TYPES: LedgerType[] = [
  "spend_message",
  "spend_voice",
  "spend_video",
  "spend_content",
  "spend_custom_request",
  "gift_sent",
  "tip_sent",
  "refund_debit",
];
const CREDIT_TYPES: LedgerType[] = ["purchase", "subscription_grant", "bonus", "refund", "reversal", "adjustment"];

export async function ensureWallet(userId: string | Types.ObjectId, session?: ClientSession) {
  await connectDb();
  const uid = oid(userId);
  return Wallet.findOneAndUpdate({ userId: uid }, { $setOnInsert: { userId: uid, balance: 0 } }, { upsert: true, returnDocument: "after", session });
}

async function inSession<T>(session: ClientSession | undefined, fn: (s: ClientSession) => Promise<T>): Promise<T> {
  if (session) return fn(session);
  return withTransaction(fn);
}

function assertAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) throw new AppError("Kredi miktarı pozitif tamsayı olmalı.", "invalid_amount");
}

/**
 * Bakiye ekler (satın alma, bonus, iade). Aynı idempotencyKey ikinci kez uygulanmaz,
 * mevcut kayıt döndürülür.
 */
export async function creditWallet(input: LedgerInput, session?: ClientSession): Promise<IWalletLedgerEntry> {
  assertAmount(input.amount);
  if (!CREDIT_TYPES.includes(input.type)) throw new AppError("Geçersiz defter türü (giriş).", "invalid_ledger_type");
  await connectDb();
  return inSession(session, async (s) => {
    const existing = await WalletLedgerEntry.findOne({ idempotencyKey: input.idempotencyKey }).session(s).lean<IWalletLedgerEntry>();
    if (existing) return existing;
    await ensureWallet(input.userId, s);
    const wallet = await Wallet.findOneAndUpdate(
      { userId: oid(input.userId) },
      { $inc: { balance: input.amount, ...(input.type === "purchase" ? { lifetimePurchased: input.amount } : {}) } },
      { returnDocument: "after", session: s },
    );
    if (!wallet) throw new AppError("Cüzdan bulunamadı.", "wallet_missing", 404);
    const [entry] = await WalletLedgerEntry.create(
      [
        {
          walletId: wallet._id,
          userId: wallet.userId,
          type: input.type,
          amount: input.amount,
          balanceAfter: wallet.balance,
          creatorId: input.creatorId ? oid(input.creatorId) : null,
          refType: input.refType ?? null,
          refId: input.refId ? oid(input.refId) : null,
          reversesEntryId: input.reversesEntryId ?? null,
          description: input.description,
          idempotencyKey: input.idempotencyKey,
          actorId: input.actorId ? oid(input.actorId) : null,
          isDemo: input.isDemo ?? false,
        },
      ],
      { session: s },
    );
    return entry!.toObject() as IWalletLedgerEntry;
  });
}

/**
 * Bakiye düşer. Koşullu `$inc` (balance >= amount) atomiktir: eşzamanlı iki istek aynı krediyi
 * harcayamaz. Aynı idempotencyKey ile tekrar çağrı çift harcama yapmaz.
 */
export async function debitWallet(input: LedgerInput, session?: ClientSession): Promise<IWalletLedgerEntry> {
  assertAmount(input.amount);
  if (!SPEND_TYPES.includes(input.type)) throw new AppError("Geçersiz defter türü (çıkış).", "invalid_ledger_type");
  await connectDb();
  return inSession(session, async (s) => {
    const existing = await WalletLedgerEntry.findOne({ idempotencyKey: input.idempotencyKey }).session(s).lean<IWalletLedgerEntry>();
    if (existing) return existing;
    const uid = oid(input.userId);
    const wallet = await Wallet.findOneAndUpdate(
      { userId: uid, status: "active", balance: { $gte: input.amount } },
      { $inc: { balance: -input.amount, lifetimeSpent: input.amount } },
      { returnDocument: "after", session: s },
    );
    if (!wallet) {
      const current = await Wallet.findOne({ userId: uid }).session(s).lean();
      if (current?.status === "frozen") throw new AppError("Cüzdanınız geçici olarak donduruldu. Destek ile iletişime geçin.", "wallet_frozen", 423);
      throw new InsufficientCreditsError(input.amount, current?.balance ?? 0);
    }
    const [entry] = await WalletLedgerEntry.create(
      [
        {
          walletId: wallet._id,
          userId: uid,
          type: input.type,
          amount: -input.amount,
          balanceAfter: wallet.balance,
          creatorId: input.creatorId ? oid(input.creatorId) : null,
          refType: input.refType ?? null,
          refId: input.refId ? oid(input.refId) : null,
          description: input.description,
          idempotencyKey: input.idempotencyKey,
          actorId: input.actorId ? oid(input.actorId) : null,
          isDemo: input.isDemo ?? false,
        },
      ],
      { session: s },
    );
    return entry!.toObject() as IWalletLedgerEntry;
  });
}

/** Bir harcamayı ters kayıtla geri alır (ör. AI sağlayıcısı hatası). Bir kayıt yalnız bir kez ters çevrilebilir. */
export async function reverseLedgerEntry(
  entryId: string | Types.ObjectId,
  reason: string,
  actorId?: string | Types.ObjectId | null,
  session?: ClientSession,
): Promise<IWalletLedgerEntry> {
  await connectDb();
  return inSession(session, async (s) => {
    const original = await WalletLedgerEntry.findById(oid(entryId)).session(s).lean<IWalletLedgerEntry>();
    if (!original) throw new AppError("Defter kaydı bulunamadı.", "not_found", 404);
    if (original.amount >= 0) throw new AppError("Yalnız harcama kayıtları ters çevrilebilir.", "invalid_reversal");
    return creditWallet(
      {
        userId: original.userId,
        amount: -original.amount,
        type: "reversal",
        description: `İade: ${reason}`.slice(0, 300),
        idempotencyKey: `reversal:${original._id.toString()}`,
        creatorId: original.creatorId,
        refType: original.refType,
        refId: original.refId,
        actorId: actorId ?? null,
        reversesEntryId: original._id,
        isDemo: original.isDemo,
      },
      s,
    );
  });
}

export async function getWalletSummary(userId: string) {
  const wallet = await ensureWallet(userId);
  return {
    balance: wallet.balance,
    lifetimePurchased: wallet.lifetimePurchased,
    lifetimeSpent: wallet.lifetimeSpent,
    status: wallet.status,
  };
}

export async function listLedger(userId: string, page = 1, pageSize = 20, filter?: "in" | "out") {
  await connectDb();
  const q: Record<string, unknown> = { userId: oid(userId) };
  if (filter === "in") q.amount = { $gt: 0 };
  if (filter === "out") q.amount = { $lt: 0 };
  const [items, total] = await Promise.all([
    WalletLedgerEntry.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<IWalletLedgerEntry[]>(),
    WalletLedgerEntry.countDocuments(q),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
