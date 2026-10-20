"use client";
import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { useT } from "@/i18n/client";

/** Admin sayfalarında beklenmeyen hata sınırı: ayrıntı sunucu günlüğünde, kullanıcıya yalnız kod gösterilir. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error("[admin:error]", error.digest ?? error.message);
  }, [error]);
  return (
    <div className="hf-card mx-auto mt-6 max-w-xl">
      <EmptyState
        icon={<TriangleAlert />}
        title={t("Bu bölüm yüklenemedi")}
        description={
          error.digest
            ? t("Beklenmeyen bir hata oluştu. Tekrar deneyin; sorun sürerse destek ekibine hata kodunu iletin (kod: {code}).", { code: error.digest })
            : t("Beklenmeyen bir hata oluştu. Tekrar deneyin; sorun sürerse destek ekibine hata kodunu iletin.")
        }
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button onClick={() => reset()}>{t("Tekrar dene")}</Button>
            <Button asChild variant="secondary">
              <Link href="/admin">{t("Genel bakışa dön")}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
