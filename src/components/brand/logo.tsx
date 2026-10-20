"use client";
import Image from "next/image";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * HEYFANS marka logosu: kalp amblemi (iki profil + yıldız) + "Heyfans" yazısı.
 * Varlıklar kullanıcının verdiği logodan şeffaf olarak çıkarıldı (public/brand, src/app/icon.png, favicon.ico, opengraph-image.png).
 * - tone="dark": açık zemin ("Hey" koyu) · tone="light": koyu zemin ("Hey" açık)
 */
const SIZES = {
  sm: { mark: "h-7", word: "h-[18px]", gap: "gap-1.5" },
  md: { mark: "h-9", word: "h-[23px]", gap: "gap-2" },
  lg: { mark: "h-12", word: "h-[30px]", gap: "gap-2.5" },
} as const;
export type LogoSize = keyof typeof SIZES;

export function LogoMark({ className, priority }: { className?: string; priority?: boolean }) {
  return <Image src="/brand/heyfans-mark.png" alt="" width={301} height={256} priority={priority} className={cn("h-9 w-auto select-none", className)} draggable={false} />;
}

export function Wordmark({ className, tone = "dark", size = "md", markOnly = false, priority }: { className?: string; tone?: "dark" | "light"; size?: LogoSize; markOnly?: boolean; priority?: boolean; dot?: boolean }) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center leading-none", s.gap, className)}>
      <LogoMark className={s.mark} priority={priority} />
      {!markOnly && (
        <Image
          src={tone === "light" ? "/brand/heyfans-wordmark-light.png" : "/brand/heyfans-wordmark.png"}
          alt="Heyfans" // i18n-ignore (marka)
          width={479}
          height={120}
          priority={priority}
          className={cn("w-auto select-none", s.word)}
          draggable={false}
        />
      )}
      {/* i18n-ignore (marka) */}
      {markOnly && <span className="sr-only">Heyfans</span>}
    </span>
  );
}

export function LogoLink({ href = "/", className, tone, size }: { href?: string; className?: string; dot?: boolean; tone?: "dark" | "light"; size?: LogoSize }) {
  const t = useT();
  return (
    <Link href={href} aria-label={t("Heyfans ana sayfa")} className={cn("inline-flex shrink-0 items-center", className)}>
      <Wordmark tone={tone} size={size} priority />
    </Link>
  );
}
