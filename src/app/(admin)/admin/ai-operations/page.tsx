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
import { LOCALE_META } from "@/i18n/config";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { can } from "@/lib/permissions";
import { AI_RANGES, getAiOpsData, getQueueData, type AiRangeKey } from "@/services/admin/ai-ops";
import { pickEnum, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("AI Operasyonları") };
}

const RANGE_LABELS: Record<AiRangeKey, string> = { "7": m("Son 7 gün"), "30": m("Son 30 gün"), "90": m("Son 90 gün") };

export default async function AdminAiOperationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("ai_ops.read");
  const t = await getT();
  const { locale, formatCompact, formatDateTime, formatNumber, formatPercent } = await getFormatters();
  const tag = LOCALE_META[locale].intl;
  const usd = (v: number) => `$${v.toLocaleString(tag, { minimumFractionDigits: v < 10 ? 2 : 0, maximumFractionDigits: 2 })}`;
  const ms = (v: number | null) => (v === null ? "—" : `${formatNumber(Math.round(v))} ms`);
  const sp = await searchParams;
  const range = pickEnum(sp, "range", ["7", "30", "90"] as const, "30");
  const canManage = can(user, "ai_ops.manage");
  const [data, queue] = await Promise.all([getAiOpsData(AI_RANGES[range]), getQueueData()]);
  const { status, totals, budget } = data;
  const budgetPct = budget.monthlyUsd > 0 ? (budget.monthToDateUsd / budget.monthlyUsd) * 100 : null;

  const alerts: { tone: "danger" | "warn" | "info"; text: string }[] = [];
  if (!status.available) alerts.push({ tone: "danger", text: t("AI sağlayıcısı yapılandırılmadı: sohbet ve gömme istekleri çalışmaz. Eksik ortam değişkenleri Platform Ayarları › Entegrasyonlar bölümünde.") });
  if (status.mock) alerts.push({ tone: "warn", text: t("Test (mock) AI sağlayıcısı etkin. Yanıtlar gerçek model çıktısı değildir; maliyet ve gecikme değerleri temsilîdir.") });
  if (status.available && !status.mock && data.prices.input === 0 && data.prices.output === 0) alerts.push({ tone: "warn", text: t("Model birim fiyatları (AI_PRICE_INPUT_PER_MTOK / AI_PRICE_OUTPUT_PER_MTOK) tanımlı değil; maliyet 0 görünür.") });
  if (totals.errorRatePct !== null && totals.errorRatePct >= 5) alerts.push({ tone: "danger", text: t("Hata oranı %{value} — eşik (%5) aşıldı.", { value: formatNumber(totals.errorRatePct) }) });
  if (queue.counts.failed! > 0) alerts.push({ tone: "warn", text: t("{failed} arka plan işi başarısız durumda; aşağıdan yeniden deneyebilirsiniz.", { failed: queue.counts.failed }) });
  if (budgetPct !== null && budgetPct >= 80) alerts.push({ tone: budgetPct >= 100 ? "danger" : "warn", text: t("Aylık AI bütçesinin %{pct}'ine ulaşıldı.", { pct: Math.round(budgetPct) }) });

  return (
    <AdminPage
      title={t("AI Operasyonları")}
      description={t("Model yönlendirme, kullanım maliyetleri, gecikme ve hata oranlarını izleyin.")}
      actions={
        <>
          <TabLinks label={t("Dönem")} active={range} tabs={(["7", "30", "90"] as const).map((r) => ({ key: r, label: t(RANGE_LABELS[r]), href: href("/admin/ai-operations", { range: r === "30" ? null : r }) }))} className="mb-0" />
        </>
      }
    >
      <Card className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">{t("AI sağlayıcısı")}</p>
          <p className="mt-1 text-sm font-black text-ink">{status.available ? (status.mock ? t("Test (mock)") : status.provider) : t("Yapılandırılmadı")}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">{t("Model")}</p>
          <p className="mt-1 text-sm font-black text-ink">{status.model ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">{t("Durum")}</p>
          <StatusPill className="mt-1" tone={status.available ? (status.mock ? "warn" : "green") : "danger"}>
            {status.available ? (status.mock ? t("Test modu") : t("Hazır")) : t("Kapalı")}
          </StatusPill>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">{t("Birim fiyat (1 Mn token)")}</p>
          <p className="mt-1 text-sm font-black text-ink">
            {t("giriş ${input} · çıkış ${output}", { input: data.prices.input, output: data.prices.output })}
          </p>
        </div>
      </Card>
      {alerts.length > 0 && (
        <div className="grid gap-2.5" aria-label={t("Operasyon uyarıları")}>
          {alerts.map((a, i) => (
            <Notice key={i} tone={a.tone === "info" ? "info" : a.tone}>
              {a.text}
            </Notice>
          ))}
        </div>
      )}

      <KpiGrid cols={5}>
        <StatCard label={t("AI İstek")} value={formatCompact(totals.requests)} icon={<Activity />} tone="pink" foot={totals.mock ? t("{range} · {count} test", { range: t(RANGE_LABELS[range]), count: formatNumber(totals.mock) }) : t(RANGE_LABELS[range])} />
        <StatCard label={t("Hata Oranı")} value={totals.errorRatePct === null ? "—" : formatPercent(totals.errorRatePct * 100)} icon={<AlertTriangle />} tone="orange" foot={t("{errors} hata · {blocked} engelli", { errors: formatNumber(totals.errors), blocked: formatNumber(totals.blocked) })} />
        <StatCard label={t("Gecikme p50 / p95")} value={`${totals.p50 === null ? "—" : Math.round(totals.p50)} / ${totals.p95 === null ? "—" : Math.round(totals.p95)} ms`} icon={<Gauge />} tone="teal" foot={totals.sample ? t("{count} başarılı istek örneği", { count: formatNumber(totals.sample) }) : t("örnek yok")} />
        <StatCard label={t("Toplam Token")} value={formatCompact(totals.tokens)} icon={<Layers />} tone="violet" foot={t("giriş {input} · çıkış {output}", { input: formatCompact(totals.inputTokens), output: formatCompact(totals.outputTokens) })} />
        <StatCard label={t("Maliyet")} value={usd(totals.costUsd)} icon={<CircleDollarSign />} tone="green" foot={t(RANGE_LABELS[range])} />
      </KpiGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Günlük Kullanım")} hint={t("{range} · günlük AI isteği", { range: t(RANGE_LABELS[range]) })} />
          {totals.requests === 0 ? <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Bu dönemde AI isteği kaydedilmedi.")} /> : <CountArea data={data.series.map((s) => ({ label: s.label, value: s.requests, value2: s.errors }))} label={t("İstek")} label2={t("Hata")} height={230} />}
        </Card>
        <Card>
          <CardHeader title={t("Aylık Bütçe")} hint={t("İçinde bulunulan takvim ayı")} />
          {budget.monthlyUsd > 0 ? (
            <>
              <ScoreBar label={t("Bütçe kullanımı")} value={budgetPct} hint={[usd(budget.monthToDateUsd), usd(budget.monthlyUsd)].join(" / ")} tone={budgetPct !== null && budgetPct >= 100 ? "orange" : "pink"} />
              <p className="mt-3 text-[11px] text-muted">{t("Kaynak: {source}.", { source: budget.source === "settings" ? t("Platform ayarları") : t("AI_MONTHLY_BUDGET_USD ortam değişkeni") })}</p>
            </>
          ) : (
            <p className="text-xs text-muted">{t("Aylık bütçe tanımlı değil. Bu ay şimdiye dek harcanan:")} <b className="text-ink">{usd(budget.monthToDateUsd)}</b>.</p>
          )}
          <Notice tone="neutral" className="mt-4">
            {t("Bütçe şu an yalnız izlenir; aşıldığında istekler otomatik durdurulmaz.")}
          </Notice>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("Model ve Servis Envanteri")} hint={t("{range} · sağlayıcı, model ve tür bazında", { range: t(RANGE_LABELS[range]) })} />
        {data.byModel.length === 0 ? (
          <EmptyState compact title={t("Henüz veri bulunmuyor")} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("Model")}</Th>
                <Th>{t("Tür")}</Th>
                <Th className="text-end">{t("İstek")}</Th>
                <Th className="text-end">{t("Token")}</Th>
                <Th className="text-end">{t("p95 gecikme")}</Th>
                <Th className="text-end">{t("Hata")}</Th>
                <Th className="text-end">{t("Maliyet")}</Th>
              </tr>
            </thead>
            <tbody>
              {data.byModel.map((row, i) => (
                <tr key={i}>
                  <Td>
                    <b className="text-ink">{row.model}</b>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted">
                      {row.provider}
                      {row.mock > 0 && (
                        <StatusPill size="sm" tone="warn">
                          {t("mock")}
                        </StatusPill>
                      )}
                    </span>
                  </Td>
                  <Td>{AI_KIND_LABELS[row.kind] ? t(AI_KIND_LABELS[row.kind]!) : row.kind}</Td>
                  <Td className="text-end tabular-nums">{formatNumber(row.requests)}</Td>
                  <Td className="text-end tabular-nums">{formatCompact(row.tokens)}</Td>
                  <Td className="text-end tabular-nums">{ms(row.p95)}</Td>
                  <Td className="text-end">
                    <StatusPill size="sm" tone={row.errorRatePct >= 5 ? "danger" : row.errorRatePct > 0 ? "warn" : "green"}>
                      {formatPercent(row.errorRatePct * 100)}
                    </StatusPill>
                  </Td>
                  <Td className="text-end tabular-nums">{usd(row.costUsd)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title={t("Arka Plan İş Kuyruğu")} hint={t("Bilgi kaynağı indeksleme, medya işleme ve zamanlanmış işler")} />
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["queued", "running", "succeeded", "failed"] as const).map((s) => (
              <div key={s} className="rounded-xl bg-soft px-3 py-2.5">
                <p className="text-[10px] font-bold text-muted">{t(JOB_STATUS_LABELS[s]!)}</p>
                <p className={`mt-0.5 text-lg font-black ${s === "failed" && queue.counts[s]! > 0 ? "text-danger" : "text-ink"}`}>{formatNumber(queue.counts[s] ?? 0)}</p>
              </div>
            ))}
          </div>
          {queue.failedJobs.length === 0 ? (
            <EmptyState compact title={t("Başarısız iş yok")} description={t("Tüm arka plan işleri sağlıklı görünüyor.")} />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>{t("İş")}</Th>
                  <Th>{t("Deneme")}</Th>
                  <Th>{t("Son hata")}</Th>
                  <Th className="text-end">{t("İşlem")}</Th>
                </tr>
              </thead>
              <tbody>
                {queue.failedJobs.map((j) => (
                  <tr key={j.id}>
                    <Td>
                      <b className="text-ink">{JOB_TYPE_LABELS[j.type] ? t(JOB_TYPE_LABELS[j.type]!) : j.type}</b>
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
                              {t("Yeniden dene")}
                            </Button>
                          }
                          title={t("Başarısız işi yeniden dene")}
                          description={t("{job} işi kuyruğa alınır (deneme sayacı sıfırlanır).", { job: JOB_TYPE_LABELS[j.type] ? t(JOB_TYPE_LABELS[j.type]!) : j.type })}
                          action={retryJobAction}
                          payload={{ jobId: j.id }}
                          reason={{ label: t("Yeniden deneme gerekçesi"), defaultValue: t("Hata nedeni giderildi; iş yeniden deneniyor.") }}
                          confirmLabel={t("Kuyruğa al")}
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
          <CardHeader title={t("Başarısız Bilgi Kaynakları")} hint={t("İndeksleme hatası alan creator kaynakları")} />
          {queue.failedSources.length === 0 ? (
            <EmptyState compact title={t("Başarısız kaynak yok")} />
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
                  <p className="mt-1 text-[11px] text-danger">{s.error ?? t("Bilinmeyen hata")}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title={t("AI Ayarları")} hint={t("Tüm sohbetlerde uygulanan genel sınırlar (platform ayarları › ai)")} />
        {canManage ? (
          <ActionForm
            action={updateAiSettingsAction}
            fields={[
              { name: "maxOutputTokens", label: t("En fazla çıktı tokenı"), type: "number", defaultValue: data.settings.maxOutputTokens, min: 16, max: 4096, step: 1, required: true, hint: t("Tek yanıtın uzunluk sınırı (16–4096).") },
              { name: "temperature", label: t("Sıcaklık (temperature)"), type: "number", defaultValue: data.settings.temperature, min: 0, max: 2, step: 0.05, required: true, hint: t("0 = tutarlı, 2 = çok yaratıcı. Önerilen 0,6–0,9.") },
              { name: "monthlyBudgetUsd", label: t("Aylık bütçe (USD)"), type: "number", defaultValue: data.settings.monthlyBudgetUsd, min: 0, step: 1, required: true, hint: t("0 = tanımsız. Bütçe şimdilik yalnız izlenir.") },
            ]}
            reason={{ label: t("Değişiklik gerekçesi") }}
            submitLabel={t("Ayarları Kaydet")}
            columns={2}
            className="max-w-3xl"
          />
        ) : (
          <>
            <DetailRow label={t("En fazla çıktı tokenı")}>{data.settings.maxOutputTokens}</DetailRow>
            <DetailRow label={t("Sıcaklık")}>{data.settings.temperature}</DetailRow>
            <DetailRow label={t("Aylık bütçe")}>{data.settings.monthlyBudgetUsd ? usd(data.settings.monthlyBudgetUsd) : t("Tanımsız")}</DetailRow>
            <Notice tone="neutral" className="mt-4">{t("AI ayarlarını değiştirmek için \"ai_ops.manage\" izni gerekir.")}</Notice>
          </>
        )}
      </Card>
    </AdminPage>
  );
}
