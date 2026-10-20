import "server-only";
import { env } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { AppError, ConflictError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid, paged } from "@/lib/validation/common";
import { User } from "@/models/identity";
import { AuditLog, type IAuditLog } from "@/models/safety";
import { PlatformSettings, type IPlatformSettings } from "@/models/platform";
import { getPlatformSettings } from "@/services/platform/settings";
import { loadUsers, REGEX_SAFE, type AdminActor } from "./shared";
import { getT } from "@/i18n/server";

// i18n-ignore (onay ifadeleri: yöneticinin aynen yazması gereken sabit metin; çevrilmez)
export const ADULT_CONFIRM_PHRASE = "YETİŞKİN İÇERİĞİ AÇ";
// i18n-ignore
export const MFA_CONFIRM_PHRASE = "2FA ZORUNLULUĞUNU KALDIR";

export type SettingsGroupInput =
  | { group: "revenue"; creatorSharePct: number; processingFeePct: number; processingFeeFixedTl: number; vatPct: number; holdDays: number; minPayoutTl: number; deductAiCostFromCreator: boolean }
  | { group: "credits"; valueTl: number; signupBonus: number; packs: { key: string; credits: number; priceTl: number; bonusCredits: number; isPopular: boolean }[] }
  | { group: "chat"; defaultMessageCredits: number; maxMessageCredits: number; freeMessagesPerDay: number; maxInputChars: number }
  | { group: "features"; features: IPlatformSettings["features"]; confirmation?: string }
  | { group: "security"; adminMfaRequired: boolean; sessionMaxAgeDays: number; maxLoginAttempts: number; confirmation?: string }
  | { group: "maintenance"; enabled: boolean; message: string };

const bps = (pct: number) => Math.round(pct * 100);
const minor = (tl: number) => Math.round(tl * 100);

type Flat = Record<string, unknown>;

function flatten(prefix: string, obj: Flat, out: Flat = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(`${prefix}.${k}`, v as Flat, out);
    else out[`${prefix}.${k}`] = v;
  }
  return out;
}

/** Bir ayar grubunu günceller; yalnız değişen alanlar $set edilir, önce/sonra farkı denetim kaydına yazılır. */
export async function updateSettingsGroup(actor: AdminActor, input: SettingsGroupInput, reason: string) {
  await connectDb();
  if (reason.trim().length < 5) throw new AppError("Gerekçe en az 5 karakter olmalı.", "reason_required");
  const before = await getPlatformSettings();
  let path: string;
  let next: Flat;
  let prev: Flat;
  let severity: "notice" | "critical" = "notice";

  switch (input.group) {
    case "revenue": {
      path = "revenue";
      next = {
        creatorShareBps: bps(input.creatorSharePct),
        processingFeeBps: bps(input.processingFeePct),
        processingFeeFixedMinor: minor(input.processingFeeFixedTl),
        vatBps: bps(input.vatPct),
        holdDays: input.holdDays,
        minPayoutMinor: minor(input.minPayoutTl),
        deductAiCostFromCreator: input.deductAiCostFromCreator,
      };
      prev = Object.fromEntries(Object.keys(next).map((k) => [k, (before.revenue as unknown as Flat)[k]]));
      severity = "critical"; // finansal kurallar
      break;
    }
    case "credits": {
      path = "credits";
      const keys = input.packs.map((p) => p.key);
      if (new Set(keys).size !== keys.length) throw new AppError("Paket anahtarları benzersiz olmalı.", "duplicate_pack");
      if (input.packs.filter((p) => p.isPopular).length > 1) throw new AppError("Yalnız bir paket 'popüler' olarak işaretlenebilir.", "multiple_popular");
      next = { valueMinor: Math.max(1, minor(input.valueTl)), signupBonus: input.signupBonus, packs: input.packs.map((p) => ({ key: p.key, credits: p.credits, priceMinor: minor(p.priceTl), bonusCredits: p.bonusCredits, isPopular: p.isPopular })) };
      prev = { valueMinor: before.credits.valueMinor, signupBonus: before.credits.signupBonus, packs: before.credits.packs.map((p) => ({ key: p.key, credits: p.credits, priceMinor: p.priceMinor, bonusCredits: p.bonusCredits, isPopular: p.isPopular })) };
      severity = "critical";
      break;
    }
    case "chat": {
      if (input.maxMessageCredits < input.defaultMessageCredits) throw new AppError("En yüksek mesaj ücreti, varsayılan ücretten küçük olamaz.", "invalid_range");
      path = "chat";
      next = { defaultMessageCredits: input.defaultMessageCredits, maxMessageCredits: input.maxMessageCredits, freeMessagesPerDay: input.freeMessagesPerDay, maxInputChars: input.maxInputChars };
      prev = { ...before.chat };
      break;
    }
    case "features": {
      path = "features";
      next = { ...input.features };
      prev = { ...before.features };
      if (!before.features.adultContent && input.features.adultContent) {
        if (input.confirmation !== ADULT_CONFIRM_PHRASE) throw new AppError('Yetişkin içeriği etkinleştirmek için "{phrase}" yazarak onaylayın.', "confirmation_required", 400, { params: { phrase: ADULT_CONFIRM_PHRASE } });
        severity = "critical";
      }
      if (before.features.payouts !== input.features.payouts || before.features.likenessGeneration !== input.features.likenessGeneration) severity = "critical";
      break;
    }
    case "security": {
      path = "security";
      if (before.security.adminMfaRequired && !input.adminMfaRequired) {
        if (env().APP_MODE === "production") throw new AppError("Üretimde yönetici 2FA zorunluluğu kapatılamaz.", "forbidden", 403);
        if (input.confirmation !== MFA_CONFIRM_PHRASE) throw new AppError('Yönetici 2FA zorunluluğunu kaldırmak için "{phrase}" yazarak onaylayın.', "confirmation_required", 400, { params: { phrase: MFA_CONFIRM_PHRASE } });
      }
      next = { adminMfaRequired: input.adminMfaRequired, sessionMaxAgeDays: input.sessionMaxAgeDays, maxLoginAttempts: input.maxLoginAttempts, sensitiveAccessRequiresReason: true };
      prev = { ...before.security };
      severity = "critical";
      break;
    }
    case "maintenance": {
      path = "maintenance";
      next = { enabled: input.enabled, message: input.message.trim() || null };
      prev = { enabled: before.maintenance.enabled, message: before.maintenance.message ?? null };
      severity = input.enabled ? "critical" : "notice";
      break;
    }
  }

  const changes: Record<string, [unknown, unknown]> = {};
  const set: Flat = {};
  const nextFlat = flatten(path, next);
  const prevFlat = flatten(path, prev);
  for (const [k, v] of Object.entries(nextFlat)) {
    if (JSON.stringify(v) !== JSON.stringify(prevFlat[k])) {
      changes[k] = [prevFlat[k], v];
      set[k] = v;
    }
  }
  if (!Object.keys(set).length) throw new ConflictError("Değişiklik yok; kaydedilecek bir fark bulunamadı.", "no_changes");
  await PlatformSettings.updateOne({ key: "global" }, { $set: { ...set, updatedBy: oid(actor.id) } });
  // i18n-ignore (denetim anahtarı)
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `settings.${input.group}_update`, targetType: "PlatformSettings", targetId: "global", reason, severity, metadata: { changes } });
  return { changed: Object.keys(changes) };
}

