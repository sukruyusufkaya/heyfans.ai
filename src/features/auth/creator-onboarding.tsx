"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, Crown, PartyPopper, ShieldAlert, XCircle } from "lucide-react";
import { FormAlert, PrimaryLink } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { startCreatorOnboardingAction } from "@/features/auth/creator-actions";
import { CreatorAssistant } from "@/features/auth/creator-assistant";
import { useFormatters, useT } from "@/i18n/client";
import type { CreatorAssistantView } from "@/services/auth/creator-assistant";

/** Başvuru durumuna göre: sohbet asistanı (onboarding) ya da durum paneli. */
export function CreatorOnboarding({ view, ...assistant }: { view: CreatorAssistantView } & Omit<React.ComponentProps<typeof CreatorAssistant>, "initialView">) {
  if (view.status === "pending_review") return <PendingPanel submittedAt={view.submittedAt} />;
  if (view.status === "approved") return <ApprovedPanel />;
  if (view.status === "rejected") return <RejectedPanel note={view.application?.decisionNote ?? null} />;
  if (view.status === "suspended") return <SuspendedPanel />;
  return <CreatorAssistant initialView={view} {...assistant} />;
}

/* ─── Başlatma ──────────────────────────────────────────── */
export function CreatorStartGate({ error }: { error?: string | null }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(error ?? null);
  return (
    <div className="m-auto max-w-[520px] py-6 text-center">
      <span className="mx-auto mb-5 grid size-[76px] place-items-center rounded-[22px] bg-brand-100 text-brand-500">
        <Crown className="size-8" aria-hidden />
      </span>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-500">{t("İçerik üreticisi başvurusu")}</p>
      <h1 className="mt-2.5 font-display text-[32px] font-extrabold leading-[1.06] tracking-[-0.035em] [word-spacing:0.07em] text-ink sm:text-[38px]">
        {t.rich("Kendi AI ikizini <mark>oluştur.</mark>", { mark: (c) => <span className="text-brand-500">{c}</span> })}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-strong">{t("Profilini kur, kimliğini doğrulat ve AI ikizini yetkilendir. Hayran hesabın aynen kalır; istediğin zaman her iki tarafı kullanabilirsin.")}</p>
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
          {t("Yolculuğa Başla")} <ArrowRight className="rtl:-scale-x-100 size-[18px]" aria-hidden />
        </Button>
        <Link href="/app" className="block text-[13px] font-semibold text-muted hover:text-ink-soft">
          {t("Şimdilik hayran olarak devam et")}
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
  const t = useT();
  const { formatDate } = useFormatters();
  return (
    <StatusShell icon={<Clock aria-hidden />} tone="bg-warning-soft text-warning" eyebrow={t("Başvuru durumu")} title={t("Başvurun")} accent={t("incelemede.")}>
      <p>{submittedAt ? t("Ekibimiz profilini, kimlik talebini ve AI ikizini inceliyor (gönderim: {date}). Sonuç bildirim olarak iletilir.", { date: formatDate(submittedAt) }) : t("Ekibimiz profilini, kimlik talebini ve AI ikizini inceliyor. Sonuç bildirim olarak iletilir.")}</p>
      <p className="mt-3 text-xs text-muted">{t("Onaylanana kadar profilin ve AI ikizin yayında olmaz. Bu sürede hayran hesabınla HEYFANS'ı kullanmaya devam edebilirsin.")}</p>
      <div className="mt-6 space-y-3">
        <PrimaryLink href="/app">{t("Hayran Paneline Git")}</PrimaryLink>
        <Link href="/help" className="block text-[13px] font-bold text-brand-500 hover:underline">
          {t("Yardım Merkezi")}
        </Link>
      </div>
    </StatusShell>
  );
}

function ApprovedPanel() {
  const t = useT();
  return (
    <StatusShell icon={<PartyPopper aria-hidden />} tone="bg-success-soft text-success" eyebrow={t("Başvuru durumu")} title={t("Başvurun")} accent={t("onaylandı.")}>
      <p>{t("Creator Studio'da profilini, AI ikizini ve içeriklerini yönetebilirsin.")}</p>
      <div className="mt-6">
        <PrimaryLink href="/studio">{t("Creator Studio'ya Git")}</PrimaryLink>
      </div>
    </StatusShell>
  );
}

function RejectedPanel({ note }: { note: string | null }) {
  const t = useT();
  return (
    <StatusShell icon={<XCircle aria-hidden />} tone="bg-danger-soft text-danger" eyebrow={t("Başvuru durumu")} title={t("Başvurun")} accent={t("onaylanmadı.")}>
      <p>{t("Ekibimiz başvurunu bu aşamada onaylamadı.")}</p>
      {note && (
        <FormAlert className="mt-4 text-start">
          <p className="font-extrabold">{t("Yönetici notu")}</p>
          <p className="mt-0.5 font-medium">{note}</p>
        </FormAlert>
      )}
      <div className="mt-6 space-y-3">
        <PrimaryLink href="/help" arrow={false} outline>
          {t("Destekle İletişime Geç")}
        </PrimaryLink>
        <Link href="/app" className="block text-[13px] font-semibold text-muted hover:text-ink-soft">
          {t("Hayran olarak devam et")}
        </Link>
      </div>
    </StatusShell>
  );
}

function SuspendedPanel() {
  const t = useT();
  return (
    <StatusShell icon={<ShieldAlert aria-hidden />} tone="bg-danger-soft text-danger" eyebrow={t("Hesap durumu")} title={t("Creator hesabın")} accent={t("askıda.")}>
      <p>{t("Creator hesabın şu anda askıya alınmış durumda. Ayrıntılar için destek ekibiyle iletişime geçebilirsin.")}</p>
      <div className="mt-6 space-y-3">
        <PrimaryLink href="/help" arrow={false} outline>
          {t("Destekle İletişime Geç")}
        </PrimaryLink>
        <Link href="/app" className="block text-[13px] font-semibold text-muted hover:text-ink-soft">
          {t("Hayran olarak devam et")}
        </Link>
      </div>
    </StatusShell>
  );
}
