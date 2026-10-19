"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { decideCreatorApplication, setCreatorSuspended } from "@/services/creators/onboarding";
import { setCreatorFeatured } from "@/services/admin/creators";
import { actorOf, assertAdminAny, idSchema, reasonSchema } from "./guard";

const decideSchema = z.object({
  applicationId: idSchema,
  decision: z.enum(["approve", "reject", "changes_requested"]),
  reason: reasonSchema,
});

export async function decideApplicationAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin("creators.verify");
    const v = decideSchema.parse(input);
    await decideCreatorApplication(actorOf(user), v.applicationId, v.decision, v.reason);
    revalidatePath("/admin/creators");
    revalidatePath("/admin");
    const message = v.decision === "approve" ? "Başvuru onaylandı." : v.decision === "reject" ? "Başvuru reddedildi." : "Creator'dan ek bilgi istendi.";
    return { ok: true, data: undefined, message };
  } catch (err) {
    return toActionError(err);
  }
}

const suspendSchema = z.object({ creatorId: idSchema, suspended: z.boolean(), reason: reasonSchema });

export async function setCreatorSuspendedAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin("creators.manage");
    const v = suspendSchema.parse(input);
    await setCreatorSuspended(actorOf(user), v.creatorId, v.suspended, v.reason);
    revalidatePath("/admin/creators");
    revalidatePath("/admin");
    return { ok: true, data: undefined, message: v.suspended ? "Creator hesabı askıya alındı; AI ikizi duraklatıldı." : "Creator hesabı yeniden etkinleştirildi." };
  } catch (err) {
    return toActionError(err);
  }
}

const featuredSchema = z.object({
  creatorId: idSchema,
  featured: z.boolean(),
  rank: z.coerce.number().int("Sıra tamsayı olmalı.").min(0, "Sıra 0 veya daha büyük olmalı.").max(9999).default(0),
});

export async function setCreatorFeaturedAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertAdminAny("creators.manage", "cms.manage");
    const v = featuredSchema.parse(input);
    await setCreatorFeatured(actorOf(user), v.creatorId, v.featured, v.rank);
    revalidatePath("/admin/creators");
    revalidatePath("/admin/content");
    revalidatePath("/");
    revalidatePath("/explore");
    return { ok: true, data: undefined, message: v.featured ? "Creator öne çıkarıldı." : "Creator öne çıkanlardan kaldırıldı." };
  } catch (err) {
    return toActionError(err);
  }
}
