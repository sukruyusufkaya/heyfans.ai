"use client";
import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { useT } from "@/i18n/client";

/** Studio sayfalarında beklenmeyen hata: kullanıcıya Türkçe bildirim + yeniden deneme. */
export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error("[studio:error]", error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={<TriangleAlert />}
        title={t("Bu sayfa yüklenemedi")}
        description={error.digest ? t("Beklenmeyen bir hata oluştu. Tekrar deneyebilir ya da panele dönebilirsin. (Destek kodu: {code})", { code: error.digest }) : t("Beklenmeyen bir hata oluştu. Tekrar deneyebilir ya da panele dönebilirsin.")}
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button onClick={reset}>{t("Tekrar dene")}</Button>
            <Button asChild variant="outline">
              <Link href="/studio">{t("Panele dön")}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
