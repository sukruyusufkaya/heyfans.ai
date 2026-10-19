"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Flag, Link2, MoreHorizontal, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlays";
import { reportAction } from "@/features/social/actions";

const REASONS = [
  { value: "impersonation", label: "Kimliğe bürünme / izinsiz benzerlik" },
  { value: "harassment", label: "Taciz veya tehdit" },
  { value: "sexual_content", label: "Uygunsuz / cinsel içerik" },
  { value: "minor_safety", label: "Reşit olmayanların güvenliği" },
  { value: "hate", label: "Nefret söylemi" },
  { value: "self_harm", label: "Kendine zarar / acil tehlike" },
  { value: "spam", label: "Spam veya dolandırıcılık" },
  { value: "copyright", label: "Telif hakkı" },
  { value: "privacy", label: "Gizlilik ihlali" },
  { value: "ai_misbehavior", label: "AI ikizinin uygunsuz davranışı" },
  { value: "other", label: "Diğer" },
];

/** Profil "…" menüsü: bağlantıyı paylaş + profili bildir (reportAction → moderasyon vakası). */
export function ProfileMenu({ creatorId, username, displayName, authed }: { creatorId: string; username: string; displayName: string; authed: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function share() {
    const url = `${window.location.origin}/creators/${username}`;
    try {
      if (navigator.share) await navigator.share({ title: `${displayName} | HEYFANS`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Profil bağlantısı kopyalandı.");
      }
    } catch {
      /* kullanıcı paylaşımı iptal etti */
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return setError("Lütfen bir bildirim nedeni seç.");
    setError(null);
    start(async () => {
      const res = await reportAction({ targetType: "profile", targetId: creatorId, reason, details: details.trim() });
      if (!res.ok) return setError(res.error);
      toast.success(res.message ?? "Bildirimin alındı.");
      setOpen(false);
      setReason("");
      setDetails("");
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary" size="icon" aria-label="Diğer işlemler" className="border-brand-200 text-brand-600">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => void share()}>
            <Share2 /> Profili paylaş
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/creators/${username}`);
                toast.success("Profil bağlantısı kopyalandı.");
              } catch {
                toast.error("Bağlantı kopyalanamadı.");
              }
            }}
          >
            <Link2 /> Bağlantıyı kopyala
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen(true)} className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger">
            <Flag /> Profili bildir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`${displayName} profilini bildir`} description="Bildirimin moderasyon ekibi tarafından incelenir. Bildirdiğin kişiye kimliğin gösterilmez.">
          {authed ? (
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <Field label="Bildirim nedeni" htmlFor="report-reason" required>
                <NativeSelect id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} required>
                  <option value="" disabled>
                    Bir neden seç
                  </option>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Açıklama (isteğe bağlı)" htmlFor="report-details" hint="Ne olduğunu kısaca anlatabilirsin.">
                <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={3000} rows={4} aria-describedby="report-details-hint" />
              </Field>
              {error && (
                <p role="alert" className="text-xs font-semibold text-danger">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2.5">
                <Button type="button" variant="secondary" shape="pill" onClick={() => setOpen(false)}>
                  Vazgeç
                </Button>
                <Button type="submit" variant="danger" shape="pill" loading={pending}>
                  Bildirimi Gönder
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 text-sm text-ink-soft">
              <p>Bildirim göndermek için giriş yapman gerekir. Hesabın yoksa güvenlik bildirimini misafir olarak da iletebilirsin.</p>
              <div className="flex flex-wrap justify-end gap-2.5">
                <Button asChild variant="secondary" shape="pill">
                  <Link href="/trust-and-safety#bildir">Misafir olarak bildir</Link>
                </Button>
                <Button asChild shape="pill">
                  <Link href={`/login?next=${encodeURIComponent(`/creators/${username}`)}`}>Giriş Yap</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
