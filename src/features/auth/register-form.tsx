"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Crown, Heart } from "lucide-react";
import { AuthField, AuthHeading, FormAlert, linkCls, PrimaryButton } from "@/components/auth/auth-ui";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-field";
import { hasSocialProviders, SocialAuth, type SocialFlags } from "@/components/auth/social-auth";
import { Checkbox, Input } from "@/components/ui/form-controls";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { authErrorText, NETWORK_ERROR } from "@/features/auth/client-errors";
import { continueUrl } from "@/features/auth/next-url";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";

const INTENTS = [
  { value: "fan", title: "Hayranım", text: "Üreticileri keşfet, AI ikizleriyle sohbet et", Icon: Heart },
  { value: "creator", title: "İçerik Üreticisiyim", text: "Kendi AI ikizini oluştur, topluluğunu büyüt", Icon: Crown },
] as const;

export function RegisterForm({ flags, defaultIntent, next }: { flags: SocialFlags; defaultIntent: "fan" | "creator"; next: string | null }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { intent: defaultIntent, name: "", email: "", password: "", terms: false },
  });
  const password = watch("password");
  const intent = watch("intent");

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    try {
      const callbackURL = `/verify?verified=1${next ? `&next=${encodeURIComponent(next)}` : ""}`;
      const { error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        signupIntent: values.intent,
        acceptTerms: values.terms === true,
        callbackURL,
      });
      if (error) {
        setFormError(authErrorText(error));
        return;
      }
      // Hesabın var olup olmadığı burada ayrıca belirtilmez; doğrulama sayfası her durumda aynı görünür.
      router.push(`/verify?email=${encodeURIComponent(values.email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
    } catch {
      setFormError(NETWORK_ERROR);
    }
  }

  return (
    <div>
      <AuthHeading eyebrow="YOLCULUĞUN BURADA BAŞLIYOR" title="Hesabını" accent="oluştur." description="HEYFANS'ı nasıl kullanmak istediğini seç." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-5">
        {formError && (
          <FormAlert>
            <p>{formError}</p>
            {formError.includes("zaten bir hesap") && (
              <p className="mt-1.5 font-bold">
                <Link href="/login" className="underline underline-offset-2">
                  Giriş yap
                </Link>{" "}
                veya{" "}
                <Link href="/forgot-password" className="underline underline-offset-2">
                  şifreni sıfırla
                </Link>
              </p>
            )}
          </FormAlert>
        )}

        <fieldset>
          <legend className="sr-only">Hesap türü</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {INTENTS.map(({ value, title, text, Icon }) => {
              const active = intent === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-3 rounded-2xl border bg-white p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500",
                    active ? "border-2 border-brand-500 bg-brand-50 p-[15px]" : "border-line hover:border-brand-200",
                  )}
                >
                  <input type="radio" value={value} className="sr-only" {...register("intent")} />
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-500">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[15px] font-extrabold text-ink">{title}</span>
                    <span className="mt-1 block text-xs leading-snug text-muted-strong">{text}</span>
                  </span>
                  {active && (
                    <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-brand-500 text-white" aria-hidden>
                      <Check className="size-3" strokeWidth={3.5} />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField label="Ad soyad" htmlFor="reg-name" error={errors.name?.message}>
            <Input id="reg-name" autoComplete="name" placeholder="Adın ve soyadın" className="h-[52px] text-[14px]" aria-invalid={!!errors.name} aria-describedby={errors.name ? "reg-name-error" : undefined} {...register("name")} />
          </AuthField>
          <AuthField label="E-posta adresi" htmlFor="reg-email" error={errors.email?.message}>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="ornek@eposta.com"
              className="h-[52px] text-[14px]"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "reg-email-error" : undefined}
              {...register("email")}
            />
          </AuthField>
        </div>

        <AuthField label="Şifre" htmlFor="reg-password" error={errors.password?.message} hint="En az 8 karakter; en az bir harf ve bir rakam.">
          <PasswordInput
            id="reg-password"
            autoComplete="new-password"
            placeholder="Güçlü bir şifre belirle"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "reg-password-error" : "reg-password-hint"}
            {...register("password")}
          />
          <PasswordStrength value={password} />
        </AuthField>

        <div>
          <div className="flex items-start gap-2.5">
            <Controller
              control={control}
              name="terms"
              render={({ field }) => (
                <Checkbox id="reg-terms" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={!!errors.terms} aria-describedby={errors.terms ? "reg-terms-error" : undefined} className="mt-px" />
              )}
            />
            <label htmlFor="reg-terms" className="cursor-pointer text-xs leading-relaxed text-muted-strong">
              Kabul ediyorum:{" "}
              <Link href="/terms" target="_blank" rel="noopener" className={linkCls}>
                Kullanım Koşulları
              </Link>{" "}
              ve{" "}
              <Link href="/privacy" target="_blank" rel="noopener" className={linkCls}>
                Gizlilik Politikası
              </Link>
              .
            </label>
          </div>
          {errors.terms && (
            <p id="reg-terms-error" role="alert" className="mt-1.5 text-xs font-semibold text-danger">
              {errors.terms.message}
            </p>
          )}
        </div>

        <PrimaryButton type="submit" loading={isSubmitting}>
          Hesap Oluştur
        </PrimaryButton>

        {hasSocialProviders(flags) && (
          <div className="space-y-3">
            <p className="text-center text-xs text-muted">veya bu hesaplarla kaydol</p>
            <SocialAuth flags={flags} callbackURL={continueUrl(next)} variant="icons" onError={setFormError} />
          </div>
        )}

        <p className="text-center text-[13px] text-muted-strong">
          Zaten hesabın var mı?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className={linkCls}>
            Giriş Yap
          </Link>
        </p>
      </form>
    </div>
  );
}
