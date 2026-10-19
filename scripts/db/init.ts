/**
 * Üretim/ilk kurulum: tüm Mongoose indekslerini senkronlar ve varsayılan platform ayarlarını oluşturur.
 * Demo verisi EKLEMEZ.  npm run db:init
 */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import "@/models";
import { getPlatformSettings } from "@/services/platform/settings";

async function main() {
  const m = await connectDb();
  for (const model of Object.values(m.models)) {
    const dropped = await model.syncIndexes();
    console.log(`✓ ${model.collection.collectionName} indeksleri${dropped.length ? ` (kaldırılan: ${dropped.join(", ")})` : ""}`);
  }
  await getPlatformSettings();
  console.log("✓ Platform ayarları hazır (varsayılanlar; Admin → Platform Ayarları'ndan düzenleyin).");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
