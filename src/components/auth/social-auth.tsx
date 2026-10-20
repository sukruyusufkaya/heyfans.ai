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

export const hasSocialProviders = (flags: SocialFlags) => flags.google || flags.apple;

/** Google / Apple ile giriş. Yalnız sunucuda yapılandırılmış sağlayıcıların düğmesi gösterilir; hiçbiri yoksa bileşen boş döner. */
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
  const active = PROVIDERS.filter((p) => flags[p.key]);

  async function go(provider: Provider) {
    setBusy(provider);
    try {
      // İptal veya sağlayıcı hatasında Better Auth'un İngilizce hata sayfası yerine Türkçe mesajla giriş sayfasına dönülür.
      const { error } = await authClient.signIn.social({ provider, callbackURL, errorCallbackURL: "/login?social=1" });
      if (error) {
        onError?.(authErrorText(error));
        setBusy(null);
      }
    } catch {
      onError?.(NETWORK_ERROR);
      setBusy(null);
    }
  }

  if (!active.length) return null;

  if (variant === "icons") {
    return (
      <div className="flex items-center justify-center gap-2" role="group" aria-label="Sosyal hesaplarla kaydol">
        {active.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => go(key)}
            disabled={busy !== null}
            title={`${label} ile devam et`}
            aria-label={`${label} ile devam et`}
            className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
          >
            <Icon />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3", active.length > 1 && "sm:grid-cols-2")}>
      {active.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => go(key)}
          disabled={busy !== null}
          className="flex h-[52px] items-center justify-center gap-2.5 rounded-[10px] border border-line bg-white text-[13px] font-extrabold text-ink-soft transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
        >
          <Icon />
          <span>{busy === key ? "Yönlendiriliyor…" : `${label} ile devam et`}</span>
        </button>
      ))}
    </div>
  );
}
