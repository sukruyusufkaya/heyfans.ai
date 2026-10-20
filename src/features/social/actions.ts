"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { objectIdSchema } from "@/lib/validation/common";
import { getT } from "@/i18n/server";
import { createReport } from "@/services/moderation/moderation";
import { setFavorite, setFollow } from "@/services/social/social";

export async function toggleFollowAction(creatorId: string, follow: boolean): Promise<ActionResult<{ following: boolean }>> {
  try {
    const { user } = await assertUser();
    const t = await getT();
    objectIdSchema.parse(creatorId);
    const res = await setFollow(user.id, creatorId, follow);
    revalidatePath("/app/following");
    return { ok: true, data: { following: res.following }, message: follow ? t("Takip ediliyor") : t("Takipten çıkıldı") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleFavoriteAction(targetType: "creator" | "content" | "twin", targetId: string, favorite: boolean): Promise<ActionResult<{ favorite: boolean }>> {
  try {
    const { user } = await assertUser();
    const t = await getT();
    z.enum(["creator", "content", "twin"]).parse(targetType);
    objectIdSchema.parse(targetId);
    const res = await setFavorite(user.id, targetType, targetId, favorite);
    revalidatePath("/app/favorites");
    return { ok: true, data: { favorite: res.favorite }, message: favorite ? t("Favorilere eklendi") : t("Favorilerden çıkarıldı") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function reportAction(input: { targetType: string; targetId: string; reason: string; details?: string }): Promise<ActionResult<{ reportNo: string }>> {
  try {
    const { user } = await assertUser();
    const t = await getT();
    const res = await createReport({ id: user.id }, input);
    return { ok: true, data: { reportNo: res.reportNo }, message: t("Bildirimin alındı ({reportNo}). Ekibimiz inceleyecek.", { reportNo: res.reportNo }) };
  } catch (err) {
    return toActionError(err);
  }
}
