/**
 * Demo/geliştirme verisi.  npm run db:seed  [-- --reset]
 * - Tüm kayıtlar isDemo=true; üretimde (APP_MODE=production) çalışmaz.
 * - Demo hesap parolası .env içindeki SEED_DEMO_PASSWORD'dan okunur (koda gömülmez).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Types } from "mongoose";
import type { TwinBoundaries, TwinPersona, TwinVoiceLikeness } from "@/models/ai";
import { env } from "@/config/env";
import { getAuth } from "@/lib/auth/auth";
import { connectDb } from "@/lib/db/mongo";
import { indexKnowledgeSource } from "@/lib/ai/knowledge";
import { aiStatus } from "@/lib/ai/provider";
import {
  AgeVerificationRecord,
  AiTwin,
  AiTwinVersion,
  AnalyticsEvent,
  Appeal,
  Campaign,
  Category,
  CmsPage,
  ContentAccessGrant,
  ContentItem,
  Conversation,
  ConversationMemory,
  CreatorApplication,
  CreatorConsent,
  CreatorProfile,
  CustomRequest,
  Favorite,
  Follow,
  Gift,
  GiftCatalogItem,
  HelpArticle,
  HomepageSection,
  KnowledgeSource,
  MembershipPlan,
  Message,
  ModerationCase,
  Notification,
  PaymentTransaction,
  PayoutAccount,
  Report,
  Subscription,
  SupportTicket,
  User,
  UserPreferences,
  AiUsageRecord,
} from "@/models";
import { recordCreditEarning, recordPaymentEarning } from "@/services/billing/earnings";
import { getPlatformSettings } from "@/services/platform/settings";
import { creditWallet, debitWallet, ensureWallet } from "@/services/wallet/wallet";
import { encryptField, maskIban } from "@/lib/security/crypto";
import { getStorage } from "@/lib/storage";
import { MediaAsset } from "@/models/content";
import { CATEGORIES, GIFTS, HELP_ARTICLES, LEGAL_PAGES, PLATFORM_PLANS } from "./seed-data";

interface CharacterFile {
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
const CHARACTERS = JSON.parse(readFileSync(path.join("scripts", "db", "characters.json"), "utf8")) as CharacterFile;
const categoryNames = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

const DAY = 86400_000;
/** Üretilmiş temsili görsel (public/images/seed) varsa URL'si, yoksa null (arayüz degrade görsele düşer). */
const seedImage = (rel: string) => (existsSync(path.join("public/images/seed", rel)) ? `/images/seed/${rel}` : null);
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600_000);
const rand = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

