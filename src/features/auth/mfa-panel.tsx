"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Download, KeyRound, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AuthField, FormAlert, PrimaryButton } from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/form-controls";
import { authClient } from "@/lib/auth/client";
import { postLoginRedirect } from "@/features/auth/actions";
import { authErrorText, NETWORK_ERROR, useFieldError } from "@/features/auth/client-errors";
import { passwordConfirmSchema, totpSchema } from "@/features/auth/schemas";
import { useT } from "@/i18n/client";

interface Props {
  enabled: boolean;
  hasPassword: boolean;
  /** Bu hesap yönetici ve 2FA zorunlu. */
  enforced: boolean;
  next: string | null;
}

type Phase = "idle" | "setup" | "codes";

function secretFromUri(uri: string) {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function PasswordForm({ id, label, button, onSubmit, tone }: { id: string; label: string; button: string; onSubmit: (password: string) => Promise<string | null>; tone?: "danger" }) {
  const t = useT();
  const fe = useFieldError();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }>({ resolver: zodResolver(passwordConfirmSchema), defaultValues: { password: "" } });
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async ({ password }) => {
        setError(null);
        const message = await onSubmit(password);
        if (message) setError(message);
        else reset();
      })}
      className="space-y-4"
    >
      {error && (
        <FormAlert>
          <p>{error}</p>
        </FormAlert>
      )}
      <AuthField label={label} htmlFor={id} error={fe(errors.password?.message)}>
        <PasswordInput id={id} autoComplete="current-password" placeholder={t("Şifren")} aria-invalid={!!errors.password} aria-describedby={errors.password ? `${id}-error` : undefined} {...register("password")} />
      </AuthField>
      {tone === "danger" ? (
        <Button type="submit" variant="danger" size="lg" loading={isSubmitting} className="h-[52px] w-full rounded-[10px]">
          {button}
        </Button>
      ) : (
        <PrimaryButton type="submit" loading={isSubmitting}>
          {button}
        </PrimaryButton>
      )}
    </form>
  );
}

