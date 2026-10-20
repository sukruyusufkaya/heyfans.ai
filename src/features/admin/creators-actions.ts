"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { decideCreatorApplication, setCreatorSuspended } from "@/services/creators/onboarding";
import { revealCreatorPhone, setCreatorFeatured } from "@/services/admin/creators";
import { actorOf, assertAdminAny, idSchema, reasonSchema } from "./guard";

const decideSchema = z.object({
  applicationId: idSchema,
  decision: z.enum(["approve", "reject", "changes_requested"]),
  reason: reasonSchema,
});

export async function decideApplicationAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("creators.verify");
    const v = decideSchema.parse(input);
    await decideCreatorApplication(actorOf(user), v.applicationId, v.decision, v.reason);
    revalidatePath("/admin/creators");
    revalidatePath("/admin");
    const message = v.decision === "approve" ? t("Başvuru onaylandı.") : v.decision === "reject" ? t("Başvuru reddedildi.") : t("Creator'dan ek bilgi istendi.");
    return { ok: true, data: undefined, message };
  } catch (err) {
    return toActionError(err);
  }
}

const revealSchema = z.object({ creatorId: idSchema, reason: reasonSchema });

/** Başvuru incelemesi: creator telefonunu göster (denetim kaydı oluşturur). */
export async function revealCreatorPhoneAction(input: unknown): Promise<ActionResult<{ phone: string }>> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("creators.verify");
    const v = revealSchema.parse(input);
    const r = await revealCreatorPhone(actorOf(user), v.creatorId, v.reason);
    return { ok: true, data: r, message: t("Numara gösterildi; işlem denetim kaydına yazıldı.") };
  } catch (err) {
    return toActionError(err);
  }
}

const suspendSchema = z.object({ creatorId: idSchema, suspended: z.boolean(), reason: reasonSchema });

export async function setCreatorSuspendedAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("creators.manage");
    const v = suspendSchema.parse(input);
    await setCreatorSuspended(actorOf(user), v.creatorId, v.suspended, v.reason);
    revalidatePath("/admin/creators");
    revalidatePath("/admin");
    return { ok: true, data: undefined, message: v.suspended ? t("Creator hesabı askıya alındı; AI ikizi duraklatıldı.") : t("Creator hesabı yeniden etkinleştirildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

const featuredSchema = z.object({
  creatorId: idSchema,
  featured: z.boolean(),
  rank: z.coerce.number().int(m("Sıra tamsayı olmalı.")).min(0, m("Sıra 0 veya daha büyük olmalı.")).max(9999).default(0),
});

export async function setCreatorFeaturedAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdminAny("creators.manage", "cms.manage");
    const v = featuredSchema.parse(input);
    await setCreatorFeatured(actorOf(user), v.creatorId, v.featured, v.rank);
    revalidatePath("/admin/creators");
    revalidatePath("/admin/content");
    revalidatePath("/");
    revalidatePath("/explore");
    return { ok: true, data: undefined, message: v.featured ? t("Creator öne çıkarıldı.") : t("Creator öne çıkanlardan kaldırıldı.") };
  } catch (err) {
    return toActionError(err);
  }
}
