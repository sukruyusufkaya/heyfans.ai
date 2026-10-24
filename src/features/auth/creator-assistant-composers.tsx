"use client";
import * as React from "react";
import Link from "next/link";
import { Camera, Check, CheckCircle2, Globe, Loader2, Lock, Pencil, Plus, SendHorizontal, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { CategoryIcon } from "@/components/creator/category-icon";
import { uploadAsset } from "@/components/studio/media-uploader";
import { SocialIcon } from "@/features/public/social-icon";
import { checkCreatorUsernameAction } from "@/features/auth/creator-actions";
import { BLOCKED_TOPIC_OPTIONS, EMOJI_OPTIONS, MAX_BLOCKED_TOPICS, TONE_KEYS, TONE_PRESETS, type ToneKey } from "@/features/auth/constants";
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
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/client";
import type { CreatorAssistantView } from "@/services/auth/creator-assistant";

export interface CreatorCategory {
  slug: string;
  name: string;
  icon: string;
}

/** Bir sorunun alt adımlarında sohbete ara mesaj ekler (ör. "Instagram" → "Kullanıcı adın?"). */
export type Say = (from: "bot" | "me", content: React.ReactNode) => void;

/** Tüm yanıt alanlarının ortak bağlamı. `onAnswer` sunucuya yazar; başarılıysa sohbet sıradaki soruya geçer. */
export interface ComposerProps {
  view: CreatorAssistantView;
  busy: boolean;
  onAnswer: (payload: unknown) => Promise<boolean>;
  say: Say;
  fail: (message: string | null) => void;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/* ─── Ortak parçalar ────────────────────────────────────── */
function SendButton({ disabled, busy }: { disabled?: boolean; busy: boolean }) {
  const t = useT();
  return (
    <button
      type="submit"
      disabled={disabled || busy}
      aria-label={t("Gönder")}
      className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-[0_8px_20px_-8px_rgba(236,0,136,0.6)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <SendHorizontal className="size-5 rtl:-scale-x-100" aria-hidden />}
    </button>
  );
}

export function Chip({ on, onClick, disabled, children, className }: { on?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        on ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink-soft hover:border-brand-300 hover:text-brand-600",
        className,
      )}
    >
      {children}
    </button>
  );
}

const textCls = "min-h-12 rounded-[24px] bg-soft px-5 text-[15px]";

/** Tek satır / çok satır metin + gönder. Çok satırda Enter gönderir, Shift+Enter yeni satır açar. */
export function TextComposer({
  initial = "",
  label,
  placeholder,
  multiline,
  maxLength,
  minLength = 1,
  busy,
  onSend,
  autoComplete,
  inputMode,
  leftIcon,
  footer,
}: {
  initial?: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength: number;
  minLength?: number;
  busy: boolean;
  onSend: (value: string) => void;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  leftIcon?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [value, setValue] = React.useState(initial);
  const ref = React.useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  React.useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  const ready = value.trim().length >= minLength && !busy;
  const send = () => ready && onSend(value.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div className="flex items-end gap-2">
        {multiline ? (
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={3}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-label={label}
            className="min-h-[88px] resize-none rounded-[22px] bg-soft px-5 py-3 text-[15px]"
          />
        ) : (
          <Input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} maxLength={maxLength} placeholder={placeholder} aria-label={label} autoComplete={autoComplete} inputMode={inputMode} leftIcon={leftIcon} className={textCls} />
        )}
        <SendButton disabled={!ready} busy={busy} />
      </div>
      {(footer || multiline) && (
        <div className="mt-1.5 flex items-center justify-between gap-3 px-2 text-[11px] text-muted">
          <span>{footer}</span>
          {multiline && <span aria-hidden>{`${value.length}/${maxLength}`}</span>}
        </div>
      )}
    </form>
  );
}

