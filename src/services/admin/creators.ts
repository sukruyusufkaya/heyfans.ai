import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid, paged } from "@/lib/validation/common";
import { AiTwin } from "@/models/ai";
import {
  CreatorApplication,
  CreatorConsent,
  CreatorProfile,
  CreatorVerificationRequest,
  CREATOR_STATUSES,
  type ICreatorApplication,
  type ICreatorProfile,
} from "@/models/creator";
import { ContentItem } from "@/models/content";
import { User } from "@/models/identity";
import { PayoutAccount } from "@/models/monetization";
import { daysAgo, REGEX_SAFE, type AdminActor } from "./shared";

export const CREATOR_TABS = ["all", ...CREATOR_STATUSES] as const;
export type CreatorTab = (typeof CREATOR_TABS)[number];
const PAGE_SIZE = 12;

export async function getCreatorCounts() {
  await connectDb();
  const [byStatus, total, pendingApps, new30] = await Promise.all([
    CreatorProfile.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    CreatorProfile.countDocuments({}),
    CreatorApplication.countDocuments({ status: { $in: ["submitted", "in_review"] } }),
    CreatorProfile.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
  ]);
  const counts: Record<string, number> = { all: total };
  for (const s of CREATOR_STATUSES) counts[s] = 0;
  for (const r of byStatus) counts[r._id] = r.n;
  return { counts, pendingApps, new30 };
}

