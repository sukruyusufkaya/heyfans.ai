"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, KeyRound, Laptop, LogOut, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/fan/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { accountRequestAction } from "@/features/fan/actions";
import { authClient, authErrorMessage } from "@/lib/auth/client";
import { useFormatters, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import type { Translator } from "@/i18n/translate";

/* ─── Şifre değiştirme ─────────────────────────────────────── */
export function PasswordForm() {
  const t = useT();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [again, setAgain] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<{ current?: string; next?: string; again?: string; form?: string }>({});
  const id = React.useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: typeof errors = {};
    if (!current) err.current = t("Mevcut şifreni gir.");
    if (next.length < 8) err.next = t("Yeni şifre en az 8 karakter olmalı.");
    else if (next.length > 128) err.next = t("Yeni şifre en fazla 128 karakter olabilir.");
    else if (next === current) err.next = t("Yeni şifre mevcut şifreden farklı olmalı.");
    if (again !== next) err.again = t("Şifreler eşleşmiyor.");
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (error) {
      setErrors({ form: t(authErrorMessage(error.code, error.message)) });
      return;
    }
    toast.success(t("Şifren değiştirildi. Diğer cihazlardaki oturumların kapatıldı."));
    setCurrent("");
    setNext("");
    setAgain("");
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Field label={t("Mevcut şifre")} htmlFor={`${id}-c`} error={errors.current} required>
        <Input id={`${id}-c`} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} aria-invalid={Boolean(errors.current) || undefined} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Yeni şifre")} htmlFor={`${id}-n`} error={errors.next} hint={t("En az 8 karakter.")} required>
          <Input id={`${id}-n`} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-invalid={Boolean(errors.next) || undefined} />
        </Field>
        <Field label={t("Yeni şifre (tekrar)")} htmlFor={`${id}-a`} error={errors.again} required>
          <Input id={`${id}-a`} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={Boolean(errors.again) || undefined} />
        </Field>
      </div>
      {errors.form && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-semibold text-danger">
          {errors.form}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" shape="pill" loading={busy}>
          <KeyRound /> {t("Şifreyi değiştir")}
        </Button>
        <p className="mt-2 text-[10px] text-muted">{t("Şifre değişince diğer cihazlardaki oturumların kapatılır.")}</p>
      </div>
    </form>
  );
}

/* ─── Aktif oturumlar ──────────────────────────────────────── */
interface SessionRow {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
}

function describeAgent(t: Translator, ua?: string | null) {
  if (!ua) return { label: t("Bilinmeyen cihaz"), mobile: false };
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : t("Tarayıcı"); // i18n-ignore (tarayıcı adları özel isim)
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : t("Bilinmeyen sistem"); // i18n-ignore (işletim sistemi adları özel isim)
  return { label: `${browser} · ${os}`, mobile: /Android|iPhone|iPad|Mobile/.test(ua) };
}

