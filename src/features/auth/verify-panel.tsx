"use client";
import * as React from "react";
import Link from "next/link";
import { BadgeCheck, CheckCheck, Mail, MailWarning, Sparkles } from "lucide-react";
import { AuthField, AuthHeading, FormAlert, IconBadge, linkCls, PrimaryButton, PrimaryLink } from "@/components/auth/auth-ui";
import { Input } from "@/components/ui/form-controls";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { postLoginRedirect } from "@/features/auth/actions";
import { authErrorText, NETWORK_ERROR } from "@/features/auth/client-errors";
import { emailField } from "@/features/auth/schemas";
import { useCooldown } from "@/features/auth/use-cooldown";

const WEBMAIL: { test: RegExp; url: string }[] = [
  { test: /@(gmail|googlemail)\.com$/i, url: "https://mail.google.com" },
  { test: /@(outlook|hotmail|live|msn)\.[a-z.]+$/i, url: "https://outlook.live.com/mail" },
  { test: /@yahoo\.[a-z.]+$/i, url: "https://mail.yahoo.com" },
  { test: /@(icloud|me)\.com$/i, url: "https://www.icloud.com/mail" },
  { test: /@yandex\.[a-z.]+$/i, url: "https://mail.yandex.com" },
  { test: /@(proton\.me|protonmail\.com)$/i, url: "https://mail.proton.me" },
];
const mailHref = (email: string) => WEBMAIL.find((w) => w.test.test(email))?.url ?? "mailto:";

const STEPS = [
  { n: "01", label: "E-postanı aç", Icon: Mail },
  { n: "02", label: "Doğrula", Icon: BadgeCheck },
  { n: "03", label: "Keşfetmeye başla", Icon: Sparkles },
];

function StepStrip({ active }: { active: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-start justify-between gap-2" aria-label="Doğrulama adımları">
      {STEPS.map(({ n, label, Icon }, i) => (
        <React.Fragment key={n}>
          <li className="flex w-[84px] shrink-0 flex-col items-center gap-1 text-center" aria-current={i === active ? "step" : undefined}>
            <Icon className={cn("size-[18px]", i <= active ? "text-brand-500" : "text-muted")} aria-hidden />
            <span className="text-[11px] font-extrabold text-ink">{n}</span>
            <span className="text-[10px] leading-tight text-muted">{label}</span>
          </li>
          {i < STEPS.length - 1 && <span className="mt-3 h-px min-w-2 flex-1 bg-line" aria-hidden />}
        </React.Fragment>
      ))}
    </ol>
  );
}