export async function listAdminCreators(opts: { tab: CreatorTab; q: string; page: number }) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.tab !== "all") filter.status = opts.tab;
  if (opts.q) {
    const rx = { $regex: REGEX_SAFE(opts.q), $options: "i" };
    filter.$or = [{ displayName: rx }, { username: rx }, { location: rx }];
  }
  const sort: Record<string, 1 | -1> = opts.tab === "pending_review" ? { "onboarding.submittedAt": 1 } : { createdAt: -1 };
  const [rows, total] = await Promise.all([
    CreatorProfile.find(filter).sort(sort).skip((opts.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<ICreatorProfile[]>(),
    CreatorProfile.countDocuments(filter),
  ]);
  const ids = rows.map((r) => r._id);
  const apps = ids.length ? await CreatorApplication.find({ creatorId: { $in: ids } }, { creatorId: 1, status: 1, submittedAt: 1 }).sort({ createdAt: -1 }).lean() : [];
  const latestApp = new Map<string, { status: string; submittedAt: Date | null }>();
  for (const a of apps) if (!latestApp.has(a.creatorId.toString())) latestApp.set(a.creatorId.toString(), { status: a.status, submittedAt: a.submittedAt ?? null });
  const items = rows.map((r) => ({
    id: r._id.toString(),
    displayName: r.displayName,
    username: r.username,
    avatarUrl: r.avatarUrl ?? null,
    location: r.location ?? null,
    status: r.status,
    identity: r.verification.identity,
    social: r.verification.social,
    followers: r.stats.followers,
    featured: r.featured.isFeatured,
    application: latestApp.get(r._id.toString()) ?? null,
    createdAt: r.createdAt,
  }));
  return paged(items, total, opts.page, PAGE_SIZE);
}

export interface CreatorDetailScope {
  /** finance.read: maskeli ödeme hesapları */
  finance: boolean;
  /** consents.read: açık rıza kayıtları */
  consents: boolean;
  /** creators.verify | creators.manage: doğrulama kanıtları */
  evidence: boolean;
}

/** Kapsam bayrakları, izni olmayan yöneticinin hassas ayrıntıları görmesini engeller (en az yetki). */
export async function getAdminCreatorDetail(creatorId: string, scope: CreatorDetailScope) {
  await connectDb();
  const profile = await CreatorProfile.findById(oid(creatorId)).lean<ICreatorProfile>();
  if (!profile) return null;
  const [user, apps, requests, consents, twin, contentCount, payoutAccounts] = await Promise.all([
    User.findById(profile.userId, { email: 1, name: 1, emailVerified: 1, status: 1, createdAt: 1 }).lean(),
    CreatorApplication.find({ creatorId: profile._id }).sort({ createdAt: -1 }).limit(3).lean<ICreatorApplication[]>(),
    scope.evidence ? CreatorVerificationRequest.find({ creatorId: profile._id }).sort({ createdAt: -1 }).limit(10).lean() : Promise.resolve([]),
    scope.consents ? CreatorConsent.find({ creatorId: profile._id }).sort({ grantedAt: -1 }).limit(20).lean() : Promise.resolve([]),
    AiTwin.findOne({ creatorId: profile._id }, { status: 1, currentVersion: 1 }).lean(),
    ContentItem.countDocuments({ creatorId: profile._id, status: "published" }),
    scope.finance ? PayoutAccount.find({ creatorId: profile._id }, { ibanMasked: 1, status: 1, holderName: 1 }).lean() : Promise.resolve([]),
  ]);
  const app = apps[0] ?? null;
  const snapshot = app?.snapshot ?? {};
  return {
    id: profile._id.toString(),
    displayName: profile.displayName,
    username: profile.username,
    headline: profile.headline ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    status: profile.status,
    location: profile.location ?? null,
    categories: profile.categories,
    socialLinks: profile.socialLinks.map((s) => ({ platform: s.platform, handle: s.handle, verified: s.verified })),
    verification: profile.verification,
    featured: profile.featured,
    stats: profile.stats,
    payoutsEnabled: profile.payoutsEnabled,
    statusHistory: [...profile.statusHistory].slice(-5).reverse().map((h) => ({ from: h.from, to: h.to, note: h.note ?? null, at: h.at })),
    createdAt: profile.createdAt,
    user: user ? { email: user.email, emailVerified: user.emailVerified, status: user.status } : null,
    application: app
      ? {
          id: app._id.toString(),
          status: app.status,
          checklist: app.checklist,
          decisionNote: app.decisionNote ?? null,
          submittedAt: app.submittedAt ?? null,
          decidedAt: app.decidedAt ?? null,
          history: app.history.map((h) => ({ from: h.from, to: h.to, note: h.note ?? null, at: h.at })),
          snapshot: {
            displayName: typeof snapshot.displayName === "string" ? snapshot.displayName : null,
            username: typeof snapshot.username === "string" ? snapshot.username : null,
            categories: Array.isArray(snapshot.categories) ? (snapshot.categories as unknown[]).filter((c): c is string => typeof c === "string") : [],
          },
        }
      : null,
    requests: requests.map((r) => ({
      id: r._id.toString(),
      type: r.type,
      status: r.status,
      provider: r.provider,
      evidence: r.evidence.map((e) => ({ kind: e.kind, value: e.value })),
      decisionNote: r.decisionNote ?? null,
      createdAt: r.createdAt,
    })),
    consents: consents.map((c) => ({ id: c._id.toString(), kind: c.kind, granted: c.granted, textVersion: c.textVersion, grantedAt: c.grantedAt, revokedAt: c.revokedAt ?? null })),
    twin: twin ? { status: twin.status, version: twin.currentVersion } : null,
    publishedContent: contentCount,
    scope,
    payoutAccounts: payoutAccounts.map((a) => ({ id: a._id.toString(), masked: a.ibanMasked, status: a.status, holder: a.holderName })),
  };
}

/** Öne çıkan creator yönetimi: yalnız onaylı creator'lar öne çıkarılabilir. */
export async function setCreatorFeatured(actor: AdminActor, creatorId: string, featured: boolean, rank: number) {
  await connectDb();
  if (!Number.isInteger(rank) || rank < 0 || rank > 9999) throw new AppError("Sıra 0 ile 9999 arasında bir tamsayı olmalı.", "invalid_rank");
  const profile = await CreatorProfile.findById(oid(creatorId));
  if (!profile) throw new NotFoundError("Creator bulunamadı.");
  if (featured && profile.status !== "approved") throw new AppError("Yalnız onaylı (aktif) creator'lar öne çıkarılabilir.", "not_approved", 409);
  const before = { isFeatured: profile.featured.isFeatured, rank: profile.featured.rank };
  profile.featured.isFeatured = featured;
  profile.featured.rank = rank;
  await profile.save();
  await audit({
    actorId: actor.id,
    actorRole: actor.adminRole,
    action: featured ? "creator.feature" : "creator.unfeature",
    targetType: "CreatorProfile",
    targetId: creatorId,
    severity: "notice",
    metadata: { before, after: { isFeatured: featured, rank } },
  });
  return { isFeatured: featured, rank };
}

export async function listFeaturedCreators() {
  await connectDb();
  const [featured, candidates] = await Promise.all([
    CreatorProfile.find({ "featured.isFeatured": true }).sort({ "featured.rank": 1, displayName: 1 }).lean<ICreatorProfile[]>(),
    CreatorProfile.find({ status: "approved", "featured.isFeatured": { $ne: true } }, { displayName: 1, username: 1 }).sort({ "stats.followers": -1 }).limit(60).lean(),
  ]);
  return {
    featured: featured.map((c) => ({ id: c._id.toString(), displayName: c.displayName, username: c.username, avatarUrl: c.avatarUrl ?? null, rank: c.featured.rank, status: c.status, followers: c.stats.followers })),
    candidates: candidates.map((c) => ({ id: c._id.toString(), label: `${c.displayName} (@${c.username})` })),
  };
}
