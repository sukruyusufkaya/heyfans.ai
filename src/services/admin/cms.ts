import "server-only";
import { randomUUID } from "node:crypto";
import { connectDb } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid } from "@/lib/validation/common";
import { Category, ContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { Campaign, CmsPage, HelpArticle, HomepageSection, type ICampaign, type ICmsPage, type IHelpArticle, type IHomepageSection } from "@/models/platform";
import type { AdminActor } from "./shared";

/* ─── Genel ─────────────────────────────────────────────────── */
export const CATEGORY_ICONS = ["sparkles", "home", "dumbbell", "plane", "gamepad-2", "music", "book-open", "shirt", "palette", "briefcase", "flower-2", "chef-hat", "sofa", "paw-print"] as const;

/** Yalnız göreli yol ("/…") veya https adresi; javascript: vb. şemalar reddedilir. */
export function safeHref(v: string | undefined | null): string | undefined {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  if (/^\/(?!\/)[^\s]*$/.test(s) || /^https:\/\/[^\s]+$/i.test(s)) return s;
  throw new AppError("Bağlantı '/' ile başlayan bir yol veya https:// adresi olmalı.", "invalid_href");
}

function isDup(err: unknown) {
  return (err as { code?: number })?.code === 11000;
}

export async function getCmsSummary() {
  await connectDb();
  const [pagesPublished, helpPublished, campaignsActive, featured, draftPages, draftHelp, draftCampaigns, sectionsInactive] = await Promise.all([
    CmsPage.countDocuments({ status: "published" }),
    HelpArticle.countDocuments({ isPublished: true }),
    Campaign.countDocuments({ status: "active" }),
    CreatorProfile.countDocuments({ "featured.isFeatured": true, status: "approved" }),
    CmsPage.countDocuments({ status: "draft" }),
    HelpArticle.countDocuments({ isPublished: false }),
    Campaign.countDocuments({ status: { $in: ["draft", "scheduled"] } }),
    HomepageSection.countDocuments({ isActive: false }),
  ]);
  return { published: pagesPublished + helpPublished, campaignsActive, featured, pending: draftPages + draftHelp + draftCampaigns + sectionsInactive };
}

/* ─── Ana sayfa vitrini ─────────────────────────────────────── */
export async function listHomeSections() {
  await connectDb();
  const rows = await HomepageSection.find({ page: "home" }).sort({ order: 1 }).lean<IHomepageSection[]>();
  return rows.map((s) => {
    const c = (s.config ?? {}) as Record<string, unknown>;
    const cta = (k: string) => (c[k] && typeof c[k] === "object" ? (c[k] as { label?: string; href?: string }) : {});
    return {
      id: s._id.toString(),
      key: s.key,
      type: s.type,
      title: s.title ?? "",
      subtitle: s.subtitle ?? "",
      order: s.order,
      isActive: s.isActive,
      updatedAt: s.updatedAt,
      badge: typeof c.badge === "string" ? c.badge : "",
      primaryCtaLabel: cta("primaryCta").label ?? "",
      primaryCtaHref: cta("primaryCta").href ?? "",
      secondaryCtaLabel: cta("secondaryCta").label ?? "",
      secondaryCtaHref: cta("secondaryCta").href ?? "",
      ctaLabel: typeof c.ctaLabel === "string" ? c.ctaLabel : "",
      ctaHref: typeof c.ctaHref === "string" ? c.ctaHref : "",
      limit: typeof c.limit === "number" ? c.limit : null,
    };
  });
}

export interface SectionPatch {
  title?: string;
  subtitle?: string;
  isActive?: boolean;
  badge?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  ctaLabel?: string;
  ctaHref?: string;
  limit?: number;
}

export async function updateHomeSection(actor: AdminActor, sectionId: string, patch: SectionPatch, reason: string) {
  await connectDb();
  const s = await HomepageSection.findById(oid(sectionId));
  if (!s) throw new NotFoundError("Bölüm bulunamadı.");
  const before = { title: s.title, subtitle: s.subtitle, isActive: s.isActive, config: JSON.parse(JSON.stringify(s.config ?? {})) };
  const cfg = { ...((s.config ?? {}) as Record<string, unknown>) };
  if (patch.title !== undefined) s.title = patch.title.trim();
  if (patch.subtitle !== undefined) s.subtitle = patch.subtitle.trim();
  if (patch.isActive !== undefined) s.isActive = patch.isActive;
  if (s.type === "hero") {
    if (patch.badge !== undefined) cfg.badge = patch.badge.trim();
    if (patch.primaryCtaLabel !== undefined || patch.primaryCtaHref !== undefined) cfg.primaryCta = { label: (patch.primaryCtaLabel ?? "").trim(), href: safeHref(patch.primaryCtaHref) ?? "" };
    if (patch.secondaryCtaLabel !== undefined || patch.secondaryCtaHref !== undefined) cfg.secondaryCta = { label: (patch.secondaryCtaLabel ?? "").trim(), href: safeHref(patch.secondaryCtaHref) ?? "" };
  }
  if (s.type === "announcement" || s.type === "banner" || s.type === "cta") {
    if (patch.ctaLabel !== undefined) cfg.ctaLabel = patch.ctaLabel.trim();
    if (patch.ctaHref !== undefined) cfg.ctaHref = safeHref(patch.ctaHref) ?? "";
  }
  if (s.type === "featured_creators" && patch.limit !== undefined) cfg.limit = patch.limit;
  s.config = cfg;
  s.markModified("config");
  s.updatedBy = oid(actor.id);
  await s.save();
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "cms.homepage_update", targetType: "HomepageSection", targetId: sectionId, reason, severity: "notice", metadata: { key: s.key, before, after: { title: s.title, subtitle: s.subtitle, isActive: s.isActive, config: cfg } } });
}

