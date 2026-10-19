"use client";
import * as React from "react";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { AppleIcon, GoogleIcon } from "@/components/auth/brand-icons";
import { authErrorText, NETWORK_ERROR } from "@/features/auth/client-errors";

export interface SocialFlags {
  google: boolean;
  apple: boolean;
}

type Provider = "google" | "apple";

const PROVIDERS: { key: Provider; label: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { key: "google", label: "Google", Icon: GoogleIcon },
  { key: "apple", label: "Apple", Icon: AppleIcon },
];

/**
 * Google / Apple ile giriş. Sağlayıcı sunucuda yapılandırılmamışsa düğme devre dışıdır ve "Yapılandırılmadı" notu gösterilir
 * (çalışıyormuş gibi davranılmaz).
 */
export function SocialAuth({
  flags,
  callbackURL,
  variant = "wide",
  onError,
}: {
  flags: SocialFlags;
  callbackURL: string;
  variant?: "wide" | "icons";
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = React.useState<Provider | null>(null);

  async function go(provider: Provider) {
    if (!flags[provider]) return;
    setBusy(provider);
    try {
      const { error } = await authClient.signIn.social({ provider, callbackURL });
      if (error) {
        onError?.(authErrorText(error));
        setBusy(null);
      }
    } catch {
      onError?.(NETWORK_ERROR);
      setBusy(null);
    }
  }

  const anyOff = !flags.google || !flags.apple;
  const note = !flags.google && !flags.apple ? "Google ve Apple ile giriş bu ortamda yapılandırılmadı." : !flags.google ? "Google ile giriş yapılandırılmadı." : !flags.apple ? "Apple ile giriş yapılandırılmadı." : null;

  if (variant === "icons") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center justify-center gap-2" role="group" aria-label="Sosyal hesaplarla kaydol">
          {PROVIDERS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => go(key)}
              disabled={!flags[key] || busy !== null}
              title={flags[key] ? `${label} ile devam et` : `${label}: Yapılandırılmadı`}
              aria-label={flags[key] ? `${label} ile devam et` : `${label} ile devam et (yapılandırılmadı)`}
              className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line disabled:hover:bg-white"
            >
              <Icon />
            </button>
          ))}
        </div>
        {anyOff && note && <p className="text-[11px] text-muted">{note}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROVIDERS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => go(key)}
            disabled={!flags[key] || busy !== null}
            aria-label={flags[key] ? `${label} ile devam et` : `${label} ile devam et (yapılandırılmadı)`}
            className={cn(
              "flex h-[52px] items-center justify-center gap-2.5 rounded-[10px] border border-line bg-white text-[13px] font-extrabold text-ink-soft transition-colors",
              "hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-white",
            )}
          >
            <Icon />
            <span className="flex flex-col items-start leading-tight">
              <span>{busy === key ? "Yönlendiriliyor…" : `${label} ile devam et`}</span>
              {!flags[key] && <span className="text-[10px] font-semibold text-muted">Yapılandırılmadı</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
