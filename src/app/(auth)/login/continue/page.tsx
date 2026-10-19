import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { requireUser } from "@/lib/auth/session";
import { resolvePostLoginDestination } from "@/services/auth/post-login";

export const metadata: Metadata = { title: "Devam Et" };

/**
 * Sosyal girişin (Google/Apple) geri dönüş adresi: oturum açıldıktan sonra yaş beyanı, karşılama ve rol
 * kurallarını uygulayıp kullanıcıyı doğru yere gönderir. E-posta/şifre girişi aynı kararı `postLoginRedirect` ile verir.
 */
export default async function LoginContinuePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const { user } = await requireUser();
  redirect(await resolvePostLoginDestination(user, next));
}
