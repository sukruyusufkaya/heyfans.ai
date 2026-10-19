"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/fan/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cancelSubscriptionAction, resumeSubscriptionAction } from "@/features/fan/actions";
import { formatDate } from "@/lib/utils";

/** Abonelik yönetimi: dönem sonunda iptal (onay penceresiyle) ve vazgeçme. Para iadesi yapılmaz; erişim dönem sonuna kadar sürer. */
export function SubscriptionActions({ id, name, cancelAtPeriodEnd, periodEnd }: { id: string; name: string; cancelAtPeriodEnd: boolean; periodEnd: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  if (cancelAtPeriodEnd) {
    return (
      <Button
        variant="outline"
        size="sm"
        shape="pill"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          const res = await resumeSubscriptionAction(id);
          setBusy(false);
          if (res.ok) {
            toast.success(res.message ?? "Üyeliğin devam edecek.");
            router.refresh();
          } else toast.error(res.error);
        }}
      >
        <RotateCcw /> Aboneliği sürdür
      </Button>
    );
  }
  return (
    <ConfirmDialog
      title="Üyeliği dönem sonunda iptal et"
      description={
        <>
          <b>{name}</b> üyeliğin {periodEnd ? <b>{formatDate(periodEnd)}</b> : "mevcut dönemin"} sonunda sona erecek. O tarihe kadar tüm avantajlarını kullanmaya devam edersin; ücret iadesi yapılmaz. İptalden vazgeçmek için dönem bitmeden “Aboneliği sürdür”ü kullanabilirsin.
        </>
      }
      confirmLabel="Dönem sonunda iptal et"
      tone="danger"
      onConfirm={async () => {
        const res = await cancelSubscriptionAction(id);
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(res.message ?? "Üyelik dönem sonunda sona erecek.");
        router.refresh();
        return true;
      }}
      trigger={
        <Button variant="secondary" size="sm" shape="pill">
          <XCircle /> Dönem sonunda iptal et
        </Button>
      }
    />
  );
}
