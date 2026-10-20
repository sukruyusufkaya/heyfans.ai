"use client";
import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, MailCheck, ShieldCheck } from "lucide-react";
import { AuthField, AuthHeading, FormAlert, IconBadge, linkCls, PrimaryButton } from "@/components/auth/auth-ui";
import { Input } from "@/components/ui/form-controls";
import { authClient } from "@/lib/auth/client";
import { authErrorText, NETWORK_ERROR, useFieldError } from "@/features/auth/client-errors";
import { forgotSchema, type ForgotValues } from "@/features/auth/schemas";
import { useCooldown } from "@/features/auth/use-cooldown";
import { useT } from "@/i18n/client";

export function ForgotPasswordForm({ showDevOutbox }: { showDevOutbox: boolean }) {
  const t = useT();
  const fe = useFieldError();
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const cooldown = useCooldown("hf.forgot.cooldown", 60);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  async function send(email: string) {
    setFormError(null);
    try {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      if (error) {
        setFormError(t(authErrorText(error)));
        return false;
      }
      cooldown.start();
      setSentTo(email);
      return true;
    } catch {
      setFormError(t(NETWORK_ERROR));
      return false;
    }
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <IconBadge badge={<ShieldCheck />}>
          <MailCheck aria-hidden />
        </IconBadge>
        <AuthHeading center eyebrow={t("KONTROL ET")} title={t("Bağlantı")} accent={t("yolda.")} as="h1" />
        <p className="mx-auto mt-4 max-w-[380px] text-[15px] leading-relaxed text-muted-strong" role="status">
          {t.rich("<b>{email}</b> adresiyle kayıtlı bir hesap varsa şifre yenileme bağlantısını gönderdik. Bağlantı 30 dakika geçerlidir.", {
            email: sentTo,
            b: (c) => <span className="font-extrabold text-ink">{c}</span>,
          })}
        </p>
        <p className="mx-auto mt-3 max-w-[380px] text-xs text-muted">{t("Gelen kutunda göremezsen istenmeyen (spam) klasörünü de kontrol et.")}</p>
        {formError && (
          <FormAlert className="mt-4 text-start">
            <p>{formError}</p>
          </FormAlert>
        )}
        {showDevOutbox && (
          <p className="mx-auto mt-4 max-w-[380px] rounded-xl bg-warning-soft px-3 py-2.5 text-xs font-semibold text-warning">
            {t("Geliştirme ortamı: e-posta gerçekten gönderilmez.")}{" "}
            <Link href={`/dev/outbox?to=${encodeURIComponent(sentTo)}`} className="underline underline-offset-2">
              {t("Geliştirme posta kutusunu aç")}
            </Link>
          </p>
        )}
        <div className="mt-6 space-y-3">
          <PrimaryButton type="button" arrow={false} outline disabled={cooldown.active} onClick={() => send(sentTo)}>
            {cooldown.active ? t("Tekrar göndermek için {n} sn bekle", { n: cooldown.remaining }) : t("Bağlantıyı yeniden gönder")}
          </PrimaryButton>
          <Link href="/login" className={`${linkCls} block text-[13px]`}>
            {t("← Girişe Dön")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <IconBadge>
        <Lock aria-hidden />
      </IconBadge>
      <AuthHeading center eyebrow={t("HESAP KURTARMA")} title={t("Şifreni mi")} accent={t("unuttun?")} description={t("Endişelenme. Kayıtlı e-posta adresine güvenli bir şifre yenileme bağlantısı göndereceğiz.")} />
      <form onSubmit={handleSubmit((v) => send(v.email))} noValidate className="mt-7 space-y-5">
        {formError && (
          <FormAlert>
            <p>{formError}</p>
          </FormAlert>
        )}
        <AuthField label={t("E-posta adresi")} htmlFor="fp-email" error={fe(errors.email?.message)}>
          <Input id="fp-email" type="email" autoComplete="email" inputMode="email" placeholder={t("ornek@eposta.com")} className="h-[52px] text-[14px]" aria-invalid={!!errors.email} aria-describedby={errors.email ? "fp-email-error" : undefined} {...register("email")} />
        </AuthField>
        <PrimaryButton type="submit" loading={isSubmitting}>
          {t("Yenileme Bağlantısı Gönder")}
        </PrimaryButton>
        <p className="text-center">
          <Link href="/login" className={`${linkCls} text-[13px]`}>
            {t("← Girişe Dön")}
          </Link>
        </p>
        <div className="flex items-start gap-3 rounded-xl bg-soft px-4 py-3.5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
          <div>
            <p className="text-xs font-extrabold text-ink">{t("Güvenli ve gizli.")}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-strong">{t("Hesap bilgilerin kurtarma işlemi boyunca korunur. Hesabın olup olmadığını açıklamayız.")}</p>
          </div>
        </div>
      </form>
    </div>
  );
}
