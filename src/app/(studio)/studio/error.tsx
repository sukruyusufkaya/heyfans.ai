"use client";
import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";

/** Studio sayfalarında beklenmeyen hata: kullanıcıya Türkçe bildirim + yeniden deneme. */
export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[studio:error]", error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={<TriangleAlert />}
        title="Bu sayfa yüklenemedi"
        description={`Beklenmeyen bir hata oluştu. Tekrar deneyebilir ya da panele dönebilirsin.${error.digest ? ` (Destek kodu: ${error.digest})` : ""}`}
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button onClick={reset}>Tekrar dene</Button>
            <Button asChild variant="outline">
              <Link href="/studio">Panele dön</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
