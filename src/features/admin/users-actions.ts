"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { getT } from "@/i18n/server";
import { ADMIN_ROLES } from "@/models/identity";
import { setUserAdminRole, setUserStatus } from "@/services/admin/users";
import { actorOf, idSchema, reasonSchema } from "./guard";

const statusSchema = z.object({ userId: idSchema, status: z.enum(["active", "suspended", "banned"]), reason: reasonSchema });

export async function setUserStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("users.manage");
    const v = statusSchema.parse(input);
    const r = await setUserStatus(actorOf(user), v.userId, v.status, v.reason);
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    const count = r.revokedSessions;
    const banned = v.status === "banned";
    const message =
      v.status === "active"
        ? t("Hesap yeniden etkinleştirildi.")
        : r.creatorSuspended
          ? banned
            ? t("Hesap yasaklandı; {count} oturum sonlandırıldı, creator profili askıya alındı.", { count })
            : t("Hesap askıya alındı; {count} oturum sonlandırıldı, creator profili askıya alındı.", { count })
          : banned
            ? t("Hesap yasaklandı; {count} oturum sonlandırıldı.", { count })
            : t("Hesap askıya alındı; {count} oturum sonlandırıldı.", { count });
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
    const t = await getT();
    const { user } = await assertAdmin("users.manage");
    const v = roleSchema.parse(input);
    await setUserAdminRole(actorOf(user), v.userId, v.adminRole === "none" ? null : v.adminRole, v.reason);
    revalidatePath("/admin/users");
    return { ok: true, data: undefined, message: v.adminRole === "none" ? t("Yönetici rolü kaldırıldı; kullanıcının oturumları sonlandırıldı.") : t("Yönetici rolü atandı; kullanıcı yeniden giriş yapmalı.") };
  } catch (err) {
    return toActionError(err);
  }
}
