"use client";
import * as React from "react";
import Link from "next/link";
import { AtSign, Check, CheckCircle2, Globe, Loader2, Lock, MapPin, MessageCircle, Phone, ShieldCheck, Star, Users, XCircle } from "lucide-react";
import { AuthField, FormAlert } from "@/components/auth/auth-ui";
import { CategoryIcon } from "@/components/creator/category-icon";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { SocialIcon } from "@/features/public/social-icon";
import { cn } from "@/lib/utils";
import {
  AUDIENCE_RANGES,
  CONTACT_PREFERENCES,
  contactErrorText,
  countryName,
  formatNational,
  normalizePhone,
  normalizeSocial,
  PHONE_COUNTRIES,
  socialMeta,
  SOCIAL_PLATFORMS,
  type AudienceRange,
  type ContactPreference,
  type SocialPlatform,
} from "@/lib/creator-contact";
import { checkCreatorUsernameAction } from "@/features/auth/creator-actions";
import type { CreatorCategory, StepProps } from "@/features/auth/creator-types";
import { useLocale, useT } from "@/i18n/client";

const inputCls = "h-[52px] text-[15px]";

export type UsernameState = { status: "idle" | "checking" | "available" | "taken" | "invalid"; message?: string };

interface FrameProps {
  number: number;
  total: number;
  title: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  qRef: React.Ref<HTMLHeadingElement>;
  optional?: boolean;
  children: React.ReactNode;
}

