"use client";
import * as React from "react";
import { AlertCircle, BadgeCheck, Check, Clock, FileX2, Lock, ShieldCheck } from "lucide-react";
import { AuthField, FormAlert } from "@/components/auth/auth-ui";
import { InstagramIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/components/auth/brand-icons";
import { TagInput } from "@/components/auth/tag-input";
import { AiTwinLabel, Badge } from "@/components/ui/badge";
import { Checkbox, Input, Switch, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { EMOJI_OPTIONS, MESSAGE_LENGTH_OPTIONS, SOCIAL_PLATFORM_META } from "@/features/auth/constants";
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

function ControlNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand-150 bg-brand-50 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand-500">
        <ShieldCheck className="size-[18px]" aria-hidden />
      </span>
      <div className="text-xs leading-relaxed text-muted-strong">{children}</div>
    </div>
  );
}

/* ─── 1 · Bağla ─────────────────────────────────────────── */
const SOCIAL_ICON = { instagram: InstagramIcon, tiktok: TikTokIcon, youtube: YouTubeIcon, x: XIcon } as const;

export function StepConnect({ view, draft, set, errors, categories }: StepProps & { categories: CreatorCategory[] }) {
  const toggleCategory = (slug: string) => {
    if (draft.categories.includes(slug)) set("categories", draft.categories.filter((c) => c !== slug));
    else if (draft.categories.length < 5) set("categories", [...draft.categories, slug]);
  };
  const hasLinks = Object.values(draft.links).some((h) => h.trim());
  return (
    <div className="space-y-7">
      <Section title="Profil bilgilerin" hint="Hayranların seni bu bilgilerle görecek.">
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField label="Görünen ad" htmlFor="cr-name" error={errors.displayName}>
            <Input id="cr-name" value={draft.displayName} onChange={(e) => set("displayName", e.target.value)} maxLength={80} autoComplete="name" className={inputCls} aria-invalid={!!errors.displayName} aria-describedby={errors.displayName ? "cr-name-error" : undefined} />
          </AuthField>
          <AuthField label="Kullanıcı adı" htmlFor="cr-username" error={errors.username} hint="heyfans.ai/creators/kullaniciadi">
            <Input
              id="cr-username"
              value={draft.username}
              onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
              maxLength={30}
              autoComplete="username"
              leftIcon={<span className="text-sm font-bold">@</span>}
              className={inputCls}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "cr-username-error" : "cr-username-hint"}
            />
          </AuthField>
        </div>
        <AuthField label="Kısa tanıtım (isteğe bağlı)" htmlFor="cr-headline" error={errors.headline} hint={`${draft.headline.length}/140`}>
          <Input id="cr-headline" value={draft.headline} onChange={(e) => set("headline", e.target.value)} maxLength={140} placeholder="Örn. Seyahat ve yaşam tarzı üzerine hikâyeler" className={inputCls} aria-describedby={errors.headline ? "cr-headline-error" : "cr-headline-hint"} />
        </AuthField>
        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-[13px] font-extrabold text-ink">
            <span>Kategoriler</span>
            <span className="text-xs font-bold text-muted">{draft.categories.length}/5</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Kategoriler">
            {categories.map((c) => {
              const on = draft.categories.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleCategory(c.slug)}
                  disabled={!on && draft.categories.length >= 5}
                  className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-45", on ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink-soft hover:border-brand-200")}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                  {c.name}
                </button>
              );
            })}
          </div>
          {errors.categories && (
            <p role="alert" className="mt-2 text-xs font-semibold text-danger">
              {errors.categories}
            </p>
          )}
        </fieldset>
      </Section>

      <Section title="Sosyal hesapların" hint="İsteğe bağlı. Hesap sahipliğini doğrulayarak AI ikizinin resmî olmasını sağlarız.">
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_PLATFORM_META.map((p) => {
            const Icon = SOCIAL_ICON[p.key];
            const err = errors[`link.${p.key}`];
            return (
              <div key={p.key} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-soft text-ink">
                  <Icon aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <label htmlFor={`cr-link-${p.key}`} className="text-[13px] font-extrabold text-ink">
                    {p.label}
                  </label>
                  <input
                    id={`cr-link-${p.key}`}
                    value={draft.links[p.key]}
                    onChange={(e) => set("links", { ...draft.links, [p.key]: e.target.value })}
                    placeholder={p.placeholder}
                    maxLength={120}
                    aria-invalid={!!err}
                    aria-describedby={err ? `cr-link-${p.key}-error` : undefined}
                    className="mt-1 h-9 w-full rounded-lg border border-line px-2.5 text-xs text-ink placeholder:text-[#b2a6b3] focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-danger"
                  />
                  {err && (
                    <p id={`cr-link-${p.key}-error`} role="alert" className="mt-1 text-[11px] font-semibold text-danger">
                      {err}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {hasLinks && (
          <FormAlert tone="info">
            <p className="font-extrabold">Sahiplik doğrulaması</p>
            <p className="mt-1 font-medium">
              Hesaplarını OAuth ile otomatik bağlama henüz yapılandırılmadı. Ekibimiz sahipliği elle doğrular: şu kodu sosyal hesabının biyografisine ekle ve incelemede kalmasını sağla:{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-extrabold text-brand-600">{view.socialCode}</code>
            </p>
          </FormAlert>
        )}
      </Section>

      <ControlNote>
        <p className="text-[13px] font-extrabold text-ink">Kontrol her zaman sende.</p>
        <p className="mt-0.5">Kimliğin, sesin, görünüşün ve içeriklerin yalnızca açık iznine bağlı olarak kullanılır; izinlerini istediğin zaman geri çekebilirsin.</p>
      </ControlNote>
    </div>
  );
}

/* ─── 2 · Doğrula ───────────────────────────────────────── */
const IDENTITY_STATUS: Record<string, { label: string; tone: "gray" | "warn" | "green" | "danger" }> = {
  none: { label: "Henüz talep edilmedi", tone: "gray" },
  pending: { label: "İncelemede", tone: "warn" },
  verified: { label: "Doğrulandı", tone: "green" },
  rejected: { label: "Reddedildi", tone: "danger" },
};

export function StepVerify({ view, draft, set, errors }: StepProps) {
  const st = IDENTITY_STATUS[view.verification.identity] ?? IDENTITY_STATUS.none!;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-soft/60 p-4">
        <BadgeCheck className="size-5 text-brand-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-ink">Kimlik doğrulama durumu</p>
          <p className="text-xs text-muted-strong">Harici bir kimlik doğrulama sağlayıcısı henüz yapılandırılmadı; talebin ekibimizin incelemesine düşer.</p>
        </div>
        <Badge tone={st.tone} size="md">
          {st.label}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Yasal ad soyad" htmlFor="cr-legal" error={errors.legalName} hint="Kimliğinde yazan şekliyle.">
          <Input id="cr-legal" value={draft.legalName} onChange={(e) => set("legalName", e.target.value)} maxLength={120} autoComplete="name" className={inputCls} aria-invalid={!!errors.legalName} aria-describedby={errors.legalName ? "cr-legal-error" : "cr-legal-hint"} />
        </AuthField>
        <AuthField label="Doğum yılı" htmlFor="cr-birth" error={errors.birthYear} hint="18 yaşını doldurmuş olmalısın.">
          <Input id="cr-birth" value={draft.birthYear} onChange={(e) => set("birthYear", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1995" className={inputCls} aria-invalid={!!errors.birthYear} aria-describedby={errors.birthYear ? "cr-birth-error" : "cr-birth-hint"} />
        </AuthField>
      </div>

      <ul className="space-y-2.5 rounded-2xl border border-line bg-white p-4 text-xs leading-relaxed text-muted-strong">
        <li className="flex items-start gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
          <span>Talebin yönetici incelemesine gönderilir; sonuç bildirim olarak iletilir. İnceleme bitene kadar kimlik doğrulaması &quot;İncelemede&quot; görünür.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <FileX2 className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
          <span>
            <strong className="text-ink">Kimlik belgesi ve selfie yüklemeni istemiyoruz; belge saklanmaz.</strong> Yalnızca yukarıdaki bilgi ve inceleme sonucu tutulur.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Lock className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
          <span>Ses ve görünüm yetkilendirmesi, kimliğin doğrulandıktan sonra açılır.</span>
        </li>
      </ul>

      <div>
        <div className="flex items-start gap-2.5">
          <Checkbox id="cr-declared" checked={draft.declared} onCheckedChange={(v) => set("declared", v === true)} aria-invalid={!!errors.declared} aria-describedby={errors.declared ? "cr-declared-error" : undefined} className="mt-px" />
          <label htmlFor="cr-declared" className="cursor-pointer text-xs leading-relaxed text-ink-soft">
            Verdiğim bilgilerin doğru olduğunu, 18 yaşını doldurduğumu ve kendi adıma başvurduğumu beyan ederim.
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

/* ─── 3 · AI İkizi ──────────────────────────────────────── */
export function StepTwin({ view, draft, set, errors, consentText }: StepProps & { consentText: string }) {
  const alreadyGranted = view.consents.includes("ai_twin_persona");
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <AuthField label="AI ikizinin adı" htmlFor="cr-twin-name" error={errors.twinName}>
            <Input id="cr-twin-name" value={draft.twinName} onChange={(e) => set("twinName", e.target.value)} maxLength={80} className={inputCls} aria-invalid={!!errors.twinName} aria-describedby={errors.twinName ? "cr-twin-name-error" : undefined} />
          </AuthField>
          <AuthField label="Kısa biyografi (isteğe bağlı)" htmlFor="cr-twin-bio" error={errors.shortBio} hint={`${draft.shortBio.length}/500`}>
            <Textarea id="cr-twin-bio" value={draft.shortBio} onChange={(e) => set("shortBio", e.target.value)} maxLength={500} rows={3} placeholder="AI ikizin kendini nasıl tanıtsın?" aria-describedby={errors.shortBio ? "cr-twin-bio-error" : "cr-twin-bio-hint"} />
          </AuthField>
          <AuthField label="Karşılama mesajı" htmlFor="cr-twin-greet" error={errors.greeting} hint={`${draft.greeting.length}/500`}>
            <Textarea id="cr-twin-greet" value={draft.greeting} onChange={(e) => set("greeting", e.target.value)} maxLength={500} rows={3} placeholder="Merhaba! Ben ... Bugün seninle ne konuşalım?" aria-invalid={!!errors.greeting} aria-describedby={errors.greeting ? "cr-twin-greet-error" : "cr-twin-greet-hint"} />
          </AuthField>
        </div>

        <div aria-label="Önizleme" role="group" className="rounded-2xl border border-line bg-soft/60 p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-muted">Hayranların bunu görecek</p>
          <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-extrabold text-ink">{draft.twinName || "AI ikizi"}</span>
              <AiTwinLabel />
            </div>
            {draft.shortBio && <p className="mt-1 text-[11px] text-muted-strong">{draft.shortBio}</p>}
            <div className="mt-3 rounded-2xl rounded-tl-sm bg-brand-100 px-3.5 py-2.5 text-xs leading-relaxed text-ink">{draft.greeting || "Karşılama mesajın burada görünecek."}</div>
            <p className="mt-2 text-[10px] text-muted">Bu yanıtlar yapay zekâ tarafından üretilir.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <div className="flex items-start gap-3">
          <Checkbox id="cr-consent-persona" checked={draft.consentPersona} disabled={alreadyGranted} onCheckedChange={(v) => set("consentPersona", v === true)} aria-invalid={!!errors.consentPersona} aria-describedby="cr-consent-persona-text" className="mt-0.5" />
          <div className="min-w-0">
            <label htmlFor="cr-consent-persona" className="cursor-pointer text-[13px] font-extrabold text-ink">
              AI ikizim için açık rıza veriyorum
            </label>
            <p id="cr-consent-persona-text" className="mt-1 text-xs leading-relaxed text-muted-strong">
              {consentText}
            </p>
            <p className="mt-2 text-[11px] text-muted">{alreadyGranted ? "Rızan kayıtlı. İstediğin zaman Creator Studio > Sınırlar ve İzinler bölümünden geri çekebilirsin." : "Rızanı istediğin zaman geri çekebilirsin; geri çekildiğinde AI ikizin hemen durdurulur."}</p>
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

/* ─── 4 · Özelleştir ────────────────────────────────────── */
function RangeField({ id, label, left, right, value, onChange }: { id: string; label: string; left: string; right: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-extrabold text-ink">
          {label}
        </label>
        <span className="text-xs font-extrabold text-brand-500" aria-hidden>
          %{value}
        </span>
      </div>
      <input id={id} type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={`%${value}`} className="h-2 w-full cursor-pointer accent-[#ec0088]" />
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function RadioChips<T extends string>({ name, legend, options, value, onChange }: { name: string; legend: string; options: readonly { value: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void }) {
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
            {o.label}
            {o.hint && <span className="font-medium text-muted">({o.hint})</span>}
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
  const identityVerified = view.verification.identity === "verified";
  return (
    <div className="space-y-7">
      <Section title="Kişilik" hint="AI ikizin hayranlarınla nasıl konuşsun?">
        <div className="grid gap-5 sm:grid-cols-2">
          <RangeField id="cr-warmth" label="Samimiyet" left="Mesafeli" right="Çok samimi" value={draft.warmth} onChange={(v) => set("warmth", v)} />
          <RangeField id="cr-formality" label="Resmiyet" left="Rahat" right="Resmî" value={draft.formality} onChange={(v) => set("formality", v)} />
          <RangeField id="cr-humor" label="Mizah" left="Ciddi" right="Esprili" value={draft.humor} onChange={(v) => set("humor", v)} />
          <RangeField id="cr-energy" label="Enerji" left="Sakin" right="Enerjik" value={draft.energy} onChange={(v) => set("energy", v)} />
        </div>
        <RadioChips name="emoji" legend="Emoji kullanımı" options={EMOJI_OPTIONS} value={draft.emojiUsage} onChange={(v) => set("emojiUsage", v)} />
        <RadioChips name="msglen" legend="Mesaj uzunluğu" options={MESSAGE_LENGTH_OPTIONS} value={draft.messageLength} onChange={(v) => set("messageLength", v)} />
      </Section>

      <Section title="Konular" hint="Enter veya virgülle ekle.">
        <AuthField label="Konuşmaktan keyif aldığın konular" htmlFor="cr-allowed" error={errors.allowedTopics}>
          <TagInput id="cr-allowed" value={draft.allowedTopics} onChange={(v) => set("allowedTopics", v)} placeholder="Örn. seyahat, kahve, fotoğrafçılık" />
        </AuthField>
        <AuthField label="Asla konuşulmayacak konular" htmlFor="cr-blocked" error={errors.blockedTopics}>
          <TagInput id="cr-blocked" value={draft.blockedTopics} onChange={(v) => set("blockedTopics", v)} placeholder="Örn. siyaset, özel hayatım" tone="danger" />
        </AuthField>
      </Section>

      <Section title="Sınırlar" hint="Platform politikası her zaman üst sınırdır; burada yalnızca daha da kısıtlayabilirsin.">
        <ul className="space-y-2.5">
          <SwitchRow id="cr-b-personal" title="Kişisel sorulara yanıt ver" text="Hayranlar yaşam tarzın hakkında genel sorular sorabilir." checked={draft.allowPersonalQuestions} onChange={(v) => set("allowPersonalQuestions", v)} />
          <SwitchRow id="cr-b-media" title="Medya isteklerini kabul et" text="Fotoğraf/video isteklerine yönlendirme yapabilir." checked={draft.allowMediaRequests} onChange={(v) => set("allowMediaRequests", v)} />
          <SwitchRow id="cr-b-custom" title="Özel taleplere izin ver" text="Hayranlar sana ücretli özel talep gönderebilir." checked={draft.allowCustomRequests} onChange={(v) => set("allowCustomRequests", v)} />
          <SwitchRow id="cr-b-distress" title="Zor durumda destek yönlendirmesi (zorunlu)" text="Bir hayran kriz belirtisi gösterirse AI ikizi güvenli yönlendirme yapar; bu ayar kapatılamaz." checked disabled onChange={() => undefined} />
        </ul>
      </Section>

      <Section title="İzinler" hint="İsteğe bağlı; açık rıza vermeden hiçbir içerik veya benzerlik kullanılmaz.">
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <Checkbox id="cr-consent-knowledge" checked={draft.knowledgeConsent} onCheckedChange={(v) => set("knowledgeConsent", v === true)} aria-describedby="cr-consent-knowledge-text" className="mt-0.5" />
            <div>
              <label htmlFor="cr-consent-knowledge" className="cursor-pointer text-[13px] font-extrabold text-ink">
                Bilgi tabanı kullanımına izin veriyorum
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
                  Ses benzerliği için izin veriyorum (isteğe bağlı)
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
              <strong className="text-ink">Ses ve görünüm yetkilendirmesi</strong> kimlik doğrulaman tamamlandıktan sonra açılır. Başvurun onaylandığında Creator Studio &gt; Ses ve Görünüm bölümünden izin verebilirsin.
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─── 5 · İncele ────────────────────────────────────────── */
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
  const catNames = draft.categories.map((s) => categories.find((c) => c.slug === s)?.name ?? s).join(", ");
  const links = Object.entries(draft.links).filter(([, h]) => h.trim());
  const identity = IDENTITY_STATUS[view.verification.identity] ?? IDENTITY_STATUS.none!;
  return (
    <div className="space-y-5">
      <div className="divide-y divide-line rounded-2xl border border-line bg-white px-5">
        <Row label="Profil" ok={completed.includes("account")}>
          <strong>{draft.displayName}</strong> · @{draft.username}
          <span className="block text-xs text-muted-strong">{catNames || "Kategori seçilmedi"}</span>
          {links.length > 0 && <span className="block text-xs text-muted-strong">{links.map(([p, h]) => `${p}: ${h}`).join(" · ")} (sahiplik incelemede)</span>}
        </Row>
        <Row label="Kimlik" ok={completed.includes("verify")}>
          {draft.legalName || "—"} <Badge tone={identity.tone}>{identity.label}</Badge>
          <span className="block text-xs text-muted-strong">Doğrulama, ekibimizin incelemesiyle sonuçlanır; belge saklanmaz.</span>
        </Row>
        <Row label="AI ikizi" ok={completed.includes("twin") && draft.consentPersona}>
          <strong>{draft.twinName}</strong> <AiTwinLabel />
          <span className="block text-xs text-muted-strong">&quot;{draft.greeting}&quot;</span>
          <span className="block text-xs text-muted-strong">Açık rıza: {draft.consentPersona ? "verildi" : "verilmedi"}</span>
        </Row>
        <Row label="Kişilik ve sınırlar" ok={completed.includes("persona") && completed.includes("boundaries")}>
          <span className="text-xs text-muted-strong">
            Samimiyet %{draft.warmth} · Resmiyet %{draft.formality} · Mizah %{draft.humor} · Enerji %{draft.energy}
          </span>
          <span className="block text-xs text-muted-strong">
            Konular: {draft.allowedTopics.length} serbest, {draft.blockedTopics.length} yasak · Bilgi tabanı izni: {draft.knowledgeConsent ? "var" : "yok"} · Ses izni: {draft.voiceConsent ? "var" : "yok"}
          </span>
        </Row>
      </div>

      {missing.length > 0 ? (
        <FormAlert tone="warn">
          <p className="font-extrabold">Başvuruyu göndermeden önce şu adımları tamamla:</p>
          <p className="mt-0.5 font-medium">{missing.join(", ")}</p>
        </FormAlert>
      ) : (
        <FormAlert tone="info">
          <p className="font-medium">
            Başvurunu gönderdiğinde ekibimiz profilini, kimlik talebini ve AI ikizini inceler. <strong>Onaylanana kadar profilin ve AI ikizin yayında olmaz.</strong> Sonuç bildirim olarak iletilir.
          </p>
        </FormAlert>
      )}
    </div>
  );
}