/* ─── Doğum tarihi ──────────────────────────────────────── */
export function BirthDateComposer({ todayIso, busy, onSend }: { todayIso: string; busy: boolean; onSend: (birthDate: string) => void }) {
  const t = useT();
  const [value, setValue] = React.useState("");
  const [declared, setDeclared] = React.useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value && declared && !busy) onSend(value);
      }}
      className="space-y-2.5"
    >
      <div className="flex items-end gap-2">
        <Input type="date" value={value} max={todayIso} min="1900-01-01" onChange={(e) => setValue(e.target.value)} aria-label={t("Doğum tarihi")} className={textCls} />
        <SendButton disabled={!value || !declared} busy={busy} />
      </div>
      <label htmlFor="as-declared" className="flex cursor-pointer items-start gap-2.5 px-2 text-xs leading-relaxed text-muted-strong">
        <Checkbox id="as-declared" checked={declared} onCheckedChange={(v) => setDeclared(v === true)} className="mt-px" />
        <span>{t("Girdiğim doğum tarihinin doğru olduğunu beyan ederim.")}</span>
      </label>
    </form>
  );
}

/* ─── Kullanıcı adı ─────────────────────────────────────── */
const ASCII: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

/** Görünen addan kullanıcı adı önerileri (Türkçe harfler sadeleştirilir) + sistemin atadığı ad. */
function usernameSuggestions(displayName: string, current: string) {
  const parts = displayName
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (c) => ASCII[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const list = parts.length ? [parts.join(""), parts.join("."), parts.join("_"), current] : [current];
  return [...new Set(list.map((s) => s.slice(0, 30)))].filter((s) => /^[a-z0-9_.]{3,30}$/.test(s)).slice(0, 4);
}

type UsernameState = { status: "idle" | "checking" | "available" | "taken" | "invalid"; message?: string };

export function UsernameComposer({ view, busy, onAnswer }: ComposerProps) {
  const t = useT();
  const suggestions = React.useMemo(() => usernameSuggestions(view.values.displayName, view.values.username), [view.values.displayName, view.values.username]);
  const [value, setValue] = React.useState(() => (view.answered.includes("username") ? view.values.username : (suggestions[0] ?? view.values.username)));
  const [state, setState] = React.useState<UsernameState>({ status: value ? "checking" : "idle" });
  const seq = React.useRef(0);
  const change = (next: string) => {
    setValue(next);
    setState({ status: next ? "checking" : "idle" });
  };

  React.useEffect(() => {
    const u = value.trim();
    const my = ++seq.current;
    if (!u) return;
    const timer = setTimeout(async () => {
      const r = await checkCreatorUsernameAction(u).catch(() => null);
      if (my !== seq.current) return;
      if (!r?.ok) return setState({ status: "idle" });
      setState({ status: r.data.available ? "available" : r.data.taken ? "taken" : "invalid", message: r.data.message });
    }, 400);
    return () => clearTimeout(timer);
  }, [value]);

  const blocked = state.status === "taken" || state.status === "invalid" || state.status === "checking";
  const right =
    state.status === "checking" ? (
      <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
    ) : state.status === "available" ? (
      <CheckCircle2 className="size-[18px] text-success" aria-hidden />
    ) : blocked ? (
      <XCircle className="size-[18px] text-danger" aria-hidden />
    ) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!blocked && value.trim() && !busy) void onAnswer({ username: value.trim() });
      }}
      className="space-y-2.5"
    >
      {suggestions.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label={t("Öneriler")}>
          {suggestions.map((s) => (
            <Chip key={s} on={value === s} onClick={() => change(s)}>
              {`@${s}`}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Input
          value={value}
          onChange={(e) => change(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30))}
          aria-label={t("Kullanıcı adı")}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          leftIcon={<span className="text-sm font-bold">@</span>}
          rightSlot={right}
          className={textCls}
          aria-describedby="as-username-status"
        />
        <SendButton disabled={blocked || !value.trim()} busy={busy} />
      </div>
      <p id="as-username-status" aria-live="polite" className={cn("px-2 text-xs", state.status === "available" ? "font-bold text-success" : blocked && state.message ? "font-semibold text-danger" : "text-muted")}>
        {state.status === "available" || !state.message ? `heyfans.ai/creators/${value || "…"}` : state.message}
      </p>
    </form>
  );
}

/* ─── Fotoğraf ──────────────────────────────────────────── */
export function PhotoComposer({ purpose, busy, onAnswer, fail }: ComposerProps & { purpose: "avatar" | "cover" }) {
  const t = useT();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);

  React.useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    fail(null);
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) return fail(t("JPG, PNG veya WEBP biçiminde, en fazla 15 MB bir fotoğraf seç."));
    setPreview(URL.createObjectURL(file));
    setProgress(0);
    try {
      const uploaded = await uploadAsset(file, purpose, t, setProgress);
      const ok = await onAnswer({ assetId: uploaded.assetId });
      if (!ok) setPreview(null);
    } catch (err) {
      setPreview(null);
      fail(err instanceof Error ? err.message : t("Dosya yüklenemedi."));
    } finally {
      setProgress(null);
    }
  }

  const uploading = progress !== null;
  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {uploading && preview ? (
        <div className="flex items-center gap-3 rounded-[22px] bg-soft p-3" role="status">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className={cn("shrink-0 object-cover", purpose === "avatar" ? "size-14 rounded-full" : "h-14 w-28 rounded-xl")} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-ink">{progress < 1 ? t("Yükleniyor… %{n}", { n: Math.round(progress * 100) }) : t("Kaydediliyor…")}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="lg" loading={busy} onClick={() => inputRef.current?.click()} className="h-12 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 text-[14px]">
            <Camera aria-hidden /> {purpose === "avatar" ? t("Profil fotoğrafı seç") : t("Kapak görseli seç")}
          </Button>
          {purpose === "cover" && (
            <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={() => void onAnswer({ assetId: null })} className="h-12 rounded-full px-6 text-[14px]">
              {t("Şimdilik geç")}
            </Button>
          )}
        </div>
      )}
      <p className="px-2 text-[11px] text-muted">{purpose === "avatar" ? t("JPG, PNG veya WEBP · kare fotoğraf önerilir") : t("JPG, PNG veya WEBP · yatay (3:1) görsel önerilir")}</p>
    </div>
  );
}

