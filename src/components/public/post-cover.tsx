import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

/**
 * Gönderi/içerik kapağı. `ContentCover` ile aynı görünümdür; fark: palet indeksi işaretsiz kaydırmayla (`>>>`)
 * hesaplanır. (`ContentCover` içinde `(h >> 2) % n` bazı başlıklarda negatif indeks üretip render'ı çökertir.)
 */
const PALETTES = [
  ["#ff9ccf", "#ec0088", "#7a1a5a"],
  ["#ffc2a8", "#ff5f8f", "#8b2252"],
  ["#c9b6ff", "#8f5cf7", "#3b1f73"],
  ["#ffd6e8", "#f472b6", "#9d174d"],
  ["#fbcfe8", "#db2777", "#500724"],
  ["#fde4cf", "#fb7185", "#881337"],
  ["#e9d5ff", "#c026d3", "#4a044e"],
] as const;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export async function PostCover({ src, title, type, locked, className }: { src?: string | null; title: string; type: string; locked?: boolean; className?: string }) {
  const t = await getT();
  if (src && !locked) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={title} loading="lazy" className={cn("size-full object-cover", className)} />;
  }
  const h = hash(title + type);
  const [a, b, c] = PALETTES[(h >>> 2) % PALETTES.length]!;
  return (
    <span
      role="img"
      aria-label={locked ? t("{title} (kilitli içerik)", { title }) : title}
      className={cn("relative block size-full overflow-hidden", className)}
      style={{ background: `linear-gradient(${120 + (h % 90)}deg, ${a}, ${b} 60%, ${c})` }}
    >
      <span className="absolute inset-0 block bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_45%)]" aria-hidden />
      {locked && <span className="absolute inset-0 block backdrop-blur-md" aria-hidden />}
    </span>
  );
}
