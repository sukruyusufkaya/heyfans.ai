import "server-only";
import { env } from "@/config/env";
import { aiStatus } from "@/lib/ai/provider";
import { connectDb } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid } from "@/lib/validation/common";
import { AiUsageRecord, IngestionJob, KnowledgeSource, type IIngestionJob } from "@/models/ai";
import { PlatformSettings } from "@/models/platform";
import { getPlatformSettings } from "@/services/platform/settings";
import { dayKeyExpr, loadCreators, percentile, type AdminActor } from "./shared";

export const AI_RANGES = { "7": 7, "30": 30, "90": 90 } as const;
export type AiRangeKey = keyof typeof AI_RANGES;
const SAMPLE_LIMIT = 20_000;

export async function getAiOpsData(rangeDays: number) {
  await connectDb();
  const now = new Date();
  const from = new Date(now.getTime() - rangeDays * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const match = { createdAt: { $gte: from, $lte: now } };

  const [totals, daily, byModel, latencies, mtd, settings] = await Promise.all([
    AiUsageRecord.aggregate<{ n: number; input: number; output: number; cost: number; errors: number; blocked: number; mock: number }>([
      { $match: match },
      {
        $group: {
          _id: null,
          n: { $sum: 1 },
          input: { $sum: "$inputTokens" },
          output: { $sum: "$outputTokens" },
          cost: { $sum: "$costMicroUsd" },
          errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
          blocked: { $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] } },
          mock: { $sum: { $cond: ["$isMock", 1, 0] } },
        },
      },
    ]),
    AiUsageRecord.aggregate<{ _id: string; n: number; cost: number; errors: number }>([
      { $match: match },
      { $group: { _id: dayKeyExpr("createdAt"), n: { $sum: 1 }, cost: { $sum: "$costMicroUsd" }, errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } } } },
    ]),
    AiUsageRecord.aggregate<{ _id: { provider: string; model: string; kind: string }; n: number; input: number; output: number; cost: number; errors: number; isMock: number }>([
      { $match: match },
      {
        $group: {
          _id: { provider: "$provider", model: "$model", kind: "$kind" },
          n: { $sum: 1 },
          input: { $sum: "$inputTokens" },
          output: { $sum: "$outputTokens" },
          cost: { $sum: "$costMicroUsd" },
          errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
          isMock: { $sum: { $cond: ["$isMock", 1, 0] } },
        },
      },
      { $sort: { n: -1 } },
      { $limit: 30 },
    ]),
    AiUsageRecord.find({ ...match, status: "ok" }, { provider: 1, model: 1, latencyMs: 1 }).sort({ createdAt: -1 }).limit(SAMPLE_LIMIT).lean(),
    AiUsageRecord.aggregate<{ cost: number }>([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, cost: { $sum: "$costMicroUsd" } } }]),
    getPlatformSettings(),
  ]);

  const t = totals[0] ?? { n: 0, input: 0, output: 0, cost: 0, errors: 0, blocked: 0, mock: 0 };
  const sorted = latencies.map((l) => l.latencyMs).sort((a, b) => a - b);
  const byKey = new Map<string, number[]>();
  for (const l of latencies) {
    const k = `${l.provider}|${l.model}`;
    const arr = byKey.get(k) ?? [];
    arr.push(l.latencyMs);
    byKey.set(k, arr);
  }

  // Günlük seri (boş günler 0)
  const dailyMap = new Map(daily.map((d) => [d._id, d]));
  const series: { label: string; requests: number; costUsd: number; errors: number }[] = [];
  const fmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", timeZone: "Europe/Istanbul" });
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" });
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const row = dailyMap.get(key.format(d));
    series.push({ label: fmt.format(d), requests: row?.n ?? 0, costUsd: (row?.cost ?? 0) / 1_000_000, errors: row?.errors ?? 0 });
  }

  const envBudgetMicro = Math.round(env().AI_MONTHLY_BUDGET_USD * 1_000_000);
  const budgetMicro = settings.ai.monthlyBudgetMicroUsd || envBudgetMicro;
  const status = aiStatus();
  return {
    status,
    prices: { input: env().AI_PRICE_INPUT_PER_MTOK, output: env().AI_PRICE_OUTPUT_PER_MTOK },
    totals: {
      requests: t.n,
      tokens: t.input + t.output,
      inputTokens: t.input,
      outputTokens: t.output,
      costUsd: t.cost / 1_000_000,
      errorRatePct: t.n ? Math.round((t.errors / t.n) * 1000) / 10 : null,
      errors: t.errors,
      blocked: t.blocked,
      mock: t.mock,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      sample: sorted.length,
    },
    series,
    byModel: byModel.map((m) => {
      const l = (byKey.get(`${m._id.provider}|${m._id.model}`) ?? []).sort((a, b) => a - b);
      return { provider: m._id.provider, model: m._id.model, kind: m._id.kind, requests: m.n, tokens: m.input + m.output, costUsd: m.cost / 1_000_000, errorRatePct: m.n ? Math.round((m.errors / m.n) * 1000) / 10 : 0, p95: percentile(l, 95), mock: m.isMock };
    }),
    budget: { monthlyUsd: budgetMicro / 1_000_000, source: settings.ai.monthlyBudgetMicroUsd ? ("settings" as const) : envBudgetMicro ? ("env" as const) : ("none" as const), monthToDateUsd: (mtd[0]?.cost ?? 0) / 1_000_000 },
    settings: { maxOutputTokens: settings.ai.maxOutputTokens, temperature: settings.ai.temperature, monthlyBudgetUsd: settings.ai.monthlyBudgetMicroUsd / 1_000_000, defaultModel: settings.ai.defaultModel ?? "" },
  };
}

