import "server-only";
import { env } from "@/config/env";
import { connectDb, getNativeDb } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid, paged } from "@/lib/validation/common";
import { CreatorProfile } from "@/models/creator";
import { ADMIN_ROLES, AgeVerificationRecord, User, type AdminRole, type IUser } from "@/models/identity";
import { Subscription, Wallet } from "@/models/monetization";
import { setCreatorSuspended } from "@/services/creators/onboarding";
import { daysAgo, REGEX_SAFE, type AdminActor } from "./shared";

export const USER_TABS = ["all", "active", "suspended", "banned"] as const;
export type UserTab = (typeof USER_TABS)[number];
const PAGE_SIZE = 15;

export async function getUserKpis() {
  await connectDb();
  const now = new Date();
  const [total, activeSubs, new7, new7Prev, restricted, byStatus] = await Promise.all([
    User.countDocuments({ status: { $ne: "deleted" } }),
    Subscription.countDocuments({ status: "active" }),
    User.countDocuments({ createdAt: { $gte: daysAgo(7, now) } }),
    User.countDocuments({ createdAt: { $gte: daysAgo(14, now), $lt: daysAgo(7, now) } }),
    User.countDocuments({ status: { $in: ["suspended", "banned"] } }),
    User.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const counts: Record<string, number> = { all: total, active: 0, suspended: 0, banned: 0 };
  for (const r of byStatus) if (r._id in counts) counts[r._id] = r.n;
  return { total, activeSubs, new7, new7Prev, restricted, counts };
}

export async function listAdminUsers(opts: { tab: UserTab; q: string; role: string; page: number }) {
  await connectDb();
  const filter: Record<string, unknown> = { status: { $ne: "deleted" } };
  if (opts.tab !== "all") filter.status = opts.tab;
  if (opts.role && ["fan", "creator", "admin"].includes(opts.role)) filter.roles = opts.role;
  if (opts.q) {
    if (/^[a-f0-9]{24}$/i.test(opts.q)) filter._id = oid(opts.q);
    else {
      const rx = { $regex: REGEX_SAFE(opts.q), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
    }
  }
  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<IUser[]>(),
    User.countDocuments(filter),
  ]);
  const ids = rows.map((r) => r._id);
  const subs = ids.length ? await Subscription.find({ userId: { $in: ids }, scope: "platform", status: { $in: ["active", "past_due"] } }, { userId: 1, tier: 1 }).lean() : [];
  const tier = new Map(subs.map((s) => [s.userId.toString(), s.tier as string]));
  const items = rows.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    roles: u.roles,
    adminRole: u.adminRole ?? null,
    status: u.status,
    tier: tier.get(u._id.toString()) ?? "free",
    lastSeenAt: u.lastSeenAt ?? null,
    createdAt: u.createdAt,
  }));
  return paged(items, total, opts.page, PAGE_SIZE);
}

export async function getAdminUserDetail(userId: string) {
  await connectDb();
  const user = await User.findById(oid(userId)).lean<IUser>();
  if (!user) return null;
  const [wallet, subCount, activeSubCount, age, creator] = await Promise.all([
    Wallet.findOne({ userId: user._id }, { balance: 1, status: 1, lifetimePurchased: 1, lifetimeSpent: 1 }).lean(),
    Subscription.countDocuments({ userId: user._id }),
    Subscription.countDocuments({ userId: user._id, status: { $in: ["active", "past_due"] } }),
    AgeVerificationRecord.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean(),
    CreatorProfile.findOne({ userId: user._id }, { username: 1, displayName: 1, status: 1 }).lean(),
  ]);
  // Parola / oturum / hesap alanları bilerek seçilmez; yalnız platform alanları döner.
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    username: user.username ?? null,
    roles: user.roles,
    adminRole: user.adminRole ?? null,
    status: user.status,
    statusReason: user.statusReason ?? null,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    signupIntent: user.signupIntent ?? null,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt ?? null,
    isDemo: Boolean(user.isDemo),
    wallet: wallet ? { balance: wallet.balance, status: wallet.status, purchased: wallet.lifetimePurchased, spent: wallet.lifetimeSpent } : null,
    subscriptions: { total: subCount, active: activeSubCount },
    age: age ? { method: age.method, level: age.assuranceLevel, status: age.status, over18: age.over18, provider: age.provider ?? null } : null,
    creator: creator ? { id: creator._id.toString(), username: creator.username, displayName: creator.displayName, status: creator.status } : null,
  };
}

/** Rol dağılımı: yöneticiler / creator'lar / hayranlar. */
export async function getUserSegments() {
  await connectDb();
  const [admins, creators, total] = await Promise.all([
    User.countDocuments({ roles: "admin", status: { $ne: "deleted" } }),
    User.countDocuments({ roles: "creator", status: { $ne: "deleted" } }),
    User.countDocuments({ status: { $ne: "deleted" } }),
  ]);
  const creatorsOnly = Math.max(0, creators);
  const fans = Math.max(0, total - admins - creatorsOnly);
  return [
    { name: "Hayranlar", value: fans },
    { name: "Creator'lar", value: creatorsOnly },
    { name: "Yöneticiler", value: admins },
  ];
}

