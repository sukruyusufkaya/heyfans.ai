"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Pause, Play, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Switch } from "@/components/ui/form-controls";
import { ConfirmDialog } from "@/components/studio/confirm-dialog";
import { Notice, SettingRow, TwinStatusBadge } from "@/components/studio/studio-ui";
import { firstError, useRun } from "@/components/studio/use-run";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useT } from "@/i18n/client";
import type { TwinStatus } from "@/models/ai";
import { ConsentCard } from "./consent-card";
import { saveNotificationPrefsAction } from "./business-actions";
import { pauseTwinAction, publishTwinAction, savePricingAction, setAllowCustomRequestsAction } from "./twin-actions";

export interface SettingsProps {
  account: { name: string; username: string; email: string; avatarUrl: string | null; verified: boolean };
  twinStatus: TwinStatus;
  creatorApproved: boolean;
  hasPersonaConsent: boolean;
  personaConsentText: string;
  personaConsentAt: string | null;
  pricing: { messageCredits: number; freeMessagesPerDay: number; voicePerMinuteCredits: number; videoPerMinuteCredits: number };
  maxMessageCredits: number;
  allowCustomRequests: boolean;
  prefs: { email: boolean; push: boolean; messages: boolean; promotions: boolean };
}

const intOr = (s: string, d = 0) => (Number.isFinite(Number(s)) && s.trim() !== "" ? Math.floor(Number(s)) : d);

