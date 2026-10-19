import { notFound } from "next/navigation";
import { getPublicCreator } from "@/services/public/profile";

/**
 * Onaylı olmayan/var olmayan profil için gerçek 404 durum kodu: denetim, sayfanın loading.tsx (akış) sınırının
 * dışında yapılır; `getPublicCreator` istek başına önbellekli olduğundan sayfa aynı sorguyu yeniden kullanır.
 */
export default async function CreatorProfileLayout({ children, params }: { children: React.ReactNode; params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!(await getPublicCreator(username))) notFound();
  return children;
}
