import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, jsonError } from "@/lib/security/http";
import { parseJson } from "@/services/fan/http";
import { objectIdSchema } from "@/lib/validation/common";
import { endCall } from "@/services/calls/calls";
import { ensureWallet } from "@/services/wallet/wallet";

export const dynamic = "force-dynamic";

const schema = z.object({ sessionId: objectIdSchema });

/** Görüşmeyi bitirir (idempotent: zaten bitmişse de 200 döner). */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await assertUser();
    const { sessionId } = await parseJson(request, schema);
    const ended = await endCall(user.id, sessionId);
    const wallet = await ensureWallet(user.id);
    return NextResponse.json(
      { ended: Boolean(ended), minutesBilled: ended?.minutesBilled ?? null, creditsSpent: ended?.creditsSpent ?? null, balance: wallet.balance },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return jsonError(err);
  }
}
