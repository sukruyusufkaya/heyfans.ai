/**
 * Örnek profiller — kurgusal Türk karakterlerini (scripts/db/characters.json) "Örnek profil" olarak içe aktarır.
 * Seed'den farklı olarak ÜRETİMDE DE çalışır (önce `db:init`).
 *
 *   npm run db:samples                    → ekle / eksikleri tamamla (tekrar çalıştırılabilir)
 *   npm run db:samples -- --reindex       → bilgi tabanını yeniden indeksle (AI sağlayıcısı sonradan bağlandıysa)
 *   npm run db:samples -- --remove --yes  → tüm örnek profilleri ve verilerini kaldır
 *
 * Kurallar (bkz. src/services/creators/sample.ts, DECISIONS D-35):
 * - CreatorProfile.isSample=true → her yerde "Örnek profil" etiketi; abonelik, satın alma, hediye, özel talep,
 *   ücretli görüşme ve kredili sohbet SUNUCUDA kapalı. Takip ve günlük ücretsiz mesaj açık.
 * - Sahte istatistik yok: takipçi/beğeni/sohbet sayıları 0'dan başlar; doğrulama rozeti ve "çevrimiçi" gösterilmez;
 *   sayaçlar (ana sayfa vb.) örnek profilleri saymaz.
 * - Hesaplara giriş yapılamaz: kullanıcı kaydı parolasız, e-posta adresi teslim edilemez (.invalid).
 * - Herkese açık görseller public/images/seed'den sunulur; içerik görselleri yapılandırılmış depolamaya (üretimde R2) yüklenir.
 */
import { existsSync, readFileSync } from "node:fs";
import mongoose, { Types } from "mongoose";
import { env } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { indexKnowledgeSource } from "@/lib/ai/knowledge";
import { aiStatus } from "@/lib/ai/provider";
import { getStorage } from "@/lib/storage";
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
import { CHARACTERS, contentImageFile, NO_VOICE, seedImage, TIER_INFO, twinBoundaries, twinPersona, type Character } from "./shared";

const args = new Set(process.argv.slice(2));
const sampleEmail = (username: string) => `${username}@${SAMPLE_EMAIL_DOMAIN}`;

async function ensureSampleUser(c: Character) {
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

async function importCreator(c: Character, storage: ReturnType<typeof getStorage>) {
  const taken = await CreatorProfile.findOne({ username: c.username }, { isSample: 1 }).lean();
  if (taken && !taken.isSample) {
    console.warn(`! ${c.username}: bu kullanıcı adı gerçek bir creator'a ait — atlandı.`);
    return "skipped" as const;
  }
  const userId = await ensureSampleUser(c);
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

async function reindex() {
  if (!aiStatus().available) throw new Error("AI sağlayıcısı yapılandırılmadı (AI_PROVIDER / AI_API_KEY); indeksleme yapılamaz.");
  const creatorIds = (await CreatorProfile.find({ isSample: true }, { _id: 1 }).lean()).map((p) => p._id);
  const sources = await KnowledgeSource.find({ creatorId: { $in: creatorIds }, status: { $ne: "indexed" } }).lean();
  for (const s of sources) await indexKnowledgeSource(s._id, s.text ?? "");
  console.log(`✓ ${sources.length} bilgi kaynağı indekslendi.`);
}

async function removeAll(storage: ReturnType<typeof getStorage>) {
  const profiles = await CreatorProfile.find({ isSample: true }, { _id: 1, userId: 1, username: 1 }).lean();
  if (!args.has("--yes")) {
    console.log(`${profiles.length} örnek profil ve tüm verileri (içerik, görseller, sohbetler, takipler) silinecek. Onaylamak için: npm run db:samples -- --remove --yes`);
    return;
  }
  for (const p of profiles) {
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
    // Yalnız örnek alan adlı kullanıcı silinir (gerçek hesaba asla dokunulmaz).
    await User.deleteOne({ _id: p.userId, email: { $regex: `@${SAMPLE_EMAIL_DOMAIN.replace(/\./g, "\\.")}$` } });
    console.log(`− @${p.username} kaldırıldı`);
  }
  console.log(`✓ ${profiles.length} örnek profil kaldırıldı.`);
}

async function main() {
  const e = env();
  await connectDb();
  const storage = getStorage();
  if (args.has("--remove")) return removeAll(storage);
  if (args.has("--reindex")) return reindex();

  console.log(`Örnek profiller içe aktarılıyor → ${e.MONGODB_DB_NAME} (APP_MODE=${e.APP_MODE}, depolama: ${storage.name})`);
  const creators = CHARACTERS.creators.filter((c) => !c.pending);
  let ok = 0;
  for (const c of creators) if ((await importCreator(c, storage)) === "ok") ok++;
  const ai = aiStatus();
  console.log(`✓ ${ok}/${creators.length} örnek profil hazır.${ai.available ? "" : " AI sağlayıcısı yok: bilgi tabanı indekslenmedi → sağlayıcı bağlanınca `npm run db:samples -- --reindex`."}`);
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Örnek profil hatası:", err);
    process.exit(1);
  });