/* ─── Kategoriler ───────────────────────────────────────── */
export function CategoriesComposer({ view, busy, onAnswer, categories }: ComposerProps & { categories: CreatorCategory[] }) {
  const t = useT();
  const [selected, setSelected] = React.useState<string[]>(view.values.categories);
  const toggle = (slug: string) => setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : s.length < 5 ? [...s, slug] : s));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.length && !busy) void onAnswer({ categories: selected });
      }}
      className="space-y-2.5"
    >
      <div className="flex max-h-[176px] flex-wrap gap-2 overflow-y-auto p-0.5" role="group" aria-label={t("Kategoriler")}>
        {categories.map((c) => {
          const on = selected.includes(c.slug);
          return (
            <Chip key={c.slug} on={on} onClick={() => toggle(c.slug)} disabled={!on && selected.length >= 5}>
              {on ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <CategoryIcon name={c.icon} className="size-4" />}
              {c.name}
            </Chip>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="px-2 text-xs font-bold text-muted">{t("{n}/5 seçildi", { n: selected.length })}</span>
        <Button type="submit" size="lg" loading={busy} disabled={!selected.length} className="h-12 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 text-[14px]">
          {t("Devam Et")}
        </Button>
      </div>
    </form>
  );
}

/* ─── Sosyal medya ──────────────────────────────────────── */
interface DraftLink {
  platform: SocialPlatform;
  handle: string;
  audience: AudienceRange | null;
}

function PlatformLabel({ platform }: { platform: SocialPlatform }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5">
      {platform === "website" ? <Globe className="size-4" aria-hidden /> : <SocialIcon platform={platform} className="size-4" />}
      {t(socialMeta(platform)!.label)}
    </span>
  );
}

/** Sosyal hesap özeti: "Instagram · @kullanici · 10 bin – 50 bin". */
export function LinkSummary({ link }: { link: { platform: SocialPlatform; handle: string; audience: AudienceRange | null } }) {
  const t = useT();
  const n = normalizeSocial(link.platform, link.handle);
  const shown = link.platform === "website" ? (n.ok ? n.url.replace(/^https:\/\/(www\.)?/, "") : link.handle) : `@${n.ok ? n.handle : link.handle}`;
  const aud = AUDIENCE_RANGES.find((a) => a.key === link.audience)?.label;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <PlatformLabel platform={link.platform} />
      <span className="opacity-90">{aud ? t("{handle} · {audience}", { handle: shown, audience: t(aud) }) : shown}</span>
    </span>
  );
}

