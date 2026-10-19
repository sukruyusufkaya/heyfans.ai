"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlays";

/**
 * Onay penceresi. `trigger` tıklanınca açılır (ya da `open`/`onOpenChange` ile dışarıdan yönetilir);
 * "Onayla" `onConfirm` çözülünce kapanır (false dönerse açık kalır). `children` ek alan (ör. not girişi) içindir.
 */
export function ConfirmDialog({
  trigger,
  open: openProp,
  onOpenChange,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  tone = "primary",
  onConfirm,
  children,
  disabled,
  confirmDisabled,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => Promise<boolean | void> | boolean | void;
  children?: React.ReactNode;
  disabled?: boolean;
  /** Onay düğmesini kilitler (ör. yazıyla doğrulama tamamlanana kadar). */
  confirmDisabled?: boolean;
}) {
  const [inner, setInner] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : inner;
  const setOpen = (o: boolean) => {
    if (!controlled) setInner(o);
    onOpenChange?.(o);
  };
  async function confirm() {
    setBusy(true);
    try {
      const r = await onConfirm();
      if (r !== false) setOpen(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      {trigger && (
        <DialogTrigger asChild disabled={disabled}>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent title={title} description={description} size="sm">
        {children}
        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <DialogClose asChild>
            <Button variant="secondary" size="sm" disabled={busy}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button variant={tone === "danger" ? "danger" : "primary"} size="sm" onClick={confirm} loading={busy} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
