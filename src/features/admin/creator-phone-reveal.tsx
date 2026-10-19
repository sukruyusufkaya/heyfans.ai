"use client";
import * as React from "react";
import { Eye, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { revealCreatorPhoneAction } from "./creators-actions";

/** Maskeli numara; yetkili yönetici gerekçe yazarak tam numarayı açar (denetim kaydı). */
export function CreatorPhoneReveal({ creatorId, masked, canReveal }: { creatorId: string; masked: string; canReveal: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [phone, setPhone] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  if (phone) {
    const digits = phone.replace(/\D/g, "");
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <b className="font-mono text-ink">{phone}</b>
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-600 hover:underline">
          <Phone className="size-3" aria-hidden /> Ara
        </a>
        <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-600 hover:underline">
          <MessageCircle className="size-3" aria-hidden /> WhatsApp
        </a>
      </span>
    );
  }
  return (
    <span className="grid gap-1.5">
      <span className="inline-flex items-center gap-2">
        <span className="font-mono">{masked}</span>
        {canReveal && !open && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-600 hover:underline">
            <Eye className="size-3" aria-hidden /> Numarayı göster
          </button>
        )}
      </span>
      {open && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await revealCreatorPhoneAction({ creatorId, reason });
              if (!r.ok) return void toast.error(r.error);
              setPhone(r.data.phone);
              toast.success(r.message ?? "Numara gösterildi.");
            });
          }}
        >
          <label htmlFor={`reveal-${creatorId}`} className="sr-only">
            Görüntüleme gerekçesi
          </label>
          <Input id={`reveal-${creatorId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gerekçe (ör. başvuru doğrulama araması)" className="h-8 min-w-[220px] flex-1 text-[11px]" minLength={5} maxLength={300} required />
          <Button type="submit" size="xs" loading={pending} disabled={reason.trim().length < 5}>
            Göster
          </Button>
        </form>
      )}
    </span>
  );
}
