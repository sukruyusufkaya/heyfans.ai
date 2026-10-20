"use client";
import { useState } from "react";
import { Landmark, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Field, Input } from "@/components/ui/form-controls";
import { Notice } from "@/components/studio/studio-ui";
import { firstError, useRun } from "@/components/studio/use-run";
import { formatMoney } from "@/lib/utils";
import { requestPayoutAction, savePayoutAccountAction } from "./business-actions";

const toMinor = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && s.trim() ? Math.round(n * 100) : 0;
};

export function RequestPayoutForm({ availableMinor, minMinor, canRequest, reasons }: { availableMinor: number; minMinor: number; canRequest: boolean; reasons: string[] }) {
  const { run, pending, fieldErrors } = useRun();
  const [amount, setAmount] = useState("");
  const minor = toMinor(amount);
  const invalid = minor < minMinor || minor > availableMinor;

  return (
    <div>
      {!canRequest && (
        <Notice tone="warn" title="Şu anda ödeme talep edilemiyor" className="mb-4">
          <ul className="grid gap-1">
            {reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </Notice>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canRequest || invalid) return;
          const ok = await run(() => requestPayoutAction({ amountMinor: minor, idempotencyKey: crypto.randomUUID() }));
          if (ok) setAmount("");
        }}
        className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      >
        <Field label="Çekilecek tutar (₺)" htmlFor="po-amount" hint={`En az ${formatMoney(minMinor)} · en fazla ${formatMoney(availableMinor)}`} error={firstError(fieldErrors, "amountMinor") ?? (amount && invalid ? `Tutar ${formatMoney(minMinor)} ile ${formatMoney(availableMinor)} arasında olmalı.` : null)}>
          <div className="flex gap-2">
            <Input id="po-amount" inputMode="decimal" value={amount} disabled={!canRequest} placeholder="0,00" onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} aria-invalid={Boolean(amount && invalid)} />
            <Button type="button" variant="secondary" size="sm" className="h-11" disabled={!canRequest} onClick={() => setAmount(String(availableMinor / 100).replace(".", ","))}>
              Tümü
            </Button>
          </div>
        </Field>
        <Button type="submit" disabled={!canRequest || invalid} loading={pending}>
          <Send className="rtl:-scale-x-100" /> Ödeme talebi gönder
        </Button>
      </form>
      <p className="mt-3 text-[10px] text-muted">Tutar, komisyon ve vergiler kesinleştikten sonra ödeme onayına sunulur. Ödeme yalnız doğrulanmış hesaba yapılır.</p>
    </div>
  );
}

export function PayoutAccountDialog({ hasAccount }: { hasAccount: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors } = useRun();
  const [holderName, setHolderName] = useState("");
  const [iban, setIban] = useState("");
  const [bankName, setBankName] = useState("");

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {hasAccount ? <Pencil /> : <Landmark />} {hasAccount ? "Hesabı değiştir" : "Ödeme hesabı ekle"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={hasAccount ? "Ödeme hesabını değiştir" : "Ödeme hesabı ekle"} description="IBAN şifrelenerek saklanır; ekranda yalnız maskelenmiş hali görünür. Yeni hesap, doğrulama tamamlanana kadar ödeme alamaz.">
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(() => savePayoutAccountAction({ holderName, iban, bankName: bankName || undefined }));
              if (ok) {
                setOpen(false);
                setIban("");
              }
            }}
          >
            <Field label="Hesap sahibi" htmlFor="pa-holder" required hint="Kimliğindeki ad soyad ile aynı olmalı" error={firstError(fieldErrors, "holderName")}>
              <Input id="pa-holder" value={holderName} onChange={(e) => setHolderName(e.target.value)} autoComplete="off" maxLength={120} />
            </Field>
            <Field label="IBAN" htmlFor="pa-iban" required hint="TR ile başlayan 26 haneli IBAN" error={firstError(fieldErrors, "iban")}>
              <Input id="pa-iban" value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="TR00 0000 0000 0000 0000 0000 00" autoComplete="off" inputMode="text" maxLength={42} />
            </Field>
            <Field label="Banka adı (isteğe bağlı)" htmlFor="pa-bank">
              <Input id="pa-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={80} />
            </Field>
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" size="sm" loading={pending} disabled={holderName.trim().length < 3 || iban.replace(/\s/g, "").length < 15}>
                Hesabı kaydet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
