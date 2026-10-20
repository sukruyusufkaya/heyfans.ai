import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { rateLimit } from "@/lib/security/rate-limit";
import { escapeRegex } from "@/lib/validation/common";
import { HelpArticle, type IHelpArticle } from "@/models/platform";
import { m } from "@/i18n/m";
import { getT } from "@/i18n/server";
import { SOURCE_LOCALE } from "@/i18n/config";
import type { Translator } from "@/i18n/translate";

export type HelpCategoryKey = IHelpArticle["category"];

/** Yardım merkezi kategorileri (sıra ve açıklamalar tasarım referansından; sayılar veritabanından). */
export const HELP_CATEGORIES: { key: HelpCategoryKey; label: string; description: string }[] = [
  { key: "account", label: m("Hesap ve Kayıt"), description: m("Kayıt, giriş ve profil işlemleri") },
  { key: "ai_twins", label: m("AI İkizleri"), description: m("Dijital ikiz ve sohbet deneyimleri") },
  { key: "subscriptions", label: m("Abonelikler"), description: m("Planlar ve üyelik yönetimi") },
  { key: "payments", label: m("Ödemeler"), description: m("Cüzdan, kredi ve ödeme soruları") },
  { key: "safety", label: m("Güvenlik ve Gizlilik"), description: m("Veriler ve hesap güvenliği") },
  { key: "technical", label: m("Teknik Destek"), description: m("Hatalar ve uygulama sorunları") },
  { key: "creators", label: m("İçerik Üreticileri"), description: m("Başvuru, izinler ve kazanç") },
];

export const HELP_CATEGORY_KEYS = HELP_CATEGORIES.map((c) => c.key) as [HelpCategoryKey, ...HelpCategoryKey[]];

export interface HelpArticleCard {
  slug: string;
  title: string;
  summary: string;
  category: HelpCategoryKey;
  views: number;
}

const CARD_PROJECTION = { slug: 1, title: 1, summary: 1, category: 1, views: 1 } as const;

/** Türkçe karakter duyarsız (İ/ı, ş/s, ç/c… ) arama için karakter sınıflı regex kaynağı üretir. */
const FOLD: Record<string, string> = { c: "çÇ", g: "ğĞ", i: "ıİI", o: "öÖ", s: "şŞ", u: "üÜ" }; // i18n-ignore (arama katlama tablosu)
const UNFOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
export function turkishPattern(term: string) {
  let out = "";
  for (const ch of term.slice(0, 40)) {
    const base = (UNFOLD[ch] ?? UNFOLD[ch.toLocaleLowerCase("tr")] ?? ch).toLowerCase();
    const set = new Set<string>([ch, ch.toLowerCase(), ch.toUpperCase(), ch.toLocaleLowerCase("tr"), ch.toLocaleUpperCase("tr"), base, base.toUpperCase()]);
    for (const f of FOLD[base] ?? "") set.add(f);
    // Yalnız harflerin büyük/küçük biçimleri sınıfa girer; diğer karakterler kaçırılarak eklenir.
    const members = [...set].filter((c) => c.length === 1);
    if (members.length > 1 && /\p{L}/u.test(ch)) out += `[${members.join("")}]`;
    else out += escapeRegex(ch);
  }
  return out;
}

