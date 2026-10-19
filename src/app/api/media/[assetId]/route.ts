import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { jsonError } from "@/lib/security/http";
import { authorizeMediaRead } from "@/services/media/media";

/** Medya okuma: erişim denetimi → s3'te kısa ömürlü imzalı URL'ye yönlendirme, yerelde akıtma. */
export async function GET(_request: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await ctx.params;
    const session = await getSession();
    const viewer = session ? { id: session.user.id, roles: session.user.roles, isAdmin: session.user.roles.includes("admin") } : null;
    const asset = await authorizeMediaRead(viewer, assetId);
    const storage = getStorage();
    const signed = await storage.signedReadUrl(asset.storageKey, 300);
    if (signed) return NextResponse.redirect(signed, { headers: { "Cache-Control": "private, no-store" } });
    const body = await storage.read(asset.storageKey);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": asset.mime,
        "Content-Length": String(body.length),
        "Cache-Control": asset.visibility === "public" ? "public, max-age=3600" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
