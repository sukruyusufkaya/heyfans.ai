"use client";
import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { useT } from "@/i18n/client";
import { submitCopyrightAction, type FormState } from "./actions";
import { fieldError, FormError, Honeypot, SubmitButton, SuccessPanel } from "./form-bits";

type Props = { claimTypes: { value: string; label: string }[]; defaults: { name: string; email: string } };

export function CopyrightForm(props: Props) {
  const [version, setVersion] = useState(0);
  return <Inner key={version} {...props} onReset={() => setVersion((v) => v + 1)} />;
}

function Inner({ claimTypes, defaults, onReset }: Props & { onReset: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(submitCopyrightAction, null);

  if (state?.ok) {
    return (
      <SuccessPanel title={t("Başvurun alındı")} reference={state.data.reference} referenceLabel={t("Başvuru numaran")} onReset={onReset} resetLabel={t("Yeni bir başvuru yap")}>
        {t("Başvurun yüksek öncelikle hukuki inceleme kuyruğuna alındı.")}{" "}
        {state.data.reportNo ? t("Bildirdiğin içerik ayrıca moderasyon kuyruğuna da eklendi ({reportNo}).", { reportNo: state.data.reportNo }) : t("Bağlantı sitemizdeki bir kayıtla eşleşmediği için moderasyon raporu açılmadı; ekibimiz bağlantıyı elle inceleyecek.")}{" "}
        {t("Yazışmalarda başvuru numaranı belirt.")}
      </SuccessPanel>
    );
  }

  return (
    <form action={action} className="relative grid gap-4" noValidate>
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Ad soyad")} htmlFor="cr-name" required error={fieldError(state, "name")}>
          <Input id="cr-name" name="name" required maxLength={120} autoComplete="name" defaultValue={defaults.name} placeholder={t("Başvuru sahibinin adı")} />
        </Field>
        <Field label={t("E-posta adresi")} htmlFor="cr-email" required error={fieldError(state, "email")}>
          <Input id="cr-email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={defaults.email} placeholder={t("iletisim@ornek.com")} />
        </Field>
      </div>
      <Field label={t("Hak sahibi")} htmlFor="cr-holder" required error={fieldError(state, "rightsHolder")} hint={t("Hakkı sahip olduğun kişi veya kurum (temsilciysen adına başvurduğun taraf).")}>
        <Input id="cr-holder" name="rightsHolder" required maxLength={160} placeholder={t("Hak sahibinin adı / unvanı")} aria-describedby="cr-holder-hint" />
      </Field>
      <Field label={t("İhlal türü")} htmlFor="cr-type" required error={fieldError(state, "claimType")}>
        <NativeSelect id="cr-type" name="claimType" required defaultValue="">
          <option value="" disabled>
            {t("Telif / izinsiz görsel / ses benzerliği / kimliğe bürünme")}
          </option>
          {claimTypes.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("İhlal edilen içerik bağlantısı")} htmlFor="cr-url" required error={fieldError(state, "url")} hint={t("Profil (/creators/…) ya da içerik (/content/…) bağlantısı kayıtla otomatik eşleştirilir.")}>
        <Input id="cr-url" name="url" type="text" inputMode="url" required maxLength={500} placeholder={t("https://heyfans.ai/creators/… / ilgili bağlantı")} aria-describedby="cr-url-hint" />
      </Field>
      <Field label={t("Açıklama ve dayanak")} htmlFor="cr-desc" required error={fieldError(state, "description")}>
        <Textarea id="cr-desc" name="description" required minLength={20} maxLength={4000} rows={5} placeholder={t("İhlal iddianı ve hak sahipliğini açıklayabilirsin…")} />
      </Field>
      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-soft px-4 py-3 text-xs leading-relaxed text-ink-soft">
          <input type="checkbox" name="declaration" className="mt-0.5 size-4 shrink-0 accent-[#ec0088]" aria-describedby={fieldError(state, "declaration") ? "cr-decl-error" : undefined} />
          <span>{t("Yukarıdaki bilgilerin doğru olduğunu, hak sahibi veya yetkili temsilcisi olduğumu beyan ederim. Gerçeğe aykırı başvuruların hesabımın kısıtlanmasına yol açabileceğini biliyorum.")}</span>
        </label>
        {fieldError(state, "declaration") && (
          <p id="cr-decl-error" role="alert" className="mt-1.5 text-[11px] font-semibold text-danger">
            {fieldError(state, "declaration")}
          </p>
        )}
      </div>
      <FormError state={state} />
      <SubmitButton pending={pending} className="justify-self-start">
        {t("Başvuru Oluştur")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
      </SubmitButton>
    </form>
  );
}
