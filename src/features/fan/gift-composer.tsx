"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Coffee, Coins, Crown, Flower2, Gem, Gift, Heart, Rocket, Send, Sparkles, Star, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { sendGiftAction } from "@/features/fan/actions";
import { cn, formatNumber } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { flower: Flower2, heart: Heart, coffee: Coffee, crown: Crown, gem: Gem, rocket: Rocket, star: Star, trophy: Trophy, sparkles: Sparkles, gift: Gift };

export interface GiftCatalogView {
  key: string;
  name: string;
  icon: string;
  credits: number;
}
export interface GiftCreatorOption {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

const TIP_PRESETS = [10, 25, 50, 100, 250];

/** Hediye / bahşiş gönderme formu. Kredi düşümü sunucuda atomik yapılır; aynı istemci anahtarı çift gönderimi engeller. */
export function GiftComposer({ catalog, creators, balance, initialCreator }: { catalog: GiftCatalogView[]; creators: GiftCreatorOption[]; balance: number; initialCreator?: string }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<"gift" | "tip">("gift");
  const [giftKey, setGiftKey] = React.useState(catalog[Math.min(3, catalog.length - 1)]?.key ?? "");
  const [tip, setTip] = React.useState("25");
  const [username, setUsername] = React.useState(creators.find((c) => c.username === initialCreator)?.username ?? creators[0]?.username ?? "");
  const [message, setMessage] = React.useState("");
  const [anonymous, setAnonymous] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [clientKey, setClientKey] = React.useState(() => crypto.randomUUID());
  const id = React.useId();

  const selected = catalog.find((g) => g.key === giftKey);
  const cost = kind === "gift" ? (selected?.credits ?? 0) : Math.floor(Number(tip) || 0);
  const insufficient = cost > balance;
  const creator = creators.find((c) => c.username === username);

  async function send() {
    if (busy || !creator) return;
    setBusy(true);
    setError(null);
    const res = await sendGiftAction({
      username,
      kind,
      giftKey: kind === "gift" ? giftKey : undefined,
      credits: kind === "tip" ? cost : undefined,
      message: message.trim() || undefined,
      anonymous,
      clientKey,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.fieldErrors ? (Object.values(res.fieldErrors).flat()[0] ?? res.error) : res.error);
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Gönderildi.");
    setMessage("");
    setClientKey(crypto.randomUUID()); // bir sonraki gönderim yeni işlem
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title={kind === "gift" ? "Bir Hediye Seç" : "Bahşiş Miktarı"} hint="Sevdiğin içerik üreticisini krediyle destekle." action={<span className="rounded-full bg-brand-100 px-2.5 py-1.5 text-[10px] font-extrabold text-brand-600">{kind === "gift" ? `${catalog.length} seçenek` : "Serbest tutar"}</span>} />
        <div role="tablist" aria-label="Gönderim türü" className="mb-4 flex gap-2">
          {(["gift", "tip"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={cn("rounded-[10px] px-4 py-2.5 text-[11px] font-extrabold transition-colors", kind === k ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}
            >
              {k === "gift" ? "Hediye" : "Bahşiş"}
            </button>
          ))}
        </div>
        {kind === "gift" ? (
          catalog.length ? (
            <div role="radiogroup" aria-label="Hediye" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {catalog.map((g) => {
                const Icon = ICONS[g.icon] ?? Gift;
                const on = g.key === giftKey;
                return (
                  <button
                    key={g.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setGiftKey(g.key)}
                    className={cn("relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all", on ? "border-brand-400 bg-brand-50 shadow-[0_8px_20px_rgb(236_0_136/0.12)]" : "border-line-soft bg-[#fcfafd] hover:border-brand-200")}
                  >
                    {on && <Check className="absolute end-2.5 top-2.5 size-4 text-brand-500" aria-hidden />}
                    <span className="grid size-12 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
                      <Icon className="size-6" />
                    </span>
                    <span className="text-xs font-extrabold">{g.name}</span>
                    <span className="text-[11px] font-bold text-muted">{formatNumber(g.credits)} kredi</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-soft p-4 text-center text-xs text-muted">Şu anda gönderilebilir hediye yok.</p>
          )
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTip(String(p))}
                  aria-pressed={Number(tip) === p}
                  className={cn("rounded-full border px-4 py-2 text-xs font-extrabold transition-colors", Number(tip) === p ? "border-brand-400 bg-brand-50 text-brand-600" : "border-line text-muted-strong hover:border-brand-200")}
                >
                  {p} kredi
                </button>
              ))}
            </div>
            <Field label="Veya kendi tutarın" htmlFor={`${id}-tip`} hint="En az 5, en fazla 50.000 kredi.">
              <Input id={`${id}-tip`} type="number" inputMode="numeric" min={5} max={50000} step={1} value={tip} onChange={(e) => setTip(e.target.value)} className="max-w-48" />
            </Field>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4 text-xs">
          <p className="text-muted">
            Mevcut kredi bakiyen <b className="text-ink">{formatNumber(balance)} kredi</b>
          </p>
          <Link href="/app/wallet" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-300 px-4 text-[11px] font-extrabold text-brand-600 hover:bg-brand-50">
            <Coins className="size-3.5" /> Daha fazla kredi yükle
          </Link>
        </div>
      </Card>

      <Card className="hf-gradient-pink h-fit">
        <CardHeader title="Gönderi" hint="Hediyenin gönderileceği içerik üreticisi" />
        {creators.length ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3">
              <Avatar src={creator?.avatarUrl ?? null} name={creator?.displayName ?? "?"} size={42} />
              <Field className="min-w-0 flex-1" label={<span className="sr-only">İçerik üreticisi</span>} htmlFor={`${id}-c`}>
                <NativeSelect id={`${id}-c`} value={username} onChange={(e) => setUsername(e.target.value)} aria-label="İçerik üreticisi" className="h-10">
                  {creators.map((c) => (
                    <option key={c.username} value={c.username}>
                      {c.displayName}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-brand-200 bg-white p-3.5 text-xs">
              <span className="font-bold text-muted-strong">{kind === "gift" ? (selected ? `Seçili hediye: ${selected.name}` : "Hediye seç") : "Bahşiş"}</span>
              <span className="font-black">{formatNumber(cost)} kredi</span>
            </div>
            <Field label="Kısa bir not ekle (isteğe bağlı)" htmlFor={`${id}-m`}>
              <Textarea id={`${id}-m`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} className="min-h-20 bg-white" placeholder="Seninle konuşmak her zaman harika! 💗" />
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-ink-soft">
              <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} /> Adım gizli kalsın (anonim gönder)
            </label>
            {(insufficient || error) && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[11px] font-semibold text-danger">
                {insufficient ? "Bakiyen bu gönderim için yeterli değil." : error}
              </p>
            )}
            <Button size="lg" shape="pill" onClick={send} loading={busy} disabled={insufficient || cost <= 0 || (kind === "tip" && cost < 5) || !creator}>
              <Send className="rtl:-scale-x-100" /> {kind === "gift" ? "Hediyeyi gönder" : "Bahşişi gönder"}
            </Button>
            <p className="text-center text-[10px] text-muted">Gönderilen hediye ve bahşişler iade edilmez. Kredi düşümü ve işlem kaydı anında yapılır.</p>
          </div>
        ) : (
          <p className="rounded-xl bg-white/80 p-4 text-center text-xs leading-relaxed text-muted-strong">
            Hediye göndermek için önce bir içerik üreticisini takip etmelisin.{" "}
            <Link href="/explore" className="font-extrabold text-brand-600 hover:underline">
              Keşfet
            </Link>
          </p>
        )}
      </Card>
    </div>
  );
}