/** "Gelen kutunu kontrol et" durumu + yeniden gönderme (60 sn bekleme). `error` varsa bağlantı sorunu da gösterilir. */
export function VerifyPending({ email: initialEmail, next, showDevOutbox, errorMessage }: { email: string; next: string | null; showDevOutbox: boolean; errorMessage?: string | null }) {
  const [email, setEmail] = React.useState(initialEmail);
  const [draft, setDraft] = React.useState("");
  const [draftError, setDraftError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [sending, setSending] = React.useState(false);
  const cooldown = useCooldown(`hf.verify.cooldown.${email.toLowerCase()}`, 60);
  const callbackURL = `/verify?verified=1${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  async function resend(target: string) {
    setNotice(null);
    setSending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({ email: target, callbackURL });
      if (error) {
        setNotice({ tone: "danger", text: authErrorText(error) });
        return;
      }
      cooldown.start();
      setNotice({ tone: "success", text: "Doğrulama bağlantısı gönderildi (bu adresle bekleyen bir kayıt varsa)." });
    } catch {
      setNotice({ tone: "danger", text: NETWORK_ERROR });
    } finally {
      setSending(false);
    }
  }

  function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailField.safeParse(draft);
    if (!parsed.success) {
      setDraftError(parsed.error.issues[0]?.message ?? "Geçerli bir e-posta adresi gir.");
      return;
    }
    setDraftError(null);
    setEmail(parsed.data);
    void resend(parsed.data);
  }

  return (
    <div className="text-center">
      <IconBadge badge={errorMessage ? undefined : <CheckCheck />} className={cn(errorMessage && "bg-warning-soft text-warning")}>
        {errorMessage ? <MailWarning aria-hidden /> : <Mail aria-hidden />}
      </IconBadge>
      <AuthHeading center eyebrow="HESAP DOĞRULAMA" title={errorMessage ? "Bağlantı" : "E-postanı"} accent={errorMessage ? "sorunu." : "kontrol et."} />
      {errorMessage && (
        <FormAlert className="mt-5 text-left">
          <p>{errorMessage}</p>
        </FormAlert>
      )}

      {email ? (
        <>
          <p className="mt-4 text-[15px] text-muted-strong">{errorMessage ? "Yeni bir doğrulama bağlantısı isteyebilirsin:" : "Doğrulama bağlantısını bu adrese gönderdik:"}</p>
          <p className="mx-auto mt-3 inline-block max-w-full break-all rounded-full bg-soft px-5 py-2.5 text-[15px] font-extrabold text-ink">{email}</p>
          <p className="mt-4 text-xs text-muted-strong">HEYFANS hesabını etkinleştirmek için gelen kutundaki bağlantıya tıkla. Bağlantı 24 saat geçerlidir.</p>
          <div className="mt-6">
            <StepStrip active={errorMessage ? 1 : 0} />
          </div>
          <div className="mt-7 space-y-4">
            <PrimaryLink href={mailHref(email)}>E-posta Uygulamasını Aç</PrimaryLink>
            <div className="text-xs text-muted">
              <p>E-posta ulaşmadı mı?</p>
              <button type="button" disabled={cooldown.active || sending} onClick={() => resend(email)} className={cn(linkCls, "mt-1 text-xs disabled:cursor-not-allowed disabled:text-muted disabled:no-underline")}>
                {cooldown.active ? `Yeniden göndermek için ${cooldown.remaining} sn bekle` : sending ? "Gönderiliyor…" : "Bağlantıyı yeniden gönder"}
              </button>
              <div className="mt-2">
                <button type="button" onClick={() => setEmail("")} className={cn(linkCls, "text-xs")}>
                  E-posta adresini değiştir
                </button>
              </div>
            </div>
            {notice && (
              <FormAlert tone={notice.tone} className="text-left">
                <p>{notice.text}</p>
              </FormAlert>
            )}
            {showDevOutbox && (
              <p className="rounded-xl bg-warning-soft px-3 py-2.5 text-xs font-semibold text-warning">
                Geliştirme ortamı: e-posta gerçekten gönderilmez.{" "}
                <Link href={`/dev/outbox?to=${encodeURIComponent(email)}`} className="underline underline-offset-2">
                  Geliştirme posta kutusunu aç
                </Link>
              </p>
            )}
          </div>
        </>
      ) : (
        <form onSubmit={submitDraft} noValidate className="mt-6 space-y-4 text-left">
          <p className="text-center text-[15px] text-muted-strong">Doğrulama bağlantısını almak istediğin e-posta adresini yaz.</p>
          <AuthField label="E-posta adresi" htmlFor="vf-email" error={draftError}>
            <Input id="vf-email" type="email" autoComplete="email" inputMode="email" placeholder="ornek@eposta.com" className="h-[52px] text-[14px]" value={draft} onChange={(e) => setDraft(e.target.value)} aria-invalid={!!draftError} aria-describedby={draftError ? "vf-email-error" : undefined} />
          </AuthField>
          {notice && (
            <FormAlert tone={notice.tone}>
              <p>{notice.text}</p>
            </FormAlert>
          )}
          <PrimaryButton type="submit" loading={sending}>
            Bağlantı Gönder
          </PrimaryButton>
          <p className="text-center">
            <Link href="/login" className={cn(linkCls, "text-[13px]")}>
              ← Girişe Dön
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

/** Doğrulama başarılı: oturum açıksa devam et (yönlendirme kararı sunucuda), değilse girişe git. */
export function VerifySuccess({ signedIn, next }: { signedIn: boolean; next: string | null }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const result = await postLoginRedirect(next);
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      window.location.assign(result.data.to);
    } catch {
      setError(NETWORK_ERROR);
      setBusy(false);
    }
  }

  return (
    <div className="text-center">
      <IconBadge className="bg-success-soft text-success">
        <BadgeCheck aria-hidden />
      </IconBadge>
      <AuthHeading center eyebrow="HESAP DOĞRULAMA" title="E-postan" accent="doğrulandı." description="Hesabın etkinleştirildi. Artık HEYFANS'ı keşfetmeye hazırsın." />
      <div className="mt-6">
        <StepStrip active={2} />
      </div>
      <div className="mt-7 space-y-3">
        {error && (
          <FormAlert className="text-left">
            <p>{error}</p>
          </FormAlert>
        )}
        {signedIn ? (
          <PrimaryButton type="button" onClick={go} loading={busy}>
            Devam Et
          </PrimaryButton>
        ) : (
          <>
            <PrimaryLink href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Giriş Yap</PrimaryLink>
            <p className="text-xs text-muted">Doğrulama farklı bir tarayıcıda tamamlandıysa şifrenle giriş yapman gerekir.</p>
          </>
        )}
      </div>
    </div>
  );
}
