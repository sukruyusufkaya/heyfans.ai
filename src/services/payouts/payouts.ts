import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { encryptField, isValidTrIban, maskIban } from "@/lib/security/crypto";
import { oid } from "@/lib/validation/common";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { PayoutAccount, PayoutRequest, type IPayoutRequest } from "@/models/monetization";
import { earningsBalance } from "@/services/billing/earnings";
import { notify } from "@/services/notifications/notifications";
import { getPlatformSettings } from "@/services/platform/settings";

async function creatorOf(userId: string) {
  await connectDb();
  const c = await CreatorProfile.findOne({ userId: oid(userId) }).lean<ICreatorProfile>();
  if (!c) throw new NotFoundError("Creator profili bulunamadı.");
  return c;
}

/** IBAN şifreli saklanır; ekranda yalnız maskelenmiş hali görünür. Doğrulama admin/sağlayıcı tarafından yapılır. */
export async function savePayoutAccount(userId: string, input: { holderName: string; iban: string; bankName?: string }) {
  const creator = await creatorOf(userId);
  const iban = input.iban.replace(/\s+/g, "").toUpperCase();
  if (!isValidTrIban(iban)) throw new AppError("Geçerli bir TR IBAN girin.", "invalid_iban");
  if (input.holderName.trim().length < 3) throw new AppError("Hesap sahibi adını girin.", "invalid_holder");
  await PayoutAccount.updateMany({ creatorId: creator._id }, { $set: { isDefault: false } });
  const acc = await PayoutAccount.create({ creatorId: creator._id, holderName: input.holderName.trim(), ibanMasked: maskIban(iban), ibanEncrypted: encryptField(iban), bankName: input.bankName?.trim() || null, status: "unverified", isDefault: true });
  await audit({ actorId: userId, action: "payout_account.create", targetType: "PayoutAccount", targetId: acc._id.toString(), severity: "notice" });
  return acc.toObject();
}

export async function requestPayout(userId: string, amountMinor: number, idempotencyKey: string) {
  const creator = await creatorOf(userId);
  const settings = await getPlatformSettings();
  if (!settings.features.payouts) throw new AppError("Ödeme talepleri şu anda platform genelinde kapalı (ödeme sağlayıcısı ve finansal uygunluk süreci tamamlanmadı).", "payouts_disabled", 403);
  if (creator.status !== "approved" || creator.verification.identity !== "verified" || !creator.payoutsEnabled) throw new AppError("Ödeme alabilmek için creator doğrulamanın tamamlanması gerekir.", "not_eligible", 403);
  if (!Number.isInteger(amountMinor) || amountMinor < settings.revenue.minPayoutMinor) throw new AppError(`En düşük ödeme tutarı ₺${settings.revenue.minPayoutMinor / 100}.`, "below_minimum");
  const account = await PayoutAccount.findOne({ creatorId: creator._id, isDefault: true, status: "verified" }).lean();
  if (!account) throw new AppError("Doğrulanmış bir ödeme hesabı ekleyin.", "no_verified_account");
  const existing = await PayoutRequest.findOne({ idempotencyKey: `payout:${creator._id.toString()}:${idempotencyKey}` }).lean<IPayoutRequest>();
  if (existing) return existing;
  const open = await PayoutRequest.exists({ creatorId: creator._id, status: { $in: ["requested", "approved", "processing"] } });
  if (open) throw new ConflictError("Devam eden bir ödeme talebin var.");
  const balance = await earningsBalance(creator._id.toString());
  if (amountMinor > balance.available) throw new AppError("Tutar kullanılabilir bakiyeden fazla.", "insufficient_balance");
  const req = await PayoutRequest.create({
    creatorId: creator._id,
    amount: { amountMinor, currency: "TRY" },
    payoutAccountId: account._id,
    status: "requested",
    history: [{ from: null, to: "requested", by: oid(userId), at: new Date() }],
    idempotencyKey: `payout:${creator._id.toString()}:${idempotencyKey}`,
  });
  await audit({ actorId: userId, action: "payout.request", targetType: "PayoutRequest", targetId: req._id.toString(), severity: "notice", metadata: { amountMinor } });
  return req.toObject();
}

const PAYOUT_FLOW: Record<string, string[]> = { requested: ["approved", "rejected", "canceled"], approved: ["processing", "rejected"], processing: ["paid", "failed"] };

/** Finans yöneticisi kararı. "paid" yalnız sağlayıcı/banka referansıyla işaretlenir. */
export async function adminUpdatePayout(actor: { id: string; adminRole: string | null }, payoutId: string, to: "approved" | "rejected" | "processing" | "paid" | "failed", note: string, providerRef?: string) {
  await connectDb();
  const req = await PayoutRequest.findById(oid(payoutId));
  if (!req) throw new NotFoundError("Ödeme talebi bulunamadı.");
  if (!PAYOUT_FLOW[req.status]?.includes(to)) throw new ConflictError(`Geçersiz geçiş: ${req.status} → ${to}`);
  if (to === "paid" && !providerRef) throw new AppError("Ödendi olarak işaretlemek için banka/sağlayıcı referansı gerekli.", "ref_required");
  req.history.push({ from: req.status, to, by: oid(actor.id), note, at: new Date() });
  req.status = to;
  req.reviewedBy = oid(actor.id);
  req.note = note;
  if (providerRef) req.providerRef = providerRef;
  await req.save();
  const creator = await CreatorProfile.findById(req.creatorId, { userId: 1 }).lean();
  const labels = { approved: "onaylandı", rejected: "reddedildi", processing: "işleme alındı", paid: "ödendi", failed: "başarısız oldu" };
  if (creator) await notify(creator.userId.toString(), { type: "payout", title: `Ödeme talebin ${labels[to]}`, body: note, link: "/studio/payouts" });
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `payout.${to}`, targetType: "PayoutRequest", targetId: payoutId, reason: note, severity: "critical", metadata: { amountMinor: req.amount.amountMinor } });
  return req.toObject();
}

export async function verifyPayoutAccount(actor: { id: string; adminRole: string | null }, accountId: string, status: "verified" | "rejected") {
  await connectDb();
  const acc = await PayoutAccount.findByIdAndUpdate(oid(accountId), { $set: { status } }, { returnDocument: "after" });
  if (!acc) throw new NotFoundError("Hesap bulunamadı.");
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `payout_account.${status}`, targetType: "PayoutAccount", targetId: accountId, severity: "critical" });
  return acc.toObject();
}