export async function getQueueData() {
  await connectDb();
  const [byStatus, failed, failedSources] = await Promise.all([
    IngestionJob.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    IngestionJob.find({ status: "failed" }).sort({ updatedAt: -1 }).limit(15).lean<IIngestionJob[]>(),
    KnowledgeSource.find({ status: "failed" }, { title: 1, error: 1, creatorId: 1, updatedAt: 1, type: 1 }).sort({ updatedAt: -1 }).limit(15).lean(),
  ]);
  const counts: Record<string, number> = { queued: 0, running: 0, succeeded: 0, failed: 0 };
  for (const r of byStatus) counts[r._id] = r.n;
  const creators = await loadCreators(failedSources.map((s) => s.creatorId));
  return {
    counts,
    failedJobs: failed.map((j) => ({ id: j._id.toString(), type: j.type, attempts: j.attempts, maxAttempts: j.maxAttempts, lastError: j.lastError ?? null, finishedAt: j.finishedAt ?? j.updatedAt, payloadSource: typeof j.payload?.sourceId === "string" ? j.payload.sourceId : null })),
    failedSources: failedSources.map((s) => ({ id: s._id.toString(), title: s.title, type: s.type, error: s.error ?? null, creator: creators.get(s.creatorId.toString())?.displayName ?? "Creator", at: s.updatedAt })),
  };
}

/** Başarısız işi yeniden kuyruğa alır: queued + runAfter=şimdi, kilit temizlenir, deneme sayacı sıfırlanır. */
export async function retryFailedJob(actor: AdminActor, jobId: string, reason: string) {
  await connectDb();
  if (reason.trim().length < 5) throw new AppError("Gerekçe en az 5 karakter olmalı.", "reason_required");
  const job = await IngestionJob.findById(oid(jobId));
  if (!job) throw new NotFoundError("İş bulunamadı.");
  if (job.status !== "failed") throw new ConflictError("Yalnız başarısız işler yeniden denenebilir.");
  job.status = "queued";
  job.runAfter = new Date();
  job.lockedUntil = null;
  job.attempts = 0;
  job.finishedAt = null;
  await job.save();
  if (job.type === "knowledge.ingest" && typeof job.payload?.sourceId === "string") {
    await KnowledgeSource.updateOne({ _id: job.payload.sourceId, status: "failed" }, { $set: { status: "validating", error: null } });
  }
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "ai_ops.job_retry", targetType: "IngestionJob", targetId: jobId, reason, severity: "notice", metadata: { type: job.type, lastError: job.lastError ?? null } });
  return { status: "queued" };
}

export interface AiSettingsInput {
  maxOutputTokens: number;
  temperature: number;
  monthlyBudgetUsd: number;
}

/** platformSettings.ai güncellemesi + denetim kaydı (önce/sonra değerleriyle). */
export async function updateAiSettings(actor: AdminActor, input: AiSettingsInput, reason: string) {
  await connectDb();
  const before = await getPlatformSettings();
  const next = { maxOutputTokens: input.maxOutputTokens, temperature: input.temperature, monthlyBudgetMicroUsd: Math.round(input.monthlyBudgetUsd * 1_000_000) };
  if (before.ai.maxOutputTokens === next.maxOutputTokens && before.ai.temperature === next.temperature && before.ai.monthlyBudgetMicroUsd === next.monthlyBudgetMicroUsd) {
    throw new ConflictError("Değişiklik yok; kaydedilecek bir fark bulunamadı.", "no_changes");
  }
  if (reason.trim().length < 5) throw new AppError("Gerekçe en az 5 karakter olmalı.", "reason_required");
  await PlatformSettings.updateOne({ key: "global" }, { $set: { "ai.maxOutputTokens": next.maxOutputTokens, "ai.temperature": next.temperature, "ai.monthlyBudgetMicroUsd": next.monthlyBudgetMicroUsd, updatedBy: oid(actor.id) } });
  await audit({
    actorId: actor.id,
    actorRole: actor.adminRole,
    action: "settings.ai_update",
    targetType: "PlatformSettings",
    targetId: "global",
    reason,
    severity: "notice",
    metadata: { before: { maxOutputTokens: before.ai.maxOutputTokens, temperature: before.ai.temperature, monthlyBudgetMicroUsd: before.ai.monthlyBudgetMicroUsd }, after: next },
  });
  return next;
}
