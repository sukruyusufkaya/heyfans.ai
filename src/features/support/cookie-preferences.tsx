"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Megaphone, BarChart3, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form-controls";
import { saveCookieConsentAction } from "./actions";
import type { ConsentChoices } from "./consent";

type Row = { key: keyof ConsentChoices | "necessary"; title: string; text: string; icon: React.ReactNode };

const ROWS: Row[] = [
  { key: "necessary", title: "Zorunlu çerezler", text: "Hesap oturumu, güvenlik ve temel işlevler için gereklidir; kapatılamaz.", icon: <LockKeyhole /> },
  { key: "preferences", title: "İşlevsel (tercih) çerezleri", text: "Dil, görünüm ve deneyim tercihlerini hatırlamayı amaçlar.", icon: <SlidersHorizontal /> },
  { key: "analytics", title: "Analitik çerezleri", text: "Platform performansını ve kullanım örüntülerini anlamaya yönelik çerezler.", icon: <BarChart3 /> },
  { key: "marketing", title: "Pazarlama çerezleri", text: "Kampanya ve tanıtım tercihlerinin yönetimine yönelik çerezler.", icon: <Megaphone /> },
];

export function CookiePreferences({ initial, decidedAt }: { initial: ConsentChoices; decidedAt: string | null }) {
  const router = useRouter();
  const [choices, setChoices] = useState<ConsentChoices>(initial);
  const [pending, start] = useTransition();

  function save(action: "accept_all" | "reject_optional" | "custom" | "withdraw", next?: ConsentChoices) {
    const value = next ?? choices;
    start(async () => {
      const res = await saveCookieConsentAction({ ...value, action });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setChoices(res.data);
      toast.success(res.message ?? "Tercihlerin kaydedildi.");
      router.refresh();
    });
  }

  return (
    <div>
      <ul className="divide-y divide-line-soft">
        {ROWS.map((r) => {
          const necessary = r.key === "necessary";
          const checked = necessary ? true : choices[r.key as keyof ConsentChoices];
          const id = `consent-${r.key}`;
          return (
            <li key={r.key} className="flex items-center gap-4 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500 [&_svg]:size-[18px]" aria-hidden>
                {r.icon}
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor={id} className="block cursor-pointer text-sm font-extrabold text-ink">
                  {r.title}
                </label>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-strong">{r.text}</p>
              </div>
              <span className="hidden shrink-0 rounded-full bg-soft px-3 py-1.5 text-[10px] font-extrabold text-muted-strong sm:inline">{necessary ? "Her zaman etkin" : "Tercihe bağlı"}</span>
              <Switch id={id} checked={checked} disabled={necessary || pending} onCheckedChange={(v) => !necessary && setChoices((c) => ({ ...c, [r.key]: v }))} aria-label={r.title} />
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-col gap-2.5 border-t border-line-soft pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="secondary" shape="pill" size="lg" disabled={pending} onClick={() => save("reject_optional", { preferences: false, analytics: false, marketing: false })}>
          Tüm isteğe bağlıları reddet
        </Button>
        <Button type="button" variant="soft" shape="pill" size="lg" disabled={pending} onClick={() => save("accept_all", { preferences: true, analytics: true, marketing: true })}>
          Tümüne izin ver
        </Button>
        <Button type="button" shape="pill" size="lg" loading={pending} onClick={() => save("custom")}>
          Tercihlerimi kaydet
        </Button>
      </div>
      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-soft px-4 py-3 text-xs text-muted-strong sm:flex-row sm:items-center sm:justify-between">
        <span>{decidedAt ? `Son karar: ${decidedAt}.` : "Henüz bir tercih kaydetmedin; yalnız zorunlu çerezler kullanılıyor."}</span>
        <Button type="button" variant="ghost" size="sm" disabled={pending || !decidedAt} onClick={() => save("withdraw", { preferences: false, analytics: false, marketing: false })}>
          Rızamı geri çek
        </Button>
      </div>
    </div>
  );
}
