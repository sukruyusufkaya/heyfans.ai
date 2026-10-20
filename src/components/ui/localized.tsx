"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Badge } from "./badge-base";

/**
 * Sunucu bileşenlerinden de kullanılan UI parçalarının çevrilen varsayılan metinleri.
 * Bu dosya istemci bileşenidir; ana dosyalar (badge.tsx, display.tsx) sunucu uyumlu kalır ve buradan içe aktarır.
 */

/** "AI İkizi" etiketi — AI yanıtları/profilleri asla gerçek creator gibi görünmesin diye her yerde zorunlu. */
export function AiTwinLabel({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  const t = useT();
  return (
    <Badge tone="violet" size={size} className={cn("uppercase tracking-wider", className)} title={t("Bu yanıtlar yapay zekâ tarafından üretilir")}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      </svg>
      {t("AI İkizi")}
    </Badge>
  );
}

/** Platformun kurgusal örnek profilleri (gerçek kişi değil; satın alma kapalı). */
export function SampleProfileLabel({ className, size = "sm", tone = "warn" }: { className?: string; size?: "sm" | "md"; tone?: "warn" | "white" }) {
  const t = useT();
  return (
    <Badge tone={tone} size={size} className={cn("uppercase tracking-wider", className)} title={t("Platformun kurgusal örnek profili; gerçek bir kişi değildir ve satın alma kapalıdır")}>
      {t("Örnek profil")}
    </Badge>
  );
}

/** Çevrimiçi/çevrimdışı noktası (ekran okuyucu etiketiyle). */
export function StatusDot({ online, className, style }: { online: boolean; className?: string; style?: React.CSSProperties }) {
  const t = useT();
  return <span className={className} style={style} aria-label={online ? t("Çevrimiçi") : t("Çevrimdışı")} />;
}

export function OnlineDot({ online, className }: { online: boolean; className?: string }) {
  return <StatusDot online={online} className={cn("inline-block size-2 rounded-full", online ? "bg-success" : "bg-muted/50", className)} />;
}

/** Sayfalama çubuğu: `children` sunucuda üretilen bağlantılardır. */
export function PaginationNav({ className, children }: { className?: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <nav aria-label={t("Sayfalama")} className={className}>
      {children}
    </nav>
  );
}

/** Önceki / sonraki sayfa bağlantısı. */
export function PaginationStep({ href, direction, className }: { href: string; direction: "prev" | "next"; className?: string }) {
  const t = useT();
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <Link href={href} className={className} aria-label={direction === "prev" ? t("Önceki sayfa") : t("Sonraki sayfa")}>
      <Icon className="rtl:-scale-x-100 size-4" />
    </Link>
  );
}
