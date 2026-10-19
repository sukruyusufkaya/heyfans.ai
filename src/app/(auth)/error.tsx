"use client";
import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Kimlik doğrulama sayfalarında beklenmeyen hata (ör. veritabanı erişilemiyor): kullanıcıya dürüst bir ekran. */
export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[auth:error]", error.digest ?? error.message);
  }, [error]);
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-16 text-center">
      <span className="mx-auto mb-5 grid size-[76px] place-items-center rounded-[22px] bg-danger-soft text-danger">
        <TriangleAlert className="size-8" aria-hidden />
      </span>
      <h1 className="font-display text-[30px] font-extrabold tracking-[-0.035em] text-ink">Bir şeyler ters gitti</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-strong">Bu sayfa şu anda yüklenemedi. Lütfen tekrar dene; sorun sürerse biraz sonra yeniden gel.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" size="lg" onClick={reset}>
          Tekrar dene
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">Ana sayfaya dön</Link>
        </Button>
      </div>
    </div>
  );
}
