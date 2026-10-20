"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { useT } from "@/i18n/client";
import { submitSafetyReportAction, type FormState } from "./actions";
import { fieldError, FormError, Honeypot, SubmitButton, SuccessPanel } from "./form-bits";

type Props = { reasons: { value: string; label: string }[]; authed: boolean };

export function SafetyReportForm(props: Props) {
  const [version, setVersion] = useState(0);
  return <Inner key={version} {...props} onReset={() => setVersion((v) => v + 1)} />;
}

function Inner({ reasons, authed, onReset }: Props & { onReset: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(submitSafetyReportAction, null);

  if (state?.ok) {
    const isReport = state.data.kind === "report";
    return (
      <SuccessPanel title={t("Bildirimin alındı")} reference={state.data.reference} referenceLabel={isReport ? t("Bildirim numaran") : t("Talep numaran")} onReset={onReset} resetLabel={t("Yeni bir bildirim oluştur")}>
        {isReport
          ? t("Bildirimin moderasyon kuyruğuna alındı ve ilgili politika kontrolüne yönlendirilecek. Karar çıktığında hesabına bildirim gönderilir.")
          : t("Bildirimin güvenlik ekibinin destek kuyruğuna alındı. Yanıtı forma yazdığın e-posta adresine ileteceğiz.")}
      </SuccessPanel>
    );
  }

  return (
    <form action={action} className="relative grid gap-4" noValidate>
      <Honeypot />
      <Field label={t("Bildirim türü")} htmlFor="safety-reason" required error={fieldError(state, "reason")}>
        <NativeSelect id="safety-reason" name="reason" required defaultValue="" aria-invalid={Boolean(fieldError(state, "reason"))}>
          <option value="" disabled>
            {t("Ne tür bir sorunla karşılaştın?")}
          </option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        label={t("İlgili profil veya içerik bağlantısı")}
        htmlFor="safety-url"
        error={fieldError(state, "targetUrl")}
        hint={authed ? t("heyfans.ai/creators/… ya da /content/… bağlantısı yapıştırırsan bildirimin doğrudan o kayda bağlanır.") : t("Varsa profil veya içerik bağlantısını yapıştır; yoksa açıklamada belirt.")}
      >
        <Input id="safety-url" name="targetUrl" type="text" inputMode="url" maxLength={500} placeholder={t("https://… veya /creators/kullanici-adi")} aria-describedby="safety-url-hint" />
      </Field>
      <Field label={t("Ne oldu?")} htmlFor="safety-details" required error={fieldError(state, "details")}>
        <Textarea id="safety-details" name="details" required minLength={10} maxLength={3000} rows={5} placeholder={t("Olayı, ilgili kişiyi ve varsa tarih/saat bilgisini ayrıntılarıyla anlat…")} aria-invalid={Boolean(fieldError(state, "details"))} />
      </Field>
      {!authed && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Ad soyad (isteğe bağlı)")} htmlFor="safety-name" error={fieldError(state, "name")}>
            <Input id="safety-name" name="name" maxLength={120} autoComplete="name" placeholder={t("Adın")} />
          </Field>
          <Field label={t("E-posta")} htmlFor="safety-email" required error={fieldError(state, "email")} hint={t("Sonucu bu adrese ileteceğiz.")}>
            <Input id="safety-email" name="email" type="email" required maxLength={200} autoComplete="email" placeholder={t("E-posta adresin")} aria-describedby="safety-email-hint" />
          </Field>
        </div>
      )}
      {authed && <p className="text-[11px] text-muted">{t("Bildirimin hesabınla ilişkilendirilir; bildirdiğin kişiye kimliğin gösterilmez.")}</p>}
      <FormError state={state} />
      <div className="flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-[11px] text-muted">
          {t.rich("Acil bir tehlike varsa önce <b>112 Acil Çağrı Merkezi</b>'ni ara. Bildirim süreci için <link>Topluluk Kuralları</link>'na bak.", {
            b: (c) => <b>{c}</b>,
            link: (c) => (
              <Link href="/community-guidelines" className="font-bold text-brand-600 underline underline-offset-2">
                {c}
              </Link>
            ),
          })}
        </p>
        <SubmitButton pending={pending}>
          {t("Güvenlik Bildirimi Gönder")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
        </SubmitButton>
      </div>
    </form>
  );
}