export function SessionsList() {
  const t = useT();
  const { formatDateTime } = useFormatters();
  const [sessions, setSessions] = React.useState<SessionRow[] | null>(null);
  const [currentToken, setCurrentToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const [reloadKey, setReloadKey] = React.useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, current] = await Promise.all([authClient.listSessions(), authClient.getSession()]);
        if (cancelled) return;
        if (list.error) throw new Error(list.error.message);
        setSessions((list.data ?? []) as SessionRow[]);
        setCurrentToken(current.data?.session?.token ?? null);
        setError(null);
      } catch {
        if (!cancelled) setError(t("Oturumlar yüklenemedi. Sayfayı yenileyip tekrar dene."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, t]);

  async function revoke(token: string) {
    setBusy(token);
    const { error: err } = await authClient.revokeSession({ token });
    setBusy(null);
    if (err) return toast.error(t(authErrorMessage(err.code, err.message)));
    toast.success(t("Oturum kapatıldı."));
    reload();
  }

  async function revokeOthers() {
    setBusy("others");
    const { error: err } = await authClient.revokeOtherSessions();
    setBusy(null);
    if (err) return toast.error(t(authErrorMessage(err.code, err.message)));
    toast.success(t("Diğer tüm oturumlar kapatıldı."));
    reload();
  }

  if (error) return <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-semibold text-danger">{error}</p>;
  if (!sessions) return <p className="text-xs text-muted" role="status">{t("Oturumlar yükleniyor…")}</p>;
  const others = sessions.filter((s) => s.token !== currentToken);

  return (
    <div>
      <ul className="grid gap-2.5">
        {sessions.map((s) => {
          const d = describeAgent(t, s.userAgent);
          const current = s.token === currentToken;
          const Icon = d.mobile ? Smartphone : Laptop;
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-line-soft bg-[#fcfafd] p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-500 shadow-sm">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-extrabold">
                  {d.label}{" "}
                  {current && (
                    <Badge tone="green" size="sm">
                      {t("Bu cihaz")}
                    </Badge>
                  )}
                </p>
                <p className="text-[10px] text-muted">
                  {s.ipAddress ? `${s.ipAddress} · ` : ""}
                  {t("Giriş: {date}", { date: formatDateTime(s.createdAt) })}
                </p>
              </div>
              {!current && (
                <Button variant="secondary" size="xs" shape="pill" loading={busy === s.token} disabled={busy !== null} onClick={() => revoke(s.token)}>
                  <LogOut className="rtl:-scale-x-100" /> {t("Kapat")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {others.length > 0 && (
        <Button variant="danger-soft" size="sm" shape="pill" className="mt-3" loading={busy === "others"} disabled={busy !== null} onClick={revokeOthers}>
          {t("Diğer tüm oturumları kapat")}
        </Button>
      )}
    </div>
  );
}

/* ─── Hesap talepleri (silme / veri kopyası) ───────────────── */
export interface AccountRequestView {
  ticketNo: string;
  subject: string;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = { open: m("Açık"), pending: m("İnceleniyor"), resolved: m("Çözüldü"), closed: m("Kapandı") };

export function AccountRequests({ requests }: { requests: AccountRequestView[] }) {
  const t = useT();
  const { formatDateTime } = useFormatters();
  const router = useRouter();

  const run = (kind: "delete_account" | "export_data") => async () => {
    const res = await accountRequestAction(kind);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(res.message ?? t("Talebin alındı."));
    router.refresh();
    return true;
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-line-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-extrabold">{t("Verilerimin bir kopyasını iste")}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{t("KVKK kapsamında hesabına ait verilerin kopyasını talep edersin. Talep destek ekibimize iletilir; kimliğin doğrulandıktan sonra hazırlanır.")}</p>
        </div>
        <ConfirmDialog
          title={t("Veri kopyası talebi")}
          description={t("Talebin destek ekibine iletilecek. Veri kopyası anında indirilemez; ekibimiz seninle e-posta üzerinden iletişime geçer.")}
          confirmLabel={t("Talebi oluştur")}
          onConfirm={run("export_data")}
          trigger={
            <Button variant="secondary" size="sm" shape="pill" className="shrink-0">
              <Download /> {t("Verilerimi indir")}
            </Button>
          }
        />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-danger/20 bg-danger-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-extrabold">{t("Hesabımı sil")}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-strong">{t("Silme talebi destek ekibine iletilir ve kimlik doğrulaması sonrası işleme alınır; hesabın anında silinmez. Yasal saklama yükümlülüğü olan kayıtlar (ör. ödeme kayıtları) mevzuat süresince saklanır.")}</p>
        </div>
        <ConfirmDialog
          title={t("Hesap silme talebi")}
          description={t("Bu bir silme talebidir; hesabın hemen silinmez. Destek ekibimiz kimliğini doğrulayıp süreci seninle yürütür. Devam etmek istiyor musun?")}
          confirmLabel={t("Silme talebi oluştur")}
          tone="danger"
          onConfirm={run("delete_account")}
          trigger={
            <Button variant="danger-soft" size="sm" shape="pill" className="shrink-0">
              <Trash2 /> {t("Hesap silme talebi")}
            </Button>
          }
        />
      </div>
      {requests.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted">{t("Açtığın talepler")}</p>
          <ul className="grid gap-2">
            {requests.map((r) => (
              <li key={r.ticketNo} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-soft px-3.5 py-2.5 text-xs">
                <span>
                  <b>{r.subject}</b> · {r.ticketNo} · {formatDateTime(r.createdAt)}
                </span>
                <Badge tone={r.status === "open" || r.status === "pending" ? "warn" : "green"} size="sm">
                  {t(STATUS_LABELS[r.status] ?? r.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
