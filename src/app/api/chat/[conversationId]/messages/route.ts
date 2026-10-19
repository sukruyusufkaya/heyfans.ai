import { z } from "zod";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, jsonError } from "@/lib/security/http";
import { idempotencyKeySchema, objectIdSchema } from "@/lib/validation/common";
import { sendChatMessage } from "@/services/conversations/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ text: z.string().min(1).max(4000), idempotencyKey: idempotencyKeySchema });

/** AI ikiziyle mesaj — NDJSON akışı (meta → delta… → done | error). */
export async function POST(request: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await assertUser();
    const { conversationId } = await ctx.params;
    objectIdSchema.parse(conversationId);
    const body = bodySchema.parse(await request.json());
    const stream = await sendChatMessage({ userId: user.id, conversationId, text: body.text, idempotencyKey: body.idempotencyKey });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
    });
  } catch (err) {
    return jsonError(err);
  }
}