/**
 * Alt akış: platform seç → kullanıcı adı → takipçi aralığı → "başka var mı?".
 * Düzenlemede mevcut hesaplarla "başka var mı?" adımından başlar; ilk eklenen sosyal hesap ana platform olur.
 */
export function SocialsComposer({ view, busy, onAnswer, say, fail }: ComposerProps) {
  const t = useT();
  const [links, setLinks] = React.useState<DraftLink[]>(() => view.values.links.map((l) => ({ platform: l.platform, handle: l.handle, audience: l.audience })));
  const [phase, setPhase] = React.useState<"pick" | "handle" | "audience" | "more">(() => (view.values.links.length ? "more" : "pick"));
  const [platform, setPlatform] = React.useState<SocialPlatform | null>(null);
  const [handle, setHandle] = React.useState("");
  const remaining = SOCIAL_PLATFORMS.filter((p) => !links.some((l) => l.platform === p));
  const hasSocial = links.some((l) => l.platform !== "website");

  function choose(p: SocialPlatform) {
    fail(null);
    setPlatform(p);
    setHandle("");
    say("me", <PlatformLabel platform={p} />);
    say("bot", t(socialMeta(p)!.question));
    setPhase("handle");
  }

  function submitHandle() {
    if (!platform) return;
    if (!handle.trim()) return fail(t("Kullanıcı adını ya da profil bağlantını yaz."));
    const n = normalizeSocial(platform, handle);
    if (!n.ok) return fail(contactErrorText(n, t));
    fail(null);
    say("me", platform === "website" ? n.url.replace(/^https:\/\/(www\.)?/, "") : `@${n.handle}`);
    if (socialMeta(platform)!.audience) {
      say("bot", t("Yaklaşık kaç takipçin var?"));
      setPhase("audience");
    } else add({ platform, handle: n.handle, audience: null });
  }

  function add(link: DraftLink) {
    setLinks((ls) => [...ls, link]);
    setPlatform(null);
    say("bot", t("Harika! Başka bir hesabın var mı? Eklemek istediğin platformu seç ya da devam et."));
    setPhase("more");
  }

  async function finish() {
    if (!hasSocial) return fail(t("En az bir sosyal medya hesabı eklemelisin (web sitesi tek başına yeterli değil)."));
    const primary = links.find((l) => l.platform !== "website")!.platform;
    await onAnswer({ links: links.map((l) => ({ platform: l.platform, handle: l.handle, audience: l.audience })), primary });
  }

  if (phase === "handle" && platform) {
    const meta = socialMeta(platform)!;
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitHandle();
        }}
        className="space-y-1.5"
      >
        <div className="flex items-end gap-2">
          <Input
            autoFocus
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            maxLength={220}
            placeholder={t(meta.placeholder)}
            aria-label={platform === "website" ? t("Adres") : t("{platform} kullanıcı adı", { platform: t(meta.label) })}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            leftIcon={platform === "website" ? <Globe /> : <span className="text-sm font-bold">@</span>}
            className={textCls}
          />
          <SendButton disabled={!handle.trim()} busy={false} />
        </div>
        <p className="px-2 text-[11px] text-muted">{t(meta.hint)}</p>
      </form>
    );
  }

  if (phase === "audience" && platform) {
    return (
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("Yaklaşık takipçi / abone sayın")}>
        {AUDIENCE_RANGES.map((a) => (
          <Chip
            key={a.key}
            onClick={() => {
              const n = normalizeSocial(platform, handle);
              say("me", t(a.label));
              add({ platform, handle: n.ok ? n.handle : handle.trim(), audience: a.key });
            }}
          >
            {t(a.label)}
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {phase === "more" && links.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("Eklenen hesaplar")}>
          {links.map((l) => (
            <li key={l.platform} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 ps-3.5 pe-1.5 text-xs font-bold text-brand-700">
              <LinkSummary link={l} />
              <button
                type="button"
                onClick={() => setLinks((ls) => ls.filter((x) => x.platform !== l.platform))}
                aria-label={t("{platform} hesabını kaldır", { platform: t(socialMeta(l.platform)!.label) })}
                className="grid size-6 place-items-center rounded-full hover:bg-brand-100"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("Platformlar")}>
        {(phase === "pick" ? remaining.filter((p) => p !== "website") : remaining).map((p) => (
          <Chip key={p} onClick={() => choose(p)} disabled={busy}>
            {phase === "more" && <Plus className="size-3.5" aria-hidden />}
            <PlatformLabel platform={p} />
          </Chip>
        ))}
      </div>
      {phase === "more" && (
        <Button type="button" size="lg" loading={busy} disabled={!hasSocial} onClick={() => void finish()} className="h-12 w-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-[14px]">
          {t("Bu kadar, devam edelim")}
        </Button>
      )}
    </div>
  );
}

/* ─── Biyografi + kısa tanıtım ──────────────────────────── */
/** Biyografinin ilk cümlesi (en fazla 140 karakter) kısa tanıtım önerisi olur. */
function suggestHeadline(bio: string) {
  const first = bio.trim().split(/(?<=[.!?…])\s+/)[0]?.trim() ?? "";
  if (first.length <= 140) return first;
  const cut = first.slice(0, 139);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 100)).trimEnd()}…`;
}

export function BioComposer({ view, busy, onAnswer, say }: ComposerProps) {
  const t = useT();
  const [bio, setBio] = React.useState<string | null>(null);
  const [headline, setHeadline] = React.useState("");
  const [editing, setEditing] = React.useState(false);

  if (bio === null) {
    return (
      <TextComposer
        multiline
        initial={view.values.bio}
        label={t("Biyografi")}
        placeholder={t("Ne üretiyorsun, hayranların senden ne bekleyebilir?")}
        maxLength={1500}
        minLength={20}
        busy={busy}
        footer={t("En az 20 karakter")}
        onSend={(value) => {
          const suggestion = suggestHeadline(value);
          setBio(value);
          setHeadline(suggestion);
          say("me", <span className="whitespace-pre-line">{value}</span>);
          say(
            "bot",
            <>
              <p>{t("Profilinin en üstünde kısa tanıtım olarak şunu kullanayım mı?")}</p>
              <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 font-bold text-ink">{`“${suggestion}”`}</p>
            </>,
          );
        }}
      />
    );
  }

  if (editing) {
    return <TextComposer initial={headline} label={t("Kısa tanıtım")} placeholder={t("Örn. Kadıköy'den şehir rehberleri ve yavaş yaşam")} maxLength={140} minLength={2} busy={busy} footer={t("En fazla 140 karakter.")} onSend={(value) => void onAnswer({ bio, headline: value })} />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="lg" loading={busy} onClick={() => void onAnswer({ bio, headline })} className="h-12 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 text-[14px]">
        <Check aria-hidden /> {t("Evet, kullan")}
      </Button>
      <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={() => setEditing(true)} className="h-12 rounded-full px-6 text-[14px]">
        <Pencil aria-hidden /> {t("Düzenle")}
      </Button>
    </div>
  );
}

/* ─── Konum ─────────────────────────────────────────────── */
export function LocationComposer({ view, busy, onAnswer }: ComposerProps) {
  const t = useT();
  return (
    <div className="space-y-2">
      <TextComposer initial={view.values.location} label={t("Şehir")} placeholder={t("Örn. İstanbul")} maxLength={80} busy={busy} autoComplete="address-level2" onSend={(location) => void onAnswer({ location })} />
      <button type="button" disabled={busy} onClick={() => void onAnswer({ location: "" })} className="px-2 text-xs font-extrabold text-muted-strong hover:text-brand-600 disabled:opacity-50">
        {t("Şimdilik geç")}
      </button>
    </div>
  );
}

/* ─── Konuşma tonu + emoji ──────────────────────────────── */
export function ToneComposer({ view, busy, onAnswer, say }: ComposerProps) {
  const t = useT();
  const [tone, setTone] = React.useState<ToneKey | null>(null);

  if (!tone) {
    return (
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t("Konuşma tarzı")}>
        {TONE_KEYS.map((key) => {
          const p = TONE_PRESETS[key];
          const was = view.values.tone === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTone(key);
                say("me", `${p.emoji} ${t(p.label)}`);
                say("bot", t("Mesajlarında ne kadar emoji kullanırsın?"));
              }}
              className={cn("flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-start transition-colors hover:border-brand-300", was ? "border-brand-500" : "border-line")}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl" aria-hidden>
                {p.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-extrabold text-ink">{t(p.label)}</span>
                <span className="block text-xs text-muted-strong">{t(p.hint)}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("Emoji kullanımı")}>
      {EMOJI_OPTIONS.map((o) => (
        <Chip key={o.value} disabled={busy} onClick={() => void onAnswer({ tone, emoji: o.value })}>
          {t(o.label)}
        </Chip>
      ))}
    </div>
  );
}

/* ─── Karşılama mesajı ──────────────────────────────────── */
export function GreetingComposer({ draft, busy, onAnswer }: ComposerProps & { draft: string }) {
  const t = useT();
  const [editing, setEditing] = React.useState(false);
  if (editing) {
    return <TextComposer multiline initial={draft} label={t("Karşılama mesajı")} maxLength={500} minLength={5} busy={busy} onSend={(greeting) => void onAnswer({ greeting })} />;
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="lg" loading={busy} onClick={() => void onAnswer({ greeting: draft })} className="h-12 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 text-[14px]">
        <Check aria-hidden /> {t("Böyle kalsın")}
      </Button>
      <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={() => setEditing(true)} className="h-12 rounded-full px-6 text-[14px]">
        <Pencil aria-hidden /> {t("Düzenle")}
      </Button>
    </div>
  );
}

/* ─── Konuşulmayacak konular ────────────────────────────── */
export function TopicsComposer({ view, busy, onAnswer, fail }: ComposerProps) {
  const t = useT();
  const presets = BLOCKED_TOPIC_OPTIONS.map((o) => t(o));
  const [selected, setSelected] = React.useState<string[]>(view.values.blockedTopics);
  const [custom, setCustom] = React.useState("");
  const extras = selected.filter((s) => !presets.includes(s));
  const toggle = (topic: string) => setSelected((s) => (s.includes(topic) ? s.filter((x) => x !== topic) : s.length < MAX_BLOCKED_TOPICS ? [...s, topic] : s));

  function addCustom() {
    const v = custom.trim();
    if (v.length < 2 || v.length > 40) return fail(t("Her konu 2–40 karakter olmalı."));
    fail(null);
    if (!selected.some((s) => s.toLocaleLowerCase() === v.toLocaleLowerCase()) && selected.length < MAX_BLOCKED_TOPICS) setSelected((s) => [...s, v]);
    setCustom("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("Konular")}>
        {[...presets, ...extras].map((topic) => (
          <Chip key={topic} on={selected.includes(topic)} onClick={() => toggle(topic)}>
            {selected.includes(topic) && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
            {topic}
          </Chip>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addCustom();
        }}
        className="flex items-center gap-2"
      >
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} placeholder={t("Başka bir konu ekle")} aria-label={t("Başka bir konu ekle")} className="h-11 rounded-full bg-soft px-4 text-[14px]" />
        <Button type="submit" variant="secondary" size="lg" disabled={!custom.trim()} className="h-11 shrink-0 rounded-full px-4">
          <Plus aria-hidden /> {t("Ekle")}
        </Button>
      </form>
      <Button type="button" size="lg" loading={busy} onClick={() => void onAnswer({ blockedTopics: selected })} className="h-12 w-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-[14px]">
        {selected.length ? t("Kaydet ve devam et") : t("Böyle bir konu yok, devam et")}
      </Button>
    </div>
  );
}

/* ─── İletişim ──────────────────────────────────────────── */
export function ContactComposer({ view, busy, onAnswer, say, fail }: ComposerProps) {
  const t = useT();
  const locale = useLocale();
  const [country, setCountry] = React.useState(view.values.contact.country);
  const [national, setNational] = React.useState(view.values.contact.national ? formatNational(view.values.contact.country, view.values.contact.national) : "");
  const [phase, setPhase] = React.useState<"phone" | "preference">("phone");
  const [preference, setPreference] = React.useState<ContactPreference>(view.values.contact.preference);
  const [consent, setConsent] = React.useState(false);
  const c = PHONE_COUNTRIES.find((x) => x.code === country) ?? PHONE_COUNTRIES[0];

  if (phase === "phone") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const r = normalizePhone(c.code, national, locale);
          if (!r.ok) return fail(contactErrorText(r, t));
          fail(null);
          say("me", <span dir="ltr">{`+${c.dial} ${r.display}`}</span>);
          say("bot", t("Seninle nasıl iletişime geçelim?"));
          setPhase("preference");
        }}
        className="space-y-1.5"
      >
        <div className="flex items-end gap-2">
          <NativeSelect value={c.code} onChange={(e) => setCountry(e.target.value)} aria-label={t("Ülke")} className="h-12 w-[112px] shrink-0 rounded-[24px] bg-soft text-[14px]">
            {PHONE_COUNTRIES.map((x) => (
              <option key={x.code} value={x.code}>
                {`${countryName(x.code, locale)} (+${x.dial})`}
              </option>
            ))}
          </NativeSelect>
          <Input
            autoFocus
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={national}
            onChange={(e) => setNational(formatNational(c.code, e.target.value.replace(/\D/g, "").slice(0, c.max + 1)))}
            placeholder={c.example}
            aria-label={t("Cep telefonu")}
            className={textCls}
          />
          <SendButton disabled={!national.trim()} busy={false} />
        </div>
        <p className="flex items-center gap-1.5 px-2 text-[11px] text-muted">
          <Lock className="size-3" aria-hidden /> {t("Numaran şifreli saklanır ve profilinde asla görünmez.")}
        </p>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!consent) return fail(t("Devam etmek için iletişim bilgilerinin işlenmesini onaylamalısın."));
        void onAnswer({ country: c.code, national: national.replace(/\D/g, ""), preference, consent: true });
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("İletişim tercihi")}>
        {CONTACT_PREFERENCES.map((p) => (
          <Chip key={p.key} on={preference === p.key} onClick={() => setPreference(p.key)}>
            {t(p.label)}
          </Chip>
        ))}
      </div>
      <label htmlFor="as-contact-consent" className="flex cursor-pointer items-start gap-2.5 px-1 text-xs leading-relaxed text-muted-strong">
        <Checkbox id="as-contact-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-px" />
        <span>
          {t.rich("<link>Gizlilik Politikası</link>'nı okudum; telefon numaramın ve iletişim tercihimin creator başvurum ve hesabımla ilgili iletişim amacıyla işlenmesini onaylıyorum.", {
            link: (chunks) => (
              <Link href="/privacy" target="_blank" rel="noopener" className="font-extrabold text-brand-600 hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      <Button type="submit" size="lg" loading={busy} disabled={!consent} className="h-12 w-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-[14px]">
        {t("Kaydet ve devam et")}
      </Button>
    </form>
  );
}

/* ─── Rızalar ───────────────────────────────────────────── */
export function ConsentsComposer({ view, busy, onAnswer, knowledgeText }: ComposerProps & { knowledgeText: string }) {
  const t = useT();
  const [persona, setPersona] = React.useState(false);
  const [knowledge, setKnowledge] = React.useState(view.values.knowledgeConsent);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (persona && !busy) void onAnswer({ persona: true, knowledge });
      }}
      className="space-y-3"
    >
      <label htmlFor="as-consent-persona" className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-white p-3.5 text-[13px] font-bold leading-relaxed text-ink">
        <Checkbox id="as-consent-persona" checked={persona} onCheckedChange={(v) => setPersona(v === true)} className="mt-0.5" />
        <span>{t("Metni okudum; AI ikizim için açık rıza veriyorum.")}</span>
      </label>
      <label htmlFor="as-consent-knowledge" className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-white p-3.5 text-xs leading-relaxed text-muted-strong">
        <Checkbox id="as-consent-knowledge" checked={knowledge} onCheckedChange={(v) => setKnowledge(v === true)} className="mt-0.5" />
        <span>
          {knowledgeText} <span className="font-bold text-muted">{t("(isteğe bağlı)")}</span>
        </span>
      </label>
      <Button type="submit" size="lg" loading={busy} disabled={!persona} className="h-12 w-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-[14px]">
        {t("Onayla")}
      </Button>
    </form>
  );
}
