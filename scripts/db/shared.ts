/**
 * db:init, db:seed ve db:samples betiklerinin ortak parçaları:
 * - Kurgusal Türk karakterleri (scripts/db/characters.json) ve persona/sınır kurucuları
 * - Platformun temel verileri (kategoriler, hediyeler, platform planları, yasal sayfalar, ana sayfa bölümleri, yardım makaleleri)
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { TwinBoundaries, TwinPersona, TwinVoiceLikeness } from "@/models/ai";
import { Category, CmsPage, GiftCatalogItem, HelpArticle, HomepageSection, MembershipPlan } from "@/models";
import { CATEGORIES, GIFTS, HELP_ARTICLES, LEGAL_PAGES, PLATFORM_PLANS } from "./seed-data";

export interface CharacterFile {
  creators: {
    username: string; displayName: string; email: string; age: number; city: string; categories: string[]; followers: number; featuredRank?: number; daysAgo: number; online: boolean; pending?: boolean;
    headline: string; bio: string; plans: [number, number, number];
    persona: { warmth: number; formality: number; humor: number; energy: number; emoji: TwinPersona["emojiUsage"]; length: TwinPersona["messageLength"]; style: string; greeting: string; catchphrases: string[]; samples: string[] };
    knowledge: { title: string; text: string }[];
    content: { type: "photo" | "video" | "audio" | "text" | "collection"; access: "public" | "followers" | "subscribers" | "purchase"; tier?: "basic" | "premium" | "vip"; price?: number; title: string; caption: string; img?: string; person?: boolean }[];
  }[];
  fans: { email: string; name: string }[];
  admins: { email: string; name: string; role: string }[];
}
export type Character = CharacterFile["creators"][number];

export const CHARACTERS = JSON.parse(readFileSync(path.join("scripts", "db", "characters.json"), "utf8")) as CharacterFile;
export const categoryNames = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

/** public/images/seed altındaki görselin herkese açık yolu (dosya yoksa null). */
export const seedImage = (rel: string) => (existsSync(path.join("public/images/seed", rel)) ? `/images/seed/${rel}` : null);
/** Ücretli/özel içerik görselleri herkese açık klasörde değil; içe aktarmada depolamaya yüklenir. */
export const contentImageFile = (username: string, index: number) => path.join("scripts/db/seed-media/content", `${username}-${index}.webp`);

export const TIER_INFO = {
  basic: { name: "Temel", benefits: ["Genel gönderilere erişim", "AI ikiziyle günlük 10 mesaj", "Abonelere özel hikâyeler"], entitlements: { contentAccess: "basic" as const, unlimitedChat: false, dailyChatAllowance: 10, monthlyCredits: 0, customRequests: false, prioritySupport: false } },
  premium: { name: "Premium", benefits: ["Tüm gönderilere erişim", "AI ikiziyle sınırsız sohbet", "Premium seriler ve rehberler", "Erken erişim"], entitlements: { contentAccess: "premium" as const, unlimitedChat: true, dailyChatAllowance: 0, monthlyCredits: 0, customRequests: true, prioritySupport: false } },
  vip: { name: "VIP", benefits: ["Tüm Premium avantajları", "Sesli içerikler ve podcast", "Özel isteklerde öncelik", "Aylık 100 kredi"], entitlements: { contentAccess: "vip" as const, unlimitedChat: true, dailyChatAllowance: 0, monthlyCredits: 100, customRequests: true, prioritySupport: true } },
};

export function twinPersona(c: Character): TwinPersona {
  return {
    displayName: c.displayName,
    shortBio: c.bio,
    greeting: c.persona.greeting,
    warmth: c.persona.warmth,
    formality: c.persona.formality,
    humor: c.persona.humor,
    energy: c.persona.energy,
    messageLength: c.persona.length,
    pace: "normal",
    language: "tr",
    emojiUsage: c.persona.emoji,
    speakingStyle: c.persona.style,
    catchphrases: c.persona.catchphrases,
    sampleReplies: c.persona.samples,
  };
}

export function twinBoundaries(c: Character): TwinBoundaries {
  return {
    allowedTopics: c.categories.map((x) => categoryNames.get(x) ?? x),
    blockedTopics: ["siyaset", "ev adresi", "telefon numarası", "özel hayatın detayları"],
    customRules: ["Ücretli içerikleri yalnız HEYFANS içinden öner", "Tıbbi veya hukuki konularda uzmana yönlendir"],
    allowFlirt: false,
    allowPersonalQuestions: true,
    allowMediaRequests: false,
    allowCustomRequests: true,
    escalateOnDistress: true,
    maxMessagesPerFanPerDay: 200,
  };
}

