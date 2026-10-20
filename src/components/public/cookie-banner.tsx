"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Cookie } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveCookieConsentAction } from "@/features/support/actions";
import { useT } from "@/i18n/client";

/**
 * Site genelinde çerez bildirimi. Karar verilene kadar görünür (`hf_consent` çerezi sunucuda okunur → `decided`).
 * Zorunlu olmayan çerez/izleme istemci tarafında yoktur; yalnız karar kaydedilir ve ileride eklenecek araçlar bu tercihe uyar.
 */
export function CookieBanner({ decided }: { decided: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(!decided);
  const [pending, start] = useTransition();

  // Tercih merkezinde ayrıca bir uyarı göstermeye gerek yok
  if (!open || pathname === "/cookies") return null;

  function decide(action: "accept_all" | "reject_optional") {
    start(async () => {
      const res = await saveCookieConsentAction({ preferences: action === "accept_all", analytics: action === "accept_all", marketing: action === "accept_all", action });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section aria-label={t("Çerez tercihi")} className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-4xl rounded-2xl border border-line bg-white p-4 shadow-[0_18px_48px_rgb(25_16_34/0.18)] sm:inset-x-6 sm:bottom-5 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500 md:grid">
          <Cookie className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink">{t("Çerez tercihin")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-strong">
            {t.rich("Oturum ve güvenlik için zorunlu çerezleri her zaman kullanırız. Tercih, analitik ve pazarlama çerezleri yalnız iznine bağlıdır; kararını istediğin an <link>Çerez Politikası</link> sayfasından değiştirebilirsin.", {
              link: (c) => (
                <Link key="link" href="/cookies" className="font-bold text-brand-600 underline underline-offset-2">
                  {c}
                </Link>
              ),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:shrink-0 md:flex-nowrap">
          <Button type="button" variant="secondary" shape="pill" size="md" disabled={pending} onClick={() => decide("reject_optional")}>
            {t("Yalnızca zorunlu")}
          </Button>
          <Button asChild variant="outline" shape="pill" size="md">
            <Link href="/cookies">{t("Tercihleri yönet")}</Link>
          </Button>
          <Button type="button" shape="pill" size="md" loading={pending} onClick={() => decide("accept_all")}>
            {t("Tümünü kabul et")}
          </Button>
        </div>
      </div>
    </section>
  );
}
