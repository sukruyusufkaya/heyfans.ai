"use client";
import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";

/** Admin sayfalarında beklenmeyen hata sınırı: ayrıntı sunucu günlüğünde, kullanıcıya yalnız kod gösterilir. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin:error]", error.digest ?? error.message);
  }, [error]);
  return (
    <div className="hf-card mx-auto mt-6 max-w-xl">
      <EmptyState
        icon={<TriangleAlert />}
        title="Bu bölüm yüklenemedi"
        description={
          <>
            Beklenmeyen bir hata oluştu. Tekrar deneyin; sorun sürerse destek ekibine hata kodunu iletin{error.digest ? ` (kod: ${error.digest})` : ""}.
          </>
        }
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button onClick={() => reset()}>Tekrar dene</Button>
            <Button asChild variant="secondary">
              <Link href="/admin">Genel bakışa dön</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
