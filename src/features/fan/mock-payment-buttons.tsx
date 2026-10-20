"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeMockPaymentAction } from "@/features/fan/actions";
import { useT } from "@/i18n/client";

/** TEST ödeme sağlayıcısı sayfasındaki onay / ret düğmeleri (HMAC imzalı webhook akışını tetikler). */
export function MockPaymentButtons({ sessionId }: { sessionId: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = React.useState<"succeed" | "fail" | null>(null);

  async function run(outcome: "succeed" | "fail") {
    if (busy) return;
    setBusy(outcome);
    const res = await completeMockPaymentAction({ sessionId, outcome });
    if (!res.ok) {
      setBusy(null);
      toast.error(res.error);
      return;
    }
    router.push(`/checkout/result?tx=${res.data.transactionId}`);
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <Button size="lg" shape="pill" onClick={() => run("succeed")} loading={busy === "succeed"} disabled={busy !== null}>
        <Check /> {t("Ödemeyi onayla (test)")}
      </Button>
      <Button size="lg" shape="pill" variant="secondary" onClick={() => run("fail")} loading={busy === "fail"} disabled={busy !== null}>
        <X /> {t("Reddet (test)")}
      </Button>
    </div>
  );
}