/* ─── Kategoriler ───────────────────────────────────────────── */
export async function listCategoriesAdmin() {
  await connectDb();
  const [cats, usage] = await Promise.all([
    Category.find({}).sort({ order: 1, name: 1 }).lean(),
    CreatorProfile.aggregate<{ _id: string; n: number }>([{ $unwind: "$categories" }, { $group: { _id: "$categories", n: { $sum: 1 } } }]),
  ]);
  const u = new Map(usage.map((x) => [x._id, x.n]));
  return cats.map((c) => ({
    id: c._id.toString(),
    slug: c.slug,
    name: c.name,
    description: c.description ?? "",
    icon: c.icon,
    order: c.order,
    isActive: c.isActive,
    heroTitle: c.heroTitle ?? "",
    heroText: c.heroText ?? "",
    creators: u.get(c.slug) ?? 0,
  }));
}

export interface CategoryInput {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  icon: string;
  order: number;
  isActive: boolean;
  heroTitle?: string;
  heroText?: string;
}

export async function saveCategory(actor: AdminActor, input: CategoryInput) {
  await connectDb();
  const data = { name: input.name.trim(), description: input.description?.trim() || undefined, icon: input.icon, order: input.order, isActive: input.isActive, heroTitle: input.heroTitle?.trim() || undefined, heroText: input.heroText?.trim() || undefined };
  try {
    if (input.id) {
      const c = await Category.findById(oid(input.id));
      if (!c) throw new NotFoundError("Kategori bulunamadı.");
      const before = { name: c.name, icon: c.icon, order: c.order, isActive: c.isActive };
      Object.assign(c, data);
      await c.save();
      await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "category.update", targetType: "Category", targetId: input.id, severity: "notice", metadata: { slug: c.slug, before, after: data } });
      return { id: input.id };
    }
    const c = await Category.create({ slug: input.slug, ...data });
    await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "category.create", targetType: "Category", targetId: c._id.toString(), severity: "notice", metadata: { slug: input.slug } });
    return { id: c._id.toString() };
  } catch (err) {
    if (isDup(err)) throw new ConflictError("Bu kısa ad (slug) zaten kullanılıyor.", "duplicate_slug");
    throw err;
  }
}

export async function deleteCategory(actor: AdminActor, id: string, reason: string) {
  await connectDb();
  const c = await Category.findById(oid(id));
  if (!c) throw new NotFoundError("Kategori bulunamadı.");
  const [creators, content] = await Promise.all([CreatorProfile.countDocuments({ categories: c.slug }), ContentItem.countDocuments({ categories: c.slug })]);
  if (creators + content > 0) throw new AppError("Kategori {creators} creator ve {content} içerikte kullanılıyor; silmek yerine pasife alın.", "category_in_use", 409, { params: { creators, content } });
  await c.deleteOne();
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "category.delete", targetType: "Category", targetId: id, reason, severity: "critical", metadata: { slug: c.slug } });
}

/* ─── Kampanyalar ───────────────────────────────────────────── */
export async function listCampaignsAdmin() {
  await connectDb();
  const rows = await Campaign.find({}).sort({ createdAt: -1 }).limit(100).lean<ICampaign[]>();
  return rows.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    type: c.type,
    status: c.status,
    audience: c.audience,
    startsAt: c.startsAt ?? null,
    endsAt: c.endsAt ?? null,
    headline: c.config?.headline ?? "",
    body: c.config?.body ?? "",
    ctaLabel: c.config?.ctaLabel ?? "",
    ctaUrl: c.config?.ctaUrl ?? "",
    bonusPercent: c.config?.bonusPercent ?? null,
    discountPercent: c.config?.discountPercent ?? null,
    metrics: c.metrics,
    isDemo: c.isDemo,
  }));
}

