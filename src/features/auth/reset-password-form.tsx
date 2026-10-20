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
import { authErrorText, NETWORK_ERROR } from "@/features/auth/client-errors";
import { resetSchema, type ResetValues } from "@/features/auth/schemas";

/** Geçersiz / süresi dolmuş / eksik bağlantı durumu. */
export function ResetLinkInvalid({ message }: { message: string }) {
  return (
    <div className="text-center">
      <IconBadge className="bg-danger-soft text-danger">
        <LinkIcon aria-hidden />
      </IconBadge>
      <AuthHeading center eyebrow="BAĞLANTI SORUNU" title="Bağlantı" accent="geçersiz." />
      <FormAlert className="mt-6 text-start">
        <p>{message}</p>
      </FormAlert>
      <div className="mt-6 space-y-3">
        <PrimaryLink href="/forgot-password">Yeni bağlantı iste</PrimaryLink>
        <Link href="/login" className={`${linkCls} block text-[13px]`}>
          ← Girişe Dön
        </Link>
      </div>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const password = watch("password");

  async function onSubmit(values: ResetValues) {
    setFormError(null);
    try {
      const { error } = await authClient.resetPassword({ newPassword: values.password, token });
      if (error) {
        setFormError(authErrorText(error));
        return;
      }
      router.replace("/login?reset=1");
    } catch {
      setFormError(NETWORK_ERROR);
    }
  }

  return (
    <div>
      <IconBadge>
        <KeyRound aria-hidden />
      </IconBadge>
      <AuthHeading center eyebrow="YENİ ŞİFRE" title="Yeni şifreni" accent="belirle." description="Güçlü ve başka yerde kullanmadığın bir şifre seç. Şifre değişince diğer cihazlardaki oturumların kapanır." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-5">
        {formError && (
          <FormAlert>
            <p>{formError}</p>
            {/geçersiz|süresi/i.test(formError) && (
              <p className="mt-1.5 font-bold">
                <Link href="/forgot-password" className="underline underline-offset-2">
                  Yeni bağlantı iste
                </Link>
              </p>
            )}
          </FormAlert>
        )}
        <AuthField label="Yeni şifre" htmlFor="rp-password" error={errors.password?.message} hint="En az 8 karakter; en az bir harf ve bir rakam.">
          <PasswordInput id="rp-password" autoComplete="new-password" placeholder="Yeni şifren" aria-invalid={!!errors.password} aria-describedby={errors.password ? "rp-password-error" : "rp-password-hint"} {...register("password")} />
          <PasswordStrength value={password} />
        </AuthField>
        <AuthField label="Yeni şifre (tekrar)" htmlFor="rp-confirm" error={errors.confirm?.message}>
          <PasswordInput id="rp-confirm" autoComplete="new-password" placeholder="Şifreni tekrar yaz" aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "rp-confirm-error" : undefined} {...register("confirm")} />
        </AuthField>
        <PrimaryButton type="submit" loading={isSubmitting}>
          Şifreyi Güncelle
        </PrimaryButton>
      </form>
    </div>
  );
}
