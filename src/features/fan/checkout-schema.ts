import { z } from "zod";
import { m } from "@/i18n/m";
import { idempotencyKeySchema, objectIdSchema } from "@/lib/validation/common";

/** /checkout?type=… adres parametreleri (sunucuda doğrulanır; fiyat asla istemciden alınmaz). */
export const checkoutParamsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("credit_pack"), pack: z.string().regex(/^[A-Za-z0-9_-]{2,40}$/) }),
  z.object({ type: z.literal("plan"), planId: objectIdSchema, interval: z.enum(["month", "year"]).default("month") }),
  z.object({ type: z.literal("content"), id: objectIdSchema }),
]);
export type CheckoutParams = z.infer<typeof checkoutParamsSchema>;

export type CheckoutItemInput =
  | { type: "credit_pack"; packKey: string }
  | { type: "plan"; planId: string; interval: "month" | "year" }
  | { type: "content"; contentId: string };

export function toCheckoutItem(p: CheckoutParams): CheckoutItemInput {
  if (p.type === "credit_pack") return { type: "credit_pack", packKey: p.pack };
  if (p.type === "plan") return { type: "plan", planId: p.planId, interval: p.interval };
  return { type: "content", contentId: p.id };
}

export function checkoutHref(p: CheckoutParams) {
  if (p.type === "credit_pack") return `/checkout?type=credit_pack&pack=${encodeURIComponent(p.pack)}`;
  if (p.type === "plan") return `/checkout?type=plan&planId=${p.planId}&interval=${p.interval}`;
  return `/checkout?type=content&id=${p.id}`;
}

/** Sunucu eylemi girdisi: ürün + istemci anahtarı + zorunlu onaylar. */
export const startCheckoutInputSchema = z
  .object({
    clientKey: idempotencyKeySchema,
    acceptTerms: z.literal(true, { error: m("Kullanım şartlarını kabul etmelisin.") }),
    acceptPreInfo: z.literal(true, { error: m("Ön bilgilendirme formunu onaylamalısın.") }),
  })
  .and(checkoutParamsSchema);
