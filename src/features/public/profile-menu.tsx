"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Flag, Link2, MoreHorizontal, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlays";
import { reportAction } from "@/features/social/actions";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";

const REASONS = [
  { value: "impersonation", label: m("Kimliğe bürünme / izinsiz benzerlik") },
  { value: "harassment", label: m("Taciz veya tehdit") },
  { value: "sexual_content", label: m("Uygunsuz / cinsel içerik") },
  { value: "minor_safety", label: m("Reşit olmayanların güvenliği") },
  { value: "hate", label: m("Nefret söylemi") },
  { value: "self_harm", label: m("Kendine zarar / acil tehlike") },
  { value: "spam", label: m("Spam veya dolandırıcılık") },
  { value: "copyright", label: m("Telif hakkı") },
  { value: "privacy", label: m("Gizlilik ihlali") },
  { value: "ai_misbehavior", label: m("AI ikizinin uygunsuz davranışı") },
  { value: "other", label: m("Diğer") },
];

/** Profil "…" menüsü: bağlantıyı paylaş + profili bildir (reportAction → moderasyon vakası). */
export function ProfileMenu({ creatorId, username, displayName, authed }: { creatorId: string; username: string; displayName: string; authed: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function share() {
    const url = `${window.location.origin}/creators/${username}`;
    try {
      // i18n-ignore: marka + kullanıcı adı
      if (navigator.share) await navigator.share({ title: `${displayName} | HEYFANS`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("Profil bağlantısı kopyalandı."));
      }
    } catch {
      /* kullanıcı paylaşımı iptal etti */
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return setError(t("Lütfen bir bildirim nedeni seç."));
    setError(null);
    start(async () => {
      const res = await reportAction({ targetType: "profile", targetId: creatorId, reason, details: details.trim() });
      if (!res.ok) return setError(res.error);
      toast.success(res.message ?? t("Bildirimin alındı."));
      setOpen(false);
      setReason("");
      setDetails("");
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary" size="icon" aria-label={t("Diğer işlemler")} className="border-brand-200 text-brand-600">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => void share()}>
            <Share2 /> {t("Profili paylaş")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/creators/${username}`);
                toast.success(t("Profil bağlantısı kopyalandı."));
              } catch {
                toast.error(t("Bağlantı kopyalanamadı."));
              }
            }}
          >
            <Link2 /> {t("Bağlantıyı kopyala")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen(true)} className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger">
            <Flag /> {t("Profili bildir")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("{name} profilini bildir", { name: displayName })} description={t("Bildirimin moderasyon ekibi tarafından incelenir. Bildirdiğin kişiye kimliğin gösterilmez.")}>
          {authed ? (
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <Field label={t("Bildirim nedeni")} htmlFor="report-reason" required>
                <NativeSelect id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} required>
                  <option value="" disabled>
                    {t("Bir neden seç")}
                  </option>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.label)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("Açıklama (isteğe bağlı)")} htmlFor="report-details" hint={t("Ne olduğunu kısaca anlatabilirsin.")}>
                <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={3000} rows={4} aria-describedby="report-details-hint" />
              </Field>
              {error && (
                <p role="alert" className="text-xs font-semibold text-danger">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2.5">
                <Button type="button" variant="secondary" shape="pill" onClick={() => setOpen(false)}>
                  {t("Vazgeç")}
                </Button>
                <Button type="submit" variant="danger" shape="pill" loading={pending}>
                  {t("Bildirimi Gönder")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 text-sm text-ink-soft">
              <p>{t("Bildirim göndermek için giriş yapman gerekir. Hesabın yoksa güvenlik bildirimini misafir olarak da iletebilirsin.")}</p>
              <div className="flex flex-wrap justify-end gap-2.5">
                <Button asChild variant="secondary" shape="pill">
                  <Link href="/trust-and-safety#bildir">{t("Misafir olarak bildir")}</Link>
                </Button>
                <Button asChild shape="pill">
                  <Link href={`/login?next=${encodeURIComponent(`/creators/${username}`)}`}>{t("Giriş Yap")}</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
