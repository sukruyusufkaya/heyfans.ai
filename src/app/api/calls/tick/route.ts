import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, jsonError } from "@/lib/security/http";
import { parseJson } from "@/services/fan/http";
import { objectIdSchema } from "@/lib/validation/common";
import { tickCall } from "@/services/calls/calls";
import { ensureWallet } from "@/services/wallet/wallet";

export const dynamic = "force-dynamic";

const schema = z.object({ sessionId: objectIdSchema });

/** Dakika faturalaması: istemci her 60 sn çağırır. Yetersiz kredide görüşme sunucuda sonlandırılır (402). */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await assertUser();
    const { sessionId } = await parseJson(request, schema);
    const res = await tickCall(user.id, sessionId);
    const wallet = await ensureWallet(user.id);
    return NextResponse.json({ ...res, balance: wallet.balance }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return jsonError(err);
  }
}
