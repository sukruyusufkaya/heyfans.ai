import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, jsonError } from "@/lib/security/http";
import { createUpload } from "@/services/media/media";

const schema = z.object({
  purpose: z.enum(["avatar", "cover", "content", "content_preview", "knowledge", "voice_sample", "deliverable", "cms"]),
  mime: z.string().max(100),
  sizeBytes: z.number().int().positive(),
  fileName: z.string().max(255).optional(),
});

/** Yükleme hedefi üretir (s3: imzalı PUT URL; local: uygulama içi PUT). */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await assertUser();
    await rateLimit("upload", user.id, 30, 600);
    const input = schema.parse(await request.json());
    return NextResponse.json(await createUpload(user, input));
  } catch (err) {
    return jsonError(err);
  }
}
