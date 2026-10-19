"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { updateSettingsGroup } from "@/services/admin/settings";
import { actorOf, reasonSchema } from "./guard";

const num = (label: string) => z.number({ error: `${label} için geçerli bir sayı girin.` });

const schema = z.discriminatedUnion("group", [
  z.object({
    group: z.literal("revenue"),
    creatorSharePct: num("Creator payı").min(0, "En az %0.").max(100, "En çok %100."),
    processingFeePct: num("Komisyon").min(0).max(20, "En çok %20."),
    processingFeeFixedTl: num("Sabit komisyon").min(0).max(10, "En çok ₺10."),
    vatPct: num("KDV").min(0).max(50, "En çok %50."),
    holdDays: num("Bekleme süresi").int("Tamsayı olmalı.").min(0).max(90, "En çok 90 gün."),
    minPayoutTl: num("Asgari ödeme").min(0).max(1_000_000),
    deductAiCostFromCreator: z.boolean(),
    reason: reasonSchema,
  }),
  z.object({
    group: z.literal("credits"),
    valueTl: num("Kredi değeri").min(0.01, "En az ₺0,01.").max(100),
    signupBonus: num("Kayıt bonusu").int("Tamsayı olmalı.").min(0).max(10_000),
    packs: z
      .array(
        z.object({
          key: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/, "Anahtar: 2-40 karakter, küçük harf/rakam/_/-."),
          credits: z.number({ error: "Kredi sayısı gerekli." }).int("Tamsayı olmalı.").min(1).max(1_000_000),
          priceTl: z.number({ error: "Fiyat gerekli." }).min(1, "Fiyat en az ₺1.").max(1_000_000),
          bonusCredits: z.number({ error: "Bonus gerekli." }).int("Tamsayı olmalı.").min(0).max(1_000_000),
          isPopular: z.boolean(),
        }),
      )
      .min(1, "En az bir kredi paketi olmalı.")
      .max(12, "En çok 12 paket."),
    reason: reasonSchema,
  }),
  z.object({
    group: z.literal("chat"),
    defaultMessageCredits: num("Varsayılan ücret").int("Tamsayı olmalı.").min(0).max(100),
    maxMessageCredits: num("En yüksek ücret").int("Tamsayı olmalı.").min(0).max(100, "En çok 100 kredi (ikiz fiyat sınırı)."),
    freeMessagesPerDay: num("Günlük ücretsiz mesaj").int("Tamsayı olmalı.").min(0).max(50),
    maxInputChars: num("En fazla karakter").int("Tamsayı olmalı.").min(100).max(10_000),
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
    sessionMaxAgeDays: num("Oturum süresi").int("Tamsayı olmalı.").min(1).max(90, "En çok 90 gün."),
    maxLoginAttempts: num("Giriş denemesi").int("Tamsayı olmalı.").min(3, "En az 3.").max(20, "En çok 20."),
    confirmation: z.string().trim().optional(),
    reason: reasonSchema,
  }),
  z.object({
    group: z.literal("maintenance"),
    enabled: z.boolean(),
    message: z.string().trim().max(300, "En çok 300 karakter.").default(""),
    reason: reasonSchema,
  }),
]);

/** Tek eylem, altı ayar grubu: izin `settings.manage`, gerekçe zorunlu, önce/sonra farkı denetim kaydına yazılır. */
export async function updateSettingsAction(input: unknown): Promise<ActionResult<{ changed: string[] }>> {
  try {
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
    return { ok: true, data: { changed: res.changed }, message: `Ayarlar kaydedildi (${res.changed.length} alan değişti).` };
  } catch (err) {
    return toActionError(err);
  }
}