export function StudioSettings(p: SettingsProps) {
  const t = useT();
  const pricing = useRun();
  const notif = useRun();
  const req = useRun();
  const twin = useRun();
  const [price, setPrice] = useState({
    messageCredits: String(p.pricing.messageCredits),
    freeMessagesPerDay: String(p.pricing.freeMessagesPerDay),
    voicePerMinuteCredits: String(p.pricing.voicePerMinuteCredits),
    videoPerMinuteCredits: String(p.pricing.videoPerMinuteCredits),
  });
  const [prefs, setPrefs] = useState(p.prefs);
  const [allowReq, setAllowReq] = useState(p.allowCustomRequests);
  const priceDirty = Object.entries(price).some(([k, v]) => String(p.pricing[k as keyof typeof p.pricing]) !== v);
  const prefsDirty = JSON.stringify(prefs) !== JSON.stringify(p.prefs);
  const overCap = intOr(price.messageCredits) > p.maxMessageCredits;

  return (
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {/* Hesap + fiyat */}
      <div className="grid content-start gap-5">
        <Card>
          <CardHeader title={t("Hesap bilgileri")} />
          <div className="flex items-center gap-3.5">
            <Avatar src={p.account.avatarUrl} name={p.account.name} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-extrabold">{p.account.name}</p>
              <p className="truncate text-[11px] text-muted">@{p.account.username} · {t("Creator hesabı")}</p>
            </div>
            <Badge tone={p.account.verified ? "green" : "warn"} dot>
              {p.account.verified ? t("Doğrulandı") : t("Doğrulama bekliyor")}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-2.5 border-t border-line-soft pt-3 text-[12px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-strong">{t("E-posta")}</dt>
              <dd className="truncate font-bold">{p.account.email}</dd>
            </div>
          </dl>
          <SettingRow title={t("Dil")} description={t("Arayüz, e-posta ve bildirim dilin.")} className="mt-1">
            <LanguageSwitcher variant="select" className="w-44" />
          </SettingRow>
          <p className="mt-3 text-[10px] text-muted">{t("Parola, oturum ve güvenlik ayarlarını hesap ayarlarından yönet. Görünen ad ve biyografi için “Profil Düzenleyici”yi kullan.")}</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button asChild variant="outline" size="sm">
              <Link href="/studio/profile">{t("Profil düzenleyici")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/settings">
                <ShieldCheck /> {t("Güvenlik ve oturumlar")}
              </Link>
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("AI ikizi fiyatlandırması")} hint={t("Kaydettiğin anda yeni sohbetlerde geçerli olur; inceleme gerekmez.")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Mesaj başı kredi")} htmlFor="pe-msg" hint={t("0 – {max} (platform üst sınırı)", { max: p.maxMessageCredits })} error={firstError(pricing.fieldErrors, "messageCredits") ?? (overCap ? t("En fazla {max} kredi", { max: p.maxMessageCredits }) : null)}>
              <Input id="pe-msg" type="number" min={0} max={p.maxMessageCredits} value={price.messageCredits} onChange={(e) => setPrice((s) => ({ ...s, messageCredits: e.target.value }))} />
            </Field>
            <Field label={t("Günlük ücretsiz mesaj")} htmlFor="pe-free" hint={t("Hayran başına · 0 – 50")} error={firstError(pricing.fieldErrors, "freeMessagesPerDay")}>
              <Input id="pe-free" type="number" min={0} max={50} value={price.freeMessagesPerDay} onChange={(e) => setPrice((s) => ({ ...s, freeMessagesPerDay: e.target.value }))} />
            </Field>
            <Field label={t("Sesli görüşme (kredi/dk)")} htmlFor="pe-voice" error={firstError(pricing.fieldErrors, "voicePerMinuteCredits")}>
              <Input id="pe-voice" type="number" min={0} max={1000} value={price.voicePerMinuteCredits} onChange={(e) => setPrice((s) => ({ ...s, voicePerMinuteCredits: e.target.value }))} />
            </Field>
            <Field label={t("Görüntülü görüşme (kredi/dk)")} htmlFor="pe-video" error={firstError(pricing.fieldErrors, "videoPerMinuteCredits")}>
              <Input id="pe-video" type="number" min={0} max={1000} value={price.videoPerMinuteCredits} onChange={(e) => setPrice((s) => ({ ...s, videoPerMinuteCredits: e.target.value }))} />
            </Field>
          </div>
          <p className="mt-3 text-[10px] text-muted">{t("Sesli ve görüntülü görüşme ücretleri, ilgili özellikler sağlayıcı bağlanıp açıldığında geçerli olur.")}</p>
          <Button
            className="mt-4"
            size="sm"
            loading={pricing.pending}
            disabled={!priceDirty || overCap}
            onClick={() =>
              pricing.run(() =>
                savePricingAction({
                  messageCredits: intOr(price.messageCredits),
                  freeMessagesPerDay: intOr(price.freeMessagesPerDay),
                  voicePerMinuteCredits: intOr(price.voicePerMinuteCredits),
                  videoPerMinuteCredits: intOr(price.videoPerMinuteCredits),
                }),
              )
            }
          >
            <Check /> {t("Fiyatları kaydet")}
          </Button>
        </Card>
      </div>

      {/* AI ikizi */}
      <div className="grid content-start gap-5">
        <Card>
          <CardHeader title={t("AI ikizi kontrolleri")} action={<TwinStatusBadge status={p.twinStatus} />} />
          <SettingRow htmlFor="st-req" title={t("Özel talepler")} description={t("Kapalıyken hayranlar sana özel talep gönderemez.")}>
            <Switch
              id="st-req"
              checked={allowReq}
              disabled={req.pending}
              onCheckedChange={async (v) => {
                setAllowReq(v);
                const ok = await req.run(() => setAllowCustomRequestsAction({ enabled: v }));
                if (!ok) setAllowReq(!v);
              }}
            />
          </SettingRow>
          <div className="mt-3 border-t border-line-soft pt-4">
            <p className="text-[13px] font-extrabold">{t("AI ikizini duraklat")}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{t("Duraklatıldığında hayranlar yeni sohbet başlatamaz; istediğin zaman devam ettirebilirsin. İzinlerin ve verilerin korunur.")}</p>
            <div className="mt-3">
              {p.twinStatus === "live" && (
                <ConfirmDialog
                  title={t("AI ikizini duraklat")}
                  description={t("Hayranlar yeni sohbet başlatamaz ve ikizin yanıt vermez. Dilediğin an devam ettirebilirsin.")}
                  confirmLabel={t("Duraklat")}
                  onConfirm={() => twin.run(() => pauseTwinAction())}
                  trigger={
                    <Button variant="secondary" size="sm">
                      <Pause /> {t("Duraklat")}
                    </Button>
                  }
                />
              )}
              {p.twinStatus === "paused" && (
                <Button size="sm" loading={twin.pending} disabled={!p.creatorApproved || !p.hasPersonaConsent} onClick={() => twin.run(() => publishTwinAction())}>
                  <Play /> {t("Devam ettir")}
                </Button>
              )}
              {p.twinStatus !== "live" && p.twinStatus !== "paused" && <p className="text-[11px] text-muted">{t("İkizin şu anda yayında değil; yayın akışı için “AI İkizim” sayfasına bak.")}</p>}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("Bildirim tercihleri")} hint={t("Uygulama içi bildirimler her zaman açıktır.")} />
          <SettingRow htmlFor="nt-msg" title={t("Mesaj ve özel talepler")} description={t("Yeni hayran talepleri ve mesajlar.")}>
            <Switch id="nt-msg" checked={prefs.messages} onCheckedChange={(v) => setPrefs((s) => ({ ...s, messages: v }))} />
          </SettingRow>
          <SettingRow htmlFor="nt-mail" title={t("E-posta bildirimleri")} description={t("Önemli gelişmeler e-postayla da gönderilir.")}>
            <Switch id="nt-mail" checked={prefs.email} onCheckedChange={(v) => setPrefs((s) => ({ ...s, email: v }))} />
          </SettingRow>
          <SettingRow htmlFor="nt-push" title={t("Anlık bildirimler")} description={t("Tarayıcı/mobil anlık bildirim.")}>
            <Switch id="nt-push" checked={prefs.push} onCheckedChange={(v) => setPrefs((s) => ({ ...s, push: v }))} />
          </SettingRow>
          <SettingRow htmlFor="nt-promo" title={t("Platform duyuruları")} description={t("Yeni özellikler ve kampanyalar.")}>
            <Switch id="nt-promo" checked={prefs.promotions} onCheckedChange={(v) => setPrefs((s) => ({ ...s, promotions: v }))} />
          </SettingRow>
          <p className="mt-2 text-[10px] text-muted">{t("Tercihlerin kaydedilir ve tüm bildirim kanallarında uygulanır.")}</p>
          <Button className="mt-3" size="sm" loading={notif.pending} disabled={!prefsDirty} onClick={() => notif.run(() => saveNotificationPrefsAction(prefs))}>
            <Check /> {t("Tercihleri kaydet")}
          </Button>
        </Card>
      </div>

      {/* Tehlikeli bölge */}
      <div className="grid content-start gap-5 lg:col-span-2 xl:col-span-1">
        <Card className="border-[#f6c9cd]">
          <CardHeader title={t("Tehlikeli bölge")} hint={t("Hassas işlemler: geri alınması zor olabilir.")} />
          <Notice tone="danger" title={t("İzinleri geri çekme")} className="mb-4">
            {t("AI ikizi kişilik iznini geri çektiğinde ikizin derhal çevrimdışı olur ve “Geri çekildi” durumuna geçer. Yeniden başlamak için izni tekrar verip taslaktan incelemeye göndermen gerekir.")}
          </Notice>
          <ConsentCard
            kind="ai_twin_persona"
            title={t("AI ikizi kişiliği")}
            text={p.personaConsentText}
            granted={p.hasPersonaConsent}
            grantedAt={p.personaConsentAt}
            strongRevoke
            revokeWarning={t("İznini geri çekersen AI ikizin DERHAL çevrimdışı olur: yayından kalkar, tüm yeni sohbetler ve özellikler durur. Yeniden başlamak için izni tekrar verip ikizi incelemeye göndermen gerekir.")}
          />
          <div className="mt-4 rounded-2xl bg-soft p-4 text-[11px] leading-relaxed text-muted-strong">
            {t("Ses, görsel ve bilgi tabanı izinlerini ilgili sayfalardan ayrı ayrı yönetebilirsin:")}{" "}
            <Link href="/studio/voice" className="font-bold text-brand-600 hover:underline">
              {t("Ses ve Görünüm")}
            </Link>{" "}
            ·{" "}
            <Link href="/studio/knowledge" className="font-bold text-brand-600 hover:underline">
              {t("Bilgi Tabanı")}
            </Link>
            .
          </div>
        </Card>
      </div>
    </div>
  );
}
