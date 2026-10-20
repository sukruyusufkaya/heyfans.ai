"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import {
  CATEGORY_ICONS,
  deleteCampaign,
  deleteCategory,
  deleteHelpArticle,
  saveCampaign,
  saveCategory,
  saveCmsPage,
  saveHelpArticle,
  updateHomeSection,
} from "@/services/admin/cms";
import { actorOf, idSchema, reasonSchema } from "./guard";

/** Zod mesajı çeviri anahtarı olduğundan her üst sınır için sabit bir metin tutulur. */
const MAX_CHARS: Record<number, string> = {
  60: m("En çok 60 karakter olabilir."),
  80: m("En çok 80 karakter olabilir."),
  120: m("En çok 120 karakter olabilir."),
  160: m("En çok 160 karakter olabilir."),
  200: m("En çok 200 karakter olabilir."),
  300: m("En çok 300 karakter olabilir."),
  400: m("En çok 400 karakter olabilir."),
  500: m("En çok 500 karakter olabilir."),
  600: m("En çok 600 karakter olabilir."),
  20_000: m("En çok 20000 karakter olabilir."),
};
const PCT_MAX: Record<number, string> = { 90: m("En çok %90."), 100: m("En çok %100.") };
const str = (max: number) => z.string().trim().max(max, MAX_CHARS[max]);
const slugSchema = (min: number, max: number) => z.string().trim().toLowerCase().regex(new RegExp(`^[a-z0-9-]{${min},${max}}$`), m("Kısa ad yalnız küçük harf, rakam ve '-' içerebilir."));
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

function revalidateCms() {
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/categories");
}

/* ─── Ana sayfa vitrini ─── */
const sectionSchema = z.object({
  sectionId: idSchema,
  title: str(200).optional(),
  subtitle: str(600).optional(),
  isActive: z.boolean().optional(),
  badge: str(120).optional(),
  primaryCtaLabel: str(60).optional(),
  primaryCtaHref: str(300).optional(),
  secondaryCtaLabel: str(60).optional(),
  secondaryCtaHref: str(300).optional(),
  ctaLabel: str(60).optional(),
  ctaHref: str(300).optional(),
  limit: z.preprocess(emptyToUndef, z.number().int().min(1, m("En az 1.")).max(24, m("En çok 24.")).optional()),
  reason: reasonSchema,
});

