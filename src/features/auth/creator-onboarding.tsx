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
import { submitCreatorApplicationAction, saveCreatorConnectAction, saveCreatorCustomizeAction, saveCreatorTwinAction, saveCreatorVerifyAction, startCreatorOnboardingAction } from "@/features/auth/creator-actions";
import { CREATOR_GROUPS, creatorGroupDone, type CreatorGroupKey } from "@/features/auth/constants";
import { initialDraft, type ConsentTexts, type CreatorCategory, type CreatorDraft, type CreatorOnboardingView, type FieldErrors } from "@/features/auth/creator-types";
import { StepConnect, StepCustomize, StepHead, StepReview, StepTwin, StepVerify } from "@/features/auth/creator-steps";
import { creatorConnectSchema, creatorCustomizeSchema, creatorTwinSchema, creatorVerifySchema } from "@/features/auth/schemas";

const HEADS: Record<CreatorGroupKey, { eyebrow: string; title: string; accent: string; text: string; cta: string }> = {
  connect: {
    eyebrow: "Adım 01 — Hesabını kur",
    title: "Topluluğunu getir.",
    accent: "Birlikte büyüyelim.",
    text: "Profilini oluştur ve üretici hesaplarını ekleyerek kimliğini doğrulamaya başla.",
    cta: "Doğrulamaya Devam Et",
  },
  verify: {
    eyebrow: "Adım 02 — Kimliğini doğrula",
    title: "Gerçek sen",
    accent: "olduğunu göster.",
    text: "Kimlik doğrulama hayranlarına güven verir ve AI ikizinin senin adına konuşabilmesinin ön koşuludur.",
    cta: "AI İkizine Devam Et",
  },
  twin: {
    eyebrow: "Adım 03 — AI ikizini oluştur",
    title: "AI ikizini",
    accent: "tanıştır.",
    text: "İkizin adını, kısa tanıtımını ve ilk selamını belirle. Yanıtları her zaman “AI İkizi” etiketiyle gösterilir.",
    cta: "Özelleştirmeye Devam Et",
  },
  customize: {
    eyebrow: "Adım 04 — Özelleştir",
    title: "Senin kuralların,",
    accent: "senin tarzın.",
    text: "Kişiliği, konuları ve sınırları sen belirlersin. Rızaların her an geri çekilebilir.",
    cta: "İncelemeye Devam Et",
  },
  review: {
    eyebrow: "Adım 05 — İncele",
    title: "Her şey hazır mı?",
    accent: "Son bir kontrol.",
    text: "Bilgilerini gözden geçir ve başvurunu incelemeye gönder.",
    cta: "Başvuruyu Gönder",
  },
};

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

