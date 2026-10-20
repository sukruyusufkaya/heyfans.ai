import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { requireUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { CreatorProfile } from "@/models/creator";
import { User } from "@/models/identity";
import { resolvePostLoginDestination } from "@/services/auth/post-login";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Devam Et") };
}

/**
 * Sosyal girişin (Google/Apple) geri dönüş adresi: oturum açıldıktan sonra yaş beyanı, karşılama ve rol
 * kurallarını uygulayıp kullanıcıyı doğru yere gönderir. E-posta/şifre girişi aynı kararı `postLoginRedirect` ile verir.
 */
export default async function LoginContinuePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const { user } = await requireUser();
  // Kayıt sayfasında "İçerik Üreticisiyim" seçilip Google/Apple ile gelindiyse, henüz creator profili yoksa niyet creator olur.
  if (firstParam(sp.intent) === "creator" && !user.roles.includes("admin")) {
    await connectDb();
    const uid = oid(user.id);
    if (!(await CreatorProfile.exists({ userId: uid }))) await User.updateOne({ _id: uid, signupIntent: { $ne: "creator" } }, { $set: { signupIntent: "creator" } });
  }
  redirect(await resolvePostLoginDestination(user, next));
}