export async function updateHomeSectionAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("cms.manage");
    const { sectionId, reason, ...patch } = sectionSchema.parse(input);
    await updateHomeSection(actorOf(user), sectionId, patch, reason);
    revalidateCms();
    return { ok: true, data: undefined, message: t("Vitrin bölümü güncellendi.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Kategoriler ─── */
const categorySchema = z.object({
  id: z.preprocess(emptyToUndef, idSchema.optional()),
  slug: slugSchema(2, 60),
  name: str(80).min(2, m("Ad en az 2 karakter olmalı.")),
  description: str(500).optional(),
  icon: z.enum(CATEGORY_ICONS),
  order: z.number({ error: m("Sıra bir sayı olmalı.") }).int(m("Tamsayı olmalı.")).min(0).max(9999),
  isActive: z.boolean(),
  heroTitle: str(120).optional(),
  heroText: str(600).optional(),
});

export async function saveCategoryAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("categories.manage");
    const v = categorySchema.parse(input);
    await saveCategory(actorOf(user), v);
    revalidateCms();
    return { ok: true, data: undefined, message: v.id ? t("Kategori güncellendi.") : t("Kategori oluşturuldu.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteCategoryAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("categories.manage");
    const v = z.object({ id: idSchema, reason: reasonSchema }).parse(input);
    await deleteCategory(actorOf(user), v.id, v.reason);
    revalidateCms();
    return { ok: true, data: undefined, message: t("Kategori silindi.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Kampanyalar ─── */
const dateStr = z.preprocess(emptyToUndef, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m("Tarih GG.AA.YYYY biçiminde olmalı.")).optional());
const pct = (max: number) => z.preprocess(emptyToUndef, z.number().int(m("Tamsayı olmalı.")).min(1, m("En az %1.")).max(max, PCT_MAX[max]).optional());

const campaignSchema = z.object({
  id: z.preprocess(emptyToUndef, idSchema.optional()),
  name: str(120).min(3, m("Ad en az 3 karakter olmalı.")),
  type: z.enum(["banner", "credit_bonus", "discount", "announcement"]),
  status: z.enum(["draft", "scheduled", "active", "ended", "archived"]),
  audience: z.enum(["all", "fans", "creators", "new_users"]),
  startsOn: dateStr,
  endsOn: dateStr,
  headline: str(160).optional(),
  body: str(600).optional(),
  ctaLabel: str(60).optional(),
  ctaUrl: str(300).optional(),
  bonusPercent: pct(100),
  discountPercent: pct(90),
  reason: reasonSchema,
});

export async function saveCampaignAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("campaigns.manage");
    const { startsOn, endsOn, reason, ...v } = campaignSchema.parse(input);
    await saveCampaign(
      actorOf(user),
      { ...v, startsAt: startsOn ? new Date(`${startsOn}T00:00:00+03:00`) : null, endsAt: endsOn ? new Date(`${endsOn}T23:59:59+03:00`) : null },
      reason,
    );
    revalidateCms();
    return { ok: true, data: undefined, message: v.id ? t("Kampanya güncellendi.") : t("Kampanya oluşturuldu.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteCampaignAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("campaigns.manage");
    const v = z.object({ id: idSchema, reason: reasonSchema }).parse(input);
    await deleteCampaign(actorOf(user), v.id, v.reason);
    revalidateCms();
    return { ok: true, data: undefined, message: t("Kampanya silindi.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Hukuki / sabit sayfalar ─── */
const pageSchema = z.object({
  id: idSchema,
  title: str(160).min(2, m("Başlık gerekli.")),
  summary: str(600).optional(),
  sections: z
    .array(z.object({ id: z.string().max(40).optional(), heading: str(200).min(1, m("Bölüm başlığı gerekli.")), body: str(20_000).min(1, m("Bölüm metni gerekli.")) }))
    .min(1, m("En az bir bölüm olmalı."))
    .max(60, m("En çok 60 bölüm.")),
  status: z.enum(["draft", "published"]),
  legalReview: z.enum(["not_required", "draft_requires_legal_review", "approved"]),
  effectiveOn: dateStr,
  reason: reasonSchema,
});

export async function saveCmsPageAction(input: unknown): Promise<ActionResult<{ version: number; legalReview: string }>> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("cms.manage");
    const { effectiveOn, reason, ...v } = pageSchema.parse(input);
    const res = await saveCmsPage(actorOf(user), { ...v, effectiveDate: effectiveOn ? new Date(`${effectiveOn}T00:00:00+03:00`) : null }, reason);
    revalidateCms();
    for (const slug of ["privacy", "terms", "creator-agreement", "community-guidelines", "copyright", "cookies", "trust-and-safety"]) revalidatePath(`/${slug}`);
    return { ok: true, data: res, message: t("Sayfa kaydedildi (sürüm {version}).", { version: res.version }) };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Yardım makaleleri ─── */
const helpSchema = z.object({
  id: z.preprocess(emptyToUndef, idSchema.optional()),
  slug: slugSchema(2, 80),
  category: z.enum(["account", "ai_twins", "subscriptions", "payments", "safety", "technical", "creators"]),
  title: str(200).min(3, m("Başlık en az 3 karakter olmalı.")),
  summary: str(400).min(3, m("Özet gerekli.")),
  body: str(20_000).min(10, m("İçerik en az 10 karakter olmalı.")),
  tags: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((s) =>
      (s ?? "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  isPublished: z.boolean(),
  order: z.number({ error: m("Sıra bir sayı olmalı.") }).int(m("Tamsayı olmalı.")).min(0).max(9999),
});

export async function saveHelpArticleAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("cms.manage");
    const v = helpSchema.parse(input);
    await saveHelpArticle(actorOf(user), v);
    revalidatePath("/admin/content");
    revalidatePath("/help");
    return { ok: true, data: undefined, message: v.id ? t("Makale güncellendi.") : t("Makale oluşturuldu.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteHelpArticleAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("cms.manage");
    const v = z.object({ id: idSchema, reason: reasonSchema }).parse(input);
    await deleteHelpArticle(actorOf(user), v.id, v.reason);
    revalidatePath("/admin/content");
    revalidatePath("/help");
    return { ok: true, data: undefined, message: t("Makale silindi.") };
  } catch (err) {
    return toActionError(err);
  }
}
