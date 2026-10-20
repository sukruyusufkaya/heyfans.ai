"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileCheck2, LogOut } from "lucide-react";
import { AuthHeading, FormAlert, PrimaryButton } from "@/components/auth/auth-ui";
import { Checkbox } from "@/components/ui/form-controls";
import { acceptTermsAction } from "@/features/auth/actions";
import { authClient } from "@/lib/auth/client";
import { useT } from "@/i18n/client";

const linkCls = "font-extrabold text-brand-600 hover:underline";

/** Google/Apple ile ilk girişte şart onayı (e-posta kaydındaki onay kutusunun karşılığı). */
export function ConsentForm({ name, next }: { name: string; next: string | null }) {
  const t = useT();
  const router = useRouter();
  const [accepted, setAccepted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-500">
        <FileCheck2 className="size-7" aria-hidden />
      </span>
      <AuthHeading eyebrow={name ? t("Hoş geldin, {name}", { name: name.split(" ")[0] }) : t("Hoş geldin")} title={t("Son bir")} accent={t("adım.")} description={t("Hesabını kullanmaya başlamadan önce HEYFANS kullanım şartlarını ve gizlilik politikasını onaylaman gerekiyor.")} />
      <form
        className="mt-7 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!accepted) return setError(t("Devam etmek için şartları kabul etmelisin."));
          start(async () => {
            const r = await acceptTermsAction({ accept: true, next });
            if (!r.ok) return setError(r.error);
            router.replace(r.data.to);
            router.refresh();
          });
        }}
      >
        <label htmlFor="consent-terms" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-4 text-[13px] leading-relaxed text-ink-soft">
          <Checkbox id="consent-terms" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" aria-describedby={error ? "consent-error" : undefined} />
          <span>
            {t.rich("<terms>Kullanım Koşulları</terms> ve <privacy>Gizlilik Politikası</privacy>'nı okudum ve kabul ediyorum. 18 yaşından büyük olduğumu biliyorum; bir sonraki adımda yaşımı beyan edeceğim.", {
              terms: (c) => (
                <Link href="/terms" target="_blank" rel="noopener" className={linkCls}>
                  {c}
                </Link>
              ),
              privacy: (c) => (
                <Link href="/privacy" target="_blank" rel="noopener" className={linkCls}>
                  {c}
                </Link>
              ),
            })}
          </span>
        </label>
        {error && (
          <FormAlert id="consent-error">
            <p>{error}</p>
          </FormAlert>
        )}
        <PrimaryButton type="submit" loading={pending} className="w-full">
          {t("Kabul et ve devam et")}
        </PrimaryButton>
        <button
          type="button"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/");
            router.refresh();
          }}
          className="mx-auto flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink-soft"
        >
          <LogOut className="rtl:-scale-x-100 size-4" aria-hidden /> {t("Vazgeç ve çıkış yap")}
        </button>
      </form>
    </div>
  );
}