export async function getSecuritySummary() {
  await connectDb();
  const now = new Date();
  const [totalUsers, verified, admins, adminsWith2fa, adminIds] = await Promise.all([
    User.countDocuments({ status: { $ne: "deleted" } }),
    User.countDocuments({ status: { $ne: "deleted" }, emailVerified: true }),
    User.countDocuments({ roles: "admin", status: "active" }),
    User.countDocuments({ roles: "admin", status: "active", twoFactorEnabled: true }),
    User.find({ roles: "admin" }, { _id: 1 }).lean(),
  ]);
  const db = await getNativeDb();
  const adminSessions = adminIds.length ? await db.collection("sessions").countDocuments({ userId: { $in: adminIds.map((a) => a._id) }, expiresAt: { $gt: now } }) : 0;
  return { totalUsers, verified, admins, adminsWith2fa, adminSessions, mfaEnforced: env().ADMIN_MFA_ENFORCED };
}

async function revokeSessions(userId: ReturnType<typeof oid>) {
  const db = await getNativeDb();
  const res = await db.collection("sessions").deleteMany({ userId });
  return res.deletedCount;
}

function assertManageable(actor: AdminActor, target: IUser) {
  if (actor.id === target._id.toString()) throw new AppError("Kendi hesabınız üzerinde bu işlemi yapamazsınız.", "self_action", 403);
  if (target.roles.includes("admin") && actor.adminRole !== "super_admin") throw new AppError("Yönetici hesaplarını yalnız Süper Yönetici yönetebilir.", "admin_protected", 403);
}

/** Hesap durumu: askıya al / yasakla / yeniden etkinleştir. Oturumlar sonlandırılır; creator ise profil de askıya alınır. */
export async function setUserStatus(actor: AdminActor, userId: string, to: "active" | "suspended" | "banned", reason: string) {
  await connectDb();
  if (reason.trim().length < 5) throw new AppError("Gerekçe en az 5 karakter olmalı.", "reason_required");
  const target = await User.findById(oid(userId)).lean<IUser>();
  if (!target) throw new NotFoundError("Kullanıcı bulunamadı.");
  assertManageable(actor, target);
  if (target.status === "deleted") throw new ConflictError("Silinmiş hesap üzerinde işlem yapılamaz.");
  if (target.status === to) throw new ConflictError("Hesap zaten bu durumda.");
  if (to !== "active" && target.adminRole === "super_admin") {
    const others = await User.countDocuments({ adminRole: "super_admin", status: "active", _id: { $ne: target._id } });
    if (!others) throw new ConflictError("Son aktif Süper Yönetici hesabı askıya alınamaz.");
  }
  await User.updateOne({ _id: target._id }, { $set: { status: to, statusReason: to === "active" ? null : reason } });
  let revoked = 0;
  if (to !== "active") revoked = await revokeSessions(target._id);
  let creatorSuspended = false;
  if (to !== "active") {
    const cp = await CreatorProfile.findOne({ userId: target._id }, { status: 1 }).lean();
    if (cp && cp.status === "approved") {
      await setCreatorSuspended(actor, cp._id.toString(), true, `Hesap ${to === "banned" ? "yasaklandı" : "askıya alındı"}: ${reason}`);
      creatorSuspended = true;
    }
  }
  await audit({
    actorId: actor.id,
    actorRole: actor.adminRole,
    action: to === "active" ? "user.reactivate" : to === "banned" ? "user.ban" : "user.suspend",
    targetType: "User",
    targetId: userId,
    reason,
    severity: to === "active" ? "notice" : "critical",
    metadata: { from: target.status, to, revokedSessions: revoked, creatorSuspended },
  });
  return { status: to, revokedSessions: revoked, creatorSuspended };
}

/** Yönetici rolü atama / kaldırma — yalnız Süper Yönetici. Oturumlar yenilenir (izinler anında değişsin). */
export async function setUserAdminRole(actor: AdminActor, userId: string, adminRole: AdminRole | null, reason: string) {
  await connectDb();
  if (actor.adminRole !== "super_admin") throw new AppError("Yönetici rollerini yalnız Süper Yönetici değiştirebilir.", "forbidden", 403);
  if (reason.trim().length < 5) throw new AppError("Gerekçe en az 5 karakter olmalı.", "reason_required");
  if (adminRole && !(ADMIN_ROLES as readonly string[]).includes(adminRole)) throw new AppError("Geçersiz yönetici rolü.", "invalid_role");
  const target = await User.findById(oid(userId)).lean<IUser>();
  if (!target) throw new NotFoundError("Kullanıcı bulunamadı.");
  if (actor.id === userId) throw new AppError("Kendi yönetici rolünüzü değiştiremezsiniz.", "self_action", 403);
  if (target.status !== "active") throw new ConflictError("Yalnız aktif hesaplara yönetici rolü verilebilir.");
  if ((target.adminRole ?? null) === adminRole) throw new ConflictError("Kullanıcı zaten bu rolde.");
  if (target.adminRole === "super_admin" && adminRole !== "super_admin") {
    const others = await User.countDocuments({ adminRole: "super_admin", status: "active", _id: { $ne: target._id } });
    if (!others) throw new ConflictError("Son Süper Yönetici'nin yetkisi kaldırılamaz.");
  }
  const roles = new Set(target.roles);
  if (adminRole) roles.add("admin");
  else roles.delete("admin");
  if (!roles.has("fan")) roles.add("fan");
  await User.updateOne({ _id: target._id }, { $set: { adminRole, roles: [...roles] } });
  const revoked = await revokeSessions(target._id);
  await audit({
    actorId: actor.id,
    actorRole: actor.adminRole,
    action: adminRole ? "admin_role.assign" : "admin_role.remove",
    targetType: "User",
    targetId: userId,
    reason,
    severity: "critical",
    metadata: { from: target.adminRole ?? null, to: adminRole, revokedSessions: revoked, twoFactorEnabled: Boolean(target.twoFactorEnabled), mfaEnforced: env().ADMIN_MFA_ENFORCED },
  });
  return { adminRole, revokedSessions: revoked };
}
