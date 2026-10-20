"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LinkIcon } from "lucide-react";
import { AuthField, AuthHeading, FormAlert, IconBadge, linkCls, PrimaryButton, PrimaryLink } from "@/components/auth/auth-ui";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-field";
import { authClient } from "@/lib/auth/client";
import { authErrorText, NETWORK_ERROR, useFieldError } from "@/features/auth/client-errors";
import { resetSchema, type ResetValues } from "@/features/auth/schemas";
import { useT } from "@/i18n/client";

/** Geçersiz / süresi dolmuş / eksik bağlantı durumu. */
export function ResetLinkInvalid({ message }: { message: string }) {
  const t = useT();
  return (
    <div className="text-center">
      <IconBadge className="bg-danger-soft text-danger">
        <LinkIcon aria-hidden />
      </IconBadge>
      <AuthHeading center eyebrow={t("BAĞLANTI SORUNU")} title={t("Bağlantı")} accent={t("geçersiz.")} />
      <FormAlert className="mt-6 text-start">
        <p>{message}</p>
      </FormAlert>
      <div className="mt-6 space-y-3">
        <PrimaryLink href="/forgot-password">{t("Yeni bağlantı iste")}</PrimaryLink>
        <Link href="/login" className={`${linkCls} block text-[13px]`}>
          {t("← Girişe Dön")}
        </Link>
      </div>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const fe = useFieldError();
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [linkProblem, setLinkProblem] = React.useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const password = watch("password");

  async function onSubmit(values: ResetValues) {
    setFormError(null);
    setLinkProblem(false);
    try {
      const { error } = await authClient.resetPassword({ newPassword: values.password, token });
      if (error) {
        setLinkProblem(error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED");
        setFormError(t(authErrorText(error)));
        return;
      }
      router.replace("/login?reset=1");
    } catch {
      setFormError(t(NETWORK_ERROR));
    }
  }

  return (
    <div>
      <IconBadge>
        <KeyRound aria-hidden />
      </IconBadge>
      <AuthHeading center eyebrow={t("YENİ ŞİFRE")} title={t("Yeni şifreni")} accent={t("belirle.")} description={t("Güçlü ve başka yerde kullanmadığın bir şifre seç. Şifre değişince diğer cihazlardaki oturumların kapanır.")} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-5">
        {formError && (
          <FormAlert>
            <p>{formError}</p>
            {linkProblem && (
              <p className="mt-1.5 font-bold">
                <Link href="/forgot-password" className="underline underline-offset-2">
                  {t("Yeni bağlantı iste")}
                </Link>
              </p>
            )}
          </FormAlert>
        )}
        <AuthField label={t("Yeni şifre")} htmlFor="rp-password" error={fe(errors.password?.message)} hint={t("En az 8 karakter; en az bir harf ve bir rakam.")}>
          <PasswordInput id="rp-password" autoComplete="new-password" placeholder={t("Yeni şifren")} aria-invalid={!!errors.password} aria-describedby={errors.password ? "rp-password-error" : "rp-password-hint"} {...register("password")} />
          <PasswordStrength value={password} />
        </AuthField>
        <AuthField label={t("Yeni şifre (tekrar)")} htmlFor="rp-confirm" error={fe(errors.confirm?.message)}>
          <PasswordInput id="rp-confirm" autoComplete="new-password" placeholder={t("Şifreni tekrar yaz")} aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "rp-confirm-error" : undefined} {...register("confirm")} />
        </AuthField>
        <PrimaryButton type="submit" loading={isSubmitting}>
          {t("Şifreyi Güncelle")}
        </PrimaryButton>
      </form>
    </div>
  );
}
