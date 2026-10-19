import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { FeatureUnavailableError } from "@/lib/errors";
import { AiUsageRecord } from "@/models/ai";
import { getPlatformSettings } from "./settings";

/** Bakım modu: yöneticiler hariç kullanıcı alanları ve ücretli/AI işlemleri durdurulur. */
export async function maintenanceState(user?: { roles: string[] } | null) {
  const s = await getPlatformSettings();
  const active = Boolean(s.maintenance?.enabled);
  return { active, blocked: active && !user?.roles.includes("admin"), message: s.maintenance?.message ?? null };
}

export async function assertNotInMaintenance(user?: { roles: string[] } | null) {
  const m = await maintenanceState(user);
  if (m.blocked) throw new FeatureUnavailableError(m.message || "Platform bakımda. Lütfen kısa süre sonra tekrar deneyin.");
}

/** AI aylık bütçe koruması: ayarlanmışsa (0 = sınırsız) bu ayki gerçek sağlayıcı maliyeti bütçeyi aşınca AI çağrıları durur. */
export async function assertAiBudget() {
  const s = await getPlatformSettings();
  const budget = s.ai?.monthlyBudgetMicroUsd ?? 0;
  if (!budget) return;
  await connectDb();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [agg] = await AiUsageRecord.aggregate<{ total: number }>([
    { $match: { createdAt: { $gte: monthStart }, isMock: false } },
    { $group: { _id: null, total: { $sum: "$costMicroUsd" } } },
  ]);
  if ((agg?.total ?? 0) >= budget) {
    throw new FeatureUnavailableError("AI sohbetleri geçici olarak durduruldu: aylık AI bütçesi doldu. Yöneticiler bilgilendirildi.");
  }
}
