import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, jsonError } from "@/lib/security/http";
import { parseJson } from "@/services/fan/http";
import { usernameSchema } from "@/lib/validation/common";
import { startCall } from "@/services/calls/calls";
import { ensureWallet } from "@/services/wallet/wallet";

export const dynamic = "force-dynamic";

const schema = z.object({ username: usernameSchema, kind: z.enum(["voice", "video"]) });

/** Görüşme başlatır: kullanılabilirlik + bakiye denetimi, ilk dakika peşin tahsilat, LiveKit belirteci. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await assertUser();
    await rateLimit("call_start", user.id, 10, 600);
    const input = await parseJson(request, schema);
    const res = await startCall({ id: user.id, name: user.name }, input.username, input.kind);
    const wallet = await ensureWallet(user.id);
    return NextResponse.json({ ...res, balance: wallet.balance }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return jsonError(err);
  }
}
