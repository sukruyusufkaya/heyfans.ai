/**
 * Demo/geliştirme verisi.  npm run db:seed  [-- --reset]
 * - Tüm kayıtlar isDemo=true; üretimde (APP_MODE=production) çalışmaz.
 * - Demo hesap parolası .env içindeki SEED_DEMO_PASSWORD'dan okunur (koda gömülmez).
 */
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
import { CATEGORIES, CONTENT_TEMPLATES, CREATOR_PLANS, CREATORS, GIFTS, HELP_ARTICLES, LEGAL_PAGES, PLATFORM_PLANS } from "./seed-data";

const DAY = 86400_000;
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
  for (const c of CATEGORIES) await Category.updateOne({ slug: c.slug }, { $set: { ...c, isActive: true, isDemo: true } }, { upsert: true });
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
  const admin = await ensureUser({ email: "admin@heyfans.local", name: "Sistem Yöneticisi", roles: ["fan", "admin"], adminRole: "super_admin", daysAgo: 500 });
  await ensureUser({ email: "moderator@heyfans.local", name: "Moderasyon Uzmanı", roles: ["fan", "admin"], adminRole: "moderation_specialist", daysAgo: 300 });
  await ensureUser({ email: "finance@heyfans.local", name: "Finans Yöneticisi", roles: ["fan", "admin"], adminRole: "finance_manager", daysAgo: 300 });
  await ensureUser({ email: "creators@heyfans.local", name: "Creator Yöneticisi", roles: ["fan", "admin"], adminRole: "creator_manager", daysAgo: 300 });

  // ── Creator'lar ──
  const creatorIds = new Map<string, Types.ObjectId>();
  const twinIds = new Map<string, Types.ObjectId>();
  for (const c of CREATORS) {
    const userId = await ensureUser({ email: c.email, name: c.displayName, roles: ["fan", "creator"], intent: "creator", daysAgo: c.daysAgo });
    await User.updateOne({ _id: userId }, { $set: { username: c.username } });
    const created = ago(c.daysAgo);
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
          location: c.location,
          languages: ["tr"],
          socialLinks: [
            { platform: "instagram", handle: `@${c.username}`, url: `https://instagram.com/${c.username}`, verified: true },
            { platform: "tiktok", handle: `@${c.username}`, url: `https://tiktok.com/@${c.username}`, verified: false },
          ],
          status: "approved",
          verification: { identity: "verified", social: "verified", verifiedAt: created },
          onboarding: { step: 10, completedSteps: ["account", "verify", "social", "twin", "persona", "knowledge", "likeness", "boundaries", "preview", "submit"], data: {}, submittedAt: created },
          "stats.followers": c.followers,
          "stats.posts": CONTENT_TEMPLATES.length,
          "stats.likes": Math.round(c.followers * 3.8),
          "stats.conversations": Math.round(c.followers / 20),
          featured: { isFeatured: Boolean(c.featuredRank), rank: c.featuredRank ?? 0 },
          isOnline: c.online,
          lastActiveAt: c.online ? new Date() : ago(1),
          payoutsEnabled: true,
          isDemo: true,
        },
        $setOnInsert: { createdAt: created, statusHistory: [{ from: null, to: "approved", by: admin, at: created }] },
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
      messageLength: "medium",
      pace: "normal",
      language: "tr",
      emojiUsage: c.persona.emoji,
      speakingStyle: c.persona.style,
      catchphrases: c.persona.catchphrases,
      sampleReplies: [],
    };
    const boundaries: TwinBoundaries = { allowedTopics: c.categories, blockedTopics: ["siyaset", "kişisel adres"], customRules: [], allowFlirt: false, allowPersonalQuestions: true, allowMediaRequests: false, allowCustomRequests: true, escalateOnDistress: true, maxMessagesPerFanPerDay: 200 };
    const voice: TwinVoiceLikeness = { voiceEnabled: false, videoEnabled: false, imageLikenessEnabled: false, voiceProfileStatus: "none", voiceSampleAssetIds: [], pitch: 0, speed: 100, tone: "neutral" };
    let twin = await AiTwin.findOne({ creatorId: profile!._id });
    if (!twin) {
      twin = await AiTwin.create({
        creatorId: profile!._id,
        userId,
        status: "live",
        statusHistory: [{ from: null, to: "live", by: admin, at: created }],
        draft: { persona, boundaries, voice },
        currentVersion: 1,
        pricing: { messageCredits: 2, voicePerMinuteCredits: 20, videoPerMinuteCredits: 40, freeMessagesPerDay: 3 },
        features: { chat: true, voice: c.username === "sophielane", video: c.username === "sophielane" },
        quality: { personaScore: 96, knowledgeScore: 92, safetyScore: 98, lastTestAt: ago(2) },
        stats: { conversations: Math.round(c.followers / 20), messages: Math.round(c.followers / 2), avgRating: 4.9 },
        isDemo: true,
      });
      const version = await AiTwinVersion.create({ twinId: twin._id, creatorId: profile!._id, version: 1, snapshot: { persona, boundaries, voice, knowledgeSourceIds: [] }, status: "live", submittedBy: userId, reviewedBy: admin, changeSummary: "İlk sürüm" });
      twin.liveVersionId = version._id;
      await twin.save();
    }
    twinIds.set(c.username, twin._id);

    for (const [i, p] of CREATOR_PLANS.entries()) {
      await MembershipPlan.updateOne(
        { scope: "creator", creatorId: profile!._id, tier: p.tier },
        {
          $set: {
            name: p.name,
            description: `${c.displayName} ${p.name} üyeliği`,
            benefits: p.benefits,
            entitlements: p.entitlements,
            priceMonthly: { amountMinor: p.priceMinor, currency: "TRY" },
            priceYearly: { amountMinor: Math.round(p.priceMinor * 12 * 0.8), currency: "TRY" },
            isPopular: Boolean((p as { isPopular?: boolean }).isPopular),
            status: "active",
            order: i,
            isDemo: true,
          },
        },
        { upsert: true },
      );
    }

    if (!(await ContentItem.exists({ creatorId: profile!._id }))) {
      const r = rand(c.username.length * 31 + c.followers);
      await ContentItem.insertMany(
        CONTENT_TEMPLATES.map((t, i) => ({
          creatorId: profile!._id,
          type: t.type,
          title: t.title,
          caption: t.caption,
          status: "published",
          statusHistory: [{ from: null, to: "published", by: userId, at: ago(i * 3 + 1) }],
          access: t.access,
          minPlanTier: (t as { minPlanTier?: string }).minPlanTier ?? null,
          price: (t as { priceMinor?: number }).priceMinor ? { amountMinor: (t as { priceMinor: number }).priceMinor, currency: "TRY" } : null,
          categories: c.categories,
          publishedAt: ago(i * 3 + 1),
          stats: { likes: Math.round(r() * 20000) + 500, comments: Math.round(r() * 600), views: Math.round(r() * 90000) + 2000, purchases: 0, revenueMinor: 0 },
          moderation: { state: "approved" },
          isDemo: true,
        })),
      );
    }

    if (c.knowledge && !(await KnowledgeSource.exists({ creatorId: profile!._id }))) {
      for (const k of c.knowledge) {
        const src = await KnowledgeSource.create({ creatorId: profile!._id, twinId: twin._id, type: "text", title: k.title, text: k.text, status: "uploaded", approved: true, sizeBytes: k.text.length, isDemo: true });
        if (aiStatus().available) await indexKnowledgeSource(src._id, k.text).catch((err) => console.warn("indeksleme atlandı:", err.message));
      }
    }
    await PayoutAccount.updateOne(
      { creatorId: profile!._id },
      { $setOnInsert: { creatorId: profile!._id, holderName: c.displayName, ibanMasked: maskIban("TR000000000000000000000000"), ibanEncrypted: encryptField("TR000000000000000000000000"), bankName: "Demo Bankası", status: "verified", isDefault: true } },
      { upsert: true },
    );
  }

  // İncelemede bekleyen creator başvurusu (admin akışı için)
  const pendingUser = await ensureUser({ email: "selin@heyfans.local", name: "Selin Kaya", roles: ["fan", "creator"], intent: "creator", daysAgo: 2 });
  const pending = await CreatorProfile.findOneAndUpdate(
    { userId: pendingUser },
    {
      $setOnInsert: {
        userId: pendingUser,
        username: "selinkaya",
        displayName: "Selin Kaya",
        headline: "Yemek ve ev yaşamı",
        bio: "Kolay tarifler ve sıcak ev sohbetleri.",
        categories: ["yemek", "ev-yasam"],
        status: "pending_review",
        verification: { identity: "pending", social: "verified" },
        onboarding: { step: 10, completedSteps: ["account", "verify", "social", "twin", "persona", "knowledge", "likeness", "boundaries", "preview", "submit"], data: {}, submittedAt: ago(1) },
        isDemo: true,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!(await CreatorApplication.exists({ creatorId: pending!._id }))) {
    await CreatorApplication.create({
      userId: pendingUser,
      creatorId: pending!._id,
      status: "submitted",
      snapshot: { displayName: "Selin Kaya", categories: ["yemek", "ev-yasam"] },
      checklist: [
        { key: "identity", label: "Kimlik doğrulama", passed: null },
        { key: "social", label: "Sosyal hesap sahipliği", passed: true },
        { key: "consent", label: "AI ikizi açık rızası", passed: true },
        { key: "age", label: "18+ doğrulaması", passed: true },
      ],
      submittedAt: ago(1),
      history: [{ from: "draft", to: "submitted", by: pendingUser, at: ago(1) }],
      isDemo: true,
    });
    const t = await AiTwin.create({ creatorId: pending!._id, userId: pendingUser, status: "pending_review", draft: { persona: { displayName: "Selin Kaya", greeting: "Merhaba! Bugün ne pişiriyoruz?" } }, currentVersion: 1, isDemo: true });
    await AiTwinVersion.create({ twinId: t._id, creatorId: pending!._id, version: 1, snapshot: { persona: t.draft.persona, boundaries: t.draft.boundaries, voice: t.draft.voice, knowledgeSourceIds: [] }, status: "pending_review", submittedBy: pendingUser, changeSummary: "İlk sürüm" });
  }

  // ── Demo hayran ──
  const fan = await ensureUser({ email: "fan@heyfans.local", name: "Deniz Yılmaz", intent: "fan", daysAgo: 90 });
  await UserPreferences.updateOne({ userId: fan }, { $set: { interests: ["seyahat", "moda", "fitness"], vibes: ["eglenceli", "samimi"], personalizationConsent: true, aiMemoryEnabled: true } });
  await AgeVerificationRecord.updateOne({ userId: fan }, { $setOnInsert: { userId: fan, method: "self_declared", status: "verified", assuranceLevel: "low", over18: true, verifiedAt: ago(90) } }, { upsert: true });
  await creditWallet({ userId: fan, amount: 300, type: "bonus", description: "Demo bakiyesi", idempotencyKey: "seed:fan:credits", isDemo: true });

  const sophie = creatorIds.get("sophielane")!;
  for (const u of ["sophielane", "zeynepdemir", "elifkaya", "mervearslan", "cerenyildiz"]) {
    const cid = creatorIds.get(u)!;
    await Follow.updateOne({ followerId: fan, creatorId: cid }, { $setOnInsert: { followerId: fan, creatorId: cid } }, { upsert: true });
  }
  for (const u of ["sophielane", "zeynepdemir", "mervearslan", "cerenyildiz", "deryaakin", "adasahin", "laradeniz", "nilaycoskun"]) {
    const cid = creatorIds.get(u)!;
    await Favorite.updateOne({ userId: fan, targetType: "creator", targetId: cid }, { $setOnInsert: { userId: fan, targetType: "creator", targetId: cid } }, { upsert: true });
  }

  // Abonelik + finansal geçmiş (demo işlemler, sağlayıcı: "seed")
  const premiumPlan = await MembershipPlan.findOne({ creatorId: sophie, tier: "premium" }).lean();
  if (premiumPlan && !(await Subscription.exists({ userId: fan, creatorId: sophie }))) {
    const tx = await PaymentTransaction.create({
      userId: fan,
      kind: "subscription",
      status: "succeeded",
      amount: premiumPlan.priceMonthly,
      provider: "seed",
      providerSessionId: `seed_${new Types.ObjectId().toHexString()}`,
      creatorId: sophie,
      item: { type: "plan", refId: premiumPlan._id, interval: "month", label: premiumPlan.name },
      idempotencyKey: "seed:fan:sub:sophie",
      succeededAt: ago(12),
      isTest: true,
      isDemo: true,
    });
    await Subscription.create({ userId: fan, planId: premiumPlan._id, scope: "creator", creatorId: sophie, tier: "premium", status: "active", interval: "month", price: premiumPlan.priceMonthly, currentPeriodStart: ago(12), currentPeriodEnd: new Date(Date.now() + 18 * DAY), provider: "seed", lastTransactionId: tx._id, isDemo: true });
    await recordPaymentEarning({ creatorId: sophie, sourceType: "subscription", grossMinor: tx.amount.amountMinor, currency: "TRY", transactionId: tx._id, description: "Abonelik: Premium", isDemo: true });
  }

  // Sophie için 60 günlük demo gelir geçmişi (başka demo hayranlar)
  if (!(await PaymentTransaction.exists({ idempotencyKey: "seed:hist:0" }))) {
    const r = rand(42);
    const plans = await MembershipPlan.find({ creatorId: sophie }).lean();
    const items = await ContentItem.find({ creatorId: sophie, access: "purchase" }).lean();
    const fans: Types.ObjectId[] = [];
    for (let i = 0; i < 8; i++) fans.push(await ensureUser({ email: `hayran${i + 1}@heyfans.local`, name: `Demo Hayran ${i + 1}`, daysAgo: 70 }));
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
        creatorId: sophie,
        item: isContent ? { type: "content", refId: item!._id, label: item!.title } : { type: "plan", refId: plan._id, interval: "month", label: plan.name },
        idempotencyKey: `seed:hist:${i}`,
        succeededAt: when,
        isTest: true,
        isDemo: true,
        createdAt: when,
      });
      if (isContent) await ContentAccessGrant.updateOne({ userId: buyer, contentId: item!._id }, { $setOnInsert: { userId: buyer, contentId: item!._id, creatorId: sophie, source: "purchase", transactionId: tx._id } }, { upsert: true });
      const earning = await recordPaymentEarning({ creatorId: sophie, sourceType: isContent ? "content" : "subscription", grossMinor: amount.amountMinor, currency: "TRY", transactionId: tx._id, description: isContent ? `İçerik satışı: ${item!.title}` : `Abonelik: ${plan.name}`, isDemo: true });
      // Demo geçmişi: hak edişi işlem tarihine taşı (defter değişmez olduğu için yalnız seed'de ham koleksiyonla)
      await db.collection("creatorEarnings").updateOne({ _id: earning._id }, { $set: { createdAt: when, availableAt: new Date(when.getTime() + settings.revenue.holdDays * DAY) } });
      await db.collection("paymentTransactions").updateOne({ _id: tx._id }, { $set: { createdAt: when } });
    }
    // Hediye/bahşiş kredi harcamaları
    for (let i = 0; i < 12; i++) {
      const buyer = fans[i % fans.length]!;
      await creditWallet({ userId: buyer, amount: 600, type: "bonus", description: "Demo bakiyesi", idempotencyKey: `seed:hist:credit:${i}`, isDemo: true });
      const g = GIFTS[i % GIFTS.length]!;
      const entry = await debitWallet({ userId: buyer, amount: g.credits, type: "gift_sent", description: `${g.name} hediyesi`, idempotencyKey: `seed:hist:gift:${i}`, creatorId: sophie, isDemo: true });
      await Gift.create({ kind: "gift", senderId: buyer, creatorId: sophie, giftKey: g.key, credits: g.credits, ledgerEntryId: entry._id, isDemo: true, createdAt: ago(i * 4) });
      const gEarning = await recordCreditEarning({ creatorId: sophie, sourceType: "gift", credits: g.credits, ledgerEntryId: entry._id, description: `${g.name} hediyesi`, isDemo: true });
      await db.collection("creatorEarnings").updateOne({ _id: gEarning._id }, { $set: { createdAt: ago(i * 4), availableAt: ago(i * 4 - settings.revenue.holdDays) } });
    }
  }

  // Sohbet geçmişi
  if (!(await Conversation.exists({ userId: fan, creatorId: sophie, kind: "fan" }))) {
    const conv = await Conversation.create({ userId: fan, creatorId: sophie, twinId: twinIds.get("sophielane")!, kind: "fan", memoryEnabled: true, isDemo: true, unreadForUser: 2 });
    const lines: [string, string][] = [
      ["ai", "Merhaba tatlım! Bugün nasılsın? Seninle konuşmak için sabırsızlanıyordum 💕"],
      ["user", "Merhaba Sophie! Bugün çok yorgunum, biraz motivasyona ihtiyacım var."],
      ["ai", "Yorgun günler de geçer, söz! Küçük bir yürüyüş ve sevdiğin bir şarkı bazen mucizeler yaratır. Bugün kendin için yaptığın küçük bir şey ne oldu?"],
      ["user", "Lizbon'a gitmeyi planlıyorum, önerin var mı?"],
      ["ai", "Lizbon en sevdiğim şehirlerden biri! Alfama'da gün batımını mutlaka izle ve 28 numaralı tramvaya erken saatte bin. Kaç gün kalmayı düşünüyorsun?"],
    ];
    for (const [i, [who, body]] of lines.entries()) {
      await Message.create({
        conversationId: conv._id,
        userId: fan,
        creatorId: sophie,
        senderType: who === "user" ? "user" : "ai",
        body,
        status: who === "user" ? "sent" : "completed",
        creditsCharged: 0,
        ai: who === "ai" ? { provider: "seed", model: "demo", isMock: true, label: "ai_generated", citations: [] } : null,
        isDemo: true,
        createdAt: ago(0, 6 - i),
      });
    }
    await Conversation.updateOne({ _id: conv._id }, { $set: { lastMessageAt: ago(0, 1), lastMessagePreview: lines.at(-1)![1].slice(0, 120), messageCount: lines.length } });
    await ConversationMemory.create({ userId: fan, creatorId: sophie, fact: "Lizbon'a gitmeyi planlıyor", category: "context", source: "auto" });
    for (const u of ["zeynepdemir", "elifkaya", "cerenyildiz"]) {
      const cid = creatorIds.get(u)!;
      const c2 = await Conversation.create({ userId: fan, creatorId: cid, twinId: twinIds.get(u)!, kind: "fan", isDemo: true, lastMessageAt: ago(1), lastMessagePreview: "Bir sonraki sohbetimizi dört gözle bekliyorum!", messageCount: 2 });
      await Message.create({ conversationId: c2._id, userId: fan, creatorId: cid, senderType: "ai", body: "Bir sonraki sohbetimizi dört gözle bekliyorum!", status: "completed", ai: { provider: "seed", model: "demo", isMock: true, label: "ai_generated", citations: [] }, isDemo: true, createdAt: ago(1) });
    }
  }

  // Özel talepler
  if (!(await CustomRequest.exists({ fanId: fan }))) {
    const now = new Date();
    await CustomRequest.insertMany([
      { fanId: fan, creatorId: sophie, type: "message", title: "Doğum günü sesli mesajı", details: "Arkadaşım Ayşe için kısa bir kutlama mesajı rica ediyorum.", priceCredits: 120, status: "pending", history: [{ from: "draft", to: "pending", by: fan, at: now }], isDemo: true },
      { fanId: fan, creatorId: creatorIds.get("zeynepdemir")!, type: "video", title: "Kişisel antrenman planı", details: "Haftada 3 gün, evde yapılabilecek bir program.", priceCredits: 250, status: "completed", history: [{ from: "draft", to: "pending", by: fan, at: ago(9) }, { from: "pending", to: "completed", by: null, at: ago(4) }], isDemo: true },
    ]);
  }

  // Bildirimler
  if (!(await Notification.exists({ userId: fan }))) {
    await Notification.insertMany([
      { userId: fan, type: "message", title: "Sophie'nin AI ikizinden yeni mesaj", body: "Lizbon planın hakkında bir sorum var!", link: "/chat/sophielane", isDemo: true },
      { userId: fan, type: "new_content", title: "Sophie Lane yeni içerik paylaştı", body: "Yaz günlüğü yayında.", link: "/creators/sophielane/content", isDemo: true, createdAt: ago(1) },
      { userId: fan, type: "subscription", title: "Premium üyeliğin aktif", body: "Sophie Lane Premium üyeliğin 18 gün sonra yenilenecek.", link: "/app/subscriptions", isDemo: true, createdAt: ago(3), readAt: ago(2) },
      { userId: fan, type: "system", title: "HEYFANS'a hoş geldin", body: "İlgi alanlarına göre öneriler hazırladık.", link: "/app", isDemo: true, createdAt: ago(10), readAt: ago(9) },
    ]);
  }

  // Trendler için 30 günlük etkileşim olayları (demo)
  if (!(await AnalyticsEvent.exists({ isDemo: true, type: "profile_view" }))) {
    const r = rand(7);
    const events: Record<string, unknown>[] = [];
    for (const c of CREATORS) {
      const cid = creatorIds.get(c.username)!;
      const weight = Math.max(1, Math.log10(c.followers));
      for (let d = 0; d < 30; d++) {
        const n = Math.round(weight * (2 + r() * 6) * (1 + (30 - d) / 40));
        for (let k = 0; k < n; k++) {
          const t = ["profile_view", "profile_view", "chat_message", "chat_message", "follow", "content_view"][Math.floor(r() * 6)]!;
          events.push({ type: t, creatorId: cid, props: {}, isDemo: true, createdAt: ago(d, Math.floor(r() * 23)) });
        }
      }
    }
    await AnalyticsEvent.insertMany(events);
    // AI kullanım kayıtları (AI operasyonları ekranı için)
    const usage: Record<string, unknown>[] = [];
    for (let d = 0; d < 30; d++) for (let k = 0; k < 20; k++) usage.push({ kind: "chat", provider: "seed", model: "demo-model", creatorId: creatorIds.get(CREATORS[k % CREATORS.length]!.username), inputTokens: 900 + Math.round(r() * 600), outputTokens: 120 + Math.round(r() * 120), latencyMs: 600 + Math.round(r() * 900), costMicroUsd: 400 + Math.round(r() * 300), status: r() < 0.97 ? "ok" : "error", isMock: true, createdAt: ago(d, Math.floor(r() * 23)) });
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
  console.log(`  Demo hesapları (parola: .env → SEED_DEMO_PASSWORD): fan@heyfans.local · sophie@heyfans.local · admin@heyfans.local (super_admin) · moderator@ · finance@ · creators@ · selin@ (başvuru incelemede)`);
  console.log(`  AI sağlayıcısı: ${aiStatus().provider}${aiStatus().mock ? " (test modu)" : ""} · kredi paketleri: ${settings.credits.packs.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed hatası:", err);
  process.exit(1);
});
