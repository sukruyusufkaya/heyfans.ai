import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Brain, ChevronRight, Eye, FlaskConical, ImageIcon, Mic2, Play, Shield, ShieldCheck } from "lucide-react";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { Badge, AiTwinLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/display";
import { Meter, Notice, Panel, STUDIO_EYEBROW, TwinStatusBadge } from "@/components/studio/studio-ui";
import { ConsentCard } from "@/features/studio/consent-card";
import { TwinControls } from "@/features/studio/twin-controls";
import { requireCreator } from "@/lib/auth/session";
import { aiStatus } from "@/lib/ai/provider";
import { rtcStatus } from "@/lib/rtc";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { CONSENT_TEXTS } from "@/services/ai-twins/lifecycle";
import { getTwinOverview } from "@/services/studio/twin";

export const metadata: Metadata = { title: "AI İkizim" };

const VERSION_LABEL: Record<string, { label: string; tone: "violet" | "green" | "danger" | "gray" | "teal" }> = {
  pending_review: { label: "İncelemede", tone: "violet" },
  approved: { label: "Onaylandı", tone: "teal" },
  rejected: { label: "Düzenleme gerekli", tone: "danger" },
  superseded: { label: "Yenisi geldi", tone: "gray" },
  live: { label: "Canlı sürüm", tone: "green" },
};

const SHORTCUTS = [
  { href: "/studio/personality", icon: Brain, title: "Kişilik ve Davranış", hint: "Konuşma tarzı, kişilik profili" },
  { href: "/studio/knowledge", icon: BookOpen, title: "Bilgi Tabanı", hint: "Onayladığın kaynak ve bilgiler" },
  { href: "/studio/voice", icon: Mic2, title: "Ses ve Görünüm", hint: "İzinli ses ve görsel ayarları" },
  { href: "/studio/boundaries", icon: Shield, title: "Sınırlar ve İzinler", hint: "İçerik ve davranış izinleri" },
  { href: "/studio/test", icon: FlaskConical, title: "AI İkizi Testi", hint: "Yayın öncesi canlı deneme" },
  { href: "/studio/settings", icon: ImageIcon, title: "Fiyat ve Ayarlar", hint: "Mesaj ücreti, ücretsiz hak" },
];

export default async function TwinPage() {
  const { user } = await requireCreator();
  const o = await getTwinOverview(user.id);
  const { twin, creator } = o;
  const ai = aiStatus();
  const rtc = rtcStatus();
  const hasPersona = o.consents.includes("ai_twin_persona");
  const consentAt = (k: string) => o.consentRows.find((r) => r.kind === k)?.grantedAt ?? null;
  const q = twin.quality;
  const live = twin.status === "live";

  const features = [
    { label: "AI ikizi sohbeti", desc: live ? "Hayranlar şu anda sohbet başlatabilir." : "Yalnız yayındayken hayranlara açıktır.", on: live && twin.features.chat },
    { label: "Sesli mesaj / görüşme", desc: rtc.configured ? "Sesli görüşme altyapısı hazır." : "Sesli görüşme şu anda kapalı.", on: twin.features.voice && rtc.configured },
    { label: "Görsel benzerlik", desc: "Yalnız kimlik doğrulaması + açık rıza ile.", on: twin.draft.voice.imageLikenessEnabled },
    { label: "Görüntülü etkileşim", desc: "Yayınlama için ayrıca onay ve sağlayıcı gerekir.", on: twin.features.video && rtc.configured },
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title="AI İkizim"
        description="Dijital ikizinin kimliğini, davranışını ve yayın durumunu yönet."
        actions={
          <Button asChild>
            <Link href="/studio/test">
              <Play /> AI ikizimi test et
            </Link>
          </Button>
        }
      />

      {!ai.available && (
        <Notice tone="warn" title="AI yanıtları şu anda kapalı" className="mb-5">
          İkizin şu anda yanıt üretemez; test sohbeti ve hayran sohbetleri yeniden açıldığında kendiliğinden etkinleşir.
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.8fr)]">
        {/* Sol: ikiz kartı + yayın kontrolü */}
        <div className="grid content-start gap-5">
          <Card padded={false} className="overflow-hidden">
            <div className="relative aspect-[4/3]">
              <CreatorPhoto src={creator.avatarUrl ?? creator.coverUrl} name={creator.displayName} rounded="rounded-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
              <div className="absolute end-3.5 top-3.5">
                <TwinStatusBadge status={twin.status} size="md" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-[22px] font-black leading-tight tracking-[-0.03em]">{creator.displayName} AI İkizi</p>
                <p className="mt-1 text-[11px] text-white/85">Yetkilendirilmiş, creator kontrolünde dijital temsilci</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-[11px] text-muted">
                {o.identityVerified ? "Creator doğrulaması tamamlandı" : "Kimlik doğrulaması bekleniyor"} · Sürüm {twin.currentVersion || "—"}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/creators/${creator.username}`}>
                  <Eye /> Önizleme
                </Link>
              </Button>
            </div>
          </Card>

          <Panel title="Yayın ve kontrol durumu" hint="Yayın akışı: taslak → inceleme → onay → yayın">
            <div className="mb-4 flex items-center gap-2">
              <TwinStatusBadge status={twin.status} />
              <AiTwinLabel />
            </div>
            <TwinControls status={twin.status} creatorApproved={creator.status === "approved"} hasPersonaConsent={hasPersona} reviewNote={twin.reviewNote} />
            <ul className="mt-4 border-t border-line-soft pt-2">
              {features.map((f) => (
                <li key={f.label} className="flex items-center justify-between gap-3 border-b border-line-soft py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold">{f.label}</p>
                    <p className="text-[10px] text-muted">{f.desc}</p>
                  </div>
                  <Badge tone={f.on ? "green" : "gray"} size="sm" dot>
                    {f.on ? "Açık" : "Kapalı"}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Orta: yönetim alanı + rızalar */}
        <div className="grid content-start gap-5">
          <Panel title="AI İkizi Yönetim Alanı" hint="Kişilik, bilgi ve sınır ayarlarına buradan ulaş.">
            <div className="grid gap-3 sm:grid-cols-2">
              {SHORTCUTS.map((s) => (
                <Link key={s.href} href={s.href} className="group flex items-center gap-3 rounded-[14px] border border-line bg-white p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500">
                    <s.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-extrabold leading-snug text-ink">{s.title}</span>
                    <span className="block text-[10px] leading-snug text-muted">{s.hint}</span>
                  </span>
                  <ChevronRight className="rtl:-scale-x-100 size-4 shrink-0 text-muted/60 group-hover:text-brand-500" aria-hidden />
                </Link>
              ))}
            </div>
            <div className="mt-4 flex gap-3 rounded-2xl bg-brand-50 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
              <div>
                <p className="text-[12px] font-extrabold text-brand-700">İzin ve kontrol önceliği</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-strong">
                  AI ikizinin üretebileceği içerikleri ve konuşabileceği konuları her zaman sen belirlersin. Kişilik ve sınır değişiklikleri inceleme gerektirir; izinlerini istediğin an geri çekebilirsin.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Açık rızalar" hint="İkizin yalnız verdiğin izinlerle çalışır.">
            <div className="grid gap-3">
              <ConsentCard
                kind="ai_twin_persona"
                title="AI ikizi kişiliği"
                text={CONSENT_TEXTS.ai_twin_persona.text}
                granted={o.consents.includes("ai_twin_persona")}
                grantedAt={consentAt("ai_twin_persona")}
                strongRevoke
                revokeWarning="İznini geri çekersen AI ikizin DERHAL çevrimdışı olur: yayından kalkar, tüm yeni sohbetler ve özellikler durur ve ikizin 'Geri çekildi' durumuna geçer. Yeniden başlamak için izni tekrar verip ikizi taslaktan incelemeye göndermen gerekir."
              />
              <ConsentCard
                kind="knowledge_use"
                title="Bilgi tabanı kullanımı"
                text={CONSENT_TEXTS.knowledge_use.text}
                granted={o.consents.includes("knowledge_use")}
                grantedAt={consentAt("knowledge_use")}
                revokeWarning="İznini geri çekersen bilgi tabanındaki tüm parçalar hemen devre dışı kalır; ikizin yanıtlarında kullanılmaz. Kaynakların silinmez, izni yeniden verdiğinde yeniden indekslemen gerekebilir."
              />
            </div>
          </Panel>
        </div>

        {/* Sağ: performans + sürüm geçmişi */}
        <div className="grid content-start gap-5 lg:col-span-2 xl:col-span-1">
          <Card>
            <CardHeader title="Performans özeti" />
            <dl className="grid grid-cols-2 gap-4 xl:grid-cols-1 xl:gap-0">
              {[
                { k: "Sohbet sayısı", v: formatNumber(twin.stats.conversations) },
                { k: "Mesaj sayısı", v: formatNumber(twin.stats.messages) },
                { k: "Ortalama yanıt puanı", v: twin.stats.avgRating ? `${twin.stats.avgRating.toLocaleString("tr-TR")} / 5` : "Henüz puan yok" },
                { k: "Hayran sohbeti (kayıtlı)", v: formatNumber(o.fanConversations) },
              ].map((r) => (
                <div key={r.k} className="border-b border-line-soft py-3 first:pt-0 last:border-0 xl:py-3.5">
                  <dt className="text-[10px] font-bold text-muted">{r.k}</dt>
                  <dd className="mt-1 text-[22px] font-black tracking-[-0.03em]">{r.v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 grid gap-3 border-t border-line-soft pt-4">
              <Meter label="Persona tutarlılığı" value={q.personaScore} />
              <Meter label="Bilgi doğruluğu" value={q.knowledgeScore} tone="violet" />
              <Meter label="Güvenlik uyumu" value={q.safetyScore} tone="teal" />
            </div>
            <div className="mt-4 text-[11px] text-muted">
              Bilgi tabanı: {o.knowledge.indexed}/{o.knowledge.sources} kaynak indekslendi · {formatNumber(o.knowledge.chunks)} parça
            </div>
          </Card>

          <Card>
            <CardHeader title="Değişiklik geçmişi" hint="Her incelemeye gönderim bir sürüm oluşturur." />
            {o.versions.length ? (
              <ol className="grid gap-3">
                {o.versions.map((v) => {
                  const s = VERSION_LABEL[v.status] ?? { label: v.status, tone: "gray" as const };
                  return (
                    <li key={v._id.toString()} className="rounded-xl border border-line-soft p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-extrabold">Sürüm {v.version}</p>
                        <Badge tone={s.tone} size="sm">
                          {s.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted">{formatDateTime(v.createdAt)}</p>
                      {v.changeSummary && <p className="mt-1.5 text-[11px] text-muted-strong">“{v.changeSummary}”</p>}
                      {v.reviewNote && (
                        <p className="mt-1.5 rounded-lg bg-soft p-2 text-[11px] text-ink-soft">
                          <b>İnceleme notu:</b> {v.reviewNote}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-[12px] text-muted">Henüz incelemeye gönderilmiş bir sürüm yok.</p>
            )}
            <Button asChild className="mt-4" size="sm">
              <Link href="/studio/test">
                <Play /> Yeni test başlat
              </Link>
            </Button>
          </Card>
        </div>
      </div>
      {twin.statusHistory.length > 0 && (
        <p className="mt-4 text-[10px] text-muted">
          Son durum değişikliği: {formatDateTime(twin.statusHistory[twin.statusHistory.length - 1]!.at)}
        </p>
      )}
    </div>
  );
}