export async function helpCategoryCounts(): Promise<Record<string, number>> {
  await connectDb();
  const rows = await HelpArticle.aggregate<{ _id: string; n: number }>([{ $match: { isPublished: true } }, { $group: { _id: "$category", n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

/**
 * Türkçe olmayan dillerde arama: yayındaki makaleler belleğe alınır; çevrilmiş başlık/özet/gövde ve Türkçe özgün metin üzerinde süzülür
 * (Mongo metin dizini yalnız Türkçe alanları kapsar; makale sayısı az olduğu için bellek içi süzme yeterlidir).
 */
async function searchHelpTranslated(t: Translator, match: Record<string, unknown>, terms: string[], limit: number): Promise<HelpArticleCard[]> {
  const docs = await HelpArticle.find(match, { ...CARD_PROJECTION, body: 1, tags: 1 })
    .sort({ views: -1, order: 1 })
    .lean<(HelpArticleCard & { _id: unknown; body: string; tags: string[] })[]>();
  const norm = (s: string) => s.toLocaleLowerCase(t.locale);
  const needles = terms.map(norm);
  const rxs = terms.map((x) => new RegExp(turkishPattern(x)));
  const view = docs.map((d) => ({ d, tr: { title: norm(t(d.title)), summary: norm(t(d.summary)), body: norm(t(d.body)) } }));
  const hits = view.filter(({ d, tr }) =>
    needles.every((n, i) => tr.title.includes(n) || tr.summary.includes(n) || tr.body.includes(n) || [d.title, d.summary, d.body, ...d.tags].some((s) => rxs[i]!.test(s))),
  );
  const score = ({ d, tr }: (typeof view)[number]) =>
    needles.reduce((sum, n, i) => sum + (tr.title.includes(n) || rxs[i]!.test(d.title) ? 2 : 0) + (tr.summary.includes(n) || rxs[i]!.test(d.summary) ? 1 : 0), 0);
  hits.sort((a, b) => score(b) - score(a));
  return hits.slice(0, limit).map(({ d: { slug, title, summary, category, views } }) => ({ slug, title, summary, category, views }));
}

export async function searchHelp(opts: { q?: string; category?: string; limit?: number }): Promise<HelpArticleCard[]> {
  await connectDb();
  const t = await getT();
  const match: Record<string, unknown> = { isPublished: true };
  if (opts.category && HELP_CATEGORY_KEYS.includes(opts.category as HelpCategoryKey)) match.category = opts.category;
  const terms = (opts.q ?? "")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 5);
  if (terms.length && t.locale !== SOURCE_LOCALE) return searchHelpTranslated(t, match, terms, Math.min(60, opts.limit ?? 30));
  if (terms.length) {
    match.$and = terms.map((term) => {
      const rx = new RegExp(turkishPattern(term));
      return { $or: [{ title: rx }, { summary: rx }, { tags: rx }, { body: rx }] };
    });
  }
  const docs = await HelpArticle.find(match, CARD_PROJECTION)
    .sort({ views: -1, order: 1 })
    .limit(Math.min(60, opts.limit ?? 30))
    .lean<(HelpArticleCard & { _id: unknown })[]>();
  const rows = docs.map(({ slug, title, summary, category, views }) => ({ slug, title, summary, category, views }));
  if (terms.length) {
    // Başlıkta geçenler öne
    const rxs = terms.map((term) => new RegExp(turkishPattern(term)));
    const score = (a: HelpArticleCard) => rxs.reduce((n, rx) => n + (rx.test(a.title) ? 2 : 0) + (rx.test(a.summary) ? 1 : 0), 0);
    rows.sort((a, b) => score(b) - score(a));
  }
  return rows;
}

export async function popularHelp(limit = 6): Promise<HelpArticleCard[]> {
  return searchHelp({ limit });
}

export async function getHelpArticle(slug: string) {
  await connectDb();
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  const doc = await HelpArticle.findOne({ slug, isPublished: true }).lean<IHelpArticle>();
  if (!doc) return null;
  const related = await HelpArticle.find({ category: doc.category, isPublished: true, slug: { $ne: slug } }, CARD_PROJECTION).sort({ order: 1 }).limit(4).lean<HelpArticleCard[]>();
  return {
    article: {
      slug: doc.slug,
      title: doc.title,
      summary: doc.summary,
      body: doc.body,
      category: doc.category,
      tags: doc.tags,
      views: doc.views,
      updatedAt: new Date(doc.updatedAt).toISOString(),
      helpfulYes: doc.helpfulYes,
      helpfulNo: doc.helpfulNo,
    },
    related: related.map(({ slug: s, title, summary, category, views }) => ({ slug: s, title, summary, category, views })),
  };
}

export async function incrementHelpViews(slug: string) {
  await connectDb();
  await HelpArticle.updateOne({ slug, isPublished: true }, { $inc: { views: 1 } });
}

export async function voteHelpArticle(slug: string, helpful: boolean, voterKey: string) {
  await connectDb();
  await rateLimit("help_vote", `${voterKey}:${slug}`, 3, 3600);
  const res = await HelpArticle.updateOne({ slug, isPublished: true }, { $inc: helpful ? { helpfulYes: 1 } : { helpfulNo: 1 } });
  return res.matchedCount === 1;
}

export async function allHelpSlugs() {
  await connectDb();
  const rows = await HelpArticle.find({ isPublished: true }, { slug: 1, updatedAt: 1 }).lean<{ slug: string; updatedAt: Date }[]>();
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt }));
}

export function helpCategoryLabel(key: string) {
  return HELP_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
