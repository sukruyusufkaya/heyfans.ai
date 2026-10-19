"use client";
import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { submitCopyrightAction, type FormState } from "./actions";
import { fieldError, FormError, Honeypot, SubmitButton, SuccessPanel } from "./form-bits";

type Props = { claimTypes: { value: string; label: string }[]; defaults: { name: string; email: string } };

export function CopyrightForm(props: Props) {
  const [version, setVersion] = useState(0);
  return <Inner key={version} {...props} onReset={() => setVersion((v) => v + 1)} />;
}

function Inner({ claimTypes, defaults, onReset }: Props & { onReset: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitCopyrightAction, null);

  if (state?.ok) {
    return (
      <SuccessPanel title="Başvurun alındı" reference={state.data.reference} referenceLabel="Başvuru numaran" onReset={onReset} resetLabel="Yeni bir başvuru yap">
        Başvurun yüksek öncelikle hukuki inceleme kuyruğuna alındı.
        {state.data.reportNo ? ` Bildirdiğin içerik ayrıca moderasyon kuyruğuna da eklendi (${state.data.reportNo}).` : " Bağlantı sitemizdeki bir kayıtla eşleşmediği için moderasyon raporu açılmadı; ekibimiz bağlantıyı elle inceleyecek."}{" "}
        Yazışmalarda başvuru numaranı belirt.
      </SuccessPanel>
    );
  }

  return (
    <form action={action} className="relative grid gap-4" noValidate>
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad soyad" htmlFor="cr-name" required error={fieldError(state, "name")}>
          <Input id="cr-name" name="name" required maxLength={120} autoComplete="name" defaultValue={defaults.name} placeholder="Başvuru sahibinin adı" />
        </Field>
        <Field label="E-posta adresi" htmlFor="cr-email" required error={fieldError(state, "email")}>
          <Input id="cr-email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={defaults.email} placeholder="iletisim@ornek.com" />
        </Field>
      </div>
      <Field label="Hak sahibi" htmlFor="cr-holder" required error={fieldError(state, "rightsHolder")} hint="Hakkı sahip olduğun kişi veya kurum (temsilciysen adına başvurduğun taraf).">
        <Input id="cr-holder" name="rightsHolder" required maxLength={160} placeholder="Hak sahibinin adı / unvanı" aria-describedby="cr-holder-hint" />
      </Field>
      <Field label="İhlal türü" htmlFor="cr-type" required error={fieldError(state, "claimType")}>
        <NativeSelect id="cr-type" name="claimType" required defaultValue="">
          <option value="" disabled>
            Telif / izinsiz görsel / ses benzerliği / kimliğe bürünme
          </option>
          {claimTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="İhlal edilen içerik bağlantısı" htmlFor="cr-url" required error={fieldError(state, "url")} hint="Profil (/creators/…) ya da içerik (/content/…) bağlantısı kayıtla otomatik eşleştirilir.">
        <Input id="cr-url" name="url" type="text" inputMode="url" required maxLength={500} placeholder="https://heyfans.ai/creators/… / ilgili bağlantı" aria-describedby="cr-url-hint" />
      </Field>
      <Field label="Açıklama ve dayanak" htmlFor="cr-desc" required error={fieldError(state, "description")}>
        <Textarea id="cr-desc" name="description" required minLength={20} maxLength={4000} rows={5} placeholder="İhlal iddianı ve hak sahipliğini açıklayabilirsin…" />
      </Field>
      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-soft px-4 py-3 text-xs leading-relaxed text-ink-soft">
          <input type="checkbox" name="declaration" className="mt-0.5 size-4 shrink-0 accent-[#ec0088]" aria-describedby={fieldError(state, "declaration") ? "cr-decl-error" : undefined} />
          <span>Yukarıdaki bilgilerin doğru olduğunu, hak sahibi veya yetkili temsilcisi olduğumu beyan ederim. Gerçeğe aykırı başvuruların hesabımın kısıtlanmasına yol açabileceğini biliyorum.</span>
        </label>
        {fieldError(state, "declaration") && (
          <p id="cr-decl-error" role="alert" className="mt-1.5 text-[11px] font-semibold text-danger">
            {fieldError(state, "declaration")}
          </p>
        )}
      </div>
      <FormError state={state} />
      <SubmitButton pending={pending} className="justify-self-start">
        Başvuru Oluştur <ArrowRight aria-hidden />
      </SubmitButton>
    </form>
  );
}
