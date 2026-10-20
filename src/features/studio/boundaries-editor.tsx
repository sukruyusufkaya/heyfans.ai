"use client";
import { useMemo, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/display";
import { Field, Input, Switch } from "@/components/ui/form-controls";
import { Notice, SettingRow, STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { TagInput } from "@/components/studio/tag-input";
import { firstError, useRun } from "@/components/studio/use-run";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import type { TwinBoundaries } from "@/models/ai";
import { saveBoundariesAction } from "./twin-actions";

const POLICY = [
  m("Reşit olmayanlarla ilgili hiçbir içerik üretilmez; bu konudaki mesajlar engellenir."),
  m("AI ikizi kendini gerçek bir insan olarak tanıtmaz; sorulduğunda AI olduğunu söyler."),
  m("Telefon, e-posta, adres gibi kişisel veriler ve platform dışı iletişim/ödeme yönlendirmesi maskelenir veya engellenir."),
  m("Kendine zarar belirtilerinde ikiz güvenli bir yanıt verir ve profesyonel yardıma yönlendirir."),
  m("Şiddet, yasa dışı faaliyet ve nefret içeren istekler yanıtlanmaz."),
  m("Mesajlar ve yanıtlar platform güvenlik filtresinden geçer; bir yanıt gerekirse düzenlenir."),
];

export function BoundariesEditor({ initial, adultContent, locked }: { initial: TwinBoundaries; adultContent: boolean; locked: boolean }) {
  const t = useT();
  const { run, pending, fieldErrors } = useRun();
  const [b, setB] = useState<TwinBoundaries>({ ...initial, allowFlirt: initial.allowFlirt && adultContent, escalateOnDistress: true });
  const [saved, setSaved] = useState(b);
  const dirty = useMemo(() => JSON.stringify(b) !== JSON.stringify(saved), [b, saved]);
  const set = <K extends keyof TwinBoundaries>(k: K, v: TwinBoundaries[K]) => setB((s) => ({ ...s, [k]: v }));
  const save = () => run(() => saveBoundariesAction(b), { onOk: () => setSaved(b) });

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title={t("Sınırlar ve İzinler")}
        description={t("AI ikizinin neyi yapıp yapmayacağını kontrol et ve güvenlik ayarlarını yönet.")}
        actions={
          <Button onClick={save} loading={pending} disabled={!dirty || locked}>
            <Check /> {t("Kuralları kaydet")}
          </Button>
        }
      />
      {locked && (
        <Notice tone="warn" className="mb-5" title={t("Düzenleme kilitli")}>
          {t("AI ikizin geri çekilmiş durumda. Düzenlemek için önce “AI İkizim” sayfasından yeniden taslağa almalısın.")}
        </Notice>
      )}
      <Notice className="mb-5" title={t("Sınırların etkisi")}>
        {t("Konu ve kural değişiklikleri taslağa yazılır ve inceleme sonrası yayındaki ikize geçer. Günlük mesaj limiti ve özel talep tercihi kaydedildiği anda geçerli olur.")}
      </Notice>

      <fieldset disabled={locked} className="min-w-0 border-0 p-0">
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.85fr)]">
          <Card>
            <CardHeader title={t("Etkileşim İzinleri")} hint={t("Hayranlarının AI ikizinle nasıl iletişim kurabileceğini seç.")} />
            <SettingRow htmlFor="b-personal" title={t("Kişisel sorulara yanıt ver")} description={t("Kapalıysa ikiz özel hayatınla ilgili sorulara yanıt vermez.")}>
              <Switch id="b-personal" checked={b.allowPersonalQuestions} onCheckedChange={(v) => set("allowPersonalQuestions", v)} />
            </SettingRow>
            <SettingRow htmlFor="b-media" title={t("Medya isteklerini kabul et")} description={t("Kapalıysa fotoğraf/video istekleri ücretli içerik kütüphanesine yönlendirilir.")}>
              <Switch id="b-media" checked={b.allowMediaRequests} onCheckedChange={(v) => set("allowMediaRequests", v)} />
            </SettingRow>
            <SettingRow htmlFor="b-custom" title={t("Özel taleplere izin ver")} description={t("Hayranlar “Özel Deneyimler” üzerinden sana özel istek gönderebilir.")}>
              <Switch id="b-custom" checked={b.allowCustomRequests} onCheckedChange={(v) => set("allowCustomRequests", v)} />
            </SettingRow>
            <SettingRow
              htmlFor="b-flirt"
              title={t("Flört tonu")}
              description={t(adultContent ? "Platform politikası izin verdiği ölçüde samimi/flörtöz üslup." : "Platform politikası, yetişkin içerik kapalıyken flört tonunu yasaklar; bu ayar şu an değiştirilemez.")}
            >
              <Switch id="b-flirt" checked={b.allowFlirt && adultContent} disabled={!adultContent} onCheckedChange={(v) => set("allowFlirt", v)} />
            </SettingRow>
            <SettingRow htmlFor="b-distress" title={t("Zor durumda yönlendirme")} description={t("Hayran kendine zarar belirtisi gösterirse güvenli yanıt ve profesyonel yardım yönlendirmesi yapılır. Güvenlik gereği kapatılamaz.")}>
              <Switch id="b-distress" checked disabled aria-label={t("Zor durumda yönlendirme (kapatılamaz)")} />
            </SettingRow>
            <div className="mt-4 border-t border-line-soft pt-4">
              <Field label={t("Hayran başına günlük mesaj sınırı")} htmlFor="b-max" hint={t("1–1000 arası. Sınıra ulaşan hayran ertesi gün devam edebilir.")} error={firstError(fieldErrors, "maxMessagesPerFanPerDay")}>
                <Input id="b-max" type="number" inputMode="numeric" min={1} max={1000} value={b.maxMessagesPerFanPerDay} onChange={(e) => set("maxMessagesPerFanPerDay", Math.min(1000, Math.max(1, Number(e.target.value) || 1)))} className="max-w-40" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("İçerik ve Konuşma Sınırları")} hint={t("Konu bazında kurallarını oluştur.")} />
            <div className="grid gap-5">
              <Field label={t("Engellenen konular ve anahtar kelimeler")} htmlFor="b-blocked" hint={t("İkiz bu konulara girmez ve nazikçe konuyu değiştirir · en fazla 30")} error={firstError(fieldErrors, "blockedTopics")}>
                <TagInput id="b-blocked" value={b.blockedTopics} onChange={(v) => set("blockedTopics", v)} max={30} maxLength={60} placeholder={t("Örn. özel hayat bilgileri")} />
              </Field>
              <Field label={t("Tercih edilen konular")} htmlFor="b-allowed" hint={t("İkiz bu konularda daha rahat konuşur · en fazla 20")} error={firstError(fieldErrors, "allowedTopics")}>
                <TagInput id="b-allowed" value={b.allowedTopics} onChange={(v) => set("allowedTopics", v)} max={20} maxLength={60} placeholder={t("Örn. seyahat, moda")} />
              </Field>
              <Field label={t("Özel kurallar")} htmlFor="b-rules" hint={t("Kendi cümlenle yaz: “Fiyat pazarlığı yapma.” · en fazla 15")} error={firstError(fieldErrors, "customRules")}>
                <TagInput id="b-rules" value={b.customRules} onChange={(v) => set("customRules", v)} max={15} maxLength={300} placeholder={t("Kuralı yaz, Enter'a bas")} />
              </Field>
              {b.customRules.length > 0 && (
                <ol className="grid gap-1.5 rounded-xl bg-soft p-3 text-[11px] text-ink-soft" aria-label={t("Özel kurallar listesi")}>
                  {b.customRules.map((r, i) => (
                    <li key={r} className="flex gap-2">
                      <b className="text-brand-500">{i + 1}.</b> {r}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
              {dirty ? <span className="text-[11px] font-semibold text-warning">{t("Kaydedilmemiş değişiklikler var")}</span> : <span className="text-[11px] font-semibold text-success">{t("Kurallar güncel")}</span>}
              <Button onClick={save} loading={pending} disabled={!dirty || locked}>
                <Check /> {t("Kuralları kaydet")}
              </Button>
            </div>
          </Card>

          <div className="grid content-start gap-5 lg:col-span-2 xl:col-span-1">
            <Card>
              <CardHeader title={t("Platform güvenlik politikası")} hint={t("Salt okunur · creator ayarları bunu aşamaz.")} icon={<ShieldCheck />} />
              <ul className="grid gap-2.5">
                {POLICY.map((line) => (
                  <li key={line} className="flex gap-2.5 text-[12px] leading-relaxed text-ink-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {t(line)}
                  </li>
                ))}
                <li className="flex gap-2.5 text-[12px] leading-relaxed text-ink-soft">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  {t(adultContent ? "Yetişkin içerik şu anda platform genelinde izne bağlı olarak açık." : "Yetişkin içerik şu anda platform genelinde KAPALI.")}
                </li>
              </ul>
            </Card>
            <Notice tone="safe" title={t("Kontrol tamamen sende")}>
              {t("Kişiliği ve içeriği belirlerken platformun güvenlik standartları uygulanmaya devam eder. İzinlerini istediğin zaman geri çekebilir, ikizini duraklatabilirsin.")}
            </Notice>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
