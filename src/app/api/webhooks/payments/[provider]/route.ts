import { NextResponse } from "next/server";
import { processPaymentWebhook } from "@/services/billing/checkout";

export const dynamic = "force-dynamic";

/** Ödeme sağlayıcısı webhook'u. Ham gövde imza doğrulaması için olduğu gibi okunur. */
export async function POST(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const raw = await request.text();
  try {
    const result = await processPaymentWebhook(provider, request.headers, raw);
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (err) {
    console.error("[webhook:payments]", provider, (err as Error).message);
    const msg = (err as Error).message ?? "";
    const isSig = /İmza|imza/.test(msg);
    return NextResponse.json({ received: false, error: isSig ? "invalid_signature" : "processing_error" }, { status: isSig ? 400 : 500 });
  }
}
