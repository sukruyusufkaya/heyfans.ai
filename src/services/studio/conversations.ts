import "server-only";
import { z } from "zod";
import { Conversation, Message, type IConversation } from "@/models/social";
import { anonymousFanLabel, dayExpr, dayKeys, fillSeries, rangeStart, studioCreator } from "./context";
import { pageSchema } from "@/lib/validation/common";

export const conversationFilterSchema = z.enum(["all", "flagged", "interventions"]).catch("all");
export { pageSchema };

/**
 * Creator sohbet analitiği — GİZLİLİK: hayranların özel sohbet metinleri creator'a gösterilmez.
 * Bu servis hiçbir mesaj gövdesi ya da önizleme alanı okumaz; yalnız toplamlar ve üst veri döner.
 */
export async function getConversationAnalytics(userId: string, opts: { filter?: "all" | "flagged" | "interventions"; page?: number } = {}) {
  const creator = await studioCreator(userId);
  const cid = creator._id;
  const keys = dayKeys(30);
  const since = rangeStart(keys);
  const page = opts.page ?? 1;
  const pageSize = 15;

  // Test sohbetleri (kind=test) hayran istatistiğine dahil edilmez.
  const testIds = await Conversation.find({ creatorId: cid, kind: "test" }, { _id: 1 }).lean();
  const fanMsgMatch = { creatorId: cid, conversationId: { $nin: testIds.map((c) => c._id) } };

  const [convDaily, msgDaily, totals, activeFans, interventionsAgg] = await Promise.all([
    Conversation.aggregate<{ _id: string; n: number }>([{ $match: { creatorId: cid, kind: "fan", createdAt: { $gte: since } } }, { $group: { _id: dayExpr(), n: { $sum: 1 } } }]),
    Message.aggregate<{ _id: string; n: number }>([{ $match: { ...fanMsgMatch, senderType: "user", createdAt: { $gte: since } } }, { $group: { _id: dayExpr(), n: { $sum: 1 } } }]),
    Conversation.aggregate<{ _id: null; total: number; messages: number; flagged: number }>([
      { $match: { creatorId: cid, kind: "fan", status: { $ne: "deleted" } } },
      { $group: { _id: null, total: { $sum: 1 }, messages: { $sum: "$messageCount" }, flagged: { $sum: { $cond: [{ $in: ["$status", ["reported", "blocked"]] }, 1, 0] } } } },
    ]),
    Message.distinct("userId", { ...fanMsgMatch, senderType: "user", createdAt: { $gte: since } }),
    Message.aggregate<{ _id: unknown; n: number }>([
      { $match: { ...fanMsgMatch, "safety.action": { $in: ["blocked", "rewritten", "escalated"] } } },
      { $group: { _id: "$conversationId", n: { $sum: 1 } } },
    ]),
  ]);

  const interventions = new Map(interventionsAgg.map((i) => [String(i._id), i.n]));
  const q: Record<string, unknown> = { creatorId: cid, kind: "fan", status: { $ne: "deleted" } };
  if (opts.filter === "flagged") q.status = { $in: ["reported", "blocked"] };
  if (opts.filter === "interventions") q._id = { $in: interventionsAgg.map((i) => i._id) };
  const [rows, total] = await Promise.all([
    // lastMessagePreview bilerek HARİÇ: özel sohbet içeriği sızmasın.
    Conversation.find(q, { lastMessagePreview: 0 }).sort({ lastMessageAt: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<IConversation[]>(),
    Conversation.countDocuments(q),
  ]);

  const t = totals[0];
  return {
    creator,
    stats: {
      total: t?.total ?? 0,
      avgMessages: t && t.total ? Math.round((t.messages / t.total) * 10) / 10 : 0,
      activeFans30: activeFans.length,
      flagged: t?.flagged ?? 0,
      interventions: interventionsAgg.reduce((a, r) => a + r.n, 0),
    },
    convSeries: fillSeries(keys, convDaily),
    msgSeries: fillSeries(keys, msgDaily),
    rows: rows.map((c) => ({
      id: c._id.toString(),
      label: anonymousFanLabel(c.userId.toString()),
      messageCount: c.messageCount,
      lastMessageAt: c.lastMessageAt ?? c.createdAt,
      status: c.status,
      creditsSpent: c.creditsSpent,
      interventions: interventions.get(c._id.toString()) ?? 0,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
