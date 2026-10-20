"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Crown, PartyPopper, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { FormAlert, PrimaryLink } from "@/components/auth/auth-ui";
import { PillStepper, useStepFocus } from "@/components/auth/wizard";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { normalizePhone, normalizeSocial, socialMeta, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/creator-contact";
import {
  submitCreatorApplicationAction,
  saveCreatorContactAction,
  saveCreatorCustomizeAction,
  saveCreatorProfileAction,
  saveCreatorSocialAction,
  saveCreatorTwinAction,
  saveCreatorVerifyAction,
  startCreatorOnboardingAction,
} from "@/features/auth/creator-actions";
import { CREATOR_GROUPS, CREATOR_QUESTIONS, creatorGroupDone, isQuestionGroup, type CreatorGroupKey } from "@/features/auth/constants";
import { initialDraft, type ConsentTexts, type CreatorCategory, type CreatorDraft, type CreatorOnboardingView, type FieldErrors } from "@/features/auth/creator-types";
import { QAbout, QCategories, QIdentity, QPhone, QPreference, QPrimary, QSocial, type UsernameState } from "@/features/auth/creator-questions";
import { StepCustomize, StepHead, StepReview, StepTwin, StepVerify } from "@/features/auth/creator-steps";
import { creatorCustomizeSchema, creatorProfileSchema, creatorTwinSchema, creatorVerifySchema } from "@/features/auth/schemas";

const HEADS: Record<CreatorGroupKey, { eyebrow: string; title: string; accent: string; text: string; cta: string }> = {
  profile: {
    eyebrow: "Adım 01 — Profil",
    title: "Seni tanıyalım.",
    accent: "Hayranların seni nasıl görsün?",
    text: "Birkaç kısa soruyla profilini oluşturalım. Her yanıtı sonradan Creator Studio'dan değiştirebilirsin.",
    cta: "İletişime Devam Et",
  },
  contact: {
    eyebrow: "Adım 02 — İletişim",
    title: "Sana nasıl",
    accent: "ulaşalım?",
    text: "Numaran şifreli saklanır ve profilinde asla görünmez.",
    cta: "Sosyal Medyaya Devam Et",
  },
  social: {
    eyebrow: "Adım 03 — Sosyal medya",
    title: "Topluluğunu getir.",
    accent: "Birlikte büyüyelim.",
    text: "Hesaplarını tek tek ekle; kullanmadığın platformları atlayabilirsin.",
    cta: "Doğrulamaya Devam Et",
  },
  verify: {
    eyebrow: "Adım 04 — Kimliğini doğrula",
    title: "Gerçek sen",
    accent: "olduğunu göster.",
    text: "Kimlik doğrulama hayranlarına güven verir ve AI ikizinin senin adına konuşabilmesinin ön koşuludur.",
    cta: "AI İkizine Devam Et",
  },
  twin: {
    eyebrow: "Adım 05 — AI ikizini oluştur",
    title: "AI ikizini",
    accent: "tanıştır.",
    text: "İkizin adını, kısa tanıtımını ve ilk selamını belirle. Yanıtları her zaman “AI İkizi” etiketiyle gösterilir.",
    cta: "Özelleştirmeye Devam Et",
  },
  customize: {
    eyebrow: "Adım 06 — Özelleştir",
    title: "Senin kuralların,",
    accent: "senin tarzın.",
    text: "Kişiliği, konuları ve sınırları sen belirlersin. Rızaların her an geri çekilebilir.",
    cta: "İncelemeye Devam Et",
  },
  review: {
    eyebrow: "Adım 07 — İncele",
    title: "Her şey hazır mı?",
    accent: "Son bir kontrol.",
    text: "Bilgilerini gözden geçir ve başvurunu incelemeye gönder.",
    cta: "Başvuruyu Gönder",
  },
};

/** Sunucudan dönen alan hatası → hangi soruda gösterileceği. */
function questionOfField(field: string): string | null {
  if (field === "displayName" || field === "username") return "identity";
  if (field === "categories") return "categories";
  if (["headline", "bio", "location"].includes(field)) return "about";
  if (field === "national" || field === "country") return "phone";
  if (field === "consent" || field === "preference") return "preference";
  if (field.startsWith("link.")) return field.slice(5);
  if (field === "links" || field === "primary") return "primary";
  return null;
}

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[], rename: Record<string, string> = {}): FieldErrors {
  const out: FieldErrors = {};
  for (const i of issues) {
    const head = String(i.path[0] ?? "_");
    const key = rename[head] ?? head;
    out[key] ??= i.message;
  }
  return out;
}

