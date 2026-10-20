"use client";
import * as React from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { AuthField, AuthHeading, FormAlert, IconBadge, linkCls, PrimaryButton } from "@/components/auth/auth-ui";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input } from "@/components/ui/form-controls";
import { authClient } from "@/lib/auth/client";
import { postLoginRedirect, submitBirthDateAction } from "@/features/auth/actions";
import { NETWORK_ERROR, useFieldError } from "@/features/auth/client-errors";
import { birthDateSchema, type BirthDateValues } from "@/features/auth/schemas";
import { useFormatters, useT } from "@/i18n/client";

export interface AgeFormProps {
  state: "none" | "declared_adult" | "under_18";
  recordedAt: string | null;
  next: string | null;
  todayIso: string;
}

export function AgeVerification({ state, recordedAt, next, todayIso }: AgeFormProps) {
  const t = useT();
  const fe = useFieldError();
  const { formatDate } = useFormatters();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [blocked, setBlocked] = React.useState(state === "under_18");
  const [busy, setBusy] = React.useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BirthDateValues>({ resolver: zodResolver(birthDateSchema), defaultValues: { birthDate: "", declared: false } });

  async function onSubmit(values: BirthDateValues) {
    setFormError(null);
    try {
      const r = await submitBirthDateAction(values);
      if (!r.ok) {
        setFormError(r.error);
        return;
      }
      if (!r.data.over18) {
        await authClient.signOut().catch(() => undefined);
        setBlocked(true);
        return;
      }
      const to = await postLoginRedirect(next);
      window.location.assign(to.ok ? to.data.to : "/app");
    } catch {
      setFormError(t(NETWORK_ERROR));
    }
  }

  async function goOn() {
    setBusy(true);
    setFormError(null);
    try {
      const r = await postLoginRedirect(next);
      if (!r.ok) {
        setFormError(r.error);
        setBusy(false);
        return;
      }
      window.location.assign(r.data.to);
    } catch {
      setFormError(t(NETWORK_ERROR));
      setBusy(false);
    }
  }

  if (blocked) {
    return (
      <div className="text-center">
        <IconBadge className="bg-danger-soft text-danger">
          <ShieldAlert aria-hidden />
        </IconBadge>
        <AuthHeading center eyebrow={t("YAŞ SINIRI")} title={t("Üzgünüz,")} accent={t("henüz olmaz.")} />
        <FormAlert className="mt-6 text-start">
          <p>{t("HEYFANS yalnızca 18 yaşını doldurmuş kişiler içindir. Bu nedenle hesabın askıya alındı ve oturumun kapatıldı.")}</p>
        </FormAlert>
        <p className="mt-4 text-xs leading-relaxed text-muted-strong">{t("Doğum tarihi bilgin saklanmadı. Hesabınla ilgili bir yanlışlık olduğunu düşünüyorsan destek ekibimizle iletişime geçebilirsin.")}</p>
        <div className="mt-6 space-y-3">
          <Link href="/help" className={`${linkCls} block text-[13px]`}>
            {t("Yardım Merkezi")}
          </Link>
          <Link href="/" className="block text-[13px] font-semibold text-muted hover:text-ink-soft">
            {t("Ana sayfaya dön")}
          </Link>
        </div>
      </div>
    );
  }

  if (state === "declared_adult") {
    return (
      <div className="text-center">
        <IconBadge className="bg-success-soft text-success">
          <CheckCircle2 aria-hidden />
        </IconBadge>
        <AuthHeading center eyebrow={t("YAŞ BEYANI")} title={t("18+ beyanın")} accent={t("kayıtlı.")} />
        <p className="mt-4 text-[15px] text-muted-strong">
          {recordedAt ? t("Doğum tarihine göre 18 yaşını doldurduğunu beyan ettin ({date}).", { date: formatDate(recordedAt) }) : t("Doğum tarihine göre 18 yaşını doldurduğunu beyan ettin.")}
        </p>
        <div className="mt-4 flex justify-center">
          <Badge tone="warn" size="lg">
            {t("Beyan · düşük güvence")}
          </Badge>
        </div>
        <div className="mt-5">
        </div>
        {formError && (
          <FormAlert className="mt-4 text-start">
            <p>{formError}</p>
          </FormAlert>
        )}
        <div className="mt-6">
          <PrimaryButton type="button" onClick={goOn} loading={busy}>
            {t("Devam Et")}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <IconBadge>
        <CalendarDays aria-hidden />
      </IconBadge>
      <AuthHeading center eyebrow={t("18+ GEREKLİ")} title={t("Yaşını")} accent={t("doğrula.")} description={t("HEYFANS yalnızca 18 yaşını doldurmuş kişiler içindir. Devam etmek için doğum tarihini beyan et.")} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-5">
        {formError && (
          <FormAlert>
            <p>{formError}</p>
          </FormAlert>
        )}
        <AuthField label={t("Doğum tarihi")} htmlFor="age-birth" error={fe(errors.birthDate?.message)} hint={t("Yalnızca yaşını hesaplamak için kullanılır.")}>
          <Input id="age-birth" type="date" max={todayIso} min="1900-01-01" autoComplete="bday" className="h-[52px] text-[14px]" aria-invalid={!!errors.birthDate} aria-describedby={errors.birthDate ? "age-birth-error" : "age-birth-hint"} {...register("birthDate")} />
        </AuthField>
        <div>
          <div className="flex items-start gap-2.5">
            <Controller control={control} name="declared" render={({ field }) => <Checkbox id="age-declared" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={!!errors.declared} aria-describedby={errors.declared ? "age-declared-error" : undefined} className="mt-px" />} />
            <label htmlFor="age-declared" className="cursor-pointer text-xs leading-relaxed text-ink-soft">
              {t("Girdiğim doğum tarihinin doğru olduğunu beyan ederim.")}
            </label>
          </div>
          {errors.declared && (
            <p id="age-declared-error" role="alert" className="mt-1.5 text-xs font-semibold text-danger">
              {fe(errors.declared.message)}
            </p>
          )}
        </div>
        <PrimaryButton type="submit" loading={isSubmitting}>
          {t("Beyanı Kaydet")}
        </PrimaryButton>
        <p className="flex items-start gap-2 text-[11px] leading-snug text-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("18 yaşından küçükseniz hesabınız askıya alınır ve doğum tarihiniz saklanmaz.")}
        </p>
      </form>
    </div>
  );
}
