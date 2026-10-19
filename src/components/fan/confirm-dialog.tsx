"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlays";

/**
 * Onay iletişim kutusu. Ya `trigger` ile (kendi durumunu yönetir) ya da `open`/`onOpenChange` ile (kontrollü;
 * menü öğelerinden açılırken kullanılır) çalışır. `onConfirm` true dönerse kapanır; false/hata durumunda açık kalır.
 */
export function ConfirmDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = "Onayla",
  tone = "primary",
  onConfirm,
  children,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => Promise<boolean> | boolean;
  children?: React.ReactNode;
}) {
  const [innerOpen, setInnerOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (v: boolean) => {
    if (busy) return;
    if (controlledOpen === undefined) setInnerOpen(v);
    onOpenChange?.(v);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent title={title} description={description} size="sm">
        {children}
        <div className="mt-5 flex justify-end gap-2.5">
          <DialogClose asChild>
            <Button variant="secondary" size="md" disabled={busy}>
              Vazgeç
            </Button>
          </DialogClose>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="md"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              let ok = false;
              try {
                ok = await onConfirm();
              } finally {
                setBusy(false);
              }
              if (ok) {
                if (controlledOpen === undefined) setInnerOpen(false);
                onOpenChange?.(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
