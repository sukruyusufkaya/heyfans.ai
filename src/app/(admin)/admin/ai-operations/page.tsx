import type { Metadata } from "next";
import { Activity, AlertTriangle, CircleDollarSign, Gauge, Layers } from "lucide-react";
import { ActionDialog, ActionForm } from "@/components/admin/action-dialog";
import { CountArea } from "@/components/admin/charts";
import { AI_KIND_LABELS, JOB_STATUS_LABELS, JOB_TYPE_LABELS } from "@/components/admin/labels";
import { AdminPage, DetailRow, KpiGrid, Notice, ScoreBar, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, StatCard, Td, Th } from "@/components/ui/display";
import { retryJobAction, updateAiSettingsAction } from "@/features/admin/ai-ops-actions";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatCompact, formatDateTime, formatNumber } from "@/lib/utils";
import { AI_RANGES, getAiOpsData, getQueueData, type AiRangeKey } from "@/services/admin/ai-ops";
import { pickEnum, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "AI Operasyonları" };

const RANGE_LABELS: Record<AiRangeKey, string> = { "7": "Son 7 gün", "30": "Son 30 gün", "90": "Son 90 gün" };
const usd = (v: number) => `$${v.toLocaleString("tr-TR", { minimumFractionDigits: v < 10 ? 2 : 0, maximumFractionDigits: 2 })}`;
const ms = (v: number | null) => (v === null ? "—" : `${Math.round(v).toLocaleString("tr-TR")} ms`);

