"use client";
import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import Link from "next/link";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { useT } from "@/i18n/client";
import { submitContactAction, type FormState } from "./actions";
import { fieldError, FormError, Honeypot, SubmitButton, SuccessPanel } from "./form-bits";

type Props = { categories: { value: string; label: string }[]; defaults: { name: string; email: string }; defaultCategory?: string; defaultSubject?: string };

export function ContactForm(props: Props) {
  const [version, setVersion] = useState(0);
  return <ContactFormInner key={version} {...props} onReset={() => setVersion((v) => v + 1)} />;
}

function ContactFormInner({ categories, defaults, defaultCategory, defaultSubject, onReset }: Props & { onReset: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(submitContactAction, null);

  if (state?.ok) {
    return (
      <SuccessPanel title={t("Talebin bize ulaştı")} reference={state.data.reference} referenceLabel={t("Talep numaran")} onReset={onReset} resetLabel={t("Yeni bir mesaj gönder")}>
        {t("Bu numarayı not et; talebinle ilgili yazışmalarda kullanabilirsin. Yanıtımızı forma yazdığın e-posta adresine ileteceğiz.")}
      </SuccessPanel>
    );
  }

  return (
    <form action={action} className="relative grid gap-4" noValidate>
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Ad soyad")} htmlFor="contact-name" required error={fieldError(state, "name")}>
          <Input id="contact-name" name="name" required minLength={2} maxLength={120} autoComplete="name" defaultValue={defaults.name} placeholder={t("Adını ve soyadını yaz")} aria-invalid={Boolean(fieldError(state, "name"))} aria-describedby={fieldError(state, "name") ? "contact-name-error" : undefined} />
        </Field>
        <Field label={t("E-posta")} htmlFor="contact-email" required error={fieldError(state, "email")}>
          <Input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={defaults.email} placeholder={t("E-posta adresin")} aria-invalid={Boolean(fieldError(state, "email"))} aria-describedby={fieldError(state, "email") ? "contact-email-error" : undefined} />
        </Field>
      </div>
      <Field label={t("Konu seç")} htmlFor="contact-category" required error={fieldError(state, "category")}>
        <NativeSelect id="contact-category" name="category" required defaultValue={defaultCategory ?? ""} aria-invalid={Boolean(fieldError(state, "category"))}>
          <option value="" disabled>
            {t("Hesap ve üyelik / İçerik / Güvenlik / Diğer")}
          </option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("Başlık")} htmlFor="contact-subject" required error={fieldError(state, "subject")}>
        <Input id="contact-subject" name="subject" required minLength={3} maxLength={200} defaultValue={defaultSubject} placeholder={t("Talebini kısaca özetle")} aria-invalid={Boolean(fieldError(state, "subject"))} aria-describedby={fieldError(state, "subject") ? "contact-subject-error" : undefined} />
      </Field>
      <Field label={t("Mesajın")} htmlFor="contact-message" required error={fieldError(state, "message")} hint={t("Ödeme sorunlarında işlem numarasını, hesap sorunlarında kullanıcı adını eklemen süreci hızlandırır. Şifre veya kart bilgisi yazma.")}>
        <Textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={6} placeholder={t("Sorununu veya talebini ayrıntılarıyla açıklayabilirsin…")} aria-invalid={Boolean(fieldError(state, "message"))} aria-describedby={fieldError(state, "message") ? "contact-message-error" : "contact-message-hint"} />
      </Field>
      <FormError state={state} />
      <div className="flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-[11px] text-muted">
          {t.rich("Göndermeden önce <link>gizlilik bilgilendirmesini</link> incele.", {
            link: (c) => (
              <Link href="/privacy" className="font-bold text-brand-600 underline underline-offset-2">
                {c}
              </Link>
            ),
          })}
        </p>
        <SubmitButton pending={pending}>
          {t("Mesajımı Gönder")} <Send className="rtl:-scale-x-100" aria-hidden />
        </SubmitButton>
      </div>
    </form>
  );
}