export const NO_VOICE: TwinVoiceLikeness = { voiceEnabled: false, videoEnabled: false, imageLikenessEnabled: false, voiceProfileStatus: "none", voiceSampleAssetIds: [], pitch: 0, speed: 100, tone: "neutral" };

/** Ana sayfa CMS bölümleri (doğrulanamayan sayı iddiası içermez). */
export const HOME_SECTIONS = [
  { key: "hero", type: "hero", title: "Gerçek İçerik Üreticileri. AI İkizler. Gerçek Bağlantılar.", subtitle: "Sevdiğin içerik üreticilerinin AI ikizleriyle 7/24 sohbet et, ipuçları al, özel içeriklere eriş ve onlarla her zamankinden daha yakın bir bağ kur.", config: { badge: "AI ile daha yakın, daha gerçek bağlantılar", primaryCta: { label: "İçerik Üreticilerini Keşfet", href: "/explore" }, secondaryCta: { label: "Nasıl Çalışır?", href: "/how-it-works" } }, order: 1 },
  { key: "featured", type: "featured_creators", title: "Öne Çıkan İçerik Üreticileri", config: { limit: 6 }, order: 2 },
  { key: "announcement", type: "announcement", title: "Şimdi HEYFANS topluluğuna katıl.", subtitle: "İçerik üreticilerini keşfet, AI ikizlerle sohbet et ve sana özel içeriklere eriş.", config: { ctaLabel: "Hemen Başla", ctaHref: "/register" }, order: 9 },
];

/**
 * Platformun temel verileri. `overwrite: false` (üretim/db:init) yalnız EKSİK kayıtları ekler;
 * admin panelinden yapılan düzenlemelerin (ör. hukuk onaylı yasal metinler) üzerine yazmaz.
 */
export async function ensureReferenceData(opts: { isDemo: boolean; overwrite: boolean }) {
  const op = <T extends object>(doc: T) => (opts.overwrite ? { $set: doc } : { $setOnInsert: doc });
  let inserted = 0;
  const count = (r: { upsertedCount?: number }) => (inserted += r.upsertedCount ?? 0);

  for (const c of CATEGORIES) count(await Category.updateOne({ slug: c.slug }, op({ ...c, coverUrl: seedImage(`categories/${c.slug}.webp`), isActive: true, isDemo: opts.isDemo }), { upsert: true }));
  for (const g of GIFTS) count(await GiftCatalogItem.updateOne({ key: g.key }, op({ ...g, isActive: true }), { upsert: true }));
  for (const [i, p] of PLATFORM_PLANS.entries()) {
    count(
      await MembershipPlan.updateOne(
        { scope: "platform", creatorId: null, tier: p.tier },
        op({
          name: p.name,
          description: p.description,
          benefits: p.benefits,
          entitlements: p.entitlements,
          priceMonthly: { amountMinor: p.priceMinor, currency: "TRY" },
          priceYearly: p.priceMinor ? { amountMinor: Math.round(p.priceMinor * 12 * 0.8), currency: "TRY" } : null,
          isPopular: Boolean((p as { isPopular?: boolean }).isPopular),
          status: "active",
          order: i,
          isDemo: opts.isDemo,
        }),
        { upsert: true },
      ),
    );
  }
  for (const p of LEGAL_PAGES) {
    count(
      await CmsPage.updateOne(
        { slug: p.slug, locale: "tr" },
        op({ kind: "legal", title: p.title, summary: p.summary, sections: p.sections.map((s, i) => ({ ...s, id: s.id ?? `s${i + 1}` })), status: "published", legalReview: "draft_requires_legal_review", publishedAt: new Date(), isDemo: opts.isDemo }),
        { upsert: true },
      ),
    );
  }
  for (const s of HOME_SECTIONS) count(await HomepageSection.updateOne({ page: "home", key: s.key }, op({ ...s, page: "home", isActive: true, isDemo: opts.isDemo }), { upsert: true }));
  for (const [i, a] of HELP_ARTICLES.entries()) count(await HelpArticle.updateOne({ slug: a.slug }, op({ ...a, order: i, isPublished: true }), { upsert: true }));
  return { inserted };
}
