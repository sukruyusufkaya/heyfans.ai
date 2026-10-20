import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/display";
import { Notice, STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { ConsentCard } from "@/features/studio/consent-card";
import { KnowledgeManager, type KnowledgeRow } from "@/features/studio/knowledge-manager";
import { getFormatters, getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { aiStatus } from "@/lib/ai/provider";
import { CONSENT_TEXTS } from "@/services/ai-twins/lifecycle";
import { getKnowledgeView } from "@/services/studio/twin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Bilgi Tabanı") };
}

export default async function KnowledgePage() {
  const t = await getT();
  const { formatDate, formatNumber } = await getFormatters();
  const { user } = await requireCreator();
  const v = await getKnowledgeView(user.id);
  const consent = v.consents.includes("knowledge_use");
  const ai = aiStatus();
  const rows: KnowledgeRow[] = v.sources.map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    status: s.status,
    approved: s.approved,
    chunkCount: s.chunkCount,
    url: s.url,
    fileName: s.fileName,
    error: s.error,
    createdAt: s.createdAt.toISOString(),
  }));
  const last = v.sources.reduce<Date | null>((m, s) => (s.indexedAt && (!m || s.indexedAt > m) ? s.indexedAt : m), null);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader eyebrow={STUDIO_EYEBROW} title={t("Bilgi Tabanı")} description={t("AI ikizinin kullanacağı bilgileri yükle, denetle ve güncelle.")} />

      {!consent && (
        <div className="mb-5">
          <Notice tone="warn" title={t("Önce kullanım iznini vermelisin")} className="mb-3">
            {t("Bilgi tabanına kaynak ekleyebilmek için, kaynakların AI ikizinin yanıtlarında bağlam olarak kullanılmasına açık rıza vermen gerekir.")}
          </Notice>
          <ConsentCard
            kind="knowledge_use"
            title={t("Bilgi tabanı kullanımı")}
            text={t(CONSENT_TEXTS.knowledge_use.text)}
            granted={false}
            revokeWarning=""
          />
        </div>
      )}

      <KnowledgeManager sources={rows} enabled={consent} aiAvailable={ai.available} />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title={t("Bilgi tabanı durumu")} />
          <Badge tone={v.stats.total && v.stats.indexed === v.stats.total ? "green" : "warn"} className="mb-4">
            {t("{indexed} / {total} kaynak hazır", { indexed: v.stats.indexed, total: v.stats.total })}
          </Badge>
          <dl className="grid gap-2.5 text-[12px]">
            {[
              [t("Toplam kaynak"), v.stats.total],
              [t("Yanıtlarda kullanılan"), v.stats.approved],
              [t("İşlem sırasında"), v.stats.processing],
              [t("Başarısız"), v.stats.failed],
              [t("Aktif parça"), v.stats.activeChunks],
              [t("Yaklaşık token"), v.stats.tokens],
            ].map(([k, n]) => (
              <div key={k as string} className="flex items-center justify-between border-b border-line-soft pb-2 last:border-0">
                <dt className="text-muted-strong">{k}</dt>
                <dd className="font-extrabold tabular-nums">{formatNumber(n as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10px] text-muted">{last ? t("Son indeksleme: {date}", { date: formatDate(last) }) : t("Henüz indekslenmiş kaynak yok.")}</p>
        </Card>

        <Card>
          <CardHeader title={t("Yanıt güvenilirliği")} />
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-8 shrink-0 text-brand-500" aria-hidden />
            <div>
              <p className="text-[13px] font-extrabold">{t("Onaylı bilgi önceliği")}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-strong">
                {t("AI ikizi, kişisel bilgi sorularında yalnız senin onayladığın ve indekslenmiş kaynakları kullanır. Kaynakta olmayan kişisel bilgileri uydurmaması istenir; emin değilse bilmediğini söyler. Bir kaynağın “Kullan” anahtarını kapattığında parçaları anında devre dışı kalır.")}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("Kaynak izinleri")} />
          <div className="grid gap-3 text-[12px]">
            <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-3">
              <div>
                <p className="font-extrabold">{t("Bilgi tabanı kullanım izni")}</p>
                <p className="text-[10px] text-muted">{t("Rıza kaydı sürüm {version}", { version: CONSENT_TEXTS.knowledge_use.version })}</p>
              </div>
              <Badge tone={consent ? "green" : "gray"} dot>
                {consent ? t("Verildi") : t("Yok")}
              </Badge>
            </div>
            {consent && (
              <ConsentCard
                kind="knowledge_use"
                title={t("Bilgi tabanı kullanımı")}
                text={t(CONSENT_TEXTS.knowledge_use.text)}
                granted
                grantedAt={v.consentRows.find((r) => r.kind === "knowledge_use")?.grantedAt}
                revokeWarning={t("İznini geri çekersen tüm bilgi parçaları hemen devre dışı kalır; ikizin yanıtlarında kullanılmaz. Kaynakların silinmez.")}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
