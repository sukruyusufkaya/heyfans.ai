import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { assertUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, jsonError } from "@/lib/security/http";
import { receiveLocalUpload } from "@/services/media/media";

export const maxDuration = 60;

/** Yalnız STORAGE_PROVIDER=local: geliştirme ortamında dosyayı alır. */
export async function PUT(request: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    if (env().STORAGE_PROVIDER !== "local") throw new AppError("Bu uç yalnız yerel depolamada kullanılır.", "not_local", 404);
    assertSameOrigin(request);
    const { user } = await assertUser();
    const { assetId } = await ctx.params;
    const buf = Buffer.from(await request.arrayBuffer());
    await receiveLocalUpload(user, assetId, buf);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
