"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { ADMIN_ROLES } from "@/models/identity";
import { setUserAdminRole, setUserStatus } from "@/services/admin/users";
import { actorOf, idSchema, reasonSchema } from "./guard";

const statusSchema = z.object({ userId: idSchema, status: z.enum(["active", "suspended", "banned"]), reason: reasonSchema });

export async function setUserStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin("users.manage");
    const v = statusSchema.parse(input);
    const r = await setUserStatus(actorOf(user), v.userId, v.status, v.reason);
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    const message =
      v.status === "active" ? "Hesap yeniden etkinleştirildi." : `Hesap ${v.status === "banned" ? "yasaklandı" : "askıya alındı"}; ${r.revokedSessions} oturum sonlandırıldı${r.creatorSuspended ? ", creator profili askıya alındı" : ""}.`;
    return { ok: true, data: undefined, message };
  } catch (err) {
    return toActionError(err);
  }
}

const roleSchema = z.object({
  userId: idSchema,
  // "none" → yönetici rolü kaldırılır
  adminRole: z.enum([...ADMIN_ROLES, "none"]),
  reason: reasonSchema,
});

export async function setAdminRoleAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin("users.manage");
    const v = roleSchema.parse(input);
    await setUserAdminRole(actorOf(user), v.userId, v.adminRole === "none" ? null : v.adminRole, v.reason);
    revalidatePath("/admin/users");
    return { ok: true, data: undefined, message: v.adminRole === "none" ? "Yönetici rolü kaldırıldı; kullanıcının oturumları sonlandırıldı." : "Yönetici rolü atandı; kullanıcı yeniden giriş yapmalı." };
  } catch (err) {
    return toActionError(err);
  }
}
