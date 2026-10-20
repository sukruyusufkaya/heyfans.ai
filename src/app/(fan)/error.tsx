"use client";
import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { useT } from "@/i18n/client";

/** Hayran alanı hata sınırı: kabuk (üst çubuk/menü) ayakta kalır, yalnız sayfa içeriği yerine bu panel gösterilir. */
export default function FanError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error("[fan:error]", error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <EmptyState
          icon={<AlertTriangle />}
          title={t("Bu sayfa yüklenirken bir sorun oluştu")}
          description={
            error.digest
              ? t("Lütfen tekrar dene. Sorun devam ederse destek ekibimize ulaş. (Hata kodu: {code})", { code: error.digest })
              : t("Lütfen tekrar dene. Sorun devam ederse destek ekibimize ulaş.")
          }
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button onClick={reset} shape="pill">
                {t("Tekrar dene")}
              </Button>
              <Button asChild variant="secondary" shape="pill">
                <Link href="/app">{t("Ana sayfaya dön")}</Link>
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}
