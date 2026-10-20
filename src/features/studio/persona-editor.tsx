"use client";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { Avatar, PageHeader } from "@/components/ui/display";
import { AiTwinLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, NativeSelect, Slider, Textarea } from "@/components/ui/form-controls";
import { Segmented } from "@/components/studio/segmented";
import { Meter, Notice, STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { TagInput } from "@/components/studio/tag-input";
import { firstError, useRun } from "@/components/studio/use-run";
import type { TwinPersona } from "@/models/ai";
import { savePersonaAction } from "./twin-actions";

const LANGS = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "ar", label: "العربية" },
  { value: "ru", label: "Русский" },
];

const level = (v: number, low: string, mid: string, high: string) => (v < 34 ? low : v < 67 ? mid : high);

function PersonaSlider({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p id={id} className="text-[13px] font-extrabold text-ink">
            {label}
          </p>
          <p className="text-[10px] text-muted">{hint}</p>
        </div>
        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-black text-brand-600" aria-live="polite">
          %{value}
        </span>
      </div>
      <Slider className="mt-2" min={0} max={100} step={1} value={[value]} onValueChange={([v]) => onChange(v ?? 0)} />
    </div>
  );
}

export function PersonaEditor({ initial, avatarUrl, creatorName, personaScore, locked }: { initial: TwinPersona; avatarUrl: string | null; creatorName: string; personaScore: number | null; locked?: boolean }) {
  const { run, pending, fieldErrors } = useRun();
  const [p, setP] = useState<TwinPersona>(initial);
  const [saved, setSaved] = useState<TwinPersona>(initial);
  const set = <K extends keyof TwinPersona>(k: K, v: TwinPersona[K]) => setP((s) => ({ ...s, [k]: v }));
  const dirty = useMemo(() => JSON.stringify(p) !== JSON.stringify(saved), [p, saved]);

  const save = () =>
    run(() => savePersonaAction(p), {
      onOk: () => setSaved(p),
    });

  const lengthRule = { short: "1-2 kısa cümle", medium: "2-4 cümle", long: "en fazla 2 kısa paragraf" }[p.messageLength];
  const emojiRule = { none: "emojisiz", low: "az emoji", medium: "orta emoji", high: "bol emoji" }[p.emojiUsage];
  const summary = [
    `Ton: ${level(p.warmth, "mesafeli", "dostça", "çok samimi")}`,
    level(p.formality, "gündelik dil", "dengeli dil", "resmî dil"),
    `mizah: ${level(p.humor, "az", "orta", "bol")}`,
    `enerji: ${level(p.energy, "sakin", "dengeli", "yüksek")}`,
    lengthRule,
    emojiRule,
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title="Kişilik Stüdyosu"
        description="AI ikizinin sesini, karakterini ve konuşma üslubunu yapılandır."
        actions={
          <Button onClick={save} loading={pending} disabled={!dirty || locked}>
            <Check /> Değişiklikleri kaydet
          </Button>
        }
      />
      {locked && (
        <Notice tone="warn" className="mb-5" title="Düzenleme kilitli">
          AI ikizin geri çekilmiş durumda. Düzenlemek için önce “AI İkizim” sayfasından yeniden taslağa almalısın.
        </Notice>
      )}
      <Notice className="mb-5" title="Değişiklikler inceleme sonrası yayına girer">
        Burada kaydettiklerin taslağa yazılır. Yayındaki ikizin davranışı, taslağı “AI İkizim” sayfasından incelemeye gönderip onaylanana kadar değişmez. Test sohbeti ise taslağı kullanır.
      </Notice>

      <fieldset disabled={locked} className="min-w-0 border-0 p-0">
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
          <Card>
            <CardHeader title="Kişilik Profili" hint="AI ikizinin temel karakter özelliklerini ayarla." />
            <div className="grid gap-4">
              <Field label="Görünen ad" htmlFor="pe-name" required error={firstError(fieldErrors, "displayName")}>
                <Input id="pe-name" value={p.displayName} maxLength={80} onChange={(e) => set("displayName", e.target.value)} />
              </Field>
              <Field label="Kısa tanıtım" htmlFor="pe-bio" hint={`${p.shortBio.length}/500`} error={firstError(fieldErrors, "shortBio")}>
                <Textarea id="pe-bio" value={p.shortBio} maxLength={500} onChange={(e) => set("shortBio", e.target.value)} className="min-h-20" />
              </Field>
              <Field label="Karşılama mesajı" htmlFor="pe-greet" required hint={`Hayran sohbeti açtığında ilk görür · ${p.greeting.length}/500`} error={firstError(fieldErrors, "greeting")}>
                <Textarea id="pe-greet" value={p.greeting} maxLength={500} onChange={(e) => set("greeting", e.target.value)} className="min-h-20" />
              </Field>
              <Field label="Konuşma tarzı" htmlFor="pe-style" hint="Örn. samimi, pozitif, kısa cümleler; teknik terimleri sade anlatır." error={firstError(fieldErrors, "speakingStyle")}>
                <Textarea id="pe-style" value={p.speakingStyle} maxLength={1000} onChange={(e) => set("speakingStyle", e.target.value)} className="min-h-20" />
              </Field>
              <div className="grid gap-5 border-t border-line-soft pt-4">
                <PersonaSlider label="Samimiyet" hint="Sıcakkanlı ve doğal bir ton" value={p.warmth} onChange={(v) => set("warmth", v)} />
                <PersonaSlider label="Resmiyet" hint="Profesyonel konuşma seviyesi" value={p.formality} onChange={(v) => set("formality", v)} />
                <PersonaSlider label="Espri düzeyi" hint="Neşeli ve eğlenceli yaklaşım" value={p.humor} onChange={(v) => set("humor", v)} />
                <PersonaSlider label="Enerji" hint="Sakin ↔ hareketli anlatım" value={p.energy} onChange={(v) => set("energy", v)} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="İfade ve Konuşma Tercihleri" hint="Ton, dil ve yanıt uzunluğunu belirle." />
            <div className="grid gap-5">
              <Field label="Ana dil" htmlFor="pe-lang">
                <NativeSelect id="pe-lang" value={p.language} onChange={(e) => set("language", e.target.value)}>
                  {LANGS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div>
                <p className="mb-2 text-[11px] font-extrabold text-ink-soft">Yanıt uzunluğu</p>
                <Segmented label="Yanıt uzunluğu" value={p.messageLength} onChange={(v) => set("messageLength", v)} options={[{ value: "short", label: "Kısa" }, { value: "medium", label: "Orta" }, { value: "long", label: "Detaylı" }]} />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-extrabold text-ink-soft">Konuşma temposu</p>
                <Segmented label="Konuşma temposu" value={p.pace} onChange={(v) => set("pace", v)} options={[{ value: "slow", label: "Yavaş" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Hızlı" }]} />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-extrabold text-ink-soft">Emoji kullanımı</p>
                <Segmented label="Emoji kullanımı" value={p.emojiUsage} onChange={(v) => set("emojiUsage", v)} options={[{ value: "none", label: "Yok" }, { value: "low", label: "Az" }, { value: "medium", label: "Orta" }, { value: "high", label: "Çok" }]} />
              </div>
              <Field label="Sık kullandığı ifadeler" htmlFor="pe-catch" hint="Enter ile ekle · en fazla 12" error={firstError(fieldErrors, "catchphrases")}>
                <TagInput id="pe-catch" value={p.catchphrases} onChange={(v) => set("catchphrases", v)} max={12} maxLength={80} placeholder="Örn. Hadi bakalım!" />
              </Field>
              <Field label="Örnek yanıtlar" htmlFor="pe-samples" hint="İkizin üslubu bu örneklerden öğrenir · en fazla 6" error={firstError(fieldErrors, "sampleReplies")}>
                <TagInput id="pe-samples" value={p.sampleReplies} onChange={(v) => set("sampleReplies", v)} max={6} maxLength={300} placeholder="Örnek bir yanıt yaz, Enter'a bas" />
              </Field>
              <Notice tone="warn" title="Önemli hatırlatma">
                Kişilik özellikleri platform güvenlik kuralları ve senin belirlediğin sınırlar içinde çalışır; bunları aşamaz. İkizin hiçbir zaman gerçek bir insan olduğunu iddia etmez.
              </Notice>
            </div>
          </Card>

          <div className="grid content-start gap-5 lg:col-span-2 xl:col-span-1">
            <Card>
              <CardHeader title="Canlı karakter önizlemesi" hint="Ayarların anında burada yansır." />
              <div className="flex items-center gap-3">
                <Avatar src={avatarUrl} name={p.displayName || creatorName} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold">{p.displayName || creatorName}</p>
                  <AiTwinLabel className="mt-1" />
                </div>
              </div>
              <div className="mt-4 rounded-2xl rounded-ss-sm bg-soft p-4 text-[12px] leading-relaxed text-ink-soft" aria-live="polite">
                {p.greeting || <span className="text-muted">Karşılama mesajını yazdığında burada görünür.</span>}
              </div>
              {p.sampleReplies[0] && <div className="ms-6 mt-2.5 rounded-2xl rounded-ss-sm bg-brand-50 p-3.5 text-[12px] leading-relaxed text-ink-soft">{p.sampleReplies[0]}</div>}
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Üslup özeti">
                {summary.map((s) => (
                  <li key={s} className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-extrabold text-brand-600">
                    {s}
                  </li>
                ))}
              </ul>
              {p.catchphrases.length > 0 && <p className="mt-3 text-[11px] text-muted">Sık söyledikleri: {p.catchphrases.map((c) => `“${c}”`).join(" · ")}</p>}
              <p className="mt-3 text-[10px] leading-relaxed text-muted">Bu kart ayarlarının özetidir. Gerçek yanıtlar test sohbetinde üretilir.</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/studio/test">
                  <MessageCircle /> Sohbeti test et
                </Link>
              </Button>
            </Card>
            <Card>
              <CardHeader title="Persona tutarlılığı" />
              <Meter label="Son testte uyum skoru" value={personaScore} />
              <p className="mt-3 text-[10px] text-muted">Skor, AI İkizi Testi çalıştırıldığında hesaplanır; burada tahmin gösterilmez.</p>
            </Card>
          </div>
        </div>
      </fieldset>

      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty && <span className="text-[11px] font-semibold text-warning">Kaydedilmemiş değişiklikler var</span>}
        <Button onClick={save} loading={pending} disabled={!dirty || locked}>
          <Check /> Kişilik ayarlarını kaydet
        </Button>
      </div>
    </div>
  );
}
