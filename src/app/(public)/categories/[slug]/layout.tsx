import { notFound } from "next/navigation";
import { getCategoryCached } from "@/services/public/discover";

/**
 * Bilinmeyen kategori için gerçek 404 durum kodu: varlık denetimi, sayfanın loading.tsx (akış) sınırının DIŞINDA,
 * yani HTML gönderilmeden önce yapılır.
 */
export default async function CategoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await getCategoryCached(slug))) notFound();
  return children;
}
