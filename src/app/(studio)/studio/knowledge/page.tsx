import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/display";
import { Notice, STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { ConsentCard } from "@/features/studio/consent-card";
import { KnowledgeManager, type KnowledgeRow } from "@/features/studio/knowledge-manager";
import { requireCreator } from "@/lib/auth/session";
import { aiStatus } from "@/lib/ai/provider";
import { formatDate, formatNumber } from "@/lib/utils";
import { CONSENT_TEXTS } from "@/services/ai-twins/lifecycle";
import { getKnowledgeView } from "@/services/studio/twin";

export const metadata: Metadata = { title: "Bilgi Tabanı" };

export default async function KnowledgePage() {
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
      <PageHeader eyebrow={STUDIO_EYEBROW} title="Bilgi Tabanı" description="AI ikizinin kullanacağı bilgileri yükle, denetle ve güncelle." />

      {!consent && (
        <div className="mb-5">
          <Notice tone="warn" title="Önce kullanım iznini vermelisin" className="mb-3">
            Bilgi tabanına kaynak ekleyebilmek için, kaynakların AI ikizinin yanıtlarında bağlam olarak kullanılmasına açık rıza vermen gerekir.
          </Notice>
          <ConsentCard
            kind="knowledge_use"
            title="Bilgi tabanı kullanımı"
            text={CONSENT_TEXTS.knowledge_use.text}
            granted={false}
            revokeWarning=""
          />
        </div>
      )}

      <KnowledgeManager sources={rows} enabled={consent} aiAvailable={ai.available} />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Bilgi tabanı durumu" />
          <Badge tone={v.stats.total && v.stats.indexed === v.stats.total ? "green" : "warn"} className="mb-4">
            {v.stats.indexed} / {v.stats.total} kaynak hazır
          </Badge>
          <dl className="grid gap-2.5 text-[12px]">
            {[
              ["Toplam kaynak", v.stats.total],
              ["Yanıtlarda kullanılan", v.stats.approved],
              ["İşlem sırasında", v.stats.processing],
              ["Başarısız", v.stats.failed],
              ["Aktif parça", v.stats.activeChunks],
              ["Yaklaşık token", v.stats.tokens],
            ].map(([k, n]) => (
              <div key={k as string} className="flex items-center justify-between border-b border-line-soft pb-2 last:border-0">
                <dt className="text-muted-strong">{k}</dt>
                <dd className="font-extrabold tabular-nums">{formatNumber(n as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10px] text-muted">{last ? `Son indeksleme: ${formatDate(last)}` : "Henüz indekslenmiş kaynak yok."}</p>
        </Card>

        <Card>
          <CardHeader title="Yanıt güvenilirliği" />
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-8 shrink-0 text-brand-500" aria-hidden />
            <div>
              <p className="text-[13px] font-extrabold">Onaylı bilgi önceliği</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-strong">
                AI ikizi, kişisel bilgi sorularında yalnız senin onayladığın ve indekslenmiş kaynakları kullanır. Kaynakta olmayan kişisel bilgileri uydurmaması istenir; emin değilse bilmediğini söyler. Bir kaynağın “Kullan” anahtarını kapattığında parçaları anında devre dışı kalır.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Kaynak izinleri" />
          <div className="grid gap-3 text-[12px]">
            <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-3">
              <div>
                <p className="font-extrabold">Bilgi tabanı kullanım izni</p>
                <p className="text-[10px] text-muted">Rıza kaydı sürüm {CONSENT_TEXTS.knowledge_use.version}</p>
              </div>
              <Badge tone={consent ? "green" : "gray"} dot>
                {consent ? "Verildi" : "Yok"}
              </Badge>
            </div>
            {consent && (
              <ConsentCard
                kind="knowledge_use"
                title="Bilgi tabanı kullanımı"
                text={CONSENT_TEXTS.knowledge_use.text}
                granted
                grantedAt={v.consentRows.find((r) => r.kind === "knowledge_use")?.grantedAt}
                revokeWarning="İznini geri çekersen tüm bilgi parçaları hemen devre dışı kalır; ikizin yanıtlarında kullanılmaz. Kaynakların silinmez."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