export function CreatorOnboarding({ view, categories, consentTexts }: { view: CreatorOnboardingView; categories: CreatorCategory[]; consentTexts: ConsentTexts }) {
  if (view.status === "pending_review") return <PendingPanel submittedAt={view.submittedAt} />;
  if (view.status === "approved") return <ApprovedPanel />;
  if (view.status === "rejected") return <RejectedPanel note={view.application?.decisionNote ?? null} />;
  if (view.status === "suspended") return <SuspendedPanel />;
  return <Wizard view={view} categories={categories} consentTexts={consentTexts} />;
}

/** Kullanıcının eklediği (atlamadığı ve geçerli) sosyal hesaplar. */
function addedSocials(draft: CreatorDraft) {
  return SOCIAL_PLATFORMS.filter((p) => !draft.socials[p].skip && draft.socials[p].handle.trim());
}

/* ─── Sihirbaz ──────────────────────────────────────────── */
function Wizard({ view, categories, consentTexts }: { view: CreatorOnboardingView; categories: CreatorCategory[]; consentTexts: ConsentTexts }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<CreatorDraft>(() => initialDraft(view));
  const [completed, setCompleted] = React.useState<string[]>(view.completedSteps);
  const [index, setIndex] = React.useState(() => Math.max(0, CREATOR_GROUPS.findIndex((g) => g.key === view.resumeGroup)));
  const [q, setQ] = React.useState(0);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [usernameState, setUsernameState] = React.useState<UsernameState>({ status: "idle" });
  const [pending, startTransition] = React.useTransition();
  const headingRef = useStepFocus(index);
  const qRef = useStepFocus(`${index}:${q}`);

  const set = React.useCallback(<K extends keyof CreatorDraft>(key: K, value: CreatorDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      const keys = Object.keys(e);
      if (!keys.length) return e;
      // Değişen alanla ilgili hatalar temizlenir (sosyal alanlar "link.x"/"audience.x" anahtarlarıyla tutulur).
      const related = (k: string) => k === key || k.startsWith(`${String(key)}.`) || (key === "socials" && (k.startsWith("link.") || k.startsWith("audience.") || k === "links")) || (key === "phoneNational" && k === "national") || (key === "contactConsent" && k === "consent");
      return keys.some(related) ? Object.fromEntries(Object.entries(e).filter(([k]) => !related(k))) : e;
    });
  }, []);

  const completedSet = React.useMemo(() => new Set(completed), [completed]);
  const doneIdx = CREATOR_GROUPS.map((g, i) => (creatorGroupDone(g.key, completedSet) ? i : -1)).filter((i) => i >= 0);
  const firstOpen = CREATOR_GROUPS.findIndex((g) => !creatorGroupDone(g.key, completedSet));
  const reachable = firstOpen === -1 ? CREATOR_GROUPS.length - 1 : firstOpen;
  const group = CREATOR_GROUPS[index]!;
  const head = HEADS[group.key];
  const questions: readonly string[] | null = isQuestionGroup(group.key) ? CREATOR_QUESTIONS[group.key] : null;
  const qKey = questions?.[q] ?? null;
  const lastQuestion = !questions || q === questions.length - 1;
  const missing = [
    !completedSet.has("account") && "Profil bilgileri",
    !completedSet.has("contact") && "İletişim bilgileri",
    !completedSet.has("social") && "Sosyal medya hesapları",
    !completedSet.has("verify") && "Kimlik doğrulama talebi",
    !completedSet.has("twin") && "AI ikizi",
    !(completedSet.has("persona") && completedSet.has("boundaries")) && "Kişilik ve sınırlar",
  ].filter(Boolean) as string[];

  function go(i: number, qi = 0) {
    setErrors({});
    setFormError(null);
    setIndex(i);
    setQ(qi);
  }

  function back() {
    if (q > 0) return go(index, q - 1);
    if (index === 0) return;
    const prev = CREATOR_GROUPS[index - 1]!;
    go(index - 1, isQuestionGroup(prev.key) ? CREATOR_QUESTIONS[prev.key].length - 1 : 0);
  }

  /** Tek sorunun istemci doğrulaması (sunucu aynı kuralları yeniden uygular). */
  function validateQuestion(key: string): FieldErrors {
    switch (key) {
      case "identity": {
        const r = creatorProfileSchema.pick({ displayName: true, username: true }).safeParse({ displayName: draft.displayName, username: draft.username });
        const e = r.success ? {} : issuesToErrors(r.error.issues);
        if (!e.username && usernameState.status === "taken") e.username = "Bu kullanıcı adı alınmış.";
        return e;
      }
      case "categories":
        return draft.categories.length ? {} : { categories: "En az bir kategori seç." };
      case "about": {
        const r = creatorProfileSchema.pick({ headline: true, bio: true, location: true }).safeParse({ headline: draft.headline, bio: draft.bio, location: draft.location });
        return r.success ? {} : issuesToErrors(r.error.issues);
      }
      case "phone": {
        const r = normalizePhone(draft.phoneCountry, draft.phoneNational);
        return r.ok ? {} : { national: r.error };
      }
      case "preference":
        return draft.contactConsent ? {} : { consent: "Devam etmek için iletişim bilgilerinin işlenmesini onaylamalısın." };
      case "primary":
        return addedSocials(draft).some((p) => p !== "website") ? {} : { links: "En az bir sosyal medya hesabı eklemelisin (web sitesi tek başına yeterli değil)." };
      default: {
        const p = key as SocialPlatform;
        const a = draft.socials[p];
        if (a.skip || !a.handle.trim()) return {};
        const n = normalizeSocial(p, a.handle);
        if (!n.ok) return { [`link.${p}`]: n.error };
        if (socialMeta(p)?.audience && !a.audience) return { [`audience.${p}`]: "Yaklaşık takipçi sayını seç." };
        return {};
      }
    }
  }

  /** Grubun tamamının doğrulaması ve sunucuya gidecek yük. */
  function validateGroup(): { ok: true; payload: unknown } | { ok: false } {
    const fail = (e: FieldErrors, msg = "Lütfen işaretli alanları düzelt.") => {
      setErrors(e);
      setFormError(msg);
      return { ok: false as const };
    };
    if (questions) {
      for (const [qi, key] of questions.entries()) {
        const e = validateQuestion(key);
        if (Object.keys(e).length) {
          setQ(qi);
          return fail(e);
        }
      }
    }
    switch (group.key) {
      case "profile":
        return { ok: true, payload: { displayName: draft.displayName, username: draft.username, categories: draft.categories, headline: draft.headline, bio: draft.bio, location: draft.location } };
      case "contact":
        return { ok: true, payload: { country: draft.phoneCountry, national: draft.phoneNational, preference: draft.contactPreference, consent: draft.contactConsent } };
      case "social": {
        const links = addedSocials(draft).map((p) => ({ platform: p, handle: draft.socials[p].handle.trim(), audience: socialMeta(p)?.audience ? draft.socials[p].audience : null }));
        const choosable = links.filter((l) => l.platform !== "website").map((l) => l.platform);
        const primary = draft.primary && choosable.includes(draft.primary) ? draft.primary : (choosable[0] ?? null);
        return { ok: true, payload: { links, primary } };
      }
      case "verify": {
        const payload = { legalName: draft.legalName, birthYear: draft.birthYear, declared: draft.declared };
        const r = creatorVerifySchema.safeParse(payload);
        return r.success ? { ok: true, payload } : fail(issuesToErrors(r.error.issues));
      }
      case "twin": {
        const payload = { displayName: draft.twinName, shortBio: draft.shortBio, greeting: draft.greeting, consentPersona: draft.consentPersona };
        const r = creatorTwinSchema.safeParse(payload);
        return r.success ? { ok: true, payload } : fail(issuesToErrors(r.error.issues, { displayName: "twinName" }));
      }
      case "customize": {
        const payload = {
          warmth: draft.warmth,
          formality: draft.formality,
          humor: draft.humor,
          energy: draft.energy,
          emojiUsage: draft.emojiUsage,
          messageLength: draft.messageLength,
          allowedTopics: draft.allowedTopics,
          blockedTopics: draft.blockedTopics,
          allowPersonalQuestions: draft.allowPersonalQuestions,
          allowMediaRequests: draft.allowMediaRequests,
          allowCustomRequests: draft.allowCustomRequests,
          knowledgeConsent: draft.knowledgeConsent,
          voiceConsent: view.verification.identity === "verified" ? draft.voiceConsent : false,
        };
        const r = creatorCustomizeSchema.safeParse(payload);
        return r.success ? { ok: true, payload } : fail(issuesToErrors(r.error.issues));
      }
      default:
        return { ok: true, payload: null };
    }
  }

  function onNext() {
    setFormError(null);
    // Soru soru ilerleyen adımlarda: yalnız mevcut soru doğrulanır, son soruda grup kaydedilir.
    if (questions && qKey) {
      const e = validateQuestion(qKey);
      if (Object.keys(e).length) return setErrors(e);
      setErrors({});
      if (!lastQuestion) return setQ(q + 1);
    }
    const v = validateGroup();
    if (!v.ok) return;
    startTransition(async () => {
      if (group.key === "review") {
        const r = await submitCreatorApplicationAction();
        if (!r.ok) return setFormError(r.error);
        toast.success(r.message ?? "Başvurun incelemeye gönderildi.");
        router.refresh();
        return;
      }
      const actions = {
        profile: saveCreatorProfileAction,
        contact: saveCreatorContactAction,
        social: saveCreatorSocialAction,
        verify: saveCreatorVerifyAction,
        twin: saveCreatorTwinAction,
        customize: saveCreatorCustomizeAction,
      } as const;
      const r = await actions[group.key](v.payload);
      if (!r.ok) {
        if (r.fieldErrors) {
          const e = issuesToErrors(Object.entries(r.fieldErrors).map(([path, m]) => ({ path: [path], message: m[0] ?? "Geçersiz değer" })), group.key === "twin" ? { displayName: "twinName" } : {});
          setErrors(e);
          // Hatalı alanın sorusuna dön
          if (questions) {
            const target = Object.keys(e).map(questionOfField).find((k): k is string => !!k && questions.includes(k));
            if (target) setQ(questions.indexOf(target));
          }
        }
        setFormError(r.error);
        return;
      }
      setCompleted((c) => [...new Set([...c, ...group.backend])]);
      if (r.message) toast.success(r.message);
      go(index + 1);
    });
  }

  /** Sosyal medya sorusunda "Bu platformu kullanmıyorum". */
  function skipPlatform(p: SocialPlatform) {
    set("socials", { ...draft.socials, [p]: { handle: "", audience: null, skip: true } });
    setErrors({});
    if (!lastQuestion) setQ(q + 1);
  }

  const shared = { view, draft, set, errors };
  const qProps = { ...shared, qRef, number: q + 1, total: questions?.length ?? 1 };
  const isSocialQ = group.key === "social" && qKey && qKey !== "primary";
  const cta = questions && !lastQuestion ? "Devam Et" : head.cta;

  return (
    <form
      className="flex min-h-full flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending && !(group.key === "review" && missing.length > 0)) onNext();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink">İçerik üreticisi başvurusu</p>
        <p className="text-[11px] font-black uppercase tracking-wide text-ink">
          {CREATOR_GROUPS.length} adımın {index + 1}.&apos;si
        </p>
      </div>
      <div className="mt-4">
        <PillStepper steps={CREATOR_GROUPS} current={index} done={doneIdx} reachable={reachable} onSelect={(i) => go(i)} />
      </div>

      {view.application?.status === "changes_requested" && (
        <FormAlert tone="warn" className="mt-5">
          <p className="font-extrabold">Başvurun için düzenleme istendi</p>
          {view.application.decisionNote && <p className="mt-0.5 font-medium">&quot;{view.application.decisionNote}&quot;</p>}
          <p className="mt-0.5 font-medium">Gerekli değişiklikleri yapıp başvurunu yeniden gönderebilirsin.</p>
        </FormAlert>
      )}

      <section className="mt-6 flex-1" aria-labelledby={questions ? "cr-q-title" : "cr-step-title"}>
        {questions ? (
          <div className="mb-6 border-b border-line pb-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{head.eyebrow}</p>
            <h1 id="cr-step-title" ref={headingRef} tabIndex={-1} className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-ink outline-none">
              {head.title} <span className="text-brand-500">{head.accent}</span>
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-strong">{head.text}</p>
          </div>
        ) : (
          <StepHead eyebrow={head.eyebrow} title={head.title} accent={head.accent} text={head.text} headingRef={headingRef} />
        )}
        <div className={questions ? "" : "mt-6"}>
          {qKey === "identity" && <QIdentity key={qKey} {...qProps} usernameState={usernameState} setUsernameState={setUsernameState} />}
          {qKey === "categories" && <QCategories key={qKey} {...qProps} categories={categories} />}
          {qKey === "about" && <QAbout key={qKey} {...qProps} />}
          {qKey === "phone" && <QPhone key={qKey} {...qProps} />}
          {qKey === "preference" && <QPreference key={qKey} {...qProps} />}
          {isSocialQ && <QSocial key={qKey} {...qProps} platform={qKey as SocialPlatform} />}
          {qKey === "primary" && <QPrimary key={qKey} {...qProps} onEdit={(p) => go(index, CREATOR_QUESTIONS.social.indexOf(p))} />}
          {group.key === "verify" && <StepVerify {...shared} />}
          {group.key === "twin" && <StepTwin {...shared} consentText={consentTexts.persona} />}
          {group.key === "customize" && <StepCustomize {...shared} consentTexts={consentTexts} />}
          {group.key === "review" && <StepReview view={view} draft={draft} categories={categories} completed={completed} missing={missing} />}
        </div>
        {formError && (
          <FormAlert className="mt-5">
            <p>{formError}</p>
          </FormAlert>
        )}
      </section>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        {index > 0 || q > 0 ? (
          <Button type="button" variant="secondary" size="lg" className="h-[54px] rounded-[10px]" onClick={back} disabled={pending}>
            <ArrowLeft className="rtl:-scale-x-100" aria-hidden /> Geri
          </Button>
        ) : (
          <span className="text-xs text-muted">Her adımın sonunda ilerlemen kaydedilir; kaldığın yerden devam edebilirsin.</span>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          {isSocialQ && (
            <Button type="button" variant="ghost" size="lg" className="h-[54px] rounded-[10px] text-muted-strong" onClick={() => skipPlatform(qKey as SocialPlatform)} disabled={pending}>
              Bu platformu kullanmıyorum
            </Button>
          )}
          <Button type="submit" size="lg" loading={pending} disabled={group.key === "review" && missing.length > 0} className="h-[54px] min-w-[200px] rounded-[10px] bg-gradient-to-r from-brand-500 to-brand-600 text-[14px]">
            {cta} <ArrowRight className="rtl:-scale-x-100 size-[18px]" aria-hidden />
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ─── Başlatma ──────────────────────────────────────────── */
export function CreatorStartGate({ error }: { error?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(error ?? null);
  return (
    <div className="m-auto max-w-[520px] py-6 text-center">
      <span className="mx-auto mb-5 grid size-[76px] place-items-center rounded-[22px] bg-brand-100 text-brand-500">
        <Crown className="size-8" aria-hidden />
      </span>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-500">İçerik üreticisi başvurusu</p>
      <h1 className="mt-2.5 font-display text-[32px] font-extrabold leading-[1.06] tracking-[-0.035em] [word-spacing:0.07em] text-ink sm:text-[38px]">
        Kendi AI ikizini <span className="text-brand-500">oluştur.</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-strong">Profilini kur, kimliğini doğrulat ve AI ikizini yetkilendir. Hayran hesabın aynen kalır; istediğin zaman her iki tarafı kullanabilirsin.</p>
      {formError && (
        <FormAlert className="mt-5 text-start">
          <p>{formError}</p>
        </FormAlert>
      )}
      <div className="mt-6 space-y-3">
        <Button
          type="button"
          size="lg"
          loading={pending}
          className="h-[54px] w-full rounded-[10px] bg-gradient-to-r from-brand-500 to-brand-600 text-[14px]"
          onClick={() =>
            startTransition(async () => {
              const r = await startCreatorOnboardingAction();
              if (!r.ok) return setFormError(r.error);
              router.refresh();
            })
          }
        >
          Yolculuğa Başla <ArrowRight className="rtl:-scale-x-100 size-[18px]" aria-hidden />
        </Button>
        <Link href="/app" className="block text-[13px] font-semibold text-muted hover:text-ink-soft">
          Şimdilik hayran olarak devam et
        </Link>
      </div>
    </div>
  );
}

/* ─── Durum panelleri ───────────────────────────────────── */
function StatusShell({ icon, tone, eyebrow, title, accent, children }: { icon: React.ReactNode; tone: string; eyebrow: string; title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="m-auto max-w-[540px] py-6 text-center">
      <span className={`mx-auto mb-5 grid size-[76px] place-items-center rounded-[22px] [&>svg]:size-8 ${tone}`}>{icon}</span>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p>
      <h1 className="mt-2.5 font-display text-[32px] font-extrabold leading-[1.06] tracking-[-0.035em] [word-spacing:0.07em] text-ink sm:text-[38px]">
        {title} <span className="text-brand-500">{accent}</span>
      </h1>
      <div className="mt-4 text-[15px] leading-relaxed text-muted-strong">{children}</div>
    </div>
  );
}

function PendingPanel({ submittedAt }: { submittedAt: string | null }) {
  return (
    <StatusShell icon={<Clock aria-hidden />} tone="bg-warning-soft text-warning" eyebrow="Başvuru durumu" title="Başvurun" accent="incelemede.">
      <p>Ekibimiz profilini, kimlik talebini ve AI ikizini inceliyor{submittedAt ? ` (gönderim: ${formatDate(submittedAt)})` : ""}. Sonuç bildirim olarak iletilir.</p>
      <p className="mt-3 text-xs text-muted">Onaylanana kadar profilin ve AI ikizin yayında olmaz. Bu sürede hayran hesabınla HEYFANS&apos;ı kullanmaya devam edebilirsin.</p>
      <div className="mt-6 space-y-3">
        <PrimaryLink href="/app">Hayran Paneline Git</PrimaryLink>
        <Link href="/help" className="block text-[13px] font-bold text-brand-500 hover:underline">
          Yardım Merkezi
        </Link>
      </div>
    </StatusShell>
  );
}

function ApprovedPanel() {
  return (
    <StatusShell icon={<PartyPopper aria-hidden />} tone="bg-success-soft text-success" eyebrow="Başvuru durumu" title="Başvurun" accent="onaylandı.">
      <p>Creator Studio&apos;da profilini, AI ikizini ve içeriklerini yönetebilirsin.</p>
      <div className="mt-6">
        <PrimaryLink href="/studio">Creator Studio&apos;ya Git</PrimaryLink>
      </div>
    </StatusShell>
  );
}

function RejectedPanel({ note }: { note: string | null }) {
  return (
    <StatusShell icon={<XCircle aria-hidden />} tone="bg-danger-soft text-danger" eyebrow="Başvuru durumu" title="Başvurun" accent="onaylanmadı.">
      <p>Ekibimiz başvurunu bu aşamada onaylamadı.</p>
      {note && (
        <FormAlert className="mt-4 text-start">
          <p className="font-extrabold">Yönetici notu</p>
          <p className="mt-0.5 font-medium">{note}</p>
        </FormAlert>
      )}
      <div className="mt-6 space-y-3">
        <PrimaryLink href="/help" arrow={false} outline>
          Destekle İletişime Geç
        </PrimaryLink>
        <Link href="/app" className="block text-[13px] font-semibold text-muted hover:text-ink-soft">
          Hayran olarak devam et
        </Link>
      </div>
    </StatusShell>
  );
}

function SuspendedPanel() {
  return (
    <StatusShell icon={<ShieldAlert aria-hidden />} tone="bg-danger-soft text-danger" eyebrow="Hesap durumu" title="Creator hesabın" accent="askıda.">
      <p>Creator hesabın şu anda askıya alınmış durumda. Ayrıntılar için destek ekibiyle iletişime geçebilirsin.</p>
      <div className="mt-6 space-y-3">
        <PrimaryLink href="/help" arrow={false} outline>
          Destekle İletişime Geç
        </PrimaryLink>
        <Link href="/app" className="block text-[13px] font-semibold text-muted hover:text-ink-soft">
          Hayran olarak devam et
        </Link>
      </div>
    </StatusShell>
  );
}