/** Tek soru ekranı: ilerleme çubuğu + büyük soru başlığı + yardımcı metin + alanlar. */
export function QuestionFrame({ number, total, title, hint, icon, qRef, optional, children }: FrameProps) {
  const t = useT();
  return (
    <div className="hf-q-enter">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-500">
          {t("Soru {number} / {total}", { number, total })}
        </span>
        <div className="flex flex-1 gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < number ? "bg-brand-500" : "bg-brand-100")} />
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-start gap-3.5">
        {icon && <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-500 [&_svg]:size-6">{icon}</span>}
        <div className="min-w-0">
          <h2 id="cr-q-title" ref={qRef} tabIndex={-1} className="font-display text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-ink outline-none sm:text-[26px]">
            {title} {optional && <span className="align-middle text-xs font-bold tracking-normal text-muted">{t("(isteğe bağlı)")}</span>}
          </h2>
          {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-muted-strong">{hint}</p>}
        </div>
      </div>
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

type QProps = StepProps & { qRef: React.Ref<HTMLHeadingElement>; number: number; total: number };

/* ─── 1 · Profil ───────────────────────────────────────── */
export function QIdentity({ draft, set, errors, qRef, number, total, usernameState, setUsernameState }: QProps & { usernameState: UsernameState; setUsernameState: (s: UsernameState) => void }) {
  const t = useT();
  const seq = React.useRef(0);
  React.useEffect(() => {
    const u = draft.username.trim();
    if (!u) return;
    const my = ++seq.current;
    const timer = setTimeout(async () => {
      setUsernameState({ status: "checking" });
      const r = await checkCreatorUsernameAction(u);
      if (my !== seq.current) return;
      if (!r.ok) return setUsernameState({ status: "idle" });
      setUsernameState({ status: r.data.available ? "available" : r.data.taken ? "taken" : "invalid", message: r.data.message });
    }, 450);
    return () => clearTimeout(timer);
  }, [draft.username, setUsernameState]);

  const status = usernameState.status;
  const profileUrl = `heyfans.ai/creators/${draft.username || "kullaniciadi"}`;
  const right =
    status === "checking" ? (
      <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
    ) : status === "available" ? (
      <CheckCircle2 className="size-[18px] text-success" aria-hidden />
    ) : status === "taken" || status === "invalid" ? (
      <XCircle className="size-[18px] text-danger" aria-hidden />
    ) : null;

  return (
    <QuestionFrame number={number} total={total} qRef={qRef} icon={<AtSign />} title={t("Hayranların seni hangi adla görsün?")} hint={t("Görünen adın profilinde ve AI ikizinde kullanılır; kullanıcı adın profil adresin olur.")}>
      <AuthField label={t("Görünen ad")} htmlFor="cr-name" error={errors.displayName}>
        <Input id="cr-name" value={draft.displayName} onChange={(e) => set("displayName", e.target.value)} maxLength={80} autoComplete="name" placeholder={t("Örn. Melis Ertürk")} className={inputCls} aria-invalid={!!errors.displayName} aria-describedby={errors.displayName ? "cr-name-error" : undefined} />
      </AuthField>
      <AuthField
        label={t("Kullanıcı adı")}
        htmlFor="cr-username"
        error={errors.username ?? (status === "taken" || status === "invalid" ? usernameState.message : undefined)}
        hint={
          <span className={cn(status === "available" && "font-bold text-success")}>
            {status === "available" ? t("Uygun · {url}", { url: profileUrl }) : profileUrl}
          </span>
        }
      >
        <Input
          id="cr-username"
          value={draft.username}
          onChange={(e) => {
            set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""));
            setUsernameState({ status: "idle" });
          }}
          maxLength={30}
          autoComplete="username"
          leftIcon={<span className="text-sm font-bold">@</span>}
          rightSlot={right}
          className={inputCls}
          aria-invalid={!!errors.username || status === "taken"}
          aria-describedby="cr-username-hint"
        />
      </AuthField>
    </QuestionFrame>
  );
}

export function QCategories({ draft, set, errors, qRef, number, total, categories }: QProps & { categories: CreatorCategory[] }) {
  const t = useT();
  const toggle = (slug: string) => {
    if (draft.categories.includes(slug)) set("categories", draft.categories.filter((c) => c !== slug));
    else if (draft.categories.length < 5) set("categories", [...draft.categories, slug]);
  };
  return (
    <QuestionFrame number={number} total={total} qRef={qRef} icon={<Star />} title={t("Hangi alanlarda içerik üretiyorsun?")} hint={t("En fazla 5 kategori seç. Keşfet sayfasında bu kategorilerde listelenirsin.")}>
      <fieldset>
        <legend className="sr-only">{t("Kategoriler")}</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {categories.map((c) => {
            const on = draft.categories.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(c.slug)}
                disabled={!on && draft.categories.length >= 5}
                className={cn(
                  "flex h-[52px] items-center gap-2.5 rounded-xl border px-3.5 text-start text-[13px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-45",
                  on ? "border-brand-500 bg-brand-50 text-brand-700 shadow-[0_0_0_3px_rgba(236,0,136,0.08)]" : "border-line bg-white text-ink-soft hover:border-brand-200",
                )}
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong")}>
                  {on ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <CategoryIcon name={c.icon} className="size-4" />}
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-xs font-bold text-muted">{t("{n}/5 seçildi", { n: draft.categories.length })}</p>
        {errors.categories && (
          <p role="alert" className="mt-1.5 text-xs font-semibold text-danger">
            {errors.categories}
          </p>
        )}
      </fieldset>
    </QuestionFrame>
  );
}

export function QAbout({ draft, set, errors, qRef, number, total }: QProps) {
  const t = useT();
  const headlineCount = `${draft.headline.length}/140`;
  const bioCount = `${draft.bio.length}/1500`;
  return (
    <QuestionFrame number={number} total={total} qRef={qRef} icon={<MessageCircle />} title={t("Kendini kısaca tanıtır mısın?")} hint={t("Profilinin üst kısmında görünür. Sonradan Creator Studio'dan değiştirebilirsin.")}>
      <AuthField label={t("Kısa tanıtım")} htmlFor="cr-headline" error={errors.headline} hint={headlineCount}>
        <Input id="cr-headline" value={draft.headline} onChange={(e) => set("headline", e.target.value)} maxLength={140} placeholder={t("Örn. Kadıköy'den şehir rehberleri ve yavaş yaşam")} className={inputCls} aria-describedby={errors.headline ? "cr-headline-error" : "cr-headline-hint"} />
      </AuthField>
      <AuthField label={t("Şehir")} htmlFor="cr-location" error={errors.location}>
        <Input id="cr-location" value={draft.location} onChange={(e) => set("location", e.target.value)} maxLength={80} placeholder={t("Örn. İstanbul")} autoComplete="address-level2" leftIcon={<MapPin />} className={inputCls} />
      </AuthField>
      <AuthField label={t("Biyografi (isteğe bağlı)")} htmlFor="cr-bio" error={errors.bio} hint={bioCount}>
        <Textarea id="cr-bio" value={draft.bio} onChange={(e) => set("bio", e.target.value)} maxLength={1500} rows={4} placeholder={t("Ne üretiyorsun, hayranların senden ne bekleyebilir?")} aria-describedby="cr-bio-hint" />
      </AuthField>
    </QuestionFrame>
  );
}

/* ─── 2 · İletişim ─────────────────────────────────────── */
export function QPhone({ draft, set, errors, qRef, number, total }: QProps) {
  const t = useT();
  const locale = useLocale();
  const country = PHONE_COUNTRIES.find((c) => c.code === draft.phoneCountry) ?? PHONE_COUNTRIES[0];
  const digits = draft.phoneNational.replace(/\D/g, "");
  const check = digits.length >= country.min ? normalizePhone(country.code, digits, locale) : null;
  const phoneHint = check?.ok ? `+${country.dial} ${check.display}` : t("Örn. {example}", { example: country.example });
  return (
    <QuestionFrame number={number} total={total} qRef={qRef} icon={<Phone />} title={t("Sana hangi numaradan ulaşabiliriz?")} hint={t("Başvurun ve ödemelerinle ilgili gerektiğinde ekibimiz bu numarayı kullanır.")}>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <AuthField label={t("Ülke")} htmlFor="cr-phone-country">
          <NativeSelect id="cr-phone-country" value={country.code} onChange={(e) => set("phoneCountry", e.target.value)} className="h-[52px] text-[14px]">
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {countryName(c.code, locale)} (+{c.dial})
              </option>
            ))}
          </NativeSelect>
        </AuthField>
        <AuthField label={t("Cep telefonu")} htmlFor="cr-phone" error={errors.national} hint={phoneHint}>
          <Input
            id="cr-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={draft.phoneNational}
            onChange={(e) => set("phoneNational", formatNational(country.code, e.target.value.replace(/\D/g, "").slice(0, country.max + 1)))}
            placeholder={country.example}
            leftIcon={<span className="text-sm font-bold">+{country.dial}</span>}
            className={cn(inputCls, country.dial.length > 2 ? "ps-14" : "ps-12")}
            aria-invalid={!!errors.national}
            aria-describedby={errors.national ? "cr-phone-error" : "cr-phone-hint"}
          />
        </AuthField>
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-brand-150 bg-brand-50 p-4 text-xs leading-relaxed text-muted-strong">
        <Lock className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
        <p>
          {t.rich("Numaran <b>şifrelenerek</b> saklanır, profilinde ve hayranlara <b>asla görünmez</b>. Gerekirse ekibimiz bu numaradan seninle iletişime geçer.", { b: (c) => <strong className="text-ink">{c}</strong> })}
        </p>
      </div>
    </QuestionFrame>
  );
}

const PREF_ICON: Record<ContactPreference, React.ReactNode> = { whatsapp: <MessageCircle />, phone: <Phone />, email: <AtSign /> };

export function QPreference({ draft, set, errors, qRef, number, total }: QProps) {
  const t = useT();
  return (
    <QuestionFrame number={number} total={total} qRef={qRef} icon={<ShieldCheck />} title={t("Seninle nasıl iletişime geçelim?")} hint={t("Başvuru sonucu her durumda bildirim ve e-posta ile de iletilir.")}>
      <div role="radiogroup" aria-label={t("İletişim tercihi")} className="grid gap-2.5 sm:grid-cols-3">
        {CONTACT_PREFERENCES.map((p) => {
          const on = draft.contactPreference === p.key;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set("contactPreference", p.key)}
              className={cn("flex h-[60px] items-center gap-3 rounded-xl border px-4 text-start text-[13px] font-extrabold transition-all", on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-white text-ink-soft hover:border-brand-200")}
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-[18px]", on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong")}>{PREF_ICON[p.key]}</span>
              {t(p.label)}
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-line bg-white p-4">
        <label htmlFor="cr-contact-consent" className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink-soft">
          <Checkbox id="cr-contact-consent" checked={draft.contactConsent} onCheckedChange={(v) => set("contactConsent", v === true)} className="mt-0.5" aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "cr-contact-consent-error" : undefined} />
          <span>
            {t.rich("<link>Gizlilik Politikası</link>'nı okudum; telefon numaramın ve iletişim tercihimin creator başvurum ve hesabımla ilgili iletişim amacıyla işlenmesini onaylıyorum.", {
              link: (c) => (
                <Link href="/privacy" target="_blank" rel="noopener" className="font-extrabold text-brand-600 hover:underline">
                  {c}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.consent && (
          <p id="cr-contact-consent-error" role="alert" className="mt-2 text-xs font-semibold text-danger">
            {errors.consent}
          </p>
        )}
      </div>
    </QuestionFrame>
  );
}

/* ─── 3 · Sosyal medya ─────────────────────────────────── */
export function QSocial({ platform, draft, set, errors, qRef, number, total }: QProps & { platform: SocialPlatform }) {
  const t = useT();
  const meta = socialMeta(platform)!;
  const ans = draft.socials[platform];
  const update = (patch: Partial<typeof ans>) => set("socials", { ...draft.socials, [platform]: { ...ans, ...patch } });
  const preview = ans.handle.trim() ? normalizeSocial(platform, ans.handle) : null;
  const err = errors[`link.${platform}`];
  return (
    <QuestionFrame
      number={number}
      total={total}
      qRef={qRef}
      optional
      icon={platform === "website" ? <Globe /> : <SocialIcon platform={platform} className="size-6" />}
      title={t(meta.question)}
      hint={t(meta.hint)}
    >
      {ans.skip && !ans.handle && (
        <FormAlert tone="info">
          <p className="font-medium">{t("Bu platformu kullanmıyorum olarak işaretlendi. Eklemek istersen aşağıya yazman yeterli.")}</p>
        </FormAlert>
      )}
      <AuthField label={platform === "website" ? t("Adres") : t("{platform} kullanıcı adı", { platform: t(meta.label) })} htmlFor={`cr-social-${platform}`} error={err} hint={preview?.ok ? <span className="font-bold text-success">✓ {preview.url.replace(/^https:\/\/(www\.)?/, "")}</span> : undefined}>
        <Input
          id={`cr-social-${platform}`}
          value={ans.handle}
          onChange={(e) => update({ handle: e.target.value, skip: false })}
          maxLength={220}
          placeholder={t(meta.placeholder)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          leftIcon={platform === "website" ? <Globe /> : <span className="text-sm font-bold">@</span>}
          className={inputCls}
          aria-invalid={!!err}
          aria-describedby={err ? `cr-social-${platform}-error` : preview?.ok ? `cr-social-${platform}-hint` : undefined}
        />
      </AuthField>
      {meta.audience && (
        <fieldset disabled={!ans.handle.trim()} className="disabled:opacity-50">
          <legend className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold text-ink">
            <Users className="size-4 text-brand-500" aria-hidden /> {t("Yaklaşık takipçi / abone sayın")}
          </legend>
          <div role="radiogroup" aria-label={t("{platform} takipçi sayısı", { platform: t(meta.label) })} className="flex flex-wrap gap-2">
            {AUDIENCE_RANGES.map((a) => {
              const on = ans.audience === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => update({ audience: a.key as AudienceRange })}
                  className={cn("h-9 rounded-full border px-3.5 text-xs font-extrabold transition-colors", on ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink-soft hover:border-brand-200")}
                >
                  {t(a.label)}
                </button>
              );
            })}
          </div>
          {errors[`audience.${platform}`] && (
            <p role="alert" className="mt-2 text-xs font-semibold text-danger">
              {errors[`audience.${platform}`]}
            </p>
          )}
        </fieldset>
      )}
    </QuestionFrame>
  );
}

export function QPrimary({ view, draft, set, errors, qRef, number, total, onEdit }: QProps & { onEdit: (platform: SocialPlatform) => void }) {
  const t = useT();
  const added = SOCIAL_PLATFORMS.filter((p) => !draft.socials[p].skip && draft.socials[p].handle.trim() && normalizeSocial(p, draft.socials[p].handle).ok);
  const choosable: SocialPlatform[] = added.filter((p) => p !== "website");
  const primary = draft.primary && choosable.includes(draft.primary) ? draft.primary : (choosable[0] ?? null);
  return (
    <QuestionFrame number={number} total={total} qRef={qRef} icon={<Star />} title={t("En aktif olduğun platform hangisi?")} hint={t("Profilinde öne çıkarılır ve başvuru incelemesinde öncelikle bu hesabın sahipliği kontrol edilir.")}>
      {choosable.length === 0 ? (
        <FormAlert tone="warn">
          <p className="font-extrabold">{t("En az bir sosyal medya hesabı eklemelisin.")}</p>
          <p className="mt-0.5 font-medium">{t("Web sitesi tek başına yeterli değil. Hesap sahipliği, AI ikizinin resmî olması için doğrulanır.")}</p>
          <button type="button" onClick={() => onEdit("instagram")} className="mt-2 text-xs font-extrabold text-brand-600 hover:underline">
            {t("Instagram'dan başlayarak ekle →")}
          </button>
        </FormAlert>
      ) : (
        <div role="radiogroup" aria-label={t("Ana platform")} className="grid gap-2.5">
          {added.map((p) => {
            const meta = socialMeta(p)!;
            const n = normalizeSocial(p, draft.socials[p].handle);
            const audKey = AUDIENCE_RANGES.find((a) => a.key === draft.socials[p].audience)?.label;
            const aud = audKey ? t(audKey) : undefined;
            const isWeb = p === "website";
            const on = primary === p;
            return (
              <div key={p} className={cn("flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 transition-all", on ? "border-brand-500 shadow-[0_0_0_3px_rgba(236,0,136,0.08)]" : "border-line")}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={isWeb}
                  onClick={() => set("primary", p)}
                  aria-label={t("{platform} ana platform olsun", { platform: t(meta.label) })}
                  className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 disabled:invisible", on ? "border-brand-500 bg-brand-500 text-white" : "border-line")}
                >
                  {on && <Check className="size-3.5" strokeWidth={3.5} aria-hidden />}
                </button>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-soft text-ink">{isWeb ? <Globe className="size-4" aria-hidden /> : <SocialIcon platform={p} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold text-ink">{t(meta.label)}</span>
                  <span className="block truncate text-xs text-muted-strong">
                    {n.ok ? n.url.replace(/^https:\/\/(www\.)?/, "") : draft.socials[p].handle}
                    {aud ? ` · ${aud}` : ""}
                  </span>
                </span>
                <button type="button" onClick={() => onEdit(p)} className="text-xs font-extrabold text-brand-600 hover:underline">
                  {t("Düzenle")}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {errors.links && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {errors.links}
        </p>
      )}
      {choosable.length > 0 && (
        <FormAlert tone="info">
          <p className="font-extrabold">{t("Sahiplik doğrulaması")}</p>
          <p className="mt-1 font-medium">
            {t("Ekibimiz hesap sahipliğini doğrular. Şu kodu ana platformundaki biyografine ekle ve inceleme bitene kadar kaldırma:")}{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-extrabold text-brand-600">{view.socialCode}</code>
          </p>
        </FormAlert>
      )}
    </QuestionFrame>
  );
}
