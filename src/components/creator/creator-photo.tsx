import { cn, initials } from "@/lib/utils";

const PALETTES = [
  ["#ff9ccf", "#ec0088", "#7a1a5a"],
  ["#ffc2a8", "#ff5f8f", "#8b2252"],
  ["#c9b6ff", "#8f5cf7", "#3b1f73"],
  ["#ffd6e8", "#f472b6", "#9d174d"],
  ["#fbcfe8", "#db2777", "#500724"],
  ["#fde4cf", "#fb7185", "#881337"],
  ["#e9d5ff", "#c026d3", "#4a044e"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Creator görseli. Gerçek fotoğraf (avatarUrl/coverUrl) varsa onu, yoksa ada göre deterministik,
 * markaya uygun temsili bir kompozisyon çizer (ekran görüntüsü kırpması kullanılmaz).
 */
export function CreatorPhoto({
  src,
  name,
  className,
  rounded = "rounded-[15px]",
  showMonogram = true,
  priority = false,
  sizes,
}: {
  src?: string | null;
  name: string;
  className?: string;
  rounded?: string;
  showMonogram?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} loading={priority ? "eager" : "lazy"} sizes={sizes} className={cn("size-full object-cover", rounded, className)} />
    );
  }
  const h = hash(name);
  const [a, b, c] = PALETTES[h % PALETTES.length]!;
  const x1 = 20 + (h % 50);
  const y1 = 15 + ((h >> 3) % 40);
  const x2 = 55 + ((h >> 5) % 35);
  const y2 = 50 + ((h >> 7) % 40);
  return (
    <span
      role="img"
      aria-label={`${name} için temsili görsel`}
      className={cn("relative block size-full overflow-hidden", rounded, className)}
      style={{
        background: `radial-gradient(circle at ${x1}% ${y1}%, ${a} 0%, transparent 48%), radial-gradient(circle at ${x2}% ${y2}%, ${b} 0%, transparent 55%), linear-gradient(150deg, ${a}, ${b} 55%, ${c})`,
      }}
    >
      <svg className="absolute inset-0 size-full opacity-[0.18] mix-blend-overlay" aria-hidden>
        <filter id={`n${h}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#n${h})`} />
      </svg>
      <span className="absolute -bottom-[18%] left-1/2 block h-[62%] w-[70%] -translate-x-1/2 rounded-[50%_50%_0_0] bg-white/15 blur-[1px]" aria-hidden />
      <span className="absolute bottom-[36%] left-1/2 block aspect-square w-[34%] -translate-x-1/2 rounded-full bg-white/20" aria-hidden />
      {showMonogram && (
        <span className="absolute inset-0 grid place-items-center font-display text-[clamp(18px,22cqw,72px)] font-extrabold tracking-tight text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.18)] [container-type:inline-size]">
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/** İçerik kapağı (medya yoksa türüne göre temsili). */
export function ContentCover({ src, title, type, locked, className }: { src?: string | null; title: string; type: string; locked?: boolean; className?: string }) {
  if (src && !locked) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={title} loading="lazy" className={cn("size-full object-cover", className)} />;
  }
  const h = hash(title + type);
  const [a, b, c] = PALETTES[(h >> 2) % PALETTES.length]!;
  return (
    <span
      role="img"
      aria-label={locked ? `${title} (kilitli içerik)` : title}
      className={cn("relative block size-full overflow-hidden", className)}
      style={{ background: `linear-gradient(${120 + (h % 90)}deg, ${a}, ${b} 60%, ${c})` }}
    >
      <span className="absolute inset-0 block bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_45%)]" aria-hidden />
      {locked && <span className="absolute inset-0 block backdrop-blur-md" aria-hidden />}
    </span>
  );
}