export function MfaPanel({ enabled, hasPassword, enforced, next }: Props) {
  const t = useT();
  const fe = useFieldError();
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [uri, setUri] = React.useState("");
  const [qr, setQr] = React.useState<string | null>(null);
  const [codes, setCodes] = React.useState<string[]>([]);
  const [saved, setSaved] = React.useState(false);
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [finishError, setFinishError] = React.useState<string | null>(null);
  const [isEnabled, setIsEnabled] = React.useState(enabled);
  const secret = React.useMemo(() => secretFromUri(uri), [uri]);

  // QR kodu tarayıcıda, yalnız kurulum açıkken üretilir (sır sunucuya yeniden gitmez).
  React.useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    (async () => {
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(uri, { margin: 1, width: 224, color: { dark: "#19111d", light: "#ffffff" } });
      if (!cancelled) setQr(url);
    })().catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const totpForm = useForm<{ code: string }>({ resolver: zodResolver(totpSchema), defaultValues: { code: "" } });

  async function startSetup(password: string) {
    try {
      const { data, error } = await authClient.twoFactor.enable({ password, method: "totp" });
      if (error || !data || data.method !== "totp") return t(authErrorText(error));
      setUri(data.totpURI);
      setCodes(data.backupCodes ?? []);
      setPhase("setup");
      return null;
    } catch {
      return t(NETWORK_ERROR);
    }
  }

  async function verifyCode({ code }: { code: string }) {
    setCodeError(null);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code });
      if (error) {
        setCodeError(t(authErrorText(error)));
        return;
      }
      setIsEnabled(true);
      setPhase("codes");
    } catch {
      setCodeError(t(NETWORK_ERROR));
    }
  }

  async function regenerate(password: string) {
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error || !data) return t(authErrorText(error));
      setCodes(data.backupCodes);
      setSaved(false);
      setPhase("codes");
      return null;
    } catch {
      return t(NETWORK_ERROR);
    }
  }

  async function disable(password: string) {
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) return t(authErrorText(error));
      setIsEnabled(false);
      setPhase("idle");
      toast.success(t("İki adımlı doğrulama kapatıldı."));
      router.refresh();
      return null;
    } catch {
      return t(NETWORK_ERROR);
    }
  }

  async function finish() {
    setFinishError(null);
    const r = await postLoginRedirect(next);
    if (!r.ok) {
      setFinishError(r.error);
      return;
    }
    window.location.assign(r.data.to);
  }

  const copy = (text: string, ok: string) => navigator.clipboard?.writeText(text).then(() => toast.success(ok)).catch(() => toast.error(t("Kopyalanamadı.")));
  const download = () => {
    const blob = new Blob([[t("HEYFANS yedek kodları"), t("Her kod yalnız bir kez kullanılabilir."), "", ...codes].join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "heyfans-yedek-kodlari.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ── Yedek kodlar (kurulum bitti) ── */
  if (phase === "codes") {
    return (
      <div className="space-y-5">
        <FormAlert tone="warn">
          <p className="font-extrabold">{t("Yedek kodlarını şimdi kaydet.")}</p>
          <p className="mt-0.5 font-medium">{t("Telefonuna erişemezsen bu kodlarla giriş yapabilirsin. Her kod yalnız bir kez geçerlidir ve bir daha gösterilmeyecek.")}</p>
        </FormAlert>
        <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-soft/60 p-4 font-mono text-[13px] font-bold tracking-wide text-ink" aria-label={t("Yedek kodlar")}>
          {codes.map((c) => (
            <li key={c} className="rounded-lg bg-white px-3 py-2 text-center">
              {c}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="md" onClick={() => copy(codes.join("\n"), t("Yedek kodlar kopyalandı."))}>
            <Copy aria-hidden /> {t("Kopyala")}
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={download}>
            <Download aria-hidden /> {t("İndir (.txt)")}
          </Button>
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox id="mfa-saved" checked={saved} onCheckedChange={(v) => setSaved(v === true)} className="mt-px" />
          <label htmlFor="mfa-saved" className="cursor-pointer text-xs leading-relaxed text-ink-soft">
            {t("Yedek kodlarımı güvenli bir yere kaydettim.")}
          </label>
        </div>
        {finishError && (
          <FormAlert>
            <p>{finishError}</p>
          </FormAlert>
        )}
        <PrimaryButton type="button" disabled={!saved} onClick={finish}>
          {t("Tamamla ve Devam Et")}
        </PrimaryButton>
      </div>
    );
  }

  /* ── Kurulum: QR + doğrulama ── */
  if (phase === "setup") {
    const groups = secret.replace(/(.{4})/g, "$1 ").trim();
    return (
      <div className="space-y-5">
        <ol className="space-y-5">
          <li>
            <p className="text-[13px] font-extrabold text-ink">{t("1. Kimlik doğrulama uygulamanı aç")}</p>
            <p className="mt-0.5 text-xs text-muted-strong">{t("Google Authenticator, Microsoft Authenticator, 1Password veya benzeri bir uygulama kullanabilirsin.")}</p>
          </li>
          <li>
            <p className="text-[13px] font-extrabold text-ink">{t("2. QR kodu tara")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-5">
              <div className="grid size-[224px] place-items-center rounded-2xl border border-line bg-white p-1">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt={t("2FA kurulum QR kodu")} width={216} height={216} />
                ) : (
                  <span className="text-xs text-muted">{t("QR kodu hazırlanıyor…")}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-xs text-muted-strong">
                <p>{t("QR kodu tarayamıyorsan anahtarı elle gir:")}</p>
                <p className="mt-2 break-all rounded-lg bg-soft px-3 py-2 font-mono text-[13px] font-bold tracking-wider text-ink" aria-label={t("Kurulum anahtarı")}>
                  {groups}
                </p>
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => copy(secret, t("Anahtar kopyalandı."))}>
                  <Copy aria-hidden /> {t("Anahtarı kopyala")}
                </Button>
              </div>
            </div>
          </li>
          <li>
            <p className="text-[13px] font-extrabold text-ink">{t("3. Uygulamadaki 6 haneli kodu gir")}</p>
            <form onSubmit={totpForm.handleSubmit(verifyCode)} noValidate className="mt-3 space-y-4">
              {codeError && (
                <FormAlert>
                  <p>{codeError}</p>
                </FormAlert>
              )}
              <AuthField label={t("Doğrulama kodu")} htmlFor="mfa-code" error={fe(totpForm.formState.errors.code?.message)}>
                <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" className="h-[52px] text-center text-xl font-extrabold tracking-[0.5em]" aria-invalid={!!totpForm.formState.errors.code} aria-describedby={totpForm.formState.errors.code ? "mfa-code-error" : undefined} {...totpForm.register("code")} />
              </AuthField>
              <PrimaryButton type="submit" loading={totpForm.formState.isSubmitting}>
                {t("Doğrula ve Etkinleştir")}
              </PrimaryButton>
            </form>
          </li>
        </ol>
      </div>
    );
  }

  /* ── Etkin ── */
  if (isEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success-soft p-4">
          <ShieldCheck className="size-6 shrink-0 text-success" aria-hidden />
          <div className="flex-1">
            <p className="text-[13px] font-extrabold text-ink">{t("İki adımlı doğrulama etkin")}</p>
            <p className="text-xs text-muted-strong">{t("Girişte kimlik doğrulama uygulamandaki kod istenir.")}</p>
          </div>
          <Badge tone="green">{t("Etkin")}</Badge>
        </div>
        {!hasPassword && (
          <FormAlert tone="warn">
            <p>{t("Bu hesabın şifresi yok; yedek kod yenileme ve kapatma için şifre gerekir. Önce \"Şifremi unuttum\" ile bir şifre belirleyebilirsin.")}</p>
          </FormAlert>
        )}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <KeyRound className="size-4 text-brand-500" aria-hidden /> {t("Yedek kodları yenile")}
          </h2>
          <p className="text-xs text-muted-strong">{t("Yeni kodlar oluşturulduğunda eskileri geçersiz olur.")}</p>
          <PasswordForm id="mfa-regen-pw" label={t("Şifren")} button={t("Yeni Yedek Kodlar Oluştur")} onSubmit={regenerate} />
        </section>
        <section className="space-y-3 border-t border-line pt-6">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <ShieldOff className="size-4 text-danger" aria-hidden /> {t("İki adımlı doğrulamayı kapat")}
          </h2>
          {enforced ? (
            <FormAlert tone="info">
              <p>{t("Yönetici hesaplarında iki adımlı doğrulama zorunludur; kapatılamaz.")}</p>
            </FormAlert>
          ) : (
            <>
              <p className="text-xs text-muted-strong">{t("Kapatırsan hesabın yalnız şifreyle korunur.")}</p>
              <PasswordForm id="mfa-off-pw" label={t("Şifren")} button={t("İki Adımlı Doğrulamayı Kapat")} tone="danger" onSubmit={disable} />
            </>
          )}
        </section>
      </div>
    );
  }

  /* ── Kapalı: başlat ── */
  return (
    <div className="space-y-5">
      {enforced && (
        <FormAlert tone="warn">
          <p className="font-extrabold">{t("Yönetici hesabın için iki adımlı doğrulama zorunlu.")}</p>
          <p className="mt-0.5 font-medium">{t("Yönetim paneline erişmek için önce aşağıdaki adımları tamamla.")}</p>
        </FormAlert>
      )}
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-soft/60 p-4">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-strong">
          {t("İki adımlı doğrulama, şifren ele geçirilse bile hesabını korur. Kurulum için bir kimlik doğrulama uygulaması (TOTP) gerekir; kurulum sonunda tek kullanımlık yedek kodlar verilir.")}
        </p>
      </div>
      {hasPassword ? (
        <PasswordForm id="mfa-start-pw" label={t("Devam etmek için şifreni gir")} button={t("Kurulumu Başlat")} onSubmit={startSetup} />
      ) : (
        <FormAlert tone="warn">
          <p>{t("Bu hesabın şifresi yok; kurulum için şifre gerekir. Önce \"Şifremi unuttum\" bağlantısıyla bir şifre belirle.")}</p>
        </FormAlert>
      )}
    </div>
  );
}
