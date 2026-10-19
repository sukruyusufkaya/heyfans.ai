import { PublicFooter } from "@/components/layouts/public-footer";
import { PublicHeader } from "@/components/layouts/public-header";
import { getSession } from "@/lib/auth/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session ? { name: session.user.name, image: session.user.image, roles: session.user.roles } : null;
  return (
    <>
      <PublicHeader user={user} />
      <main id="main">{children}</main>
      <PublicFooter />
    </>
  );
}
