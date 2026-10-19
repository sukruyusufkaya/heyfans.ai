import type { AdminRole, UserRole } from "@/models/identity";

/** Admin izinleri. Fan/creator yetkileri kaynak sahipliğiyle (servis katmanında) denetlenir. */
export const PERMISSIONS = [
  "admin.dashboard",
  "users.read",
  "users.manage",
  "creators.read",
  "creators.verify",
  "creators.manage",
  "twins.read",
  "twins.review",
  "twins.manage",
  "consents.read",
  "content.read",
  "moderation.read",
  "moderation.act",
  "reports.read",
  "reports.manage",
  "appeals.manage",
  "conversations.read_sensitive",
  "finance.read",
  "finance.refund",
  "payouts.manage",
  "ai_ops.read",
  "ai_ops.manage",
  "analytics.read",
  "cms.manage",
  "campaigns.manage",
  "categories.manage",
  "settings.read",
  "settings.manage",
  "audit.read",
  "support.read",
  "support.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS] as Permission[];

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ALL,
  operations_admin: [
    "admin.dashboard",
    "users.read",
    "users.manage",
    "creators.read",
    "creators.manage",
    "twins.read",
    "content.read",
    "reports.read",
    "reports.manage",
    "analytics.read",
    "cms.manage",
    "campaigns.manage",
    "categories.manage",
    "settings.read",
    "audit.read",
    "support.read",
    "support.manage",
  ],
  creator_manager: [
    "admin.dashboard",
    "users.read",
    "creators.read",
    "creators.verify",
    "creators.manage",
    "twins.read",
    "twins.review",
    "consents.read",
    "content.read",
    "analytics.read",
  ],
  moderation_specialist: [
    "admin.dashboard",
    "users.read",
    "creators.read",
    "twins.read",
    "content.read",
    "moderation.read",
    "moderation.act",
    "reports.read",
    "reports.manage",
    "appeals.manage",
    "conversations.read_sensitive",
  ],
  finance_manager: ["admin.dashboard", "users.read", "creators.read", "finance.read", "finance.refund", "payouts.manage", "analytics.read", "audit.read"],
  ai_operations_manager: ["admin.dashboard", "twins.read", "twins.manage", "ai_ops.read", "ai_ops.manage", "analytics.read", "settings.read"],
  support_agent: ["admin.dashboard", "users.read", "creators.read", "reports.read", "support.read", "support.manage"],
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Süper Yönetici",
  operations_admin: "Operasyon Yöneticisi",
  creator_manager: "Creator Yöneticisi",
  moderation_specialist: "Moderasyon Uzmanı",
  finance_manager: "Finans Yöneticisi",
  ai_operations_manager: "AI Operasyon Yöneticisi",
  support_agent: "Destek Temsilcisi",
};

export interface Actor {
  id: string;
  roles: UserRole[];
  adminRole?: AdminRole | null;
}

export function permissionsFor(actor: Pick<Actor, "roles" | "adminRole">): Set<Permission> {
  if (!actor.roles.includes("admin") || !actor.adminRole) return new Set();
  return new Set(ADMIN_ROLE_PERMISSIONS[actor.adminRole] ?? []);
}

export function can(actor: Pick<Actor, "roles" | "adminRole"> | null | undefined, permission: Permission): boolean {
  if (!actor) return false;
  return permissionsFor(actor).has(permission);
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Bu işlem için yetkiniz yok.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Bu işlem için giriş yapmalısınız.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function assertCan(actor: Pick<Actor, "roles" | "adminRole"> | null | undefined, permission: Permission) {
  if (!can(actor, permission)) throw new ForbiddenError();
}
