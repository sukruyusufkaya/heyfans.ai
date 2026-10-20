"use client";
import { useState } from "react";
import { Mic2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Slider, Switch } from "@/components/ui/form-controls";
import { MediaUploader } from "@/components/studio/media-uploader";
import { Segmented } from "@/components/studio/segmented";
import { Notice, SettingRow } from "@/components/studio/studio-ui";
import { useRun } from "@/components/studio/use-run";
import { useFormatters, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import type { ConsentKind } from "@/models/creator";
import { ConsentCard } from "./consent-card";
import { addVoiceSampleAction, removeVoiceSampleAction, saveVoiceSettingsAction, setLikenessAction } from "./twin-actions";

type Tone = "soft" | "neutral" | "energetic";
export interface VoiceStudioProps {
  identityVerified: boolean;
  consents: ConsentKind[];
  consentAt: Partial<Record<ConsentKind, string | null>>;
  texts: Record<"voice_likeness" | "image_likeness" | "video_likeness", string>;
  voice: { voiceEnabled: boolean; videoEnabled: boolean; imageLikenessEnabled: boolean; voiceProfileStatus: string; pitch: number; speed: number; tone: Tone };
  samples: { assetId: string; name: string; sizeBytes: number; url: string }[];
  rtcConfigured: boolean;
  avatarUrl: string | null;
  creatorName: string;
  locked: boolean;
}

const PROFILE_LABEL: Record<string, string> = { none: m("Ses profili oluşturulmadı"), pending: m("Ses profili hazırlanıyor"), ready: m("Ses profili hazır"), disabled: m("Ses profili kapalı") };

export function VoiceStudio(p: VoiceStudioProps) {
  const t = useT();
  const { formatPercent } = useFormatters();
  const { run, pending } = useRun();
  const [pitch, setPitch] = useState(p.voice.pitch);
  const [speed, setSpeed] = useState(p.voice.speed);
  const [tone, setTone] = useState<Tone>(p.voice.tone);
  const [flags, setFlags] = useState({ voice: p.voice.voiceEnabled, video: p.voice.videoEnabled, image: p.voice.imageLikenessEnabled });
  const dirty = pitch !== p.voice.pitch || speed !== p.voice.speed || tone !== p.voice.tone;
  const has = (k: ConsentKind) => p.consents.includes(k);

  const toggle = async (feature: "voice" | "video" | "image", enabled: boolean) => {
    setFlags((f) => ({ ...f, [feature]: enabled }));
    const ok = await run(() => setLikenessAction({ feature, enabled }));
    if (!ok) setFlags((f) => ({ ...f, [feature]: !enabled }));
  };

  const lockedReason = t("Kimlik doğrulaman tamamlanmadan bu izin verilemez.");
  return (
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Sol: görünüm + görsel kullanım */}
      <div className="grid content-start gap-5">
        <Card>
          <CardHeader title={t("AI Görünümü")} hint={t("Onay verdiğin profil ve görsel varlıklar.")} />
          <div className="flex items-center gap-4">
            <Avatar src={p.avatarUrl} name={p.creatorName} size={84} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-extrabold">{p.creatorName}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={p.identityVerified ? "green" : "warn"} size="sm" dot>
                  {p.identityVerified ? t("Doğrulanmış creator") : t("Kimlik doğrulaması bekleniyor")}
                </Badge>
                <Badge tone={has("image_likeness") ? "pink" : "gray"} size="sm">
                  {t(has("image_likeness") && flags.image ? "Görsel kimlik aktif" : "Görsel kimlik kapalı")}
                </Badge>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">{t("AI görselleri yalnızca senin izin verdiğin kimlik ve içeriklerden üretilebilir. Kimlik doğrulaması ve açık rıza olmadan görsel benzerlik kullanılmaz.")}</p>
        </Card>

        <Card>
          <CardHeader title={t("Benzerlik özellikleri")} hint={t("Açık rıza + kimlik doğrulaması olmadan açılamaz.")} />
          <Notice tone="info" className="mb-3" title={t("Tercihlerin kaydedilir")}>
            {t("Anahtarları açman tercihini kaydeder; özellikler platformda etkinleştirildiğinde hayranlarına sunulur.")}
          </Notice>
          <SettingRow htmlFor="lk-voice" title={t("Ses benzerliği")} description={has("voice_likeness") ? (p.rtcConfigured ? t("Ses altyapısı bağlı.") : t("Sesli görüşme şu anda kapalı.")) : t("Önce ses benzerliği iznini ver.")}>
            <Switch id="lk-voice" checked={flags.voice} disabled={p.locked || pending || !has("voice_likeness")} onCheckedChange={(v) => toggle("voice", v)} aria-label={t("Ses benzerliğini aç/kapat")} />
          </SettingRow>
          <SettingRow htmlFor="lk-image" title={t("Görsel benzerlik")} description={has("image_likeness") ? t("Yeni görsel üretimi için sağlayıcı gerekir.") : t("Önce görsel benzerlik iznini ver.")}>
            <Switch id="lk-image" checked={flags.image} disabled={p.locked || pending || !has("image_likeness")} onCheckedChange={(v) => toggle("image", v)} aria-label={t("Görsel benzerliği aç/kapat")} />
          </SettingRow>
          <SettingRow htmlFor="lk-video" title={t("Görüntülü etkileşim")} description={has("video_likeness") ? t("Yayınlama için ayrıca onay ve sağlayıcı gerekir.") : t("Önce video benzerlik iznini ver.")}>
            <Switch id="lk-video" checked={flags.video} disabled={p.locked || pending || !has("video_likeness")} onCheckedChange={(v) => toggle("video", v)} aria-label={t("Görüntülü etkileşimi aç/kapat")} />
          </SettingRow>
        </Card>
      </div>

      {/* Orta: ses stüdyosu */}
      <div className="grid content-start gap-5">
        <Card>
          <CardHeader title={t("Ses Stüdyosu")} hint={t("AI ikizinin yetkilendirilmiş ses deneyimini yönet.")} />
          <div className="rounded-2xl bg-gradient-to-br from-[#fff1f9] to-[#f7eaf7] p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-500 shadow-sm">
                <Mic2 className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold">{t(PROFILE_LABEL[p.voice.voiceProfileStatus] ?? m("Ses profili"))}</p>
                <p className="text-[10px] text-muted">{t("{count} ses örneği kayıtlı · Ses sentezi sağlayıcısı henüz bağlı değil", { count: p.samples.length })}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-strong">{t("Örnek ses dinleme ve ses profili oluşturma, sağlayıcı bağlandığında etkinleşir. O zamana kadar yüklediğin örnekler yalnız güvenle saklanır.")}</p>
          </div>

          <div className="mt-5 grid gap-5 border-t border-line-soft pt-5">
            <div role="group" aria-labelledby="vs-speed">
              <div className="mb-1 flex items-center justify-between">
                <p id="vs-speed" className="text-[11px] font-extrabold text-ink-soft">
                  {t("Konuşma hızı")}
                </p>
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-black text-brand-600">{formatPercent(speed * 100)}</span>
              </div>
              <Slider min={50} max={150} step={1} value={[speed]} onValueChange={([v]) => setSpeed(v ?? 100)} disabled={p.locked} />
              <div className="mt-1 flex justify-between text-[10px] text-muted">
                <span>{t("Yavaş")}</span>
                <span>{t("Normal")}</span>
                <span>{t("Hızlı")}</span>
              </div>
            </div>
            <div role="group" aria-labelledby="vs-pitch">
              <div className="mb-1 flex items-center justify-between">
                <p id="vs-pitch" className="text-[11px] font-extrabold text-ink-soft">
                  {t("Ses perdesi")}
                </p>
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-black text-brand-600">{pitch > 0 ? `+${pitch}` : pitch}</span>
              </div>
              <Slider min={-10} max={10} step={1} value={[pitch]} onValueChange={([v]) => setPitch(v ?? 0)} disabled={p.locked} />
              <div className="mt-1 flex justify-between text-[10px] text-muted">
                <span>{t("Kalın")}</span>
                <span>{t("Doğal")}</span>
                <span>{t("İnce")}</span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-extrabold text-ink-soft">{t("Ses tonu")}</p>
              <Segmented label={t("Ses tonu")} value={tone} onChange={setTone} disabled={p.locked} options={[{ value: "neutral", label: t("Doğal") }, { value: "energetic", label: t("Enerjik") }, { value: "soft", label: t("Sakin") }]} />
            </div>
            <div>
              <Button onClick={() => run(() => saveVoiceSettingsAction({ pitch, speed, tone }))} loading={pending} disabled={!dirty || p.locked}>
                {t("Ses ayarlarını kaydet")}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Sağ: onay + örnekler */}
      <div className="grid content-start gap-5 lg:col-span-2 xl:col-span-1">
        <Card>
          <CardHeader title={t("Onay ve erişim")} hint={t("Her özellik için açık rıza gerekir; istediğin an geri çekebilirsin.")} />
          <div className="grid gap-3">
            <ConsentCard
              kind="voice_likeness"
              title={t("Ses benzerliği")}
              text={p.texts.voice_likeness}
              granted={has("voice_likeness")}
              grantedAt={p.consentAt.voice_likeness}
              locked={!p.identityVerified}
              lockedReason={lockedReason}
              revokeWarning={t("İznini geri çekersen ses özellikleri DERHAL durdurulur; ses profili kapatılır ve ses benzerliği devre dışı kalır.")}
            />
            <ConsentCard
              kind="image_likeness"
              title={t("Görsel benzerlik")}
              text={p.texts.image_likeness}
              granted={has("image_likeness")}
              grantedAt={p.consentAt.image_likeness}
              locked={!p.identityVerified}
              lockedReason={lockedReason}
              revokeWarning={t("İznini geri çekersen görsel benzerlik ve görüntülü özellikler derhal durdurulur.")}
            />
            <ConsentCard
              kind="video_likeness"
              title={t("Görüntülü benzerlik")}
              text={p.texts.video_likeness}
              granted={has("video_likeness")}
              grantedAt={p.consentAt.video_likeness}
              locked={!p.identityVerified}
              lockedReason={lockedReason}
              revokeWarning={t("İznini geri çekersen görüntülü AI deneyimleri derhal durdurulur.")}
            />
          </div>
          {!p.identityVerified && (
            <Notice tone="info" className="mt-3" title={t("Kimlik doğrulaması gerekli")}>
              {t("Ses, görsel ve görüntülü benzerlik izinleri yalnız kimliği doğrulanmış creator’lara açıktır. Doğrulama süreci tamamlanınca burada izin verebilirsin.")}
            </Notice>
          )}
        </Card>

        <Card>
          <CardHeader title={t("Ses örnekleri")} hint={t("İzin verdiğin ses kayıtlarını yükle (MP3, WAV, M4A · en fazla 50 MB).")} />
          {has("voice_likeness") ? (
            <>
              <MediaUploader
                purpose="voice_sample"
                value={[]}
                onChange={async (files) => {
                  const f = files[0];
                  if (f) await run(() => addVoiceSampleAction({ assetId: f.assetId }));
                }}
                accept="audio/*,.mp3,.wav,.m4a,.ogg"
                label={t("Ses dosyası seç")}
                hint={t("İzin verdiğin ses kaydını yükle")}
                compact
                disabled={p.locked || pending}
              />
              {p.samples.length > 0 && (
                <ul className="mt-4 grid gap-2.5">
                  {p.samples.map((s) => (
                    <li key={s.assetId} className="rounded-xl border border-line p-2.5">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-bold">{s.name}</p>
                        <button type="button" className="grid size-7 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger" aria-label={t("{name} örneğini sil", { name: s.name })} onClick={() => void run(() => removeVoiceSampleAction({ assetId: s.assetId }))}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <audio controls preload="none" src={s.url} className="h-8 w-full" aria-label={t("{name} önizleme", { name: s.name })} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-[12px] text-muted">{t("Ses örneği yüklemek için önce yukarıdan “Ses benzerliği” iznini vermelisin.")}</p>
          )}
        </Card>

        <Notice tone="safe" title={t("Creator hakları korunur")}>
          {t("Ses ve görsel benzerlik izin kapsamı dışında üretilmez; izni geri çektiğinde ilgili özellikler hemen durur ve istediğin an yayından kaldırabilirsin.")}
        </Notice>
      </div>
    </div>
  );
}
