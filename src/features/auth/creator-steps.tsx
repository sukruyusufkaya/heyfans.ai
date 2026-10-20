"use client";
import * as React from "react";
import { AlertCircle, BadgeCheck, Check, Clock, FileX2, Lock } from "lucide-react";
import { AuthField, FormAlert } from "@/components/auth/auth-ui";
import { TagInput } from "@/components/auth/tag-input";
import { AiTwinLabel, Badge } from "@/components/ui/badge";
import { Checkbox, Input, Switch, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { EMOJI_OPTIONS, MESSAGE_LENGTH_OPTIONS } from "@/features/auth/constants";
import { audienceLabel, CONTACT_PREFERENCES, normalizePhone, SOCIAL_PLATFORMS, socialMeta } from "@/lib/creator-contact";
import { useFormatters, useLocale, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import type { ConsentTexts, CreatorCategory, StepProps } from "@/features/auth/creator-types";

const inputCls = "h-[52px] text-[14px]";

export function StepHead({ eyebrow, title, accent, text, headingRef }: { eyebrow: string; title: string; accent: string; text: string; headingRef: React.Ref<HTMLHeadingElement> }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{eyebrow}</p>
      <h1 id="cr-step-title" ref={headingRef} tabIndex={-1} className="mt-1.5 font-display text-[30px] font-extrabold leading-[1.08] tracking-[-0.035em] [word-spacing:0.07em] text-ink outline-none sm:text-[36px]">
        {title}
        <br />
        <span className="text-brand-500">{accent}</span>
      </h1>
      <p className="mt-3 max-w-[560px] text-[13px] leading-relaxed text-muted-strong">{text}</p>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-extrabold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-strong">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/* ─── 4 · Doğrula ───────────────────────────────────────── */
const IDENTITY_STATUS: Record<string, { label: string; tone: "gray" | "warn" | "green" | "danger" }> = {
  none: { label: m("Henüz talep edilmedi"), tone: "gray" },
  pending: { label: m("İncelemede"), tone: "warn" },
  verified: { label: m("Doğrulandı"), tone: "green" },
  rejected: { label: m("Reddedildi"), tone: "danger" },
};

export function StepVerify({ view, draft, set, errors }: StepProps) {
  const t = useT();
  const st = IDENTITY_STATUS[view.verification.identity] ?? IDENTITY_STATUS.none!;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-soft/60 p-4">
        <BadgeCheck className="size-5 text-brand-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-ink">{t("Kimlik doğrulama durumu")}</p>
          <p className="text-xs text-muted-strong">{t("Kimlik doğrulama talebin ekibimiz tarafından incelenir; sonuç bildirim olarak iletilir.")}</p>
        </div>
        <Badge tone={st.tone} size="md">
          {t(st.label)}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label={t("Yasal ad soyad")} htmlFor="cr-legal" error={errors.legalName} hint={t("Kimliğinde yazan şekliyle.")}>
          <Input id="cr-legal" value={draft.legalName} onChange={(e) => set("legalName", e.target.value)} maxLength={120} autoComplete="name" className={inputCls} aria-invalid={!!errors.legalName} aria-describedby={errors.legalName ? "cr-legal-error" : "cr-legal-hint"} />
        </AuthField>
        <AuthField label={t("Doğum yılı")} htmlFor="cr-birth" error={errors.birthYear} hint={t("18 yaşını doldurmuş olmalısın.")}>
          <Input id="cr-birth" value={draft.birthYear} onChange={(e) => set("birthYear", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1995" className={inputCls} aria-invalid={!!errors.birthYear} aria-describedby={errors.birthYear ? "cr-birth-error" : "cr-birth-hint"} />
        </AuthField>
      </div>

      <ul className="space-y-2.5 rounded-2xl border border-line bg-white p-4 text-xs leading-relaxed text-muted-strong">
        <li className="flex items-start gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
          <span>{t("Talebin yönetici incelemesine gönderilir; sonuç bildirim olarak iletilir. İnceleme bitene kadar kimlik doğrulaması \"İncelemede\" görünür.")}</span>
        </li>
        <li className="flex items-start gap-2.5">
          <FileX2 className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
          <span>
            {t.rich("<b>Kimlik belgesi ve selfie yüklemeni istemiyoruz; belge saklanmaz.</b> Yalnızca yukarıdaki bilgi ve inceleme sonucu tutulur.", { b: (c) => <strong className="text-ink">{c}</strong> })}
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Lock className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
          <span>{t("Ses ve görünüm yetkilendirmesi, kimliğin doğrulandıktan sonra açılır.")}</span>
        </li>
      </ul>

      <div>
        <div className="flex items-start gap-2.5">
          <Checkbox id="cr-declared" checked={draft.declared} onCheckedChange={(v) => set("declared", v === true)} aria-invalid={!!errors.declared} aria-describedby={errors.declared ? "cr-declared-error" : undefined} className="mt-px" />
          <label htmlFor="cr-declared" className="cursor-pointer text-xs leading-relaxed text-ink-soft">
            {t("Verdiğim bilgilerin doğru olduğunu, 18 yaşını doldurduğumu ve kendi adıma başvurduğumu beyan ederim.")}
          </label>
        </div>
        {errors.declared && (
          <p id="cr-declared-error" role="alert" className="mt-1.5 text-xs font-semibold text-danger">
            {errors.declared}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── 5 · AI İkizi ──────────────────────────────────────── */
export function StepTwin({ view, draft, set, errors, consentText }: StepProps & { consentText: string }) {
  const t = useT();
  const bioCount = `${draft.shortBio.length}/500`;
  const greetCount = `${draft.greeting.length}/500`;
  const alreadyGranted = view.consents.includes("ai_twin_persona");
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <AuthField label={t("AI ikizinin adı")} htmlFor="cr-twin-name" error={errors.twinName}>
            <Input id="cr-twin-name" value={draft.twinName} onChange={(e) => set("twinName", e.target.value)} maxLength={80} className={inputCls} aria-invalid={!!errors.twinName} aria-describedby={errors.twinName ? "cr-twin-name-error" : undefined} />
          </AuthField>
          <AuthField label={t("Kısa biyografi (isteğe bağlı)")} htmlFor="cr-twin-bio" error={errors.shortBio} hint={bioCount}>
            <Textarea id="cr-twin-bio" value={draft.shortBio} onChange={(e) => set("shortBio", e.target.value)} maxLength={500} rows={3} placeholder={t("AI ikizin kendini nasıl tanıtsın?")} aria-describedby={errors.shortBio ? "cr-twin-bio-error" : "cr-twin-bio-hint"} />
          </AuthField>
          <AuthField label={t("Karşılama mesajı")} htmlFor="cr-twin-greet" error={errors.greeting} hint={greetCount}>
            <Textarea id="cr-twin-greet" value={draft.greeting} onChange={(e) => set("greeting", e.target.value)} maxLength={500} rows={3} placeholder={t("Merhaba! Ben ... Bugün seninle ne konuşalım?")} aria-invalid={!!errors.greeting} aria-describedby={errors.greeting ? "cr-twin-greet-error" : "cr-twin-greet-hint"} />
          </AuthField>
        </div>

        <div aria-label={t("Önizleme")} role="group" className="rounded-2xl border border-line bg-soft/60 p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-muted">{t("Hayranların bunu görecek")}</p>
          <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-extrabold text-ink">{draft.twinName || t("AI ikizi")}</span>
              <AiTwinLabel />
            </div>
            {draft.shortBio && <p className="mt-1 text-[11px] text-muted-strong">{draft.shortBio}</p>}
            <div className="mt-3 rounded-2xl rounded-ss-sm bg-brand-100 px-3.5 py-2.5 text-xs leading-relaxed text-ink">{draft.greeting || t("Karşılama mesajın burada görünecek.")}</div>
            <p className="mt-2 text-[10px] text-muted">{t("Bu yanıtlar yapay zekâ tarafından üretilir.")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <div className="flex items-start gap-3">
          <Checkbox id="cr-consent-persona" checked={draft.consentPersona} disabled={alreadyGranted} onCheckedChange={(v) => set("consentPersona", v === true)} aria-invalid={!!errors.consentPersona} aria-describedby="cr-consent-persona-text" className="mt-0.5" />
          <div className="min-w-0">
            <label htmlFor="cr-consent-persona" className="cursor-pointer text-[13px] font-extrabold text-ink">
              {t("AI ikizim için açık rıza veriyorum")}
            </label>
            <p id="cr-consent-persona-text" className="mt-1 text-xs leading-relaxed text-muted-strong">
              {consentText}
            </p>
            <p className="mt-2 text-[11px] text-muted">{alreadyGranted ? t("Rızan kayıtlı. İstediğin zaman Creator Studio > Sınırlar ve İzinler bölümünden geri çekebilirsin.") : t("Rızanı istediğin zaman geri çekebilirsin; geri çekildiğinde AI ikizin hemen durdurulur.")}</p>
          </div>
        </div>
        {errors.consentPersona && (
          <p role="alert" className="mt-2 text-xs font-semibold text-danger">
            {errors.consentPersona}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── 6 · Özelleştir ────────────────────────────────────── */
function RangeField({ id, label, left, right, value, onChange }: { id: string; label: string; left: string; right: string; value: number; onChange: (v: number) => void }) {
  const { formatPercent } = useFormatters();
  const pct = formatPercent(value * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-extrabold text-ink">
          {label}
        </label>
        <span className="text-xs font-extrabold text-brand-500" aria-hidden>
          {pct}
        </span>
      </div>
      <input id={id} type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={pct} className="h-2 w-full cursor-pointer accent-[#ec0088]" />
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function RadioChips<T extends string>({ name, legend, options, value, onChange }: { name: string; legend: string; options: readonly { value: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useT();
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-extrabold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn("flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-extrabold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500", value === o.value ? "border-brand-500 bg-brand-50 text-brand-600" : "border-line bg-white text-ink-soft hover:border-brand-200")}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {t(o.label)}
            {o.hint && <span className="font-medium text-muted">({t(o.hint)})</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SwitchRow({ id, title, text, checked, onChange, disabled }: { id: string; title: string; text: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <li className="flex items-start gap-4 rounded-xl border border-line bg-white p-3.5">
      <div className="min-w-0 flex-1">
        <p id={`${id}-t`} className="text-[13px] font-extrabold text-ink">
          {title}
        </p>
        <p id={`${id}-d`} className="mt-0.5 text-xs leading-snug text-muted-strong">
          {text}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} />
    </li>
  );
}

export function StepCustomize({ view, draft, set, errors, consentTexts }: StepProps & { consentTexts: ConsentTexts }) {
  const t = useT();
  const identityVerified = view.verification.identity === "verified";
  return (
    <div className="space-y-7">
      <Section title={t("Kişilik")} hint={t("AI ikizin hayranlarınla nasıl konuşsun?")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <RangeField id="cr-warmth" label={t("Samimiyet")} left={t("Mesafeli")} right={t("Çok samimi")} value={draft.warmth} onChange={(v) => set("warmth", v)} />
          <RangeField id="cr-formality" label={t("Resmiyet")} left={t("Rahat")} right={t("Resmî")} value={draft.formality} onChange={(v) => set("formality", v)} />
          <RangeField id="cr-humor" label={t("Mizah")} left={t("Ciddi")} right={t("Esprili")} value={draft.humor} onChange={(v) => set("humor", v)} />
          <RangeField id="cr-energy" label={t("Enerji")} left={t("Sakin")} right={t("Enerjik")} value={draft.energy} onChange={(v) => set("energy", v)} />
        </div>
        <RadioChips name="emoji" legend={t("Emoji kullanımı")} options={EMOJI_OPTIONS} value={draft.emojiUsage} onChange={(v) => set("emojiUsage", v)} />
        <RadioChips name="msglen" legend={t("Mesaj uzunluğu")} options={MESSAGE_LENGTH_OPTIONS} value={draft.messageLength} onChange={(v) => set("messageLength", v)} />
      </Section>

      <Section title={t("Konular")} hint={t("Enter veya virgülle ekle.")}>
        <AuthField label={t("Konuşmaktan keyif aldığın konular")} htmlFor="cr-allowed" error={errors.allowedTopics}>
          <TagInput id="cr-allowed" value={draft.allowedTopics} onChange={(v) => set("allowedTopics", v)} placeholder={t("Örn. seyahat, kahve, fotoğrafçılık")} />
        </AuthField>
        <AuthField label={t("Asla konuşulmayacak konular")} htmlFor="cr-blocked" error={errors.blockedTopics}>
          <TagInput id="cr-blocked" value={draft.blockedTopics} onChange={(v) => set("blockedTopics", v)} placeholder={t("Örn. siyaset, özel hayatım")} tone="danger" />
        </AuthField>
      </Section>

      <Section title={t("Sınırlar")} hint={t("Platform politikası her zaman üst sınırdır; burada yalnızca daha da kısıtlayabilirsin.")}>
        <ul className="space-y-2.5">
          <SwitchRow id="cr-b-personal" title={t("Kişisel sorulara yanıt ver")} text={t("Hayranlar yaşam tarzın hakkında genel sorular sorabilir.")} checked={draft.allowPersonalQuestions} onChange={(v) => set("allowPersonalQuestions", v)} />
          <SwitchRow id="cr-b-media" title={t("Medya isteklerini kabul et")} text={t("Fotoğraf/video isteklerine yönlendirme yapabilir.")} checked={draft.allowMediaRequests} onChange={(v) => set("allowMediaRequests", v)} />
          <SwitchRow id="cr-b-custom" title={t("Özel taleplere izin ver")} text={t("Hayranlar sana ücretli özel talep gönderebilir.")} checked={draft.allowCustomRequests} onChange={(v) => set("allowCustomRequests", v)} />
          <SwitchRow id="cr-b-distress" title={t("Zor durumda destek yönlendirmesi (zorunlu)")} text={t("Bir hayran kriz belirtisi gösterirse AI ikizi güvenli yönlendirme yapar; bu ayar kapatılamaz.")} checked disabled onChange={() => undefined} />
        </ul>
      </Section>

      <Section title={t("İzinler")} hint={t("İsteğe bağlı; açık rıza vermeden hiçbir içerik veya benzerlik kullanılmaz.")}>
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <Checkbox id="cr-consent-knowledge" checked={draft.knowledgeConsent} onCheckedChange={(v) => set("knowledgeConsent", v === true)} aria-describedby="cr-consent-knowledge-text" className="mt-0.5" />
            <div>
              <label htmlFor="cr-consent-knowledge" className="cursor-pointer text-[13px] font-extrabold text-ink">
                {t("Bilgi tabanı kullanımına izin veriyorum")}
              </label>
              <p id="cr-consent-knowledge-text" className="mt-1 text-xs leading-relaxed text-muted-strong">
                {consentTexts.knowledge}
              </p>
            </div>
          </div>
        </div>

        {identityVerified ? (
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-start gap-3">
              <Checkbox id="cr-consent-voice" checked={draft.voiceConsent} onCheckedChange={(v) => set("voiceConsent", v === true)} aria-describedby="cr-consent-voice-text" className="mt-0.5" />
              <div>
                <label htmlFor="cr-consent-voice" className="cursor-pointer text-[13px] font-extrabold text-ink">
                  {t("Ses benzerliği için izin veriyorum (isteğe bağlı)")}
                </label>
                <p id="cr-consent-voice-text" className="mt-1 text-xs leading-relaxed text-muted-strong">
                  {consentTexts.voice}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-line bg-soft/60 p-4">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-strong">
              {t.rich("<b>Ses ve görünüm yetkilendirmesi</b> kimlik doğrulaman tamamlandıktan sonra açılır. Başvurun onaylandığında Creator Studio > Ses ve Görünüm bölümünden izin verebilirsin.", { b: (c) => <strong className="text-ink">{c}</strong> })}
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─── 7 · İncele ────────────────────────────────────────── */
function Row({ label, children, ok }: { label: string; children: React.ReactNode; ok?: boolean | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", ok === false ? "bg-warning-soft text-warning" : "bg-success-soft text-success")} aria-hidden>
        {ok === false ? <AlertCircle className="size-3" /> : <Check className="size-3" strokeWidth={3.5} />}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
        <div className="mt-0.5 text-[13px] text-ink">{children}</div>
      </div>
    </div>
  );
}

export function StepReview({ view, draft, categories, completed, missing }: { view: StepProps["view"]; draft: StepProps["draft"]; categories: CreatorCategory[]; completed: string[]; missing: string[] }) {
  const t = useT();
  const locale = useLocale();
  const { formatPercent } = useFormatters();
  const catNames = draft.categories.map((s) => categories.find((c) => c.slug === s)?.name ?? s).join(", ");
  const links = SOCIAL_PLATFORMS.filter((p) => !draft.socials[p].skip && draft.socials[p].handle.trim());
  const phone = normalizePhone(draft.phoneCountry, draft.phoneNational, locale);
  const prefLabel = CONTACT_PREFERENCES.find((c) => c.key === draft.contactPreference)?.label;
  const pref = prefLabel ? t(prefLabel) : "—";
  const identity = IDENTITY_STATUS[view.verification.identity] ?? IDENTITY_STATUS.none!;
  return (
    <div className="space-y-5">
      <div className="divide-y divide-line rounded-2xl border border-line bg-white px-5">
        <Row label={t("Profil")} ok={completed.includes("account")}>
          <strong>{draft.displayName}</strong> · @{draft.username}
          <span className="block text-xs text-muted-strong">{catNames || t("Kategori seçilmedi")}</span>
          {draft.headline && <span className="block text-xs text-muted-strong">{draft.headline}</span>}
        </Row>
        <Row label={t("İletişim")} ok={completed.includes("contact")}>
          {phone.ok ? <span>{view.contact.masked && completed.includes("contact") ? view.contact.masked : `+${phone.e164.slice(1, phone.e164.length - phone.display.replace(/\s/g, "").length)} ${phone.display}`}</span> : "—"}
          <span className="block text-xs text-muted-strong">{t("Tercih: {pref} · Numaran şifreli saklanır, profilinde görünmez.", { pref })}</span>
        </Row>
        <Row label={t("Sosyal medya")} ok={completed.includes("social")}>
          {links.length ? (
            <span className="block space-y-0.5 text-xs text-muted-strong">
              {links.map((p) => (
                <span key={p} className="block">
                  <strong className="text-ink">{t(socialMeta(p)?.label ?? p)}</strong>
                  {draft.primary === p && <> {t("(ana platform)")}</>}: {draft.socials[p].handle}
                  {audienceLabel(draft.socials[p].audience) && <> · {t(audienceLabel(draft.socials[p].audience)!)}</>}
                </span>
              ))}
              <span className="block">{t("Hesap sahipliği incelemede doğrulanır.")}</span>
            </span>
          ) : (
            t("Hesap eklenmedi")
          )}
        </Row>
        <Row label={t("Kimlik")} ok={completed.includes("verify")}>
          {draft.legalName || "—"} <Badge tone={identity.tone}>{t(identity.label)}</Badge>
          <span className="block text-xs text-muted-strong">{t("Doğrulama, ekibimizin incelemesiyle sonuçlanır; belge saklanmaz.")}</span>
        </Row>
        <Row label={t("AI ikizi")} ok={completed.includes("twin") && draft.consentPersona}>
          <strong>{draft.twinName}</strong> <AiTwinLabel />
          <span className="block text-xs text-muted-strong">{`"${draft.greeting}"`}</span>
          <span className="block text-xs text-muted-strong">{t("Açık rıza: {state}", { state: draft.consentPersona ? t("verildi") : t("verilmedi") })}</span>
        </Row>
        <Row label={t("Kişilik ve sınırlar")} ok={completed.includes("persona") && completed.includes("boundaries")}>
          <span className="text-xs text-muted-strong">
            {t("Samimiyet {warmth} · Resmiyet {formality} · Mizah {humor} · Enerji {energy}", { warmth: formatPercent(draft.warmth * 100), formality: formatPercent(draft.formality * 100), humor: formatPercent(draft.humor * 100), energy: formatPercent(draft.energy * 100) })}
          </span>
          <span className="block text-xs text-muted-strong">
            {t("Konular: {allowed} serbest, {blocked} yasak · Bilgi tabanı izni: {knowledge} · Ses izni: {voice}", { allowed: draft.allowedTopics.length, blocked: draft.blockedTopics.length, knowledge: draft.knowledgeConsent ? t("var") : t("yok"), voice: draft.voiceConsent ? t("var") : t("yok") })}
          </span>
        </Row>
      </div>

      {missing.length > 0 ? (
        <FormAlert tone="warn">
          <p className="font-extrabold">{t("Başvuruyu göndermeden önce şu adımları tamamla:")}</p>
          <p className="mt-0.5 font-medium">{missing.join(", ")}</p>
        </FormAlert>
      ) : (
        <FormAlert tone="info">
          <p className="font-medium">
            {t.rich("Başvurunu gönderdiğinde ekibimiz profilini, kimlik talebini ve AI ikizini inceler. <b>Onaylanana kadar profilin ve AI ikizin yayında olmaz.</b> Sonuç bildirim olarak iletilir.", { b: (c) => <strong>{c}</strong> })}
          </p>
        </FormAlert>
      )}
    </div>
  );
}