/* ─── Sihirbaz ──────────────────────────────────────────── */
function Wizard({ view, categories, consentTexts }: { view: CreatorOnboardingView; categories: CreatorCategory[]; consentTexts: ConsentTexts }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<CreatorDraft>(() => initialDraft(view));
  const [completed, setCompleted] = React.useState<string[]>(view.completedSteps);
  const [index, setIndex] = React.useState(() => Math.max(0, CREATOR_GROUPS.findIndex((g) => g.key === view.resumeGroup)));
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const headingRef = useStepFocus(index);

  const set = React.useCallback(<K extends keyof CreatorDraft>(key: K, value: CreatorDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!(key in e) && !Object.keys(e).some((k) => k.startsWith(`${String(key)}.`))) return e;
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  }, []);

  const completedSet = React.useMemo(() => new Set(completed), [completed]);
  const doneIdx = CREATOR_GROUPS.map((g, i) => (creatorGroupDone(g.key, completedSet) ? i : -1)).filter((i) => i >= 0);
  const firstOpen = CREATOR_GROUPS.findIndex((g) => !creatorGroupDone(g.key, completedSet));
  const reachable = firstOpen === -1 ? CREATOR_GROUPS.length - 1 : firstOpen;
  const group = CREATOR_GROUPS[index]!;
  const head = HEADS[group.key];
  const missing = [
    !completedSet.has("account") && "Hesap bilgileri",
    !completedSet.has("verify") && "Kimlik doğrulama talebi",
    !completedSet.has("twin") && "AI ikizi",
    !(completedSet.has("persona") && completedSet.has("boundaries")) && "Kişilik ve sınırlar",
  ].filter(Boolean) as string[];

  function go(i: number) {
    setErrors({});
    setFormError(null);
    setIndex(i);
  }

  /** İstemci tarafı doğrulama; hata yoksa sunucuya gönderilecek yükü döndürür. */
  function validate(): { ok: true; payload: unknown } | { ok: false } {
    const fail = (e: FieldErrors) => {
      setErrors(e);
      setFormError("Lütfen işaretli alanları düzelt.");
      return { ok: false as const };
    };
    if (group.key === "connect") {
      const linkErrors: FieldErrors = {};
      const links = Object.entries(draft.links)
        .map(([platform, handle]) => ({ platform, handle: handle.trim() }))
        .filter((l) => l.handle);
      for (const l of links) if (l.handle.length < 2) linkErrors[`link.${l.platform}`] = "En az 2 karakter.";
      const payload = { displayName: draft.displayName, username: draft.username, headline: draft.headline, categories: draft.categories, links };
      const r = creatorConnectSchema.safeParse(payload);
      const errs = { ...(r.success ? {} : issuesToErrors(r.error.issues)), ...linkErrors };
      if (Object.keys(errs).length) return fail(errs);
      return { ok: true, payload };
    }
    if (group.key === "verify") {
      const payload = { legalName: draft.legalName, birthYear: draft.birthYear, declared: draft.declared };
      const r = creatorVerifySchema.safeParse(payload);
      if (!r.success) return fail(issuesToErrors(r.error.issues));
      return { ok: true, payload };
    }
    if (group.key === "twin") {
      const payload = { displayName: draft.twinName, shortBio: draft.shortBio, greeting: draft.greeting, consentPersona: draft.consentPersona };
      const r = creatorTwinSchema.safeParse(payload);
      if (!r.success) return fail(issuesToErrors(r.error.issues, { displayName: "twinName" }));
      return { ok: true, payload };
    }
    if (group.key === "customize") {
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
      if (!r.success) return fail(issuesToErrors(r.error.issues));
      return { ok: true, payload };
    }
    return { ok: true, payload: null };
  }

  function onNext() {
    setFormError(null);
    const v = validate();
    if (!v.ok) return;
    startTransition(async () => {
      if (group.key === "review") {
        const r = await submitCreatorApplicationAction();
        if (!r.ok) return setFormError(r.error);
        toast.success(r.message ?? "Başvurun incelemeye gönderildi.");
        router.refresh();
        return;
      }
      const action = { connect: saveCreatorConnectAction, verify: saveCreatorVerifyAction, twin: saveCreatorTwinAction, customize: saveCreatorCustomizeAction }[group.key];
      const r = await action(v.payload);
      if (!r.ok) {
        if (r.fieldErrors) setErrors(issuesToErrors(Object.entries(r.fieldErrors).map(([path, m]) => ({ path: [path.split(".")[0]!], message: m[0] ?? "Geçersiz değer" })), group.key === "twin" ? { displayName: "twinName" } : {}));
        setFormError(r.error);
        return;
      }
      setCompleted((c) => [...new Set([...c, ...group.backend])]);
      if (r.message) toast.success(r.message);
      go(index + 1);
    });
  }

  const shared = { view, draft, set, errors };
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink">İçerik üreticisi karşılama</p>
        <p className="text-[11px] font-black uppercase tracking-wide text-ink">
          {CREATOR_GROUPS.length} adımın {index + 1}.&apos;si
        </p>
      </div>
      <div className="mt-4">
        <PillStepper steps={CREATOR_GROUPS} current={index} done={doneIdx} reachable={reachable} onSelect={go} />
      </div>

      {view.application?.status === "changes_requested" && (
        <FormAlert tone="warn" className="mt-5">
          <p className="font-extrabold">Başvurun için düzenleme istendi</p>
          {view.application.decisionNote && <p className="mt-0.5 font-medium">&quot;{view.application.decisionNote}&quot;</p>}
          <p className="mt-0.5 font-medium">Gerekli değişiklikleri yapıp başvurunu yeniden gönderebilirsin.</p>
        </FormAlert>
      )}

      <section className="mt-6 flex-1" aria-labelledby="cr-step-title">
        <StepHead eyebrow={head.eyebrow} title={head.title} accent={head.accent} text={head.text} headingRef={headingRef} />
        <div className="mt-6">
          {group.key === "connect" && <StepConnect {...shared} categories={categories} />}
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

      <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5">
        {index > 0 ? (
          <Button type="button" variant="secondary" size="lg" className="h-[54px] rounded-[10px]" onClick={() => go(index - 1)} disabled={pending}>
            <ArrowLeft aria-hidden /> Geri
          </Button>
        ) : (
          <span className="text-xs text-muted">Her adımda ilerlemen kaydedilir; kaldığın yerden devam edebilirsin.</span>
        )}
        <Button type="button" size="lg" onClick={onNext} loading={pending} disabled={group.key === "review" && missing.length > 0} className="h-[54px] min-w-[200px] rounded-[10px] bg-gradient-to-r from-brand-500 to-brand-600 text-[14px]">
          {head.cta} <ArrowRight className="size-[18px]" aria-hidden />
        </Button>
      </div>
    </div>
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
        <FormAlert className="mt-5 text-left">
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
          Yolculuğa Başla <ArrowRight className="size-[18px]" aria-hidden />
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
        <FormAlert className="mt-4 text-left">
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
