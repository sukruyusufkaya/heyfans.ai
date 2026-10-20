import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { CreatorProfile } from "@/models/creator";
import { AiTwin } from "@/models/ai";
import { Subscription, Wallet, CustomRequest } from "@/models/monetization";
import { ModerationCase, Report } from "@/models/safety";
import { Conversation, Notification } from "@/models/social";
import { m } from "@/i18n/m";
import { getT } from "@/i18n/server";

const TIER_LABEL: Record<string, string> = { free: m("Ücretsiz üye"), basic: m("Temel üye"), premium: m("Premium üye"), vip: m("VIP üye") };

/** Fan kabuğu için tek sorguda başlık/yan menü verisi. */
export async function getFanShellData(userId: string) {
  await connectDb();
  const t = await getT();
  const uid = oid(userId);
  const [wallet, unreadNotifications, unreadChatsAgg, platformSub] = await Promise.all([
    Wallet.findOne({ userId: uid }, { balance: 1 }).lean(),
    Notification.countDocuments({ userId: uid, readAt: null }),
    Conversation.aggregate<{ total: number }>([
      { $match: { userId: uid, kind: "fan", status: "active", unreadForUser: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]),
    Subscription.findOne({ userId: uid, scope: "platform", status: { $in: ["active", "past_due"] } }, { tier: 1 }).lean(),
  ]);
  return {
    credits: wallet?.balance ?? 0,
    unreadNotifications,
    unreadChats: unreadChatsAgg[0]?.total ?? 0,
    membershipLabel: t(TIER_LABEL[platformSub?.tier ?? "free"] ?? m("Üye")),
  };
}

export async function getStudioShellData(userId: string) {
  await connectDb();
  const creator = await CreatorProfile.findOne(
    { userId: oid(userId) },
    { displayName: 1, username: 1, avatarUrl: 1, status: 1, verification: 1 },
  ).lean();
  if (!creator) return null;
  const [twin, pendingRequests, unreadNotifications] = await Promise.all([
    AiTwin.findOne({ creatorId: creator._id }, { status: 1 }).lean(),
    CustomRequest.countDocuments({ creatorId: creator._id, status: { $in: ["pending", "in_review"] } }),
    Notification.countDocuments({ userId: oid(userId), readAt: null }),
  ]);
  return {
    creatorId: creator._id.toString(),
    displayName: creator.displayName,
    username: creator.username,
    avatarUrl: creator.avatarUrl ?? null,
    status: creator.status,
    verified: creator.verification?.identity === "verified",
    twinStatus: twin?.status ?? null,
    pendingRequests,
    unreadNotifications,
  };
}

export async function getAdminShellData() {
  await connectDb();
  const [openCases, openReports] = await Promise.all([
    ModerationCase.countDocuments({ status: { $in: ["open", "in_review", "escalated"] } }),
    Report.countDocuments({ status: { $in: ["open", "triaged"] } }),
  ]);
  return { openCases, openReports };
}
