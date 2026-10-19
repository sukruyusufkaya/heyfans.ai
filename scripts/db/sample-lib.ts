/**
 * Örnek profil içe aktarma/kaldırma çekirdeği — `db:samples` ve `db:demo-accounts` ortak kullanır.
 * Kurallar için bkz. scripts/db/samples.ts ve src/services/creators/sample.ts (D-35).
 */
import { existsSync, readFileSync } from "node:fs";
import mongoose, { Types } from "mongoose";
import { indexKnowledgeSource } from "@/lib/ai/knowledge";
import { aiStatus } from "@/lib/ai/provider";
import type { getStorage } from "@/lib/storage";
import {
  AiTwin,
  AiTwinVersion,
  ContentItem,
  Conversation,
  ConversationMemory,
  CreatorProfile,
  Favorite,
  Follow,
  KnowledgeChunk,
  KnowledgeSource,
  MediaAsset,
  MembershipPlan,
  Message,
  User,
} from "@/models";
import { SAMPLE_EMAIL_DOMAIN } from "@/services/creators/sample";
import { contentImageFile, NO_VOICE, seedImage, TIER_INFO, twinBoundaries, twinPersona, type Character } from "./shared";

export const sampleEmail = (username: string) => `${username}@${SAMPLE_EMAIL_DOMAIN}`;

export async function ensureSampleUser(c: Character) {
  const email = sampleEmail(c.username);
  const existing = await User.findOne({ email }, { _id: 1 }).lean();
  if (existing) return existing._id as Types.ObjectId;
  const _id = new Types.ObjectId();
  const now = new Date();
  // Better Auth kullanıcı koleksiyonu; "credential" hesabı OLUŞTURULMAZ → parola ile giriş yapılamaz.
  await mongoose.connection.db!.collection("users").insertOne({
    _id,
    name: c.displayName,
    email,
    emailVerified: false,
    image: seedImage(`creators/${c.username}-portrait.webp`),
    username: c.username,
    roles: ["creator"],
    adminRole: null,
    status: "active",
    signupIntent: "creator",
    twoFactorEnabled: false,
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  });
  return _id;
}

