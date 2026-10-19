/**
 * Üretim/ilk kurulum: tüm Mongoose indekslerini senkronlar, varsayılan platform ayarlarını ve temel verileri
 * (kategoriler, hediye kataloğu, platform planları, yasal sayfa taslakları, ana sayfa bölümleri, yardım makaleleri) oluşturur.
 * Yalnız EKSİK kayıtları ekler; admin düzenlemelerinin üzerine yazmaz. Demo verisi EKLEMEZ.  npm run db:init
 */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import "@/models";
import { getPlatformSettings } from "@/services/platform/settings";
import { ensureReferenceData } from "./shared";

async function main() {
  const m = await connectDb();
  for (const model of Object.values(m.models)) {
    const dropped = await model.syncIndexes();
    console.log(`✓ ${model.collection.collectionName} indeksleri${dropped.length ? ` (kaldırılan: ${dropped.join(", ")})` : ""}`);
  }
  await getPlatformSettings();
  console.log("✓ Platform ayarları hazır (varsayılanlar; Admin → Platform Ayarları'ndan düzenleyin).");
  const { inserted } = await ensureReferenceData({ isDemo: false, overwrite: false });
  console.log(`✓ Temel veriler hazır (${inserted} yeni kayıt; mevcut kayıtlar korunur). Yasal metinler "hukuki onay gerekli" taslağıdır.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
