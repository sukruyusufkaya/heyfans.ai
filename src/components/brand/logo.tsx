import Link from "next/link";
import { cn } from "@/lib/utils";

/** Referanslardaki kelime işareti: "HEY" koyu + "FANS" fuşya, 950 ağırlık, sıkı harf aralığı. */
export function Wordmark({ className, dot = false, tone = "dark" }: { className?: string; dot?: boolean; tone?: "dark" | "light" }) {
  return (
    <span className={cn("font-display text-[28px] font-black leading-none tracking-[-0.06em]", tone === "light" ? "text-white" : "text-ink", className)}>
      HEY<span className="text-brand-500">FANS</span>
      {dot && <span className="text-brand-500">.</span>}
    </span>
  );
}

export function LogoLink({ href = "/", className, dot, tone }: { href?: string; className?: string; dot?: boolean; tone?: "dark" | "light" }) {
  return (
    <Link href={href} aria-label="HEYFANS ana sayfa" className={cn("inline-flex shrink-0 items-center", className)}>
      <Wordmark dot={dot} tone={tone} />
    </Link>
  );
}
