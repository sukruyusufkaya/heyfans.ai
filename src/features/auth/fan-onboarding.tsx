"use client";
import * as React from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/creator/category-icon";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { CircleStepper, useStepFocus } from "@/components/auth/wizard";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { completeFanOnboardingAction, saveFanStepAction, skipFanOnboardingAction } from "@/features/auth/actions";
import { FAN_STEPS, FAN_VIBES, MIN_FAN_INTERESTS } from "@/features/auth/constants";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";

export interface FanCategory {
  slug: string;
  name: string;
  icon: string;
}

export interface FanInitial {
  step: number;
  completed: boolean;
  interests: string[];
  vibes: string[];
  recommendationsEnabled: boolean;
  personalizationConsent: boolean;
  aiMemoryEnabled: boolean;
}

const CONSENTS = [
  {
    key: "recommendationsEnabled",
    title: m("İçerik ve üretici önerileri"),
    text: m("Seçtiğin ilgi alanlarına ve ruh haline göre sana içerik üreticileri ve AI ikizleri öneririz. Kapalıyken genel (herkese aynı) listeler gösterilir."),
  },
  {
    key: "personalizationConsent",
    title: m("Kişiselleştirme izni"),
    text: m("Gezinme ve etkileşim davranışının, sana özel öneriler ve deneyim için kullanılmasına izin verirsin. İstediğin zaman Ayarlar'dan kapatabilirsin."),
  },
  {
    key: "aiMemoryEnabled",
    title: m("AI hafızası"),
    text: m("AI ikizleri, sohbetlerde paylaştığın tercihleri (ör. adın, sevdiğin şeyler) hatırlayarak daha kişisel yanıt verir. Hafıza yalnız senin hesabında tutulur; istediğin zaman görüp silebilirsin. Kişiselleştirme izni gerektirir."),
  },
] as const;

