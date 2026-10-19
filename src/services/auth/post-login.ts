import "server-only";
import { safeNext, withNext } from "@/features/auth/next-url";
import { connectDb } from "@/lib/db/mongo";
import type { SessionUser } from "@/lib/auth/session";
import { oid } from "@/lib/validation/common";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { AgeVerificationRecord, User, UserPreferences } from "@/models/identity";

/**
 * Girişten (veya e-posta doğrulamasından) sonra kullanıcının gideceği yeri belirler.
 * Sıra: admin → şart onayı yok (Google/Apple kaydı) → yaş beyanı yok → creator başvurusu açık → hayran karşılaması → creator paneli → hayran paneli.
 * Şart onayı ve kayıt niyeti oturum çerezi önbelleğinden değil, veritabanından okunur (onaydan hemen sonra döngü olmaz).
 * `next` yalnız aynı origin'e ait göreli yol ise ve tüm ön koşullar sağlandıysa kullanılır.
 *
 * Hayran karşılaması "Şimdilik geç" ile atlanmışsa `fanOnboarding.step = -1` olarak işaretlenir ve tekrar sorulmaz.
 */
export async function resolvePostLoginDestination(user: SessionUser, nextRaw?: string | null): Promise<string> {
  const next = safeNext(nextRaw);
  const isAdmin = user.roles.includes("admin") && !!user.adminRole;
  if (isAdmin) return next && (next === "/admin" || next.startsWith("/admin/")) ? next : "/admin";

  await connectDb();
  const uid = oid(user.id);
  const isCreator = user.roles.includes("creator");
  const fresh = await User.findById(uid, { termsAcceptedAt: 1, signupIntent: 1 }).lean();
  if (!fresh?.termsAcceptedAt) return withNext("/consent", next);
  const intent = fresh.signupIntent === "creator" ? "creator" : user.signupIntent;
  const [adult, profile, prefs] = await Promise.all([
    AgeVerificationRecord.exists({ userId: uid, over18: true }),
    isCreator || intent === "creator" ? CreatorProfile.findOne({ userId: uid }, { status: 1, "verification.identity": 1 }).lean<{ status: ICreatorProfile["status"]; verification?: { identity?: string } }>() : null,
    UserPreferences.findOne({ userId: uid }, { fanOnboarding: 1 }).lean(),
  ]);

  // Kimliği yönetici incelemesiyle doğrulanmış (onaylı) creator'lar 18+ kontrolünden zaten geçmiştir.
  const adultByCreator = profile?.status === "approved" && profile.verification?.identity === "verified";
  if (!adult && !adultByCreator) return withNext("/age-verification", next);

  // Creator yolculuğu: başvuru tamamlanmadıysa/incelemedeyse/reddedildiyse karşılama sayfası durumu gösterir.
  if (profile && profile.status !== "approved" && profile.status !== "suspended") return "/onboarding/creator";
  if (!profile && intent === "creator" && !isCreator) return "/onboarding/creator?start=1";

  if (!isCreator) {
    const fo = prefs?.fanOnboarding;
    const skipped = fo?.step === -1;
    if (!fo?.completedAt && !skipped) return withNext("/onboarding/fan", next);
  }

  if (next) return next;
  return profile?.status === "approved" ? "/studio" : "/app";
}
