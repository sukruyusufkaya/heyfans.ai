"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { updateSettingsGroup } from "@/services/admin/settings";
import { actorOf, reasonSchema } from "./guard";

/** Zod mesajı çeviri anahtarı olduğundan her alan için tam cümle (m) verilir. */
const num = (message: string) => z.number({ error: message });

const schema = z.discriminatedUnion("group", [
  z.object({
    group: z.literal("revenue"),
    creatorSharePct: num(m("Creator payı için geçerli bir sayı girin.")).min(0, m("En az %0.")).max(100, m("En çok %100.")),
    processingFeePct: num(m("Komisyon için geçerli bir sayı girin.")).min(0).max(20, m("En çok %20.")),
    processingFeeFixedTl: num(m("Sabit komisyon için geçerli bir sayı girin.")).min(0).max(10, m("En çok ₺10.")),
    vatPct: num(m("KDV için geçerli bir sayı girin.")).min(0).max(50, m("En çok %50.")),
    holdDays: num(m("Bekleme süresi için geçerli bir sayı girin.")).int(m("Tamsayı olmalı.")).min(0).max(90, m("En çok 90 gün.")),
    minPayoutTl: num(m("Asgari ödeme için geçerli bir sayı girin.")).min(0).max(1_000_000),
    deductAiCostFromCreator: z.boolean(),
    reason: reasonSchema,
  }),
  z.object({
    group: z.literal("credits"),
    valueTl: num(m("Kredi değeri için geçerli bir sayı girin.")).min(0.01, m("En az ₺0,01.")).max(100),
    signupBonus: num(m("Kayıt bonusu için geçerli bir sayı girin.")).int(m("Tamsayı olmalı.")).min(0).max(10_000),
    packs: z
      .array(
        z.object({
          key: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/, m("Anahtar: 2-40 karakter, küçük harf/rakam/_/-.")),
          credits: z.number({ error: m("Kredi sayısı gerekli.") }).int(m("Tamsayı olmalı.")).min(1).max(1_000_000),
          priceTl: z.number({ error: m("Fiyat gerekli.") }).min(1, m("Fiyat en az ₺1.")).max(1_000_000),
          bonusCredits: z.number({ error: m("Bonus gerekli.") }).int(m("Tamsayı olmalı.")).min(0).max(1_000_000),
          isPopular: z.boolean(),
        }),
      )
      .min(1, m("En az bir kredi paketi olmalı."))
      .max(12, m("En çok 12 paket.")),
    reason: reasonSchema,
  }),
  z.object({
    group: z.literal("chat"),
    defaultMessageCredits: num(m("Varsayılan ücret için geçerli bir sayı girin.")).int(m("Tamsayı olmalı.")).min(0).max(100),
    maxMessageCredits: num(m("En yüksek ücret için geçerli bir sayı girin.")).int(m("Tamsayı olmalı.")).min(0).max(100, m("En çok 100 kredi (ikiz fiyat sınırı).")),
    freeMessagesPerDay: num(m("Günlük ücretsiz mesaj için geçerli bir sayı girin.")).int(m("Tamsayı olmalı.")).min(0).max(50),
    maxInputChars: num(m("En fazla karakter için geçerli bir sayı girin.")).int(m("Tamsayı olmalı.")).min(100).max(10_000),
    reason: reasonSchema,
  }),
  z.object({
    group: z.literal("features"),
    adultContent: z.boolean(),
    voiceCalls: z.boolean(),
    videoCalls: z.boolean(),
    likenessGeneration: z.boolean(),
    creatorSignup: z.boolean(),
    payouts: z.boolean(),
    aiMemory: z.boolean(),
    confirmation: z.string().trim().optional(),
    reason: reasonSchema,
  }),
  z.object({
    group: z.literal("security"),
    adminMfaRequired: z.boolean(),
    sessionMaxAgeDays: num(m("Oturum süresi için geçerli bir sayı girin.")).int(m("Tamsayı olmalı.")).min(1).max(90, m("En çok 90 gün.")),
    maxLoginAttempts: num(m("Giriş denemesi için geçerli bir sayı girin.")).int(m("Tamsayı olmalı.")).min(3, m("En az 3.")).max(20, m("En çok 20.")),
    confirmation: z.string().trim().optional(),
    reason: reasonSchema,
  }),
  z.object({
    group: z.literal("maintenance"),
    enabled: z.boolean(),
    message: z.string().trim().max(300, m("En çok 300 karakter.")).default(""),
    reason: reasonSchema,
  }),
]);

/** Tek eylem, altı ayar grubu: izin `settings.manage`, gerekçe zorunlu, önce/sonra farkı denetim kaydına yazılır. */
export async function updateSettingsAction(input: unknown): Promise<ActionResult<{ changed: string[] }>> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("settings.manage");
    const parsed = schema.parse(input);
    const { reason } = parsed;
    let payload: Parameters<typeof updateSettingsGroup>[1];
    if (parsed.group === "features") {
      const { adultContent, voiceCalls, videoCalls, likenessGeneration, creatorSignup, payouts, aiMemory, confirmation } = parsed;
      payload = { group: "features", features: { adultContent, voiceCalls, videoCalls, likenessGeneration, creatorSignup, payouts, aiMemory }, confirmation };
    } else {
      const { reason: _r, ...rest } = parsed;
      void _r;
      payload = rest as Parameters<typeof updateSettingsGroup>[1];
    }
    const res = await updateSettingsGroup(actorOf(user), payload, reason);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    // Fiyat/kredi değişiklikleri herkese açık sayfaları etkiler.
    revalidatePath("/pricing");
    revalidatePath("/for-creators");
    return { ok: true, data: { changed: res.changed }, message: t("Ayarlar kaydedildi ({count} alan değişti).", { count: res.changed.length }) };
  } catch (err) {
    return toActionError(err);
  }
}
