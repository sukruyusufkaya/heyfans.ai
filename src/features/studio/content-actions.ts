"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { m } from "@/i18n/m";
import { getT } from "@/i18n/server";
import { toActionError, type ActionResult } from "@/lib/errors";
import { CONTENT_STATUSES } from "@/models/content";
import { createContent, setContentStatus, updateContent } from "@/services/content/manage";
import { creatorUserId } from "./server-helpers";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i, m("Geçersiz kimlik"));

/** Oluştur / düzenle. `intent`: "draft" taslak olarak kaydeder, "publish" yayına alır (onaysız creator'da incelemeye düşer). */
export async function saveContentAction(input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { id, intent, content } = z.object({ id: idSchema.optional(), intent: z.enum(["draft", "publish"]), content: z.unknown() }).parse(input);
    let doc;
    if (id) {
      doc = await updateContent(userId, id, content);
      if (intent === "publish" && doc.status !== "published" && doc.status !== "in_review") doc = await setContentStatus(userId, id, "published"); // i18n-ignore (durum kimliği)
    } else {
      doc = await createContent(userId, content, intent);
    }
    revalidatePath("/studio/content");
    revalidatePath("/studio");
    const message = doc.status === "published" ? t("İçerik yayınlandı.") : doc.status === "in_review" ? t("İçerik inceleme kuyruğuna alındı.") : t("Taslak kaydedildi.");
    return { ok: true, data: { id: doc._id.toString(), status: doc.status }, message };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setContentStatusAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { id, to } = z.object({ id: idSchema, to: z.enum(CONTENT_STATUSES) }).parse(input);
    const doc = await setContentStatus(userId, id, to);
    revalidatePath("/studio/content");
    revalidatePath("/studio");
    const msg = { published: m("İçerik yayınlandı."), hidden: m("İçerik gizlendi."), draft: m("İçerik taslağa alındı."), removed: m("İçerik kaldırıldı."), in_review: m("İçerik incelemeye alındı.") } as const;
    return { ok: true, data: { status: doc.status }, message: t(msg[doc.status as keyof typeof msg]) };
  } catch (err) {
    return toActionError(err);
  }
}
