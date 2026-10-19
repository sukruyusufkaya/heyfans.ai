import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { getAuth } from "@/lib/auth/auth";
import { ObjectId } from "mongodb";
import { connectDb } from "@/lib/db/mongo";
import { can, ForbiddenError, UnauthorizedError, type Permission } from "@/lib/permissions";
import { User, type AdminRole, type UserRole, type UserStatus } from "@/models/identity";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string | null;
  roles: UserRole[];
  adminRole: AdminRole | null;
  status: UserStatus;
  twoFactorEnabled: boolean;
  signupIntent: "fan" | "creator";
}

export interface AppSession {
  user: SessionUser;
  sessionId: string;
}

function normalize(raw: Record<string, unknown>): SessionUser {
  const roles = Array.isArray(raw.roles) ? (raw.roles as UserRole[]) : ["fan" as UserRole];
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    emailVerified: Boolean(raw.emailVerified),
    image: (raw.image as string | null) ?? null,
    username: (raw.username as string | null) ?? null,
    roles,
    adminRole: (raw.adminRole as AdminRole | null) ?? null,
    status: ((raw.status as UserStatus) ?? "active") as UserStatus,
    twoFactorEnabled: Boolean(raw.twoFactorEnabled),
    signupIntent: raw.signupIntent === "creator" ? "creator" : "fan",
  };
}

/**
 * İstek başına önbelleklenmiş oturum (React cache).
 * Better Auth oturum çerezi önbelleği (5 dk) rolleri/durumu bayat taşıyabilir; bu yüzden yetkiyle ilgili
 * alanlar (durum, roller, admin rolü, 2FA) her istekte veritabanından tazelenir — askıya alma/rol
 * kaldırma anında etkili olur.
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  const user = normalize(result.user as unknown as Record<string, unknown>);
  if (ObjectId.isValid(user.id)) {
    await connectDb();
    const fresh = await User.findById(user.id, { status: 1, roles: 1, adminRole: 1, twoFactorEnabled: 1, name: 1, image: 1, username: 1 }).lean();
    if (!fresh) return null;
    user.status = fresh.status;
    user.roles = fresh.roles;
    user.adminRole = fresh.adminRole ?? null;
    user.twoFactorEnabled = Boolean(fresh.twoFactorEnabled);
    user.name = fresh.name;
    user.image = fresh.image ?? null;
    user.username = fresh.username ?? null;
  }
  if (user.status !== "active") return null;
  return { user, sessionId: result.session.id };
});

function loginUrl(next?: string) {
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

/** Sayfa/layout kullanımı: oturum yoksa girişe yönlendirir. */
export async function requireUser(next?: string): Promise<AppSession> {
  const session = await getSession();
  if (!session) redirect(loginUrl(next));
  return session;
}

export async function requireCreator(next = "/studio"): Promise<AppSession> {
  const session = await requireUser(next);
  if (!session.user.roles.includes("creator")) redirect("/onboarding/creator");
  return session;
}

export function adminMfaSatisfied(user: SessionUser) {
  return !env().ADMIN_MFA_ENFORCED || user.twoFactorEnabled;
}

export async function requireAdmin(permission: Permission = "admin.dashboard", next = "/admin"): Promise<AppSession> {
  const session = await requireUser(next);
  const { user } = session;
  if (!user.roles.includes("admin") || !user.adminRole) redirect("/app");
  if (!adminMfaSatisfied(user)) redirect("/security/mfa");
  if (!can(user, permission)) redirect("/admin?denied=1");
  return session;
}

/** Server Action / Route Handler kullanımı: yönlendirme yerine hata fırlatır. */
export async function assertUser(): Promise<AppSession> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function assertAdmin(permission: Permission): Promise<AppSession> {
  const session = await assertUser();
  const { user } = session;
  if (!user.roles.includes("admin") || !user.adminRole || !adminMfaSatisfied(user)) throw new ForbiddenError();
  if (!can(user, permission)) throw new ForbiddenError();
  return session;
}

export async function assertCreator(): Promise<AppSession> {
  const session = await assertUser();
  if (!session.user.roles.includes("creator")) throw new ForbiddenError("Bu işlem yalnız içerik üreticileri içindir.");
  return session;
}
