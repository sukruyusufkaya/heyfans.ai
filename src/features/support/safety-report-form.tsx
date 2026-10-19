"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { submitSafetyReportAction, type FormState } from "./actions";
import { fieldError, FormError, Honeypot, SubmitButton, SuccessPanel } from "./form-bits";

type Props = { reasons: { value: string; label: string }[]; authed: boolean };

export function SafetyReportForm(props: Props) {
  const [version, setVersion] = useState(0);
  return <Inner key={version} {...props} onReset={() => setVersion((v) => v + 1)} />;
}

function Inner({ reasons, authed, onReset }: Props & { onReset: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitSafetyReportAction, null);

  if (state?.ok) {
    const isReport = state.data.kind === "report";
    return (
      <SuccessPanel title="Bildirimin alındı" reference={state.data.reference} referenceLabel={isReport ? "Bildirim numaran" : "Talep numaran"} onReset={onReset} resetLabel="Yeni bir bildirim oluştur">
        {isReport
          ? "Bildirimin moderasyon kuyruğuna alındı ve ilgili politika kontrolüne yönlendirilecek. Karar çıktığında hesabına bildirim gönderilir."
          : "Bildirimin güvenlik ekibinin destek kuyruğuna alındı. Yanıtı forma yazdığın e-posta adresine ileteceğiz."}
      </SuccessPanel>
    );
  }

  return (
    <form action={action} className="relative grid gap-4" noValidate>
      <Honeypot />
      <Field label="Bildirim türü" htmlFor="safety-reason" required error={fieldError(state, "reason")}>
        <NativeSelect id="safety-reason" name="reason" required defaultValue="" aria-invalid={Boolean(fieldError(state, "reason"))}>
          <option value="" disabled>
            Ne tür bir sorunla karşılaştın?
          </option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        label="İlgili profil veya içerik bağlantısı"
        htmlFor="safety-url"
        error={fieldError(state, "targetUrl")}
        hint={authed ? "heyfans.ai/creators/… ya da /content/… bağlantısı yapıştırırsan bildirimin doğrudan o kayda bağlanır." : "Varsa profil veya içerik bağlantısını yapıştır; yoksa açıklamada belirt."}
      >
        <Input id="safety-url" name="targetUrl" type="text" inputMode="url" maxLength={500} placeholder="https://… veya /creators/kullanici-adi" aria-describedby="safety-url-hint" />
      </Field>
      <Field label="Ne oldu?" htmlFor="safety-details" required error={fieldError(state, "details")}>
        <Textarea id="safety-details" name="details" required minLength={10} maxLength={3000} rows={5} placeholder="Olayı, ilgili kişiyi ve varsa tarih/saat bilgisini ayrıntılarıyla anlat…" aria-invalid={Boolean(fieldError(state, "details"))} />
      </Field>
      {!authed && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad soyad (isteğe bağlı)" htmlFor="safety-name" error={fieldError(state, "name")}>
            <Input id="safety-name" name="name" maxLength={120} autoComplete="name" placeholder="Adın" />
          </Field>
          <Field label="E-posta" htmlFor="safety-email" required error={fieldError(state, "email")} hint="Sonucu bu adrese ileteceğiz.">
            <Input id="safety-email" name="email" type="email" required maxLength={200} autoComplete="email" placeholder="E-posta adresin" aria-describedby="safety-email-hint" />
          </Field>
        </div>
      )}
      {authed && <p className="text-[11px] text-muted">Bildirimin hesabınla ilişkilendirilir; bildirdiğin kişiye kimliğin gösterilmez.</p>}
      <FormError state={state} />
      <div className="flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-[11px] text-muted">
          Acil bir tehlike varsa önce <b>112 Acil Çağrı Merkezi</b>&apos;ni ara. Bildirim süreci için{" "}
          <Link href="/community-guidelines" className="font-bold text-brand-600 underline underline-offset-2">
            Topluluk Kuralları
          </Link>
          &apos;na bak.
        </p>
        <SubmitButton pending={pending}>
          Güvenlik Bildirimi Gönder <ArrowRight aria-hidden />
        </SubmitButton>
      </div>
    </form>
  );
}