async function main() {
  const e = env();
  if (e.APP_MODE === "production") throw new Error("Seed üretimde çalıştırılamaz.");
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 10) throw new Error(".env içinde SEED_DEMO_PASSWORD (en az 10 karakter) tanımlayın.");
  const m = await connectDb();
  const db = m.connection.db!;

  if (process.argv.includes("--reset")) {
    const cols = await db.listCollections().toArray();
    for (const c of cols) if (!c.name.startsWith("system.")) await db.collection(c.name).drop();
    console.log(`↺ ${cols.length} koleksiyon silindi (${e.MONGODB_DB_NAME})`);
  }
  for (const model of Object.values(m.models)) await model.syncIndexes().catch((err) => console.warn("indeks:", model.modelName, err.message));

  const auth = await getAuth();
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);

  async function ensureUser(input: { email: string; name: string; roles?: string[]; adminRole?: string | null; intent?: "fan" | "creator"; daysAgo?: number }) {
    const existing = await User.findOne({ email: input.email }).lean();
    if (existing) return existing._id as Types.ObjectId;
    const _id = new Types.ObjectId();
    const created = ago(input.daysAgo ?? 30);
    await db.collection("users").insertOne({
      _id,
      name: input.name,
      email: input.email,
      emailVerified: true,
      image: null,
      roles: input.roles ?? ["fan"],
      adminRole: input.adminRole ?? null,
      status: "active",
      signupIntent: input.intent ?? "fan",
      twoFactorEnabled: false,
      isDemo: true,
      createdAt: created,
      updatedAt: created,
    });
    await db.collection("accounts").insertOne({ _id: new Types.ObjectId(), accountId: _id.toHexString(), providerId: "credential", userId: _id, password: hash, createdAt: created, updatedAt: created });
    await ensureWallet(_id);
    await UserPreferences.updateOne({ userId: _id }, { $setOnInsert: { userId: _id, fanOnboarding: { step: 4, completedAt: created } } }, { upsert: true });
    return _id;
  }

  // ── Platform ayarları, kategoriler, hediyeler, platform planları ──
  const settings = await getPlatformSettings();
  for (const c of CATEGORIES) await Category.updateOne({ slug: c.slug }, { $set: { ...c, coverUrl: seedImage(`categories/${c.slug}.webp`), isActive: true, isDemo: true } }, { upsert: true });
  for (const g of GIFTS) await GiftCatalogItem.updateOne({ key: g.key }, { $set: { ...g, isActive: true } }, { upsert: true });
  for (const [i, p] of PLATFORM_PLANS.entries()) {
    await MembershipPlan.updateOne(
      { scope: "platform", creatorId: null, tier: p.tier },
      {
        $set: {
          name: p.name,
          description: p.description,
          benefits: p.benefits,
          entitlements: p.entitlements,
          priceMonthly: { amountMinor: p.priceMinor, currency: "TRY" },
          priceYearly: p.priceMinor ? { amountMinor: Math.round(p.priceMinor * 12 * 0.8), currency: "TRY" } : null,
          isPopular: Boolean((p as { isPopular?: boolean }).isPopular),
          status: "active",
          order: i,
          isDemo: true,
        },
      },
      { upsert: true },
    );
  }

  // ── Yöneticiler ──
  const adminIds = new Map<string, Types.ObjectId>();
  for (const a of CHARACTERS.admins) adminIds.set(a.role, await ensureUser({ email: a.email, name: a.name, roles: ["fan", "admin"], adminRole: a.role, daysAgo: a.role === "super_admin" ? 500 : 300 }));
  const admin = adminIds.get("super_admin")!;

  // ── Creator'lar (scripts/db/characters.json — kurgusal Türk karakterler) ──
  const creatorIds = new Map<string, Types.ObjectId>();
  const twinIds = new Map<string, Types.ObjectId>();
  const storage = getStorage();
  const TIER_INFO = {
    basic: { name: "Temel", benefits: ["Genel gönderilere erişim", "AI ikiziyle günlük 10 mesaj", "Abonelere özel hikâyeler"], entitlements: { contentAccess: "basic" as const, unlimitedChat: false, dailyChatAllowance: 10, monthlyCredits: 0, customRequests: false, prioritySupport: false } },
    premium: { name: "Premium", benefits: ["Tüm gönderilere erişim", "AI ikiziyle sınırsız sohbet", "Premium seriler ve rehberler", "Erken erişim"], entitlements: { contentAccess: "premium" as const, unlimitedChat: true, dailyChatAllowance: 0, monthlyCredits: 0, customRequests: true, prioritySupport: false } },
    vip: { name: "VIP", benefits: ["Tüm Premium avantajları", "Sesli içerikler ve podcast", "Özel isteklerde öncelik", "Aylık 100 kredi"], entitlements: { contentAccess: "vip" as const, unlimitedChat: true, dailyChatAllowance: 0, monthlyCredits: 100, customRequests: true, prioritySupport: true } },
  };
  for (const c of CHARACTERS.creators) {
    const isPending = Boolean(c.pending);
    const userId = await ensureUser({ email: c.email, name: c.displayName, roles: ["fan", "creator"], intent: "creator", daysAgo: c.daysAgo });
    await User.updateOne({ _id: userId }, { $set: { username: c.username, image: seedImage(`creators/${c.username}-portrait.webp`) } });
    const created = ago(c.daysAgo);
    const r = rand(c.username.length * 31 + c.followers + 7);
    const profile = await CreatorProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          username: c.username,
          displayName: c.displayName,
          headline: c.headline,
          bio: c.bio,
          categories: c.categories,
          tags: c.categories,
          location: c.city,
          languages: ["tr"],
          // Kurgusal hesap adları: herkese açık profilde dış bağlantıya dönüştürülmez (bkz. services/public/profile.ts)
          socialLinks: [
            { platform: "instagram", handle: `@${c.username}`, verified: !isPending },
            { platform: "tiktok", handle: `@${c.username}`, verified: false },
          ],
          status: isPending ? "pending_review" : "approved",
          verification: isPending ? { identity: "pending", social: "pending", verifiedAt: null } : { identity: "verified", social: "verified", verifiedAt: created },
          onboarding: { step: 10, completedSteps: ["account", "verify", "social", "twin", "persona", "knowledge", "likeness", "boundaries", "preview", "submit"], data: {}, submittedAt: created },
          "stats.followers": c.followers,
          "stats.posts": c.content.length,
          "stats.likes": Math.round(c.followers * (2.6 + r() * 1.8)),
          "stats.conversations": Math.round(c.followers / (14 + r() * 10)),
          featured: { isFeatured: Boolean(c.featuredRank), rank: c.featuredRank ?? 0 },
          avatarUrl: seedImage(`creators/${c.username}-portrait.webp`),
          coverUrl: seedImage(`creators/${c.username}-cover.webp`),
          isOnline: c.online,
          lastActiveAt: c.online ? new Date() : ago(0, 3 + Math.floor(r() * 20)),
          payoutsEnabled: !isPending,
          isDemo: true,
        },
        $setOnInsert: { statusHistory: [{ from: null, to: isPending ? "pending_review" : "approved", by: admin, at: created }] },
      },
      { upsert: true, returnDocument: "after" },
    );
    creatorIds.set(c.username, profile!._id);
    // Demo zaman çizelgesi: profil kayıt tarihi (Mongoose timestamps upsert'te "şimdi" yazar)
    await db.collection("creatorProfiles").updateOne({ _id: profile!._id }, { $set: { createdAt: created } });

    for (const kind of ["ai_twin_persona", "knowledge_use"] as const) {
      await CreatorConsent.updateOne(
        { creatorId: profile!._id, kind, revokedAt: null },
        { $setOnInsert: { creatorId: profile!._id, userId, kind, granted: true, textVersion: "2026-10-draft", textHash: "seed", grantedAt: created } },
        { upsert: true },
      );
    }

    const persona: TwinPersona = {
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
    const boundaries: TwinBoundaries = {
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
    const voice: TwinVoiceLikeness = { voiceEnabled: false, videoEnabled: false, imageLikenessEnabled: false, voiceProfileStatus: "none", voiceSampleAssetIds: [], pitch: 0, speed: 100, tone: "neutral" };
    let twin = await AiTwin.findOne({ creatorId: profile!._id });
    if (!twin) {
      twin = await AiTwin.create({
        creatorId: profile!._id,
        userId,
        status: isPending ? "pending_review" : "live",
        statusHistory: [{ from: null, to: isPending ? "pending_review" : "live", by: isPending ? userId : admin, at: created }],
        draft: { persona, boundaries, voice },
        currentVersion: 1,
        pricing: { messageCredits: c.followers > 100_000 ? 3 : 2, voicePerMinuteCredits: 20, videoPerMinuteCredits: 40, freeMessagesPerDay: 3 },
        features: { chat: !isPending, voice: false, video: false },
        quality: isPending ? { personaScore: null, knowledgeScore: null, safetyScore: null } : { personaScore: 88 + Math.floor(r() * 10), knowledgeScore: 84 + Math.floor(r() * 12), safetyScore: 95 + Math.floor(r() * 5), lastTestAt: ago(Math.floor(r() * 9) + 1) },
        stats: { conversations: isPending ? 0 : Math.round(c.followers / (16 + r() * 8)), messages: isPending ? 0 : Math.round(c.followers / (1.8 + r())), avgRating: isPending ? null : Math.round((4.5 + r() * 0.45) * 10) / 10 },
        isDemo: true,
      });
      const version = await AiTwinVersion.create({ twinId: twin._id, creatorId: profile!._id, version: 1, snapshot: { persona, boundaries, voice, knowledgeSourceIds: [] }, status: isPending ? "pending_review" : "live", submittedBy: userId, reviewedBy: isPending ? null : admin, changeSummary: "İlk sürüm" });
      if (!isPending) {
        twin.liveVersionId = version._id;
        await twin.save();
      }
    }
    twinIds.set(c.username, twin._id);

    for (const [i, tier] of (["basic", "premium", "vip"] as const).entries()) {
      const info = TIER_INFO[tier];
      const priceMinor = c.plans[i]! * 100;
      await MembershipPlan.updateOne(
        { scope: "creator", creatorId: profile!._id, tier },
        {
          $set: {
            name: info.name,
            description: `${c.displayName} ${info.name} üyeliği`,
            benefits: info.benefits,
            entitlements: info.entitlements,
            priceMonthly: { amountMinor: priceMinor, currency: "TRY" },
            priceYearly: { amountMinor: Math.round(priceMinor * 12 * 0.8), currency: "TRY" },
            isPopular: tier === "premium",
            status: "active",
            order: i,
            isDemo: true,
          },
        },
        { upsert: true },
      );
    }

    if (c.content.length && !(await ContentItem.exists({ creatorId: profile!._id }))) {
      for (const [i, item] of c.content.entries()) {
        // İçerik görseli: ücretli/özel içeriklerde özel depolamada, herkese açıkta açık görünürlükte (erişim kontrolü /api/media üzerinden)
        let mediaAssetIds: Types.ObjectId[] = [];
        let coverUrl: string | null = null;
        const file = path.join("scripts/db/seed-media/content", `${c.username}-${i}.webp`);
        if (item.img && existsSync(file)) {
          const body = readFileSync(file);
          const visibility = item.access === "public" ? "public" : "private";
          const storageKey = `${visibility}/content/seed/${c.username}-${i}.webp`;
          await storage.put(storageKey, body, "image/webp");
          const asset = await MediaAsset.findOneAndUpdate(
            { storageKey },
            {
              $set: { ownerId: userId, creatorId: profile!._id, kind: "image", purpose: "content", mime: "image/webp", sizeBytes: body.length, visibility, status: "ready", scan: { status: "skipped", provider: null, checkedAt: new Date() }, originalName: `${c.username}-${i}.webp`, isDemo: true },
            },
            { upsert: true, returnDocument: "after" },
          );
          mediaAssetIds = [asset!._id];
          if (item.access === "public") coverUrl = `/api/media/${asset!._id.toString()}`;
        }
        const when = ago(i * (2 + Math.floor(r() * 3)) + 1, Math.floor(r() * 12));
        const popularity = c.followers / 100_000;
        await ContentItem.create({
          creatorId: profile!._id,
          type: item.type,
          title: item.title,
          caption: item.caption,
          status: "published",
          statusHistory: [{ from: null, to: "published", by: userId, at: when }],
          access: item.access,
          minPlanTier: item.access === "subscribers" ? (item.tier ?? "basic") : null,
          price: item.access === "purchase" && item.price ? { amountMinor: item.price * 100, currency: "TRY" } : null,
          mediaAssetIds,
          coverUrl,
          categories: c.categories,
          publishedAt: when,
          stats: { likes: Math.round((300 + r() * 1800) * Math.max(0.2, popularity)), comments: Math.round((10 + r() * 90) * Math.max(0.2, popularity)), views: Math.round((2000 + r() * 12000) * Math.max(0.2, popularity)), purchases: 0, revenueMinor: 0 },
          moderation: { state: "approved" },
          isDemo: true,
        });
      }
    }

    if (!(await KnowledgeSource.exists({ creatorId: profile!._id }))) {
      for (const k of c.knowledge) {
        const src = await KnowledgeSource.create({ creatorId: profile!._id, twinId: twin._id, type: "text", title: k.title, text: k.text, status: "uploaded", approved: true, sizeBytes: k.text.length, isDemo: true });
        if (aiStatus().available) await indexKnowledgeSource(src._id, k.text).catch((err) => console.warn("indeksleme atlandı:", err.message));
      }
    }
    if (!isPending) {
      await PayoutAccount.updateOne(
        { creatorId: profile!._id },
        { $setOnInsert: { creatorId: profile!._id, holderName: c.displayName, ibanMasked: maskIban("TR000000000000000000000000"), ibanEncrypted: encryptField("TR000000000000000000000000"), bankName: "Demo Bankası", status: "verified", isDefault: true } },
        { upsert: true },
      );
    }

    // İncelemede bekleyen creator: başvuru kaydı (admin akışı için)
    if (isPending && !(await CreatorApplication.exists({ creatorId: profile!._id }))) {
      await CreatorApplication.create({
        userId,
        creatorId: profile!._id,
        status: "submitted",
        snapshot: { displayName: c.displayName, username: c.username, categories: c.categories, city: c.city },
        checklist: [
          { key: "identity", label: "Kimlik doğrulama", passed: null },
          { key: "social", label: "Sosyal hesap sahipliği", passed: null },
          { key: "consent", label: "AI ikizi açık rızası", passed: true },
          { key: "age", label: "18+ doğrulaması", passed: true },
        ],
        submittedAt: ago(1),
        history: [{ from: "draft", to: "submitted", by: userId, at: ago(1) }],
        isDemo: true,
      });
    }
  }

  // ── Demo hayran ──
  const fan = await ensureUser({ email: CHARACTERS.fans[0]!.email, name: CHARACTERS.fans[0]!.name, intent: "fan", daysAgo: 90 });
  await UserPreferences.updateOne({ userId: fan }, { $set: { interests: ["seyahat", "moda", "fitness"], vibes: ["eglenceli", "samimi"], personalizationConsent: true, aiMemoryEnabled: true } });
  await AgeVerificationRecord.updateOne({ userId: fan }, { $setOnInsert: { userId: fan, method: "self_declared", status: "verified", assuranceLevel: "low", over18: true, verifiedAt: ago(90) } }, { upsert: true });
  await creditWallet({ userId: fan, amount: 300, type: "bonus", description: "Demo bakiyesi", idempotencyKey: "seed:fan:credits", isDemo: true });

  const lead = creatorIds.get("meliserturk")!;
  for (const u of ["meliserturk", "zeynepdemir", "elifkaya", "mervearslan", "cerenyildiz"]) {
    const cid = creatorIds.get(u)!;
    await Follow.updateOne({ followerId: fan, creatorId: cid }, { $setOnInsert: { followerId: fan, creatorId: cid } }, { upsert: true });
  }
  for (const u of ["meliserturk", "zeynepdemir", "mervearslan", "cerenyildiz", "deryaakin", "adasahin", "damladeniz", "nilaycoskun"]) {
    const cid = creatorIds.get(u)!;
    await Favorite.updateOne({ userId: fan, targetType: "creator", targetId: cid }, { $setOnInsert: { userId: fan, targetType: "creator", targetId: cid } }, { upsert: true });
  }

  // Abonelik + finansal geçmiş (demo işlemler, sağlayıcı: "seed")
  const premiumPlan = await MembershipPlan.findOne({ creatorId: lead, tier: "premium" }).lean();
  if (premiumPlan && !(await Subscription.exists({ userId: fan, creatorId: lead }))) {
    const tx = await PaymentTransaction.create({
      userId: fan,
      kind: "subscription",
      status: "succeeded",
      amount: premiumPlan.priceMonthly,
      provider: "seed",
      providerSessionId: `seed_${new Types.ObjectId().toHexString()}`,
      creatorId: lead,
      item: { type: "plan", refId: premiumPlan._id, interval: "month", label: premiumPlan.name },
      idempotencyKey: "seed:fan:sub:lead",
      succeededAt: ago(12),
      isTest: true,
      isDemo: true,
    });
    await Subscription.create({ userId: fan, planId: premiumPlan._id, scope: "creator", creatorId: lead, tier: "premium", status: "active", interval: "month", price: premiumPlan.priceMonthly, currentPeriodStart: ago(12), currentPeriodEnd: new Date(Date.now() + 18 * DAY), provider: "seed", lastTransactionId: tx._id, isDemo: true });
    await recordPaymentEarning({ creatorId: lead, sourceType: "subscription", grossMinor: tx.amount.amountMinor, currency: "TRY", transactionId: tx._id, description: "Abonelik: Premium", isDemo: true });
  }

  // Melis için 60 günlük demo gelir geçmişi (diğer demo hayranlar)
  if (!(await PaymentTransaction.exists({ idempotencyKey: "seed:hist:0" }))) {
    const r = rand(42);
    const plans = await MembershipPlan.find({ creatorId: lead }).lean();
    const items = await ContentItem.find({ creatorId: lead, access: "purchase" }).lean();
    const fans: Types.ObjectId[] = [];
    for (const [i, f] of CHARACTERS.fans.slice(1).entries()) fans.push(await ensureUser({ email: f.email, name: f.name, daysAgo: 45 + i * 7 }));
    for (let i = 0; i < 60; i++) {
      const isContent = r() < 0.35 && items.length;
      const plan = plans[Math.floor(r() * plans.length)]!;
      const item = items[Math.floor(r() * items.length)];
      const buyer = fans[Math.floor(r() * fans.length)]!;
      const when = ago(Math.floor(r() * 60), Math.floor(r() * 23));
      const amount = isContent ? item!.price! : plan.priceMonthly;
      const tx = await PaymentTransaction.create({
        userId: buyer,
        kind: isContent ? "content_purchase" : "subscription",
        status: "succeeded",
        amount,
        provider: "seed",
        providerSessionId: `seed_${new Types.ObjectId().toHexString()}`,
        creatorId: lead,
        item: isContent ? { type: "content", refId: item!._id, label: item!.title } : { type: "plan", refId: plan._id, interval: "month", label: plan.name },
        idempotencyKey: `seed:hist:${i}`,
        succeededAt: when,
        isTest: true,
        isDemo: true,
        createdAt: when,
      });
      if (isContent) await ContentAccessGrant.updateOne({ userId: buyer, contentId: item!._id }, { $setOnInsert: { userId: buyer, contentId: item!._id, creatorId: lead, source: "purchase", transactionId: tx._id } }, { upsert: true });
      const earning = await recordPaymentEarning({ creatorId: lead, sourceType: isContent ? "content" : "subscription", grossMinor: amount.amountMinor, currency: "TRY", transactionId: tx._id, description: isContent ? `İçerik satışı: ${item!.title}` : `Abonelik: ${plan.name}`, isDemo: true });
      // Demo geçmişi: hak edişi işlem tarihine taşı (defter değişmez olduğu için yalnız seed'de ham koleksiyonla)
      await db.collection("creatorEarnings").updateOne({ _id: earning._id }, { $set: { createdAt: when, availableAt: new Date(when.getTime() + settings.revenue.holdDays * DAY) } });
      await db.collection("paymentTransactions").updateOne({ _id: tx._id }, { $set: { createdAt: when } });
    }
    // Hediye/bahşiş kredi harcamaları
    for (let i = 0; i < 12; i++) {
      const buyer = fans[i % fans.length]!;
      await creditWallet({ userId: buyer, amount: 600, type: "bonus", description: "Demo bakiyesi", idempotencyKey: `seed:hist:credit:${i}`, isDemo: true });
      const g = GIFTS[i % GIFTS.length]!;
      const entry = await debitWallet({ userId: buyer, amount: g.credits, type: "gift_sent", description: `${g.name} hediyesi`, idempotencyKey: `seed:hist:gift:${i}`, creatorId: lead, isDemo: true });
      await Gift.create({ kind: "gift", senderId: buyer, creatorId: lead, giftKey: g.key, credits: g.credits, ledgerEntryId: entry._id, isDemo: true, createdAt: ago(i * 4) });
      const gEarning = await recordCreditEarning({ creatorId: lead, sourceType: "gift", credits: g.credits, ledgerEntryId: entry._id, description: `${g.name} hediyesi`, isDemo: true });
      await db.collection("creatorEarnings").updateOne({ _id: gEarning._id }, { $set: { createdAt: ago(i * 4), availableAt: ago(i * 4 - settings.revenue.holdDays) } });
    }
  }

  // Sohbet geçmişi (doğal, karaktere özgü konuşmalar; AI mesajları "AI İkizi" etiketiyle görünür)
  const CHATS: Record<string, { lines: [string, string][]; unread: number; memory?: string }> = {
    meliserturk: {
      unread: 2,
      memory: "Hafta sonu Kuzguncuk'a gitmeyi planlıyor",
      lines: [
        ["ai", "Selam canım! Bugün İstanbul'un neresindesin? ☕"],
        ["user", "Selam Melis! Bu hafta sonu Kuzguncuk'a gitmeyi düşünüyorum, ilk defa gideceğim."],
        ["ai", "Ah çok güzel seçim! Sabah erken git, bostanın oradaki sokaklar o saatte bomboş oluyor. Kahvaltı mı edeceksin yoksa sadece yürüyüş mü?"],
        ["user", "Kahvaltı da yaparım, bir de fotoğraf çekmek istiyorum."],
        ["ai", "O zaman İcadiye Caddesi'ndeki renkli evlerin önünde ışık 9'dan önce çok yumuşak. Fotoğraflardan birini bana da gösterir misin? 📸"],
      ],
    },
    zeynepdemir: {
      unread: 0,
      lines: [
        ["ai", "Selam şampiyon! Bugün hareket planın ne? 💪"],
        ["user", "Masa başı çalışıyorum, akşamları 20 dakikam oluyor ancak."],
        ["ai", "20 dakika gayet yeterli! 3 tur: 12 squat, 10 duvar şınavı, 30 saniye plank. Haftada 3 gün dene, cuma günü nasıl gittiğini yaz bana."],
      ],
    },
    elifkaya: {
      unread: 1,
      lines: [
        ["ai", "Merhaba! Bugün sana küçük bir kasaba hikâyem var 🌿"],
        ["user", "Ankara'dan günübirlik gidilebilecek bir yer önerir misin?"],
        ["ai", "Beypazarı tam sana göre. Sabah erken çıkarsan konakları kalabalık başlamadan gezersin; dönüşte havucu ve kurusunu almadan dönme. Daha önce gittin mi?"],
      ],
    },
    cerenyildiz: {
      unread: 0,
      lines: [
        ["ai", "GG! Bu akşam hangi oyun? 🎮"],
        ["user", "Hikâyesi güzel kısa bir oyun arıyorum, hafta sonu bitirebileceğim."],
        ["ai", "O zaman küçük bir indie macera öneririm; 6-7 saatte biter ve sonu baya duygusal. Kontrolcüyle mi oynuyorsun klavyeyle mi?"],
      ],
    },
  };
  if (!(await Conversation.exists({ userId: fan, kind: "fan" }))) {
    for (const [username, chat] of Object.entries(CHATS)) {
      const cid = creatorIds.get(username)!;
      const conv = await Conversation.create({ userId: fan, creatorId: cid, twinId: twinIds.get(username)!, kind: "fan", memoryEnabled: true, isDemo: true, unreadForUser: chat.unread });
      const hoursBack = username === "meliserturk" ? 6 : 30;
      for (const [i, [who, body]] of chat.lines.entries()) {
        await Message.create({
          conversationId: conv._id,
          userId: fan,
          creatorId: cid,
          senderType: who === "user" ? "user" : "ai",
          body,
          status: who === "user" ? "sent" : "completed",
          creditsCharged: 0,
          ai: who === "ai" ? { provider: "seed", model: "demo", isMock: true, label: "ai_generated", citations: [] } : null,
          isDemo: true,
          createdAt: ago(0, hoursBack - i),
        });
      }
      await Conversation.updateOne({ _id: conv._id }, { $set: { lastMessageAt: ago(0, hoursBack - chat.lines.length + 1), lastMessagePreview: chat.lines.at(-1)![1].slice(0, 120), messageCount: chat.lines.length } });
      if (chat.memory) await ConversationMemory.create({ userId: fan, creatorId: cid, fact: chat.memory, category: "context", source: "auto" });
    }
  }

  // Özel talepler
  if (!(await CustomRequest.exists({ fanId: fan }))) {
    const now = new Date();
    await CustomRequest.insertMany([
      { fanId: fan, creatorId: lead, type: "message", title: "Doğum günü için kısa mesaj", details: "Arkadaşım Ayşe'nin doğum günü cumartesi; İstanbul'u çok seviyor, ona kısa bir kutlama mesajı rica ediyorum.", priceCredits: 120, status: "pending", history: [{ from: "draft", to: "pending", by: fan, at: now }], isDemo: true },
      { fanId: fan, creatorId: creatorIds.get("zeynepdemir")!, type: "video", title: "Evde 3 günlük antrenman planı", details: "Haftada 3 gün, ekipmansız, dizlerimi zorlamayan bir program istiyorum.", priceCredits: 250, status: "completed", history: [{ from: "draft", to: "pending", by: fan, at: ago(9) }, { from: "pending", to: "completed", by: null, at: ago(4) }], isDemo: true },
    ]);
  }

  // Bildirimler
  if (!(await Notification.exists({ userId: fan }))) {
    await Notification.insertMany([
      { userId: fan, type: "message", title: "Melis Ertürk'ün AI ikizinden yeni mesaj", body: "Kuzguncuk fotoğraflarını merak ediyorum!", link: "/chat/meliserturk", isDemo: true },
      { userId: fan, type: "new_content", title: "Melis Ertürk yeni içerik paylaştı", body: "Kadıköy'de bir pazar sabahı", link: "/creators/meliserturk/content", isDemo: true, createdAt: ago(1) },
      { userId: fan, type: "new_content", title: "Elif Kaya yeni içerik paylaştı", body: "Ankara Kalesi'nde bir cumartesi", link: "/creators/elifkaya/content", isDemo: true, createdAt: ago(2), readAt: ago(1) },
      { userId: fan, type: "subscription", title: "Premium üyeliğin aktif", body: "Melis Ertürk Premium üyeliğin 18 gün sonra yenilenecek.", link: "/app/subscriptions", isDemo: true, createdAt: ago(3), readAt: ago(2) },
      { userId: fan, type: "system", title: "HEYFANS'a hoş geldin", body: "İlgi alanlarına göre öneriler hazırladık.", link: "/app", isDemo: true, createdAt: ago(10), readAt: ago(9) },
    ]);
  }

  // Trendler için 30 günlük etkileşim olayları (demo)
  const liveCreators = CHARACTERS.creators.filter((c) => !c.pending);
  if (!(await AnalyticsEvent.exists({ isDemo: true, type: "profile_view" }))) {
    const r = rand(7);
    const events: Record<string, unknown>[] = [];
    for (const c of liveCreators) {
      const cid = creatorIds.get(c.username)!;
      const weight = Math.max(1, Math.log10(c.followers));
      // Yeni katılanlar son günlerde daha hızlı yükselir (gerçekçi trend dağılımı)
      const momentum = c.daysAgo < 10 ? 1.8 : 1;
      for (let d = 0; d < 30; d++) {
        const n = Math.round(weight * (2 + r() * 6) * (1 + (30 - d) / 40) * (d < 7 ? momentum : 1));
        for (let k = 0; k < n; k++) {
          const t = ["profile_view", "profile_view", "chat_message", "chat_message", "follow", "content_view"][Math.floor(r() * 6)]!;
          events.push({ type: t, creatorId: cid, props: {}, isDemo: true, createdAt: ago(d, Math.floor(r() * 23)) });
        }
      }
    }
    await AnalyticsEvent.insertMany(events);
    // AI kullanım kayıtları (AI operasyonları ekranı için)
    const usage: Record<string, unknown>[] = [];
    for (let d = 0; d < 30; d++) for (let k = 0; k < 20; k++) usage.push({ kind: "chat", provider: "seed", model: "demo-model", creatorId: creatorIds.get(liveCreators[k % liveCreators.length]!.username), inputTokens: 900 + Math.round(r() * 600), outputTokens: 120 + Math.round(r() * 120), latencyMs: 600 + Math.round(r() * 900), costMicroUsd: 400 + Math.round(r() * 300), status: r() < 0.97 ? "ok" : "error", isMock: true, createdAt: ago(d, Math.floor(r() * 23)) });
    await AiUsageRecord.insertMany(usage);
  }

  // Moderasyon, raporlar, itirazlar, destek
  if (!(await ModerationCase.exists({ isDemo: true }))) {
    const items = await ContentItem.find({ creatorId: creatorIds.get("mervearslan") }).limit(3).lean();
    const cases = await ModerationCase.insertMany([
      { caseNo: "MOD-2047", targetType: "content", targetId: items[0]!._id, creatorId: creatorIds.get("mervearslan"), source: "auto", reason: "Otomatik filtre: hassas görsel şüphesi", categories: ["sexual"], riskScore: 72, priority: "high", status: "open", isDemo: true },
      { caseNo: "MOD-2046", targetType: "profile", targetId: creatorIds.get("cerenyildiz")!, creatorId: creatorIds.get("cerenyildiz"), source: "report", reason: "Taklit hesap bildirimi", categories: ["impersonation"], riskScore: 55, priority: "medium", status: "in_review", isDemo: true },
      { caseNo: "MOD-2045", targetType: "twin", targetId: twinIds.get("deryaakin")!, creatorId: creatorIds.get("deryaakin"), source: "auto", reason: "AI çıktısında platform dışı iletişim önerisi", categories: ["off_platform"], riskScore: 40, priority: "medium", status: "open", isDemo: true },
      { caseNo: "MOD-2044", targetType: "content", targetId: items[1]!._id, creatorId: creatorIds.get("mervearslan"), source: "pre_publish", reason: "Yayın öncesi inceleme", categories: [], riskScore: 12, priority: "low", status: "dismissed", isDemo: true },
    ]);
    const reps = await Report.insertMany([
      { reportNo: "RPT-3021", reporterId: fan, targetType: "profile", targetId: creatorIds.get("cerenyildiz")!, creatorId: creatorIds.get("cerenyildiz"), reason: "impersonation", details: "Bu hesabın gerçek kişiyi taklit ettiğini düşünüyorum.", status: "triaged", caseId: cases[1]!._id, isDemo: true },
      { reportNo: "RPT-3020", reporterId: fan, targetType: "message", targetId: new Types.ObjectId(), creatorId: creatorIds.get("deryaakin"), reason: "ai_misbehavior", details: "AI ikizi WhatsApp'tan yazmamı önerdi.", status: "open", isDemo: true },
      { reportNo: "RPT-3019", reporterEmail: "hak.sahibi@example.com", targetType: "content", targetId: items[2]!._id, creatorId: creatorIds.get("mervearslan"), reason: "copyright", details: "Fotoğraf bana aittir.", status: "open", isDemo: true },
    ]);
    await ModerationCase.updateOne({ _id: cases[1]!._id }, { $set: { reportIds: [reps[0]!._id] } });
    await Appeal.create({ appealNo: "APL-501", userId: (await CreatorProfile.findById(creatorIds.get("mervearslan")).lean())!.userId, caseId: cases[3]!._id, reason: "İçeriğim kurallara uygundu, tekrar incelenmesini rica ediyorum.", status: "open", isDemo: true });
    await SupportTicket.insertMany([
      { ticketNo: "DST-1042", userId: fan, name: "Deniz Yılmaz", email: "fan@heyfans.local", category: "payments", subject: "Kredi yüklemesi görünmüyor", message: "Dün kredi aldım ama bakiyeme yansımadı.", status: "open", priority: "high", isDemo: true },
      { ticketNo: "DST-1041", name: "Ziyaretçi", email: "ziyaretci@example.com", category: "account", subject: "Doğrulama e-postası", message: "Doğrulama e-postası gelmedi.", status: "pending", priority: "normal", isDemo: true },
    ]);
  }

  // CMS: yasal taslaklar, ana sayfa bölümleri, kampanyalar, yardım makaleleri
  for (const p of LEGAL_PAGES) {
    await CmsPage.updateOne(
      { slug: p.slug, locale: "tr" },
      { $set: { kind: "legal", title: p.title, summary: p.summary, sections: p.sections.map((s, i) => ({ ...s, id: s.id ?? `s${i + 1}` })), status: "published", legalReview: "draft_requires_legal_review", publishedAt: new Date(), isDemo: true } },
      { upsert: true },
    );
  }
  const homeSections = [
    { key: "hero", type: "hero", title: "Gerçek İçerik Üreticileri. AI İkizler. Gerçek Bağlantılar.", subtitle: "Sevdiğin içerik üreticilerinin AI ikizleriyle 7/24 sohbet et, ipuçları al, özel içeriklere eriş ve onlarla her zamankinden daha yakın bir bağ kur.", config: { badge: "AI ile daha yakın, daha gerçek bağlantılar", primaryCta: { label: "İçerik Üreticilerini Keşfet", href: "/explore" }, secondaryCta: { label: "Nasıl Çalışır?", href: "/how-it-works" } }, order: 1 },
    { key: "featured", type: "featured_creators", title: "Öne Çıkan İçerik Üreticileri", config: { limit: 6 }, order: 2 },
    { key: "announcement", type: "announcement", title: "Şimdi HEYFANS topluluğuna katıl.", subtitle: "Binlerce içerik üreticisini keşfet, AI ikizlerle sohbet et ve sana özel içeriklere eriş.", config: { ctaLabel: "Hemen Başla", ctaHref: "/register" }, order: 9 },
  ];
  for (const s of homeSections) await HomepageSection.updateOne({ page: "home", key: s.key }, { $set: { ...s, page: "home", isActive: true, isDemo: true } }, { upsert: true });
  if (!(await Campaign.exists({ isDemo: true }))) {
    await Campaign.insertMany([
      { name: "Hoş geldin kredisi", type: "credit_bonus", status: "active", startsAt: ago(10), endsAt: new Date(Date.now() + 20 * DAY), audience: "new_users", config: { headline: "İlk kredi alımında %20 bonus", bonusPercent: 20 }, metrics: { impressions: 12840, clicks: 1520, conversions: 212 }, createdBy: admin, isDemo: true },
      { name: "Yaz koleksiyonları", type: "banner", status: "scheduled", startsAt: new Date(Date.now() + 5 * DAY), endsAt: new Date(Date.now() + 35 * DAY), audience: "fans", config: { headline: "Yaz koleksiyonları yayında", ctaLabel: "Keşfet", ctaUrl: "/explore" }, createdBy: admin, isDemo: true },
    ]);
  }
  for (const [i, a] of HELP_ARTICLES.entries()) await HelpArticle.updateOne({ slug: a.slug }, { $set: { ...a, order: i, isPublished: true } }, { upsert: true });

  console.log("✓ Seed tamamlandı.");
  console.log(`  Demo hesapları (parola: .env → SEED_DEMO_PASSWORD): fan@heyfans.local · melis@heyfans.local · admin@heyfans.local (super_admin) · moderator@ · finance@ · creators@ · selin@ (başvuru incelemede)`);
  console.log(`  AI sağlayıcısı: ${aiStatus().provider}${aiStatus().mock ? " (test modu)" : ""} · kredi paketleri: ${settings.credits.packs.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed hatası:", err);
  process.exit(1);
});