export interface CampaignInput {
  id?: string;
  name: string;
  type: ICampaign["type"];
  status: ICampaign["status"];
  audience: ICampaign["audience"];
  startsAt?: Date | null;
  endsAt?: Date | null;
  headline?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  bonusPercent?: number;
  discountPercent?: number;
}

const CAMPAIGN_FLOW: Record<ICampaign["status"], ICampaign["status"][]> = {
  draft: ["scheduled", "active", "archived"],
  scheduled: ["draft", "active", "archived"],
  active: ["ended", "archived"],
  ended: ["archived"],
  archived: [],
};

export async function saveCampaign(actor: AdminActor, input: CampaignInput, reason: string) {
  await connectDb();
  if (input.endsAt && input.startsAt && input.endsAt <= input.startsAt) throw new AppError("Bitiş tarihi başlangıçtan sonra olmalı.", "invalid_dates");
  if (input.type === "credit_bonus" && !(input.bonusPercent && input.bonusPercent > 0)) throw new AppError("Kredi bonusu kampanyası için bonus yüzdesi girin.", "bonus_required");
  if (input.type === "discount" && !(input.discountPercent && input.discountPercent > 0)) throw new AppError("İndirim kampanyası için indirim yüzdesi girin.", "discount_required");
  if ((input.status === "active" || input.status === "scheduled") && !input.headline?.trim()) throw new AppError("Yayına alınacak kampanya için başlık metni gerekli.", "headline_required");
  const config = {
    headline: input.headline?.trim() || undefined,
    body: input.body?.trim() || undefined,
    ctaLabel: input.ctaLabel?.trim() || undefined,
    ctaUrl: safeHref(input.ctaUrl),
    bonusPercent: input.type === "credit_bonus" ? input.bonusPercent : undefined,
    discountPercent: input.type === "discount" ? input.discountPercent : undefined,
  };
  if (input.id) {
    const c = await Campaign.findById(oid(input.id));
    if (!c) throw new NotFoundError("Kampanya bulunamadı.");
    if (c.status !== input.status && !CAMPAIGN_FLOW[c.status].includes(input.status)) throw new AppError("Geçersiz durum geçişi: {from} → {to}", "conflict", 409, { params: { from: c.status, to: input.status } });
    const before = { name: c.name, status: c.status, type: c.type };
    if (c.status !== input.status) c.history.push({ from: c.status, to: input.status, by: oid(actor.id), note: reason, at: new Date() });
    c.name = input.name.trim();
    c.type = input.type;
    c.status = input.status;
    c.audience = input.audience;
    c.startsAt = input.startsAt ?? null;
    c.endsAt = input.endsAt ?? null;
    c.config = config;
    c.markModified("config");
    await c.save();
    await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "campaign.update", targetType: "Campaign", targetId: input.id, reason, severity: "notice", metadata: { before, after: { name: c.name, status: c.status, type: c.type } } });
    return { id: input.id };
  }
  const c = await Campaign.create({
    name: input.name.trim(),
    type: input.type,
    status: input.status,
    audience: input.audience,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    config,
    createdBy: oid(actor.id),
    history: [{ from: null, to: input.status, by: oid(actor.id), note: reason, at: new Date() }],
  });
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "campaign.create", targetType: "Campaign", targetId: c._id.toString(), reason, severity: "notice", metadata: { name: c.name, type: c.type, status: c.status } });
  return { id: c._id.toString() };
}

export async function deleteCampaign(actor: AdminActor, id: string, reason: string) {
  await connectDb();
  const c = await Campaign.findById(oid(id));
  if (!c) throw new NotFoundError("Kampanya bulunamadı.");
  if (c.status !== "draft") throw new ConflictError("Yalnız taslak kampanyalar silinebilir; diğerlerini arşivleyin.");
  await c.deleteOne();
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "campaign.delete", targetType: "Campaign", targetId: id, reason, severity: "notice", metadata: { name: c.name } });
}

/* ─── Hukuki / sabit sayfalar ──────────────────────────────── */
export async function listCmsPagesAdmin() {
  await connectDb();
  const rows = await CmsPage.find({}).sort({ kind: 1, slug: 1 }).lean<ICmsPage[]>();
  return rows.map((p) => ({
    id: p._id.toString(),
    slug: p.slug,
    locale: p.locale,
    kind: p.kind,
    title: p.title,
    summary: p.summary ?? "",
    status: p.status,
    legalReview: p.legalReview,
    version: p.version,
    effectiveDate: p.effectiveDate ?? null,
    updatedAt: p.updatedAt,
    sections: p.sections.map((s) => ({ id: s.id, heading: s.heading, body: s.body })),
  }));
}

