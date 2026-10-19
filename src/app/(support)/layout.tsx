import { PublicFooter } from "@/components/layouts/public-footer";
import { PublicHeader } from "@/components/layouts/public-header";
import { getSession } from "@/lib/auth/session";

/** Destek, Güvenlik ve Yasal sayfaları: genel başlık + "Destek" menü öğesi. */
export default async function SupportLegalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session ? { name: session.user.name, image: session.user.image, roles: session.user.roles } : null;
  return (
    <>
      <PublicHeader user={user} extraNav={[{ href: "/help", label: "Destek", match: "prefix" }]} />
      <main id="main" className="bg-gradient-to-b from-white to-[#fffafd]">{children}</main>
      <PublicFooter />
    </>
  );
}
