"use client";
import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, ShieldCheck } from "lucide-react";
import { AuthField, AuthHeading, FormAlert, IconBadge, linkCls, PrimaryButton } from "@/components/auth/auth-ui";
import { Input } from "@/components/ui/form-controls";
import { authClient } from "@/lib/auth/client";
import { postLoginRedirect } from "@/features/auth/actions";
import { authErrorText, NETWORK_ERROR, useFieldError } from "@/features/auth/client-errors";
import { LOGIN_NEXT_KEY } from "@/features/auth/constants";
import { backupCodeSchema, totpSchema } from "@/features/auth/schemas";
import { useT } from "@/i18n/client";

type Mode = "totp" | "backup";

/** Giriş sırasında ikinci adım: kimlik doğrulama uygulamasından 6 haneli kod veya yedek kod. */
export function TwoFactorForm() {
  const t = useT();
  const fe = useFieldError();
  const [mode, setMode] = React.useState<Mode>("totp");
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<{ code: string }>({ resolver: zodResolver(mode === "totp" ? totpSchema : backupCodeSchema), defaultValues: { code: "" } });

  React.useEffect(() => {
    setFocus("code");
  }, [mode, setFocus]);

  async function onSubmit({ code }: { code: string }) {
    setFormError(null);
    try {
      const { error } = mode === "totp" ? await authClient.twoFactor.verifyTotp({ code }) : await authClient.twoFactor.verifyBackupCode({ code });
      if (error) {
        setFormError(t(authErrorText(error)));
        return;
      }
      let next: string | null = null;
      try {
        next = sessionStorage.getItem(LOGIN_NEXT_KEY);
        sessionStorage.removeItem(LOGIN_NEXT_KEY);
      } catch {
        /* depolama kapalı olabilir */
      }
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

  const switchMode = () => {
    setMode((m) => (m === "totp" ? "backup" : "totp"));
    setFormError(null);
    reset({ code: "" });
  };

  const field = register("code");
  return (
    <div>
      <IconBadge>
        <ShieldCheck aria-hidden />
      </IconBadge>
      <AuthHeading
        center
        eyebrow={t("İKİ ADIMLI DOĞRULAMA")}
        title={t("Kodunu")}
        accent={t("gir.")}
        description={mode === "totp" ? t("Kimlik doğrulama uygulamandaki 6 haneli kodu yaz.") : t("Hesabını kurarken kaydettiğin yedek kodlardan birini yaz. Her kod yalnız bir kez kullanılabilir.")}
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        {formError && (
          <FormAlert>
            <p>{formError}</p>
          </FormAlert>
        )}
        <AuthField label={mode === "totp" ? t("Doğrulama kodu") : t("Yedek kod")} htmlFor="tf-code" error={fe(errors.code?.message)}>
          <Input
            id="tf-code"
            {...field}
            inputMode={mode === "totp" ? "numeric" : "text"}
            autoComplete="one-time-code"
            maxLength={mode === "totp" ? 6 : 32}
            placeholder={mode === "totp" ? "123456" : "xxxxx-xxxxx"} // i18n-ignore (kod biçimi örneği)
            className={`h-[52px] ${mode === "totp" ? "text-center text-xl font-extrabold tracking-[0.5em]" : "text-[14px]"}`}
            aria-invalid={!!errors.code}
            aria-describedby={errors.code ? "tf-code-error" : undefined}
          />
        </AuthField>
        <PrimaryButton type="submit" loading={isSubmitting}>
          {t("Doğrula")}
        </PrimaryButton>
        <div className="flex flex-col items-center gap-2 text-[13px]">
          <button type="button" onClick={switchMode} className={`${linkCls} inline-flex items-center gap-1.5`}>
            <KeyRound className="size-3.5" aria-hidden />
            {mode === "totp" ? t("Yedek kod kullan") : t("Doğrulama uygulamasını kullan")}
          </button>
          <Link href="/login" className="text-muted-strong hover:text-ink">
            {t("← Girişe dön")}
          </Link>
        </div>
      </form>
    </div>
  );
}
