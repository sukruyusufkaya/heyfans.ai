import "server-only";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { rateLimit } from "@/lib/security/rate-limit";
import { oid } from "@/lib/validation/common";
import { CookieConsent } from "@/models/platform";

export const consentInputSchema = z.object({
  preferences: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  action: z.enum(["accept_all", "reject_optional", "custom", "withdraw"]),
});
export type ConsentInput = z.infer<typeof consentInputSchema>;

/** Rıza kaydı (kanıt niteliğinde, değişmez günlük): her karar yeni bir kayıt olarak eklenir. */
export async function recordCookieConsent(input: ConsentInput, ctx: { anonId: string; userId?: string | null; policyVersion: string }) {
  await connectDb();
  await rateLimit("cookie_consent", ctx.anonId, 30, 3600);
  const withdrawn = input.action === "withdraw" || input.action === "reject_optional";
  await CookieConsent.create({
    anonId: ctx.anonId.slice(0, 64),
    userId: ctx.userId ? oid(ctx.userId) : null,
    choices: {
      necessary: true,
      preferences: withdrawn ? false : input.preferences,
      analytics: withdrawn ? false : input.analytics,
      marketing: withdrawn ? false : input.marketing,
    },
    policyVersion: ctx.policyVersion,
    action: input.action,
  });
}