export interface CmsPageInput {
  id: string;
  title: string;
  summary?: string;
  sections: { id?: string; heading: string; body: string }[];
  status: ICmsPage["status"];
  legalReview: ICmsPage["legalReview"];
  effectiveDate?: Date | null;
}

export async function saveCmsPage(actor: AdminActor, input: CmsPageInput, reason: string) {
  await connectDb();
  const p = await CmsPage.findById(oid(input.id));
  if (!p) throw new NotFoundError("Sayfa bulunamadı.");
  const isSuper = actor.adminRole === "super_admin";
  if (input.legalReview === "approved" && !isSuper) throw new AppError("Hukuki onay durumunu yalnız Süper Yönetici 'onaylı' yapabilir.", "forbidden", 403);
  if (input.sections.length === 0) throw new AppError("Sayfa en az bir bölüm içermeli.", "no_sections");
  const sections = input.sections.map((s) => ({ id: s.id || randomUUID().slice(0, 8), heading: s.heading.trim(), body: s.body.trim() }));
  const changed = p.title !== input.title.trim() || JSON.stringify(p.sections.map((s) => [s.heading, s.body])) !== JSON.stringify(sections.map((s) => [s.heading, s.body]));
  let legalReview = input.legalReview;
  // Onaylı hukuki metin Süper Yönetici dışında değiştirilirse onay düşer.
  if (p.kind === "legal" && p.legalReview === "approved" && changed && !isSuper) legalReview = "draft_requires_legal_review";
  if (p.kind !== "legal" && legalReview !== "not_required" && legalReview !== "approved") legalReview = "not_required";
  const before = { version: p.version, status: p.status, legalReview: p.legalReview };
  p.title = input.title.trim();
  p.summary = input.summary?.trim() || undefined;
  p.sections = sections;
  p.status = input.status;
  p.legalReview = legalReview;
  p.effectiveDate = input.effectiveDate ?? null;
  p.version = p.version + 1;
  p.updatedBy = oid(actor.id);
  if (input.status === "published" && !p.publishedAt) p.publishedAt = new Date();
  await p.save();
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "cms.page_update", targetType: "CmsPage", targetId: input.id, reason, severity: p.kind === "legal" ? "critical" : "notice", metadata: { slug: p.slug, kind: p.kind, before, after: { version: p.version, status: p.status, legalReview: p.legalReview }, approvalReset: legalReview !== input.legalReview } });
  return { version: p.version, legalReview };
}

/* ─── Yardım makaleleri ────────────────────────────────────── */
export async function listHelpArticlesAdmin() {
  await connectDb();
  const rows = await HelpArticle.find({}).sort({ category: 1, order: 1, title: 1 }).lean<IHelpArticle[]>();
  return rows.map((a) => ({ id: a._id.toString(), slug: a.slug, category: a.category, title: a.title, summary: a.summary, body: a.body, tags: a.tags, isPublished: a.isPublished, order: a.order, views: a.views, helpful: a.helpfulYes, notHelpful: a.helpfulNo }));
}

export interface HelpArticleInput {
  id?: string;
  slug: string;
  category: IHelpArticle["category"];
  title: string;
  summary: string;
  body: string;
  tags: string[];
  isPublished: boolean;
  order: number;
}

export async function saveHelpArticle(actor: AdminActor, input: HelpArticleInput) {
  await connectDb();
  const data = { category: input.category, title: input.title.trim(), summary: input.summary.trim(), body: input.body.trim(), tags: input.tags, isPublished: input.isPublished, order: input.order };
  try {
    if (input.id) {
      const a = await HelpArticle.findById(oid(input.id));
      if (!a) throw new NotFoundError("Makale bulunamadı.");
      Object.assign(a, data);
      await a.save();
      await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "help.update", targetType: "HelpArticle", targetId: input.id, severity: "info", metadata: { slug: a.slug, isPublished: a.isPublished } });
      return { id: input.id };
    }
    const a = await HelpArticle.create({ slug: input.slug, ...data });
    await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "help.create", targetType: "HelpArticle", targetId: a._id.toString(), severity: "info", metadata: { slug: input.slug } });
    return { id: a._id.toString() };
  } catch (err) {
    if (isDup(err)) throw new ConflictError("Bu kısa ad (slug) zaten kullanılıyor.", "duplicate_slug");
    throw err;
  }
}

export async function deleteHelpArticle(actor: AdminActor, id: string, reason: string) {
  await connectDb();
  const a = await HelpArticle.findByIdAndDelete(oid(id));
  if (!a) throw new NotFoundError("Makale bulunamadı.");
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "help.delete", targetType: "HelpArticle", targetId: id, reason, severity: "notice", metadata: { slug: a.slug } });
}
