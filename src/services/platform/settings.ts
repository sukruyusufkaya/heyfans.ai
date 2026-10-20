import "server-only";
import { cache } from "react";
import { connectDb } from "@/lib/db/mongo";
import { PlatformSettings, type IPlatformSettings } from "@/models/platform";

export const DEFAULT_CREDIT_PACKS: IPlatformSettings["credits"]["packs"] = [
  { key: "credits_100", credits: 100, priceMinor: 4900, bonusCredits: 0, isPopular: false },
  { key: "credits_250", credits: 250, priceMinor: 10900, bonusCredits: 0, isPopular: false },
  { key: "credits_500", credits: 500, priceMinor: 19900, bonusCredits: 25, isPopular: true },
  { key: "credits_1000", credits: 1000, priceMinor: 34900, bonusCredits: 100, isPopular: false },
];

/** Tekil ayar belgesini döndürür; yoksa varsayılanlarla oluşturur. İstek başına önbelleklenir. */
export const getPlatformSettings = cache(async (): Promise<IPlatformSettings> => {
  await connectDb();
  const doc = await PlatformSettings.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global", "credits.packs": DEFAULT_CREDIT_PACKS } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean<IPlatformSettings>();
  if (!doc) throw new Error("Platform ayarları okunamadı"); // i18n-ignore (dahili hata)
  if (!doc.credits.packs?.length) doc.credits.packs = DEFAULT_CREDIT_PACKS;
  return doc;
});

export type FeatureFlag = keyof IPlatformSettings["features"];

export async function isFeatureEnabled(flag: FeatureFlag) {
  const s = await getPlatformSettings();
  return Boolean(s.features[flag]);
}
