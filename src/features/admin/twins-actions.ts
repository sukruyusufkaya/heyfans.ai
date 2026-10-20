"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { adminSetTwinStatus, reviewTwinVersion } from "@/services/ai-twins/lifecycle";
import { actorOf, idSchema, reasonSchema } from "./guard";

const reviewSchema = z.object({ versionId: idSchema, decision: z.enum(["approve", "reject"]), reason: reasonSchema });

export async function reviewTwinVersionAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("twins.review");
    const v = reviewSchema.parse(input);
    await reviewTwinVersion(actorOf(user), v.versionId, v.decision, v.reason);
    revalidatePath("/admin/ai-twins");
    revalidatePath("/admin");
    return { ok: true, data: undefined, message: v.decision === "approve" ? t("AI ikizi sürümü onaylandı.") : t("AI ikizi sürümü reddedildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

const statusSchema = z.object({ twinId: idSchema, to: z.enum(["paused", "revoked", "live"]), reason: reasonSchema });

export async function setTwinStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("twins.manage");
    const v = statusSchema.parse(input);
    await adminSetTwinStatus(actorOf(user), v.twinId, v.to, v.reason);
    revalidatePath("/admin/ai-twins");
    revalidatePath("/admin");
    const message = v.to === "paused" ? t("AI ikizi duraklatıldı.") : v.to === "revoked" ? t("AI ikizi geri çekildi; tüm özellikleri kapatıldı.") : t("AI ikizi devam ettirildi.");
    return { ok: true, data: undefined, message };
  } catch (err) {
    return toActionError(err);
  }
}