/** Bir karakteri örnek profil olarak içe aktarır. `userId` verilirse (demo creator girişi) o kullanıcıya bağlanır. */
export async function importSampleCreator(c: Character, storage: ReturnType<typeof getStorage>, opts: { userId?: Types.ObjectId } = {}) {
  const taken = await CreatorProfile.findOne({ username: c.username }, { isSample: 1 }).lean();
  if (taken && !taken.isSample) {
    console.warn(`! ${c.username}: bu kullanıcı adı gerçek bir creator'a ait — atlandı.`);
    return "skipped" as const;
  }
  const userId = opts.userId ?? (await ensureSampleUser(c));
  const now = new Date();
  const profile = await CreatorProfile.findOneAndUpdate(
    { username: c.username },
    {
      $set: {
        userId,
        username: c.username,
        displayName: c.displayName,
        headline: c.headline,
        bio: c.bio,
        categories: c.categories,
        tags: c.categories,
        location: c.city,
        languages: ["tr"],
        socialLinks: [],
        status: "approved",
        avatarUrl: seedImage(`creators/${c.username}-portrait.webp`),
        coverUrl: seedImage(`creators/${c.username}-cover.webp`),
        isOnline: false,
        payoutsEnabled: false,
        isSample: true,
        isDemo: false,
      },
      // Öne çıkarma admin panelinden değiştirilebilir: yalnız ilk eklemede ayarlanır.
      $setOnInsert: { featured: { isFeatured: Boolean(c.featuredRank), rank: c.featuredRank ?? 0 }, statusHistory: [{ from: null, to: "approved", by: null, at: now, note: "Örnek profil" }] },
    },
    { upsert: true, returnDocument: "after" },
  );
  const creatorId = profile!._id;

  let twin = await AiTwin.findOne({ creatorId });
  if (!twin) {
    const persona = twinPersona(c);
    const boundaries = twinBoundaries(c);
    twin = await AiTwin.create({
      creatorId,
      userId,
      status: "live",
      statusHistory: [{ from: null, to: "live", by: null, at: now, note: "Örnek profil" }],
      draft: { persona, boundaries, voice: NO_VOICE },
      currentVersion: 1,
      pricing: { messageCredits: 2, voicePerMinuteCredits: 20, videoPerMinuteCredits: 40, freeMessagesPerDay: 3 },
      features: { chat: true, voice: false, video: false },
      quality: { personaScore: null, knowledgeScore: null, safetyScore: null },
      stats: { conversations: 0, messages: 0, avgRating: null },
      isDemo: false,
    });
    const version = await AiTwinVersion.create({ twinId: twin._id, creatorId, version: 1, snapshot: { persona, boundaries, voice: NO_VOICE, knowledgeSourceIds: [] }, status: "live", submittedBy: userId, reviewedBy: null, changeSummary: "Örnek profil — ilk sürüm" });
    twin.liveVersionId = version._id;
    await twin.save();
  }

  // Planlar profilde örnek olarak görünür; satın alma sunucuda kapalıdır.
  for (const [i, tier] of (["basic", "premium", "vip"] as const).entries()) {
    const info = TIER_INFO[tier];
    const priceMinor = c.plans[i]! * 100;
    await MembershipPlan.updateOne(
      { scope: "creator", creatorId, tier },
      {
        $set: {
          name: info.name,
          description: `${c.displayName} ${info.name} üyeliği (örnek)`,
          benefits: info.benefits,
          entitlements: info.entitlements,
          priceMonthly: { amountMinor: priceMinor, currency: "TRY" },
          priceYearly: { amountMinor: Math.round(priceMinor * 12 * 0.8), currency: "TRY" },
          isPopular: tier === "premium",
          status: "active",
          order: i,
          isDemo: false,
        },
      },
      { upsert: true },
    );
  }

  let uploaded = 0;
  if (!(await ContentItem.exists({ creatorId }))) {
    for (const [i, item] of c.content.entries()) {
      let mediaAssetIds: Types.ObjectId[] = [];
      let coverUrl: string | null = null;
      const file = contentImageFile(c.username, i);
      if (item.img && existsSync(file)) {
        const body = readFileSync(file);
        const visibility = item.access === "public" ? "public" : "private";
        const storageKey = `${visibility}/content/samples/${c.username}-${i}.webp`;
        await storage.put(storageKey, body, "image/webp");
        const asset = await MediaAsset.findOneAndUpdate(
          { storageKey },
          { $set: { ownerId: userId, creatorId, kind: "image", purpose: "content", mime: "image/webp", sizeBytes: body.length, visibility, status: "ready", scan: { status: "skipped", provider: null, checkedAt: new Date() }, originalName: `${c.username}-${i}.webp`, isDemo: false } },
          { upsert: true, returnDocument: "after" },
        );
        mediaAssetIds = [asset!._id];
        if (item.access === "public") coverUrl = `/api/media/${asset!._id.toString()}`;
        uploaded++;
      }
      const when = new Date(now.getTime() - i * 3600_000); // sıra korunur; geriye dönük sahte tarih yok
      await ContentItem.create({
        creatorId,
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
        moderation: { state: "approved" },
        isDemo: false,
      });
    }
    await CreatorProfile.updateOne({ _id: creatorId }, { $set: { "stats.posts": c.content.length } });
  }

  let indexed = 0;
  if (!(await KnowledgeSource.exists({ creatorId }))) {
    for (const k of c.knowledge) {
      const src = await KnowledgeSource.create({ creatorId, twinId: twin._id, type: "text", title: k.title, text: k.text, status: "uploaded", approved: true, sizeBytes: k.text.length, isDemo: false });
      if (aiStatus().available) {
        await indexKnowledgeSource(src._id, k.text).then(() => indexed++).catch((err) => console.warn(`  indeksleme atlandı (${c.username}):`, err.message));
      }
    }
  }
  console.log(`✓ ${c.displayName} (@${c.username}) — ${uploaded} görsel yüklendi${indexed ? `, ${indexed} bilgi kaynağı indekslendi` : ""}`);
  return "ok" as const;
}

/** Örnek profili ve tüm verilerini siler. Kullanıcı yalnız örnek alan adlıysa (veya `deleteUserEmailPattern` eşleşirse) silinir. */
export async function removeSampleCreator(p: { _id: Types.ObjectId; userId: Types.ObjectId; username: string }, storage: ReturnType<typeof getStorage>, deleteUserEmailPattern?: RegExp) {
    const creatorId = p._id;
    const contentIds = (await ContentItem.find({ creatorId }, { _id: 1 }).lean()).map((c) => c._id);
    for (const a of await MediaAsset.find({ creatorId }, { storageKey: 1 }).lean()) await storage.remove(a.storageKey).catch(() => undefined);
    await Promise.all([
      MediaAsset.deleteMany({ creatorId }),
      ContentItem.deleteMany({ creatorId }),
      Favorite.deleteMany({ $or: [{ targetType: "creator", targetId: creatorId }, { targetType: "content", targetId: { $in: contentIds } }] }),
      Follow.deleteMany({ creatorId }),
      Message.deleteMany({ creatorId }),
      ConversationMemory.deleteMany({ creatorId }),
      Conversation.deleteMany({ creatorId }),
      KnowledgeChunk.deleteMany({ creatorId }),
      KnowledgeSource.deleteMany({ creatorId }),
      AiTwinVersion.deleteMany({ creatorId }),
      AiTwin.deleteMany({ creatorId }),
      MembershipPlan.deleteMany({ scope: "creator", creatorId }),
    ]);
    await CreatorProfile.deleteOne({ _id: creatorId });
    const pattern = deleteUserEmailPattern ?? new RegExp(`@${SAMPLE_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`);
    await User.deleteOne({ _id: p.userId, email: { $regex: pattern } });
}
