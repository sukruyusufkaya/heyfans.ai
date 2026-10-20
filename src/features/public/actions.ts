"use server";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { hashIp } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { NewsletterSubscription } from "@/models/platform";

const schema = z.object({ email: z.string().trim().toLowerCase().email(m("Geçerli bir e-posta adresi girin")).max(200) });

export async function subscribeNewsletter(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const t = await getT();
    const { email } = schema.parse({ email: formData.get("email") });
    const h = await headers();
    await rateLimit("newsletter", hashIp(h.get("x-forwarded-for")?.split(",")[0]) ?? "anon", 5, 3600);
    await connectDb();
    await NewsletterSubscription.updateOne(
      { email },
      { $set: { status: "subscribed" }, $setOnInsert: { email, source: "footer", unsubscribeToken: randomBytes(18).toString("base64url") } },
      { upsert: true },
    );
    return { ok: true, data: undefined, message: t("Teşekkürler! Bültene kaydoldun.") };
  } catch (err) {
    return toActionError(err);
  }
}
