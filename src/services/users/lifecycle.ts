import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { UserPreferences } from "@/models/identity";
import { AnalyticsEvent } from "@/models/platform";
import { getPlatformSettings } from "@/services/platform/settings";
import { creditWallet, ensureWallet } from "@/services/wallet/wallet";

/**
 * Better Auth kullanıcı oluşturduktan sonra çağrılır: cüzdan, tercih belgesi ve kayıt bonusu.
 * Hata kaydı engellemez (kullanıcı yine giriş yapabilir); eksik belgeler ilk erişimde de oluşturulur.
 */
export async function onUserCreated({ userId, intent }: { userId: string; intent: "fan" | "creator" }) {
  try {
    await connectDb();
    const uid = oid(userId);
    await ensureWallet(uid);
    await UserPreferences.updateOne({ userId: uid }, { $setOnInsert: { userId: uid } }, { upsert: true });
    const settings = await getPlatformSettings();
    if (settings.credits.signupBonus > 0) {
      await creditWallet({
        userId: uid,
        amount: settings.credits.signupBonus,
        type: "bonus",
        description: "Hoş geldin bonusu", // i18n-ignore (defter açıklaması saklanır)
        idempotencyKey: `signup_bonus:${userId}`,
      });
    }
    await AnalyticsEvent.create({ type: "signup", userId: uid, props: { intent } });
  } catch (err) {
    console.error("[users:onUserCreated]", err);
  }
}

export async function ensureUserPreferences(userId: string) {
  await connectDb();
  const uid = oid(userId);
  return UserPreferences.findOneAndUpdate({ userId: uid }, { $setOnInsert: { userId: uid } }, { upsert: true, returnDocument: "after" }).lean();
}