export default async function AdminAiOperationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("ai_ops.read");
  const sp = await searchParams;
  const range = pickEnum(sp, "range", ["7", "30", "90"] as const, "30");
  const canManage = can(user, "ai_ops.manage");
  const [data, queue] = await Promise.all([getAiOpsData(AI_RANGES[range]), getQueueData()]);
  const { status, totals, budget } = data;
  const budgetPct = budget.monthlyUsd > 0 ? (budget.monthToDateUsd / budget.monthlyUsd) * 100 : null;

  const alerts: { tone: "danger" | "warn" | "info"; text: string }[] = [];
  if (!status.available) alerts.push({ tone: "danger", text: "AI sağlayıcısı yapılandırılmadı: sohbet ve gömme istekleri çalışmaz. Eksik ortam değişkenleri Platform Ayarları › Entegrasyonlar bölümünde." });
  if (status.mock) alerts.push({ tone: "warn", text: "Test (mock) AI sağlayıcısı etkin. Yanıtlar gerçek model çıktısı değildir; maliyet ve gecikme değerleri temsilîdir." });
  if (status.available && !status.mock && data.prices.input === 0 && data.prices.output === 0) alerts.push({ tone: "warn", text: "Model birim fiyatları (AI_PRICE_INPUT_PER_MTOK / AI_PRICE_OUTPUT_PER_MTOK) tanımlı değil; maliyet 0 görünür." });
  if (totals.errorRatePct !== null && totals.errorRatePct >= 5) alerts.push({ tone: "danger", text: `Hata oranı %${totals.errorRatePct.toLocaleString("tr-TR")} — eşik (%5) aşıldı.` });
  if (queue.counts.failed! > 0) alerts.push({ tone: "warn", text: `${queue.counts.failed} arka plan işi başarısız durumda; aşağıdan yeniden deneyebilirsiniz.` });
  if (budgetPct !== null && budgetPct >= 80) alerts.push({ tone: budgetPct >= 100 ? "danger" : "warn", text: `Aylık AI bütçesinin %${Math.round(budgetPct)}'ine ulaşıldı.` });

  return (
    <AdminPage
      title="AI Operasyonları"
      description="Model yönlendirme, kullanım maliyetleri, gecikme ve hata oranlarını izleyin."
      actions={
        <>
          <TabLinks label="Dönem" active={range} tabs={(["7", "30", "90"] as const).map((r) => ({ key: r, label: RANGE_LABELS[r], href: href("/admin/ai-operations", { range: r === "30" ? null : r }) }))} className="mb-0" />
        </>
      }
    >
      <Card className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">AI sağlayıcısı</p>
          <p className="mt-1 text-sm font-black text-ink">{status.available ? (status.mock ? "Test (mock)" : status.provider) : "Yapılandırılmadı"}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">Model</p>
          <p className="mt-1 text-sm font-black text-ink">{status.model ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">Durum</p>
          <StatusPill className="mt-1" tone={status.available ? (status.mock ? "warn" : "green") : "danger"}>
            {status.available ? (status.mock ? "Test modu" : "Hazır") : "Kapalı"}
          </StatusPill>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">Birim fiyat (1 Mn token)</p>
          <p className="mt-1 text-sm font-black text-ink">
            giriş ${data.prices.input} · çıkış ${data.prices.output}
          </p>
        </div>
      </Card>
      {alerts.length > 0 && (
        <div className="grid gap-2.5" aria-label="Operasyon uyarıları">
          {alerts.map((a, i) => (
            <Notice key={i} tone={a.tone === "info" ? "info" : a.tone}>
              {a.text}
            </Notice>
          ))}
        </div>
      )}

      <KpiGrid cols={5}>
        <StatCard label="AI İstek" value={formatCompact(totals.requests)} icon={<Activity />} tone="pink" foot={`${RANGE_LABELS[range]}${totals.mock ? ` · ${formatNumber(totals.mock)} test` : ""}`} />
        <StatCard label="Hata Oranı" value={totals.errorRatePct === null ? "—" : `%${totals.errorRatePct.toLocaleString("tr-TR")}`} icon={<AlertTriangle />} tone="orange" foot={`${formatNumber(totals.errors)} hata · ${formatNumber(totals.blocked)} engelli`} />
        <StatCard label="Gecikme p50 / p95" value={`${totals.p50 === null ? "—" : Math.round(totals.p50)} / ${totals.p95 === null ? "—" : Math.round(totals.p95)} ms`} icon={<Gauge />} tone="teal" foot={totals.sample ? `${formatNumber(totals.sample)} başarılı istek örneği` : "örnek yok"} />
        <StatCard label="Toplam Token" value={formatCompact(totals.tokens)} icon={<Layers />} tone="violet" foot={`giriş ${formatCompact(totals.inputTokens)} · çıkış ${formatCompact(totals.outputTokens)}`} />
        <StatCard label="Maliyet" value={usd(totals.costUsd)} icon={<CircleDollarSign />} tone="green" foot={RANGE_LABELS[range]} />
      </KpiGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Günlük Kullanım" hint={`${RANGE_LABELS[range]} · günlük AI isteği`} />
          {totals.requests === 0 ? <EmptyState compact title="Henüz veri bulunmuyor" description="Bu dönemde AI isteği kaydedilmedi." /> : <CountArea data={data.series.map((s) => ({ label: s.label, value: s.requests, value2: s.errors }))} label="İstek" label2="Hata" height={230} />}
        </Card>
        <Card>
          <CardHeader title="Aylık Bütçe" hint="İçinde bulunulan takvim ayı" />
          {budget.monthlyUsd > 0 ? (
            <>
              <ScoreBar label="Bütçe kullanımı" value={budgetPct} hint={`${usd(budget.monthToDateUsd)} / ${usd(budget.monthlyUsd)}`} tone={budgetPct !== null && budgetPct >= 100 ? "orange" : "pink"} />
              <p className="mt-3 text-[11px] text-muted">Kaynak: {budget.source === "settings" ? "Platform ayarları" : "AI_MONTHLY_BUDGET_USD ortam değişkeni"}.</p>
            </>
          ) : (
            <p className="text-xs text-muted">Aylık bütçe tanımlı değil. Bu ay şimdiye dek harcanan: <b className="text-ink">{usd(budget.monthToDateUsd)}</b>.</p>
          )}
          <Notice tone="neutral" className="mt-4">
            Bütçe şu an yalnız izlenir; aşıldığında istekler otomatik durdurulmaz.
          </Notice>
        </Card>
      </div>

      <Card>
        <CardHeader title="Model ve Servis Envanteri" hint={`${RANGE_LABELS[range]} · sağlayıcı, model ve tür bazında`} />
        {data.byModel.length === 0 ? (
          <EmptyState compact title="Henüz veri bulunmuyor" />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Model</Th>
                <Th>Tür</Th>
                <Th className="text-end">İstek</Th>
                <Th className="text-end">Token</Th>
                <Th className="text-end">p95 gecikme</Th>
                <Th className="text-end">Hata</Th>
                <Th className="text-end">Maliyet</Th>
              </tr>
            </thead>
            <tbody>
              {data.byModel.map((m, i) => (
                <tr key={i}>
                  <Td>
                    <b className="text-ink">{m.model}</b>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted">
                      {m.provider}
                      {m.mock > 0 && (
                        <StatusPill size="sm" tone="warn">
                          mock
                        </StatusPill>
                      )}
                    </span>
                  </Td>
                  <Td>{AI_KIND_LABELS[m.kind] ?? m.kind}</Td>
                  <Td className="text-end tabular-nums">{formatNumber(m.requests)}</Td>
                  <Td className="text-end tabular-nums">{formatCompact(m.tokens)}</Td>
                  <Td className="text-end tabular-nums">{ms(m.p95)}</Td>
                  <Td className="text-end">
                    <StatusPill size="sm" tone={m.errorRatePct >= 5 ? "danger" : m.errorRatePct > 0 ? "warn" : "green"}>
                      %{m.errorRatePct.toLocaleString("tr-TR")}
                    </StatusPill>
                  </Td>
                  <Td className="text-end tabular-nums">{usd(m.costUsd)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Arka Plan İş Kuyruğu" hint="Bilgi kaynağı indeksleme, medya işleme ve zamanlanmış işler" />
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["queued", "running", "succeeded", "failed"] as const).map((s) => (
              <div key={s} className="rounded-xl bg-soft px-3 py-2.5">
                <p className="text-[10px] font-bold text-muted">{JOB_STATUS_LABELS[s]}</p>
                <p className={`mt-0.5 text-lg font-black ${s === "failed" && queue.counts[s]! > 0 ? "text-danger" : "text-ink"}`}>{formatNumber(queue.counts[s] ?? 0)}</p>
              </div>
            ))}
          </div>
          {queue.failedJobs.length === 0 ? (
            <EmptyState compact title="Başarısız iş yok" description="Tüm arka plan işleri sağlıklı görünüyor." />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>İş</Th>
                  <Th>Deneme</Th>
                  <Th>Son hata</Th>
                  <Th className="text-end">İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {queue.failedJobs.map((j) => (
                  <tr key={j.id}>
                    <Td>
                      <b className="text-ink">{JOB_TYPE_LABELS[j.type] ?? j.type}</b>
                      <span className="block text-[10px] text-muted">{formatDateTime(j.finishedAt)}</span>
                    </Td>
                    <Td className="tabular-nums">
                      {j.attempts}/{j.maxAttempts}
                    </Td>
                    <Td className="max-w-[220px]">
                      <span className="line-clamp-2 text-[11px] text-danger">{j.lastError ?? "—"}</span>
                    </Td>
                    <Td className="text-end">
                      {canManage ? (
                        <ActionDialog
                          trigger={
                            <Button size="xs" variant="secondary">
                              Yeniden dene
                            </Button>
                          }
                          title="Başarısız işi yeniden dene"
                          description={`${JOB_TYPE_LABELS[j.type] ?? j.type} işi kuyruğa alınır (deneme sayacı sıfırlanır).`}
                          action={retryJobAction}
                          payload={{ jobId: j.id }}
                          reason={{ label: "Yeniden deneme gerekçesi", defaultValue: "Hata nedeni giderildi; iş yeniden deneniyor." }}
                          confirmLabel="Kuyruğa al"
                        />
                      ) : (
                        <span className="text-[10px] text-muted">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>

        <Card>
          <CardHeader title="Başarısız Bilgi Kaynakları" hint="İndeksleme hatası alan creator kaynakları" />
          {queue.failedSources.length === 0 ? (
            <EmptyState compact title="Başarısız kaynak yok" />
          ) : (
            <ul className="grid gap-2.5">
              {queue.failedSources.map((s) => (
                <li key={s.id} className="rounded-xl border border-line-soft px-3.5 py-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <b className="truncate text-ink">{s.title}</b>
                    <span className="shrink-0 text-[10px] text-muted">{formatDateTime(s.at)}</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    {s.creator} · {s.type}
                  </p>
                  <p className="mt-1 text-[11px] text-danger">{s.error ?? "Bilinmeyen hata"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="AI Ayarları" hint="Tüm sohbetlerde uygulanan genel sınırlar (platform ayarları › ai)" />
        {canManage ? (
          <ActionForm
            action={updateAiSettingsAction}
            fields={[
              { name: "maxOutputTokens", label: "En fazla çıktı tokenı", type: "number", defaultValue: data.settings.maxOutputTokens, min: 16, max: 4096, step: 1, required: true, hint: "Tek yanıtın uzunluk sınırı (16–4096)." },
              { name: "temperature", label: "Sıcaklık (temperature)", type: "number", defaultValue: data.settings.temperature, min: 0, max: 2, step: 0.05, required: true, hint: "0 = tutarlı, 2 = çok yaratıcı. Önerilen 0,6–0,9." },
              { name: "monthlyBudgetUsd", label: "Aylık bütçe (USD)", type: "number", defaultValue: data.settings.monthlyBudgetUsd, min: 0, step: 1, required: true, hint: "0 = tanımsız. Bütçe şimdilik yalnız izlenir." },
            ]}
            reason={{ label: "Değişiklik gerekçesi" }}
            submitLabel="Ayarları Kaydet"
            columns={2}
            className="max-w-3xl"
          />
        ) : (
          <>
            <DetailRow label="En fazla çıktı tokenı">{data.settings.maxOutputTokens}</DetailRow>
            <DetailRow label="Sıcaklık">{data.settings.temperature}</DetailRow>
            <DetailRow label="Aylık bütçe">{data.settings.monthlyBudgetUsd ? usd(data.settings.monthlyBudgetUsd) : "Tanımsız"}</DetailRow>
            <Notice tone="neutral" className="mt-4">AI ayarlarını değiştirmek için &quot;ai_ops.manage&quot; izni gerekir.</Notice>
          </>
        )}
      </Card>
    </AdminPage>
  );
}
