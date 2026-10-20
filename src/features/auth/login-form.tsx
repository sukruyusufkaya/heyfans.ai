"use client";
import * as React from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { AuthField, AuthHeading, FormAlert, linkCls, PrimaryButton, TextDivider } from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-field";
import { hasSocialProviders, SocialAuth, type SocialFlags } from "@/components/auth/social-auth";
import { Checkbox, Input } from "@/components/ui/form-controls";
import { authClient } from "@/lib/auth/client";
import { postLoginRedirect } from "@/features/auth/actions";
import { authErrorText, NETWORK_ERROR, useFieldError } from "@/features/auth/client-errors";
import { continueUrl } from "@/features/auth/next-url";
import { LOGIN_NEXT_KEY } from "@/features/auth/constants";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { useT } from "@/i18n/client";

export function LoginForm({
  next,
  flags,
  notice,
  initialError,
}: {
  next: string | null;
  flags: SocialFlags;
  notice?: "reset" | null;
  initialError?: string | null;
}) {
  const t = useT();
  const fe = useFieldError();
  const [formError, setFormError] = React.useState<string | null>(initialError ?? null);
  const [unverified, setUnverified] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", rememberMe: true }, mode: "onSubmit" });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    setUnverified(null);
    try {
      // 2FA gerekirse istemci eklentisi /login/two-factor'a yönlendirir; `next` oturum deposunda taşınır.
      try {
        if (next) sessionStorage.setItem(LOGIN_NEXT_KEY, next);
        else sessionStorage.removeItem(LOGIN_NEXT_KEY);
      } catch {
        /* depolama kapalı olabilir */
      }
      // `callbackURL` ÖZELLİKLE verilmez: Better Auth istemcisi başarılı yanıtta o adrese kendisi yönlendirir ve
      // sunucudaki karar (`postLoginRedirect`) ile yarışırdı.
      const { data, error } = await authClient.signIn.email({ email: values.email, password: values.password, rememberMe: values.rememberMe });
      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") setUnverified(values.email);
        setFormError(t(authErrorText(error)));
        return;
      }
      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return; // yönlendirme istemci eklentisinde
      const result = await postLoginRedirect(next);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      window.location.assign(result.data.to);
    } catch {
      setFormError(t(NETWORK_ERROR));
    }
  }

  const errId = formError ? "login-form-error" : undefined;

  return (
    <div>
      <AuthHeading eyebrow={t("HEYFANS'A YENİDEN HOŞ GELDİN")} title={t("Yeniden")} accent={t("bağlan.")} description={t("Sevdiğin içerik üreticilerine yalnızca bir sohbet uzaklıktasın.")} />

      <div className="mt-8 space-y-5">
        {notice === "reset" && <FormAlert tone="success">{t("Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.")}</FormAlert>}
        {hasSocialProviders(flags) && (
          <>
            <SocialAuth flags={flags} callbackURL={continueUrl(next)} onError={setFormError} />
            <TextDivider>{t("veya e-posta ile devam et")}</TextDivider>
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5" aria-describedby={errId}>
          {formError && (
            <FormAlert id="login-form-error">
              <p>{formError}</p>
              {unverified && (
                <p className="mt-1.5 font-bold">
                  <Link href={`/verify?email=${encodeURIComponent(unverified)}`} className="underline underline-offset-2">
                    {t("Doğrulama bağlantısını yeniden gönder")}
                  </Link>
                </p>
              )}
            </FormAlert>
          )}

          <AuthField label={t("E-posta adresi")} htmlFor="login-email" error={fe(errors.email?.message)}>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t("ornek@eposta.com")}
              className="h-[52px] text-[14px]"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
          </AuthField>

          <AuthField label={t("Şifre")} htmlFor="login-password" error={fe(errors.password?.message)}>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder={t("Şifreni gir")}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
          </AuthField>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="login-remember" className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-ink-soft">
              <Controller control={control} name="rememberMe" render={({ field }) => <Checkbox id="login-remember" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />} />
              {t("Beni hatırla")}
            </label>
            <Link href="/forgot-password" className={`${linkCls} text-xs`}>
              {t("Şifreni mi unuttun?")}
            </Link>
          </div>

          <PrimaryButton type="submit" loading={isSubmitting}>
            {t("Giriş Yap")}
          </PrimaryButton>
        </form>

        <p className="text-center text-[13px] text-muted-strong">
          {t("HEYFANS'ta yeni misin?")}{" "}
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className={linkCls}>
            {t("Hemen katıl")}
          </Link>
        </p>
        <div className="border-t border-line pt-5">
          <p className="flex items-center justify-center gap-2 text-[11px] text-muted">
            <ShieldCheck className="size-4" aria-hidden /> {t("Gizliliğin ve güvenliğin bizim için öncelikli.")}
          </p>
        </div>
      </div>
    </div>
  );
}
