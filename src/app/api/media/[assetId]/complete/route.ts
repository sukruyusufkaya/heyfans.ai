import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, jsonError } from "@/lib/security/http";
import { completeUpload, mediaUrl } from "@/services/media/media";

export async function POST(request: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await assertUser();
    const { assetId } = await ctx.params;
    const asset = await completeUpload(user, assetId);
    return NextResponse.json({ assetId: asset._id.toString(), status: asset.status, kind: asset.kind, url: await mediaUrl(asset) });
  } catch (err) {
    return jsonError(err);
  }
}
