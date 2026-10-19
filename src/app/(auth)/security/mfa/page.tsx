import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AuthSingle } from "@/components/auth/auth-shell";
import { IconBadge } from "@/components/auth/auth-ui";
import { env } from "@/config/env";
import { MfaPanel } from "@/features/auth/mfa-panel";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { requireUser } from "@/lib/auth/session";
import { getMfaState } from "@/services/auth/security";

export const metadata: Metadata = { title: "İki Adımlı Doğrulama" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const { user } = await requireUser("/security/mfa");
  const state = await getMfaState(user.id);
  const isAdmin = user.roles.includes("admin") && !!user.adminRole;
  const enforced = isAdmin && env().ADMIN_MFA_ENFORCED;

  return (
    <AuthSingle>
      <div className="text-center">
        <IconBadge>
          <ShieldCheck aria-hidden />
        </IconBadge>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-500">Hesap güvenliği</p>
        <h1 className="mt-2.5 font-display text-[32px] font-extrabold leading-[1.06] tracking-[-0.035em] [word-spacing:0.07em] text-ink sm:text-[38px]">
          İki adımlı <span className="text-brand-500">doğrulama.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[440px] text-[15px] leading-relaxed text-muted-strong">Hesabını şifrenin yanında bir doğrulama koduyla koru.</p>
      </div>
      <div className="mt-8">
        <MfaPanel enabled={state.enabled} hasPassword={state.hasPassword} enforced={enforced} next={next} />
      </div>
    </AuthSingle>
  );
}
