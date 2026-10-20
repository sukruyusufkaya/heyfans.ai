import * as React from "react";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { cn } from "@/lib/utils";

export interface VisualLine {
  text: string;
  accent?: boolean;
}

type ArtKind = "portrait" | "portrait-left" | "phones";

/** Koyu fuşya gradyan + üretilmiş temsili creator portreleri (ekran görüntüsü kırpması kullanılmaz). */
function VisualArt({ kind }: { kind: ArtKind }) {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-[linear-gradient(162deg,#8d1666_0%,#5b1044_38%,#270a23_100%)]">
      {kind === "phones" ? (
        <>
          <div className="absolute -end-[6%] top-[3%] h-[58%] w-[40%] rotate-[9deg] overflow-hidden rounded-[30px] border-[3px] border-white/20 opacity-80">
            <CreatorPhoto src="/images/seed/creators/damladeniz-portrait.webp" name="Damla Deniz" rounded="rounded-none" showMonogram={false} />
          </div>
          <div className="absolute start-[7%] top-[13%] h-[60%] w-[42%] -rotate-[7deg] overflow-hidden rounded-[30px] border-[3px] border-brand-300/60">
            <CreatorPhoto src="/images/seed/creators/mervearslan-portrait.webp" name="Merve Arslan" rounded="rounded-none" showMonogram={false} />
          </div>
          <div className="absolute start-[34%] top-[6%] h-[62%] w-[42%] rotate-[4deg] overflow-hidden rounded-[30px] border-[4px] border-brand-400 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            {/* i18n-ignore (örnek creator adı) */}
            <CreatorPhoto src="/images/seed/creators/meliserturk-portrait.webp" name="Melis Ertürk" rounded="rounded-none" showMonogram={false} />
          </div>
        </>
      ) : (
        <>
          <div className={cn("absolute inset-y-0 w-full", kind === "portrait" ? "end-0" : "start-0")}>
            <CreatorPhoto
              src={kind === "portrait" ? "/images/seed/creators/meliserturk-portrait.webp" : "/images/seed/creators/gizemaydin-portrait.webp"}
              name={kind === "portrait" ? "Melis Ertürk" : "Gizem Aydın"} // i18n-ignore (örnek creator adı)
              rounded="rounded-none"
              showMonogram={false}
            />
          </div>
          {/* Referanstaki koyu fuşya ton: fotoğrafın üstünde çarpma katmanı */}
          <div className="absolute inset-0 bg-[linear-gradient(162deg,rgba(141,22,102,0.55)_0%,rgba(91,16,68,0.45)_45%,rgba(39,10,35,0.7)_100%)] mix-blend-multiply" />
        </>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(39,10,35,0)_20%,rgba(39,10,35,0.55)_58%,rgba(32,8,28,0.96)_100%)]" />
    </div>
  );
}

/** Sol görsel panel: koyu fuşya gradyan, üst rozet, eyebrow + büyük başlık (ikinci satır pembe) + açıklama + alt not. */
export function AuthVisual({
  art = "portrait",
  topBadge,
  eyebrow,
  lines,
  body,
  footer,
  className,
}: {
  art?: ArtKind;
  topBadge?: React.ReactNode;
  eyebrow: string;
  lines: VisualLine[];
  body?: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate hidden overflow-clip text-white lg:flex", className)}>
      <VisualArt kind={art} />
      <div className="flex w-full flex-col justify-between gap-10 p-10 lg:sticky lg:top-0 lg:h-full lg:max-h-dvh lg:self-start xl:p-[54px]">
        <div className="min-h-10">{topBadge}</div>
        <div className="max-w-[560px]">
          <p className="text-[13px] font-medium uppercase tracking-[0.03em] text-white/90 xl:text-[15px]">{eyebrow}</p>
          <h2 className="mt-4 font-display text-[clamp(36px,3.7vw,58px)] font-extrabold leading-[0.99] tracking-[-0.035em] [word-spacing:0.08em]">
            {lines.map((l) => (
              <span key={l.text} className={cn("block", l.accent ? "text-[#ff69b8]" : "text-white")}>
                {l.text}
              </span>
            ))}
          </h2>
          {body && <p className="mt-6 max-w-[460px] text-[15px] leading-relaxed text-white/90 xl:text-base">{body}</p>}
          {footer && <div className="mt-8">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function VisualPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-2xl border border-white/25 bg-white/12 px-4 py-2.5 text-[11px] font-extrabold tracking-wide text-white backdrop-blur-md [&_svg]:size-4">
      {icon}
      {children}
    </span>
  );
}

export function VisualNote({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[13px] font-semibold text-white">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white [&_svg]:size-4">{icon}</span>
      {children}
    </p>
  );
}

const COLS = {
  login: "lg:grid-cols-[781fr_706fr]",
  register: "lg:grid-cols-[632fr_855fr]",
  balanced: "lg:grid-cols-2",
  verify: "lg:grid-cols-[696fr_818fr]",
  fan: "lg:grid-cols-[606fr_908fr]",
  creator: "lg:grid-cols-[651fr_863fr]",
} as const;
export type ShellRatio = keyof typeof COLS;

const OUTER_SHADOW = "shadow-[0_30px_70px_-28px_rgba(236,0,136,0.22)]";

/**
 * İki panelli kart iskeleti.
 * - `cards`: görsel panel ve form paneli ayrı iki kart (giriş/kayıt)
 * - `merged`: tek dış kart içinde solda görsel, sağda içerik (şifre/doğrulama/karşılama); `inner` içeriği ikinci bir kartta gösterir
 * Küçük ekranda görsel panel gizlenir; form tam genişlikte kalır.
 */
export function AuthShell({
  mode,
  ratio,
  visual,
  children,
  inner = false,
  align = "center",
  contentWidth = "max-w-[460px]",
}: {
  mode: "cards" | "merged";
  ratio: ShellRatio;
  visual: React.ReactNode;
  children: React.ReactNode;
  inner?: boolean;
  align?: "center" | "start";
  /** `cards` kipinde form sütununun azami genişliği. */
  contentWidth?: string;
}) {
  const alignment = align === "center" ? "justify-center" : "justify-start";
  if (mode === "cards") {
    return (
      <div className={cn("mx-auto grid w-full max-w-[1600px] gap-7 px-4 py-6 sm:px-6 lg:min-h-[858px] lg:px-[42px] lg:py-8", COLS[ratio])}>
        <div className="hidden overflow-clip rounded-[28px] lg:flex [&>div]:w-full">{visual}</div>
        <section className={cn("flex min-w-0 flex-col rounded-[28px] border border-line bg-white p-5 sm:p-10 lg:p-12", alignment, OUTER_SHADOW)}>
          <div className={cn("mx-auto w-full", contentWidth)}>{children}</div>
        </section>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-[42px] lg:py-8">
      <div className={cn("grid overflow-clip rounded-[28px] border border-line bg-white lg:min-h-[794px]", COLS[ratio], OUTER_SHADOW)}>
        <div className="hidden lg:flex [&>div]:w-full">{visual}</div>
        <section className={cn("flex min-w-0 flex-col p-4 sm:p-8 lg:p-10", alignment)}>
          {inner ? (
            <div className="mx-auto w-full max-w-[574px] bg-white px-1 py-4 sm:rounded-[26px] sm:border sm:border-line sm:p-10 sm:shadow-[0_24px_60px_-30px_rgba(25,16,34,0.25)]">{children}</div>
          ) : (
            children
          )}
        </section>
      </div>
    </div>
  );
}

/** Tek kartlı sade iskelet (güvenlik / geliştirme sayfaları). */
export function AuthSingle({ children, width = "max-w-[640px]" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:py-12">
      <section className={cn("mx-auto w-full rounded-[28px] border border-line bg-white p-6 sm:p-10", width, OUTER_SHADOW)}>{children}</section>
    </div>
  );
}