export function FanOnboarding({ categories, initial, next, firstName }: { categories: FanCategory[]; initial: FanInitial; next: string | null; firstName: string }) {
  const t = useT();
  // Tamamlanmış/atlanmış karşılama baştan düzenlenir; yarım kalan, kaldığı adımdan devam eder.
  const startStep = initial.step >= 0 && initial.step < 3 && !initial.completed ? initial.step : 0;
  const [step, setStep] = React.useState(startStep);
  const [furthest, setFurthest] = React.useState(Math.max(startStep, initial.completed ? 3 : 0));
  const [interests, setInterests] = React.useState<string[]>(initial.interests);
  const [vibes, setVibes] = React.useState<string[]>(initial.vibes);
  const [consents, setConsents] = React.useState({
    recommendationsEnabled: initial.recommendationsEnabled,
    personalizationConsent: initial.personalizationConsent,
    aiMemoryEnabled: initial.aiMemoryEnabled,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const headingRef = useStepFocus(step);

  const catName = React.useMemo(() => new Map(categories.map((c) => [c.slug, c.name])), [categories]);
  const toggle = (list: string[], set: (v: string[]) => void, key: string) => set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  const canContinue = step === 0 ? interests.length >= MIN_FAN_INTERESTS : true;

  function go(to: number) {
    setError(null);
    setStep(to);
    setFurthest((f) => Math.max(f, to));
  }

  function onNext() {
    setError(null);
    startTransition(async () => {
      if (step === 3) {
        const r = await completeFanOnboardingAction({ interests, vibes, ...consents }, next);
        if (!r.ok) return setError(r.error);
        toast.success(t("Hazırsın! Tercihlerin kaydedildi."));
        window.location.assign(r.data.to);
        return;
      }
      const data = step === 0 ? { interests } : step === 1 ? { vibes } : consents;
      const r = await saveFanStepAction(step as 0 | 1 | 2, data);
      if (!r.ok) return setError(r.error);
      go(step + 1);
    });
  }

  function onSkip() {
    setError(null);
    startTransition(async () => {
      const r = await skipFanOnboardingAction(next);
      if (!r.ok) return setError(r.error);
      window.location.assign(r.data.to);
    });
  }

  function setConsent(key: keyof typeof consents, value: boolean) {
    setConsents((c) => {
      const n = { ...c, [key]: value };
      if (key === "personalizationConsent" && !value) n.aiMemoryEnabled = false; // hafıza kişiselleştirme izni olmadan açılamaz
      return n;
    });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-500">{t("Hayran karşılama")}</p>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-strong">
          {t("{total} adımın {current}.'si", { total: FAN_STEPS.length, current: step + 1 })}
        </p>
      </div>
      <div className="mt-4">
        <CircleStepper steps={FAN_STEPS} current={step} done={furthest} />
      </div>

      <section className="mt-7 flex-1" aria-labelledby="fan-step-title">
        {step === 0 && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("Deneyimini şekillendir")}</p>
                <h1 id="fan-step-title" ref={headingRef} tabIndex={-1} className="mt-1.5 font-display text-[30px] font-extrabold leading-tight tracking-[-0.035em] [word-spacing:0.07em] text-ink outline-none sm:text-[36px]">
                  {t.rich("Nelerle <mark>ilgileniyorsun?</mark>", { mark: (c) => <span className="text-brand-500">{c}</span> })}
                </h1>
              </div>
              <span aria-live="polite" className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold", interests.length >= MIN_FAN_INTERESTS ? "bg-brand-100 text-brand-600" : "bg-soft text-muted-strong")}>
                {t("{n} alan seçildi", { n: interests.length })} {interests.length >= MIN_FAN_INTERESTS && <Check className="size-3.5" aria-hidden />}
              </span>
            </div>
            <p className="mt-3 text-[13px] text-muted-strong">{t("En az {min} ilgi alanı seç. Sana uygun içerik üreticilerini ve AI ikizlerini önerelim.", { min: MIN_FAN_INTERESTS })}</p>
            {categories.length === 0 ? (
              <FormAlert tone="warn" className="mt-6">
                <p>{t("Kategoriler şu anda yüklenemedi. Bu adımı atlayıp daha sonra Ayarlar'dan seçebilirsin.")}</p>
              </FormAlert>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4" role="group" aria-label={t("İlgi alanları")}>
                {categories.map((c) => {
                  const on = interests.includes(c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(interests, setInterests, c.slug)}
                      className={cn("overflow-hidden rounded-xl border bg-white text-start transition-all", on ? "border-2 border-brand-500 shadow-[0_8px_22px_-10px_rgba(236,0,136,0.45)]" : "border-line hover:border-brand-200")}
                    >
                      <span className="block h-[64px] sm:h-[78px]">
                        <CreatorPhoto name={c.name} rounded="rounded-none" showMonogram={false} />
                      </span>
                      <span className="flex items-center gap-2 px-3 py-2.5">
                        <CategoryIcon name={c.icon} className="size-[18px] shrink-0 text-brand-500" />
                        <span className="min-w-0 flex-1 text-xs font-extrabold leading-tight text-ink">{c.name}</span>
                        <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-full border", on ? "border-brand-500 bg-brand-500 text-white" : "border-line text-muted")} aria-hidden>
                          {on ? <Check className="size-3" strokeWidth={3.5} /> : <Plus className="size-3" />}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("Tercihlerini belirle")}</p>
            <h1 id="fan-step-title" ref={headingRef} tabIndex={-1} className="mt-1.5 font-display text-[30px] font-extrabold leading-tight tracking-[-0.035em] [word-spacing:0.07em] text-ink outline-none sm:text-[36px]">
              {t.rich("Nasıl bir <mark>enerji</mark> arıyorsun?", { mark: (c) => <span className="text-brand-500">{c}</span> })}
            </h1>
            <p className="mt-3 text-[13px] text-muted-strong">{t("İstediğin kadarını seç; bu seçim yalnız önerileri şekillendirir, istediğin zaman değiştirebilirsin.")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label={t("Ruh halleri")}>
              {FAN_VIBES.map((v) => {
                const on = vibes.includes(v.key);
                return (
                  <button
                    key={v.key}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(vibes, setVibes, v.key)}
                    className={cn("flex min-h-[92px] flex-col justify-between rounded-xl border p-3.5 text-start transition-all", on ? "border-2 border-brand-500 bg-brand-50 p-[13px]" : "border-line bg-white hover:border-brand-200")}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-[13px] font-extrabold text-ink">{t(v.label)}</span>
                      <span className={cn("grid size-5 place-items-center rounded-full border", on ? "border-brand-500 bg-brand-500 text-white" : "border-line text-transparent")} aria-hidden>
                        <Check className="size-3" strokeWidth={3.5} />
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-strong">{t(v.hint)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("Gizlilik ve kişiselleştirme")}</p>
            <h1 id="fan-step-title" ref={headingRef} tabIndex={-1} className="mt-1.5 font-display text-[30px] font-extrabold leading-tight tracking-[-0.035em] [word-spacing:0.07em] text-ink outline-none sm:text-[36px]">
              {t.rich("Deneyimini <mark>sen yönet.</mark>", { mark: (c) => <span className="text-brand-500">{c}</span> })}
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-strong">{t("Aşağıdaki izinlerin hiçbiri zorunlu değil. Kapalı bırakırsan da HEYFANS'ı tam olarak kullanabilirsin; istediğin zaman Ayarlar'dan değiştirirsin.")}</p>
            <ul className="mt-5 space-y-3">
              {CONSENTS.map((c) => {
                const disabled = c.key === "aiMemoryEnabled" && !consents.personalizationConsent;
                return (
                  <li key={c.key} className={cn("flex items-start gap-4 rounded-xl border border-line bg-white p-4", disabled && "opacity-60")}>
                    <div className="min-w-0 flex-1">
                      <p id={`consent-${c.key}`} className="text-[13px] font-extrabold text-ink">
                        {t(c.title)}
                      </p>
                      <p id={`consent-${c.key}-desc`} className="mt-1 text-xs leading-relaxed text-muted-strong">
                        {t(c.text)}
                      </p>
                    </div>
                    <Switch checked={consents[c.key]} disabled={disabled} onCheckedChange={(v) => setConsent(c.key, v)} aria-labelledby={`consent-${c.key}`} aria-describedby={`consent-${c.key}-desc`} />
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("Neredeyse bitti")}</p>
            <h1 id="fan-step-title" ref={headingRef} tabIndex={-1} className="mt-1.5 font-display text-[30px] font-extrabold leading-tight tracking-[-0.035em] [word-spacing:0.07em] text-ink outline-none sm:text-[36px]">
              {firstName
                ? t.rich("Hazırsın, {name}! <mark>Özetin burada.</mark>", { name: firstName, mark: (c) => <span className="text-brand-500">{c}</span> })
                : t.rich("Hazırsın! <mark>Özetin burada.</mark>", { mark: (c) => <span className="text-brand-500">{c}</span> })}
            </h1>
            <dl className="mt-6 space-y-4 rounded-2xl border border-line bg-soft/60 p-5">
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{t("İlgi alanların")}</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {interests.length ? interests.map((s) => <Chip key={s}>{catName.get(s) ?? s}</Chip>) : <span className="text-xs text-muted">{t("Seçilmedi")}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{t("Ruh halin")}</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {vibes.length ? vibes.map((s) => {
                    const label = FAN_VIBES.find((v) => v.key === s)?.label;
                    return <Chip key={s}>{label ? t(label) : s}</Chip>;
                  }) : <span className="text-xs text-muted">{t("Seçilmedi")}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{t("İzinler")}</dt>
                <dd className="mt-2 grid gap-1.5 text-xs text-ink-soft sm:grid-cols-3">
                  <Status on={consents.recommendationsEnabled} label={t("Öneriler")} />
                  <Status on={consents.personalizationConsent} label={t("Kişiselleştirme")} />
                  <Status on={consents.aiMemoryEnabled} label={t("AI hafızası")} />
                </dd>
              </div>
            </dl>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-strong">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-500" aria-hidden />
              {t("Bu tercihleri istediğin zaman Ayarlar > Kişiselleştirme bölümünden değiştirebilir, AI hafızanı silebilirsin.")}
            </p>
          </>
        )}

        {error && (
          <FormAlert className="mt-5">
            <p>{error}</p>
          </FormAlert>
        )}
      </section>

      <div className="mt-7 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button type="button" variant="secondary" size="lg" className="h-[54px] rounded-[10px]" onClick={() => go(step - 1)} disabled={pending}>
              <ArrowLeft className="rtl:-scale-x-100" aria-hidden /> {t("Geri")}
            </Button>
          )}
          <button type="button" onClick={onSkip} disabled={pending} className="text-[13px] font-semibold text-muted hover:text-ink-soft disabled:opacity-60">
            {t("Şimdilik geç")}
          </button>
        </div>
        <Button type="button" size="lg" onClick={onNext} disabled={!canContinue} loading={pending} className="h-[54px] min-w-[170px] rounded-[10px] bg-gradient-to-r from-brand-500 to-brand-600 text-[14px]">
          {step === 3 ? t("HEYFANS'a Başla") : t("Devam Et")} <ArrowRight className="rtl:-scale-x-100 size-[18px]" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-brand-100 px-3 py-1.5 text-[11px] font-extrabold text-brand-600">{children}</span>;
}

function Status({ on, label }: { on: boolean; label: string }) {
  const t = useT();
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("grid size-4 place-items-center rounded-full", on ? "bg-success text-white" : "bg-[#e3dbe5] text-transparent")} aria-hidden>
        <Check className="size-2.5" strokeWidth={4} />
      </span>
      <span>{t.rich("{label}: <b>{state}</b>", { label, state: on ? t("açık") : t("kapalı"), b: (c) => <strong>{c}</strong> })}</span>
    </span>
  );
}