export async function getSettingsView() {
  const s = await getPlatformSettings();
  return {
    revenue: {
      creatorSharePct: s.revenue.creatorShareBps / 100,
      processingFeePct: s.revenue.processingFeeBps / 100,
      processingFeeFixedTl: s.revenue.processingFeeFixedMinor / 100,
      vatPct: s.revenue.vatBps / 100,
      holdDays: s.revenue.holdDays,
      minPayoutTl: s.revenue.minPayoutMinor / 100,
      deductAiCostFromCreator: s.revenue.deductAiCostFromCreator,
    },
    credits: { valueTl: s.credits.valueMinor / 100, signupBonus: s.credits.signupBonus, packs: s.credits.packs.map((p) => ({ key: p.key, credits: p.credits, priceTl: p.priceMinor / 100, bonusCredits: p.bonusCredits, isPopular: p.isPopular })) },
    chat: { ...s.chat },
    features: { ...s.features },
    security: { ...s.security },
    maintenance: { enabled: s.maintenance.enabled, message: s.maintenance.message ?? "" },
    updatedAt: s.updatedAt,
  };
}

/* ─── Denetim kaydı ─── */
export async function listAuditLogs(opts: { action: string; actor: string; severity: string; target: string; page: number }) {
  const t = await getT();
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.action) filter.action = { $regex: REGEX_SAFE(opts.action), $options: "i" };
  if (["info", "notice", "critical"].includes(opts.severity)) filter.severity = opts.severity;
  if (opts.target) filter.targetType = { $regex: REGEX_SAFE(opts.target), $options: "i" };
  if (opts.actor) {
    const rx = { $regex: REGEX_SAFE(opts.actor), $options: "i" };
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }, { _id: 1 }).limit(200).lean();
    filter.actorId = { $in: users.map((u) => u._id) };
  }
  const size = 25;
  const [rows, total, actions] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * size).limit(size).lean<IAuditLog[]>(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct("action"),
  ]);
  const actors = await loadUsers(rows.map((r) => r.actorId));
  const items = rows.map((r) => ({
    id: r._id.toString(),
    action: r.action,
    actor: r.actorId ? actors.get(r.actorId.toString())?.name ?? t("Silinmiş kullanıcı") : t("Sistem"),
    actorRole: r.actorRole ?? null,
    targetType: r.targetType ?? null,
    targetId: r.targetId ?? null,
    reason: r.reason ?? null,
    severity: r.severity,
    metadata: Object.keys(r.metadata ?? {}).length ? JSON.stringify(r.metadata, null, 2).slice(0, 2500) : null,
    createdAt: r.createdAt,
  }));
  return { ...paged(items, total, opts.page, size), actions: actions.map(String).sort().slice(0, 300) };
}
