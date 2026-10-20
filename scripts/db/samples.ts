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
import mongoose from "mongoose";
import { env } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { indexKnowledgeSource } from "@/lib/ai/knowledge";
import { aiStatus } from "@/lib/ai/provider";
import { getStorage } from "@/lib/storage";
import { CreatorProfile, KnowledgeSource } from "@/models";
import { importSampleCreator, removeSampleCreator } from "./sample-lib";
import { CHARACTERS } from "./shared";

const args = new Set(process.argv.slice(2));

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
    await removeSampleCreator(p, storage);
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
  for (const c of creators) if ((await importSampleCreator(c, storage)) === "ok") ok++;
  const ai = aiStatus();
  console.log(`✓ ${ok}/${creators.length} örnek profil hazır.${ai.available ? "" : " AI sağlayıcısı yok: bilgi tabanı indekslenmedi → sağlayıcı bağlanınca `npm run db:samples -- --reindex` (canlı: `npm run db:samples:prod -- --reindex`)."}`);
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Örnek profil hatası:", err);
    process.exit(1);
  });
