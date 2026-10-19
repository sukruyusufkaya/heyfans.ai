"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { toActionError, type ActionResult } from "@/lib/errors";
import { addKnowledgeSource, deleteKnowledgeSource, reindexKnowledgeSource, setKnowledgeApproved } from "@/services/ai-twins/knowledge";
import { processJobs } from "@/services/jobs/jobs";
import { creatorUserId } from "./server-helpers";

const idSchema = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, "Geçersiz kimlik") });

/** Kaynak ekler ve yerel geliştirmede hemen indekslenmesi için kuyruğu yanıttan sonra çalıştırır. */
export async function addKnowledgeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await creatorUserId();
    const src = await addKnowledgeSource(userId, input);
    after(async () => {
      try {
        await processJobs(3);
      } catch (e) {
        console.error("[knowledge:process]", e);
      }
    });
    revalidatePath("/studio/knowledge");
    return { ok: true, data: { id: src._id.toString() }, message: "Kaynak eklendi; indeksleme başladı." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setKnowledgeApprovedAction(input: unknown): Promise<ActionResult> {
  try {
    const userId = await creatorUserId();
    const { id, approved } = idSchema.extend({ approved: z.boolean() }).parse(input);
    await setKnowledgeApproved(userId, id, approved);
    revalidatePath("/studio/knowledge");
    return { ok: true, data: undefined, message: approved ? "Kaynak yanıtlarda kullanılacak." : "Kaynak yanıtlardan çıkarıldı." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function reindexKnowledgeAction(input: unknown): Promise<ActionResult> {
  try {
    const userId = await creatorUserId();
    const { id } = idSchema.parse(input);
    await reindexKnowledgeSource(userId, id);
    after(async () => {
      try {
        await processJobs(3);
      } catch (e) {
        console.error("[knowledge:process]", e);
      }
    });
    revalidatePath("/studio/knowledge");
    return { ok: true, data: undefined, message: "Yeniden indeksleme başladı." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteKnowledgeAction(input: unknown): Promise<ActionResult> {
  try {
    const userId = await creatorUserId();
    const { id } = idSchema.parse(input);
    await deleteKnowledgeSource(userId, id);
    revalidatePath("/studio/knowledge");
    return { ok: true, data: undefined, message: "Kaynak ve parçaları silindi." };
  } catch (err) {
    return toActionError(err);
  }
}
