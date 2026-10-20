import { Link2 } from "lucide-react";
import { m } from "@/i18n/m";

// i18n-ignore: platform adları marka adıdır, yalnız "Web sitesi" çevrilir.
const LABELS: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X (Twitter)", twitch: "Twitch", kick: "Kick", website: m("Web sitesi") };

/** Kaynak etiketi döner; gösterirken `t(socialLabel(platform))` kullanın. */
export function socialLabel(platform: string) {
  return LABELS[platform] ?? platform;
}

/** Yalnız http(s) bağlantılarına izin verir; kullanıcı girdisinden `javascript:` vb. şemalar asla bağlantıya dönüşmez. */
export function socialHref(s: { platform: string; handle: string; url: string | null }): string | null {
  const clean = (v: string) => v.trim().replace(/^@/, "");
  let raw = s.url?.trim() || "";
  if (!raw) {
    const h = clean(s.handle);
    if (!h) return null;
    if (/^https?:\/\//i.test(h)) raw = h;
    else if (s.platform === "instagram") raw = `https://instagram.com/${h}`;
    else if (s.platform === "tiktok") raw = `https://tiktok.com/@${h}`;
    else if (s.platform === "youtube") raw = `https://youtube.com/@${h}`;
    else if (s.platform === "x") raw = `https://x.com/${h}`;
    else if (s.platform === "twitch") raw = `https://www.twitch.tv/${h}`;
    else if (s.platform === "kick") raw = `https://kick.com/${h}`;
    else raw = `https://${h}`;
  }
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function SocialIcon({ platform, className = "size-4" }: { platform: string; className?: string }) {
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.3l4.4 5.8zm-1.1 18h1.7L6.3 3.9H4.5z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M16.6 2h-3.4v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.3 6.3 0 1 0 5.4 6.3V8.6a8 8 0 0 0 4.7 1.5V6.7A4.7 4.7 0 0 1 16.6 2z" />
        </svg>
      );
    case "twitch":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M4.3 2 3 5.4v13.8h4.6V22h2.6l2.6-2.8h3.8L21.8 14V2zm15.8 11.2-3 3h-4.6l-2.6 2.6v-2.6H6V3.8h14.1zM16.3 7.1h-1.8v5.2h1.8zm-4.8 0H9.7v5.2h1.8z" />
        </svg>
      );
    case "kick":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M3 3h6v4h2V5h2V3h6v6h-2v2h-2v2h2v2h2v6h-6v-2h-2v-2H9v4H3z" />
        </svg>
      );
    default:
      return <Link2 className={className} aria-hidden />;
  }
}
