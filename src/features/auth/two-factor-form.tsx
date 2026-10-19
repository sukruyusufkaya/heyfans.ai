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
import { authErrorText, NETWORK_ERROR } from "@/features/auth/client-errors";
import { LOGIN_NEXT_KEY } from "@/features/auth/constants";
import { backupCodeSchema, totpSchema } from "@/features/auth/schemas";

type Mode = "totp" | "backup";

/** Giriş sırasında ikinci adım: kimlik doğrulama uygulamasından 6 haneli kod veya yedek kod. */
export function TwoFactorForm() {
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
        setFormError(authErrorText(error));
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
      setFormError(NETWORK_ERROR);
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
        eyebrow="İKİ ADIMLI DOĞRULAMA"
        title="Kodunu"
        accent="gir."
        description={mode === "totp" ? "Kimlik doğrulama uygulamandaki 6 haneli kodu yaz." : "Hesabını kurarken kaydettiğin yedek kodlardan birini yaz. Her kod yalnız bir kez kullanılabilir."}
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        {formError && (
          <FormAlert>
            <p>{formError}</p>
          </FormAlert>
        )}
        <AuthField label={mode === "totp" ? "Doğrulama kodu" : "Yedek kod"} htmlFor="tf-code" error={errors.code?.message}>
          <Input
            id="tf-code"
            {...field}
            inputMode={mode === "totp" ? "numeric" : "text"}
            autoComplete="one-time-code"
            maxLength={mode === "totp" ? 6 : 32}
            placeholder={mode === "totp" ? "123456" : "xxxxx-xxxxx"}
            className={`h-[52px] ${mode === "totp" ? "text-center text-xl font-extrabold tracking-[0.5em]" : "text-[14px]"}`}
            aria-invalid={!!errors.code}
            aria-describedby={errors.code ? "tf-code-error" : undefined}
          />
        </AuthField>
        <PrimaryButton type="submit" loading={isSubmitting}>
          Doğrula
        </PrimaryButton>
        <div className="flex flex-col items-center gap-2 text-[13px]">
          <button type="button" onClick={switchMode} className={`${linkCls} inline-flex items-center gap-1.5`}>
            <KeyRound className="size-3.5" aria-hidden />
            {mode === "totp" ? "Yedek kod kullan" : "Doğrulama uygulamasını kullan"}
          </button>
          <Link href="/login" className="text-muted-strong hover:text-ink">
            ← Girişe dön
          </Link>
        </div>
      </form>
    </div>
  );
}
