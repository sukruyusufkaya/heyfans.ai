import { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { AiTwin, AiTwinVersion, ContentItem, CreatorConsent, CreatorProfile, MembershipPlan, User, type UserRole } from "@/models";

let n = 0;
export async function makeUser(roles: UserRole[] = ["fan"], extra: Record<string, unknown> = {}) {
  await connectDb();
  n++;
  const u = await User.create({ name: `Test Kullanıcı ${n}`, email: `t${n}_${Date.now()}@test.local`, emailVerified: true, roles, ...extra });
  return u._id.toString();
}

/** Onaylı creator + yayında ikiz + planlar + içerikler. */
export async function makeLiveCreator(username = `creator${Date.now().toString(36)}`) {
  const userId = await makeUser(["fan", "creator"]);
  const profile = await CreatorProfile.create({
    userId: new Types.ObjectId(userId),
    username,
    displayName: "Test Creator",
    status: "approved",
    verification: { identity: "verified", social: "verified" },
    categories: ["fitness"],
  });
  await CreatorConsent.create({ creatorId: profile._id, userId: profile.userId, kind: "ai_twin_persona", granted: true, textVersion: "t", textHash: "t" });
  const twin = await AiTwin.create({
    creatorId: profile._id,
    userId: profile.userId,
    status: "live",
    draft: { persona: { displayName: "Test Creator", greeting: "Selam!" } },
    pricing: { messageCredits: 2, voicePerMinuteCredits: 20, videoPerMinuteCredits: 40, freeMessagesPerDay: 1 },
    features: { chat: true, voice: false, video: false },
  });
  const v = await AiTwinVersion.create({ twinId: twin._id, creatorId: profile._id, version: 1, snapshot: { persona: twin.draft.persona, boundaries: twin.draft.boundaries, voice: twin.draft.voice, knowledgeSourceIds: [] }, status: "live", submittedBy: profile.userId });
  twin.liveVersionId = v._id;
  await twin.save();
  const plan = await MembershipPlan.create({
    scope: "creator",
    creatorId: profile._id,
    tier: "premium",
    name: "Premium",
    priceMonthly: { amountMinor: 39_900, currency: "TRY" },
    entitlements: { contentAccess: "premium", unlimitedChat: true, dailyChatAllowance: 0, monthlyCredits: 0, customRequests: true, prioritySupport: false },
  });
  const paid = await ContentItem.create({ creatorId: profile._id, type: "photo", title: "Ücretli seri", status: "published", access: "purchase", price: { amountMinor: 7_900, currency: "TRY" }, publishedAt: new Date() });
  const subsOnly = await ContentItem.create({ creatorId: profile._id, type: "photo", title: "Abonelere", status: "published", access: "subscribers", minPlanTier: "premium", publishedAt: new Date() });
  return { userId, creatorId: profile._id.toString(), username, twinId: twin._id.toString(), planId: plan._id.toString(), paidContentId: paid._id.toString(), subsContentId: subsOnly._id.toString() };
}

export async function readStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
  }
  return buf
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { type: string; [k: string]: unknown });
}
