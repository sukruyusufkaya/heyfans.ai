import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid, paged } from "@/lib/validation/common";
import { AiTwin, AiTwinVersion, KnowledgeSource, TWIN_STATUSES, type ITwin, type ITwinVersion } from "@/models/ai";
import { CreatorConsent, CreatorProfile } from "@/models/creator";
import { loadCreators, REGEX_SAFE } from "./shared";

export const TWIN_TABS = ["all", ...TWIN_STATUSES] as const;
export type TwinTab = (typeof TWIN_TABS)[number];
const PAGE_SIZE = 12;

const avg = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export async function getTwinKpis() {
  await connectDb();
  const [byStatus, pendingVersions, quality] = await Promise.all([
    AiTwin.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    AiTwinVersion.countDocuments({ status: "pending_review" }),
    AiTwin.aggregate<{ avg: number | null; n: number }>([
      { $project: { q: { $avg: ["$quality.personaScore", "$quality.knowledgeScore", "$quality.safetyScore"] } } },
      { $match: { q: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: "$q" }, n: { $sum: 1 } } },
    ]),
  ]);
  const counts: Record<string, number> = { all: 0 };
  for (const s of TWIN_STATUSES) counts[s] = 0;
  for (const r of byStatus) {
    counts[r._id] = r.n;
    counts.all = (counts.all ?? 0) + r.n;
  }
  return { counts, pendingVersions, avgQuality: quality[0]?.avg ?? null, scored: quality[0]?.n ?? 0 };
}

export async function listAdminTwins(opts: { tab: TwinTab; q: string; page: number }) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.tab !== "all") filter.status = opts.tab;
  if (opts.q) {
    const rx = { $regex: REGEX_SAFE(opts.q), $options: "i" };
    const creators = await CreatorProfile.find({ $or: [{ displayName: rx }, { username: rx }] }, { _id: 1 }).limit(200).lean();
    filter.$or = [{ "draft.persona.displayName": rx }, { creatorId: { $in: creators.map((c) => c._id) } }];
  }
  const [rows, total] = await Promise.all([
    AiTwin.find(filter).sort({ status: 1, updatedAt: -1 }).skip((opts.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<ITwin[]>(),
    AiTwin.countDocuments(filter),
  ]);
  const creators = await loadCreators(rows.map((r) => r.creatorId));
  const pending = rows.length ? await AiTwinVersion.find({ twinId: { $in: rows.map((r) => r._id) }, status: "pending_review" }, { twinId: 1 }).lean() : [];
  const pendingSet = new Set(pending.map((p) => p.twinId.toString()));
  const items = rows.map((t) => {
    const c = creators.get(t.creatorId.toString());
    return {
      id: t._id.toString(),
      name: t.draft.persona.displayName || c?.displayName || "AI İkizi",
      creator: c?.displayName ?? "—",
      avatarUrl: c?.avatarUrl ?? null,
      status: t.status,
      version: t.currentVersion,
      conversations: t.stats.conversations,
      quality: avg([t.quality.personaScore, t.quality.knowledgeScore, t.quality.safetyScore]),
      hasPending: pendingSet.has(t._id.toString()),
    };
  });
  return paged(items, total, opts.page, PAGE_SIZE);
}

function summarizeVersion(v: ITwinVersion) {
  const p = v.snapshot.persona;
  const b = v.snapshot.boundaries;
  const vo = v.snapshot.voice;
  return {
    id: v._id.toString(),
    version: v.version,
    status: v.status,
    submittedAt: v.createdAt,
    reviewNote: v.reviewNote ?? null,
    changeSummary: v.changeSummary ?? null,
    knowledgeCount: v.snapshot.knowledgeSourceIds?.length ?? 0,
    persona: {
      displayName: p.displayName,
      shortBio: p.shortBio,
      greeting: p.greeting,
      warmth: p.warmth,
      formality: p.formality,
      humor: p.humor,
      energy: p.energy,
      messageLength: p.messageLength,
      emojiUsage: p.emojiUsage,
      language: p.language,
      speakingStyle: p.speakingStyle,
      catchphrases: p.catchphrases ?? [],
    },
    boundaries: {
      allowedTopics: b.allowedTopics ?? [],
      blockedTopics: b.blockedTopics ?? [],
      customRules: b.customRules ?? [],
      allowFlirt: b.allowFlirt,
      allowPersonalQuestions: b.allowPersonalQuestions,
      allowMediaRequests: b.allowMediaRequests,
      allowCustomRequests: b.allowCustomRequests,
      escalateOnDistress: b.escalateOnDistress,
      maxMessagesPerFanPerDay: b.maxMessagesPerFanPerDay,
    },
    voice: { voiceEnabled: vo.voiceEnabled, videoEnabled: vo.videoEnabled, imageLikenessEnabled: vo.imageLikenessEnabled },
  };
}

export async function getAdminTwinDetail(twinId: string, scope: { consents: boolean }) {
  await connectDb();
  const twin = await AiTwin.findById(oid(twinId)).lean<ITwin>();
  if (!twin) return null;
  const [creator, versions, consents, sources] = await Promise.all([
    CreatorProfile.findById(twin.creatorId, { displayName: 1, username: 1, avatarUrl: 1, status: 1, verification: 1 }).lean(),
    AiTwinVersion.find({ twinId: twin._id }).sort({ version: -1 }).limit(6).lean<ITwinVersion[]>(),
    scope.consents ? CreatorConsent.find({ creatorId: twin.creatorId, granted: true, revokedAt: null }, { kind: 1, textVersion: 1, grantedAt: 1 }).lean() : Promise.resolve([]),
    KnowledgeSource.aggregate<{ _id: string; n: number }>([{ $match: { twinId: twin._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const pending = versions.find((v) => v.status === "pending_review") ?? null;
  const live = versions.find((v) => v.status === "live") ?? null;
  const focus = pending ?? live ?? versions[0] ?? null;
  return {
    id: twin._id.toString(),
    name: twin.draft.persona.displayName || creator?.displayName || "AI İkizi",
    status: twin.status,
    currentVersion: twin.currentVersion,
    reviewNote: twin.reviewNote ?? null,
    creator: creator ? { id: creator._id.toString(), displayName: creator.displayName, username: creator.username, avatarUrl: creator.avatarUrl ?? null, status: creator.status, identity: creator.verification.identity } : null,
    quality: { persona: twin.quality.personaScore, knowledge: twin.quality.knowledgeScore, safety: twin.quality.safetyScore, lastTestAt: twin.quality.lastTestAt ?? null },
    stats: twin.stats,
    features: twin.features,
    pricing: twin.pricing,
    statusHistory: [...twin.statusHistory].slice(-6).reverse().map((h) => ({ from: h.from, to: h.to, note: h.note ?? null, at: h.at })),
    pendingVersion: pending ? summarizeVersion(pending) : null,
    focusVersion: focus ? summarizeVersion(focus) : null,
    focusIsPending: Boolean(pending),
    versions: versions.map((v) => ({ id: v._id.toString(), version: v.version, status: v.status, at: v.createdAt })),
    canSeeConsents: scope.consents,
    consents: consents.map((c) => ({ kind: c.kind, version: c.textVersion, at: c.grantedAt })),
    knowledge: Object.fromEntries(sources.map((s) => [s._id, s.n])) as Record<string, number>,
  };
}
