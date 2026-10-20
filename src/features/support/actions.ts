"use server";
import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { env } from "@/config/env";
import { getSession } from "@/lib/auth/session";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { hashIp } from "@/lib/security/audit";
import { getT } from "@/i18n/server";
import { recordCookieConsent, consentInputSchema, type ConsentInput } from "@/services/support/consent";
import { voteHelpArticle } from "@/services/support/help";
import { submitCopyrightClaim, submitSafetyReport } from "@/services/support/reports";
import { createSupportTicket } from "@/services/support/tickets";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, CONSENT_POLICY_VERSION, decodeConsent, encodeConsent } from "./consent";

export type FormState = ActionResult<{ reference: string; kind?: "ticket" | "report"; reportNo?: string | null }> | null;

async function requestIdentity() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  return { ipKey: hashIp(ip) ?? "anon" };
}

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

/** Bot tuzağı: görünmez "website" alanı doluysa başarılı gibi yanıtla, hiçbir şey kaydetme. */
const isBot = (fd: FormData) => str(fd, "website").trim().length > 0;
const fakeOk = (reference = "DST-0000"): FormState => ({ ok: true, data: { reference, kind: "ticket" } });

/* ─── İletişim formu ───────────────────────────────────────── */
export async function submitContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    if (isBot(formData)) return fakeOk();
    const t = await getT();
    const session = await getSession();
    const { ipKey } = await requestIdentity();
    const res = await createSupportTicket(
      {
        name: str(formData, "name"),
        email: str(formData, "email"),
        category: str(formData, "category"),
        subject: str(formData, "subject"),
        message: str(formData, "message"),
      },
      { userId: session?.user.id ?? null, ipKey },
    );
    return { ok: true, data: { reference: res.ticketNo, kind: "ticket" }, message: t("Talebin alındı.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Güvenlik bildirimi ───────────────────────────────────── */
export async function submitSafetyReportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    if (isBot(formData)) return fakeOk();
    const t = await getT();
    const session = await getSession();
    const { ipKey } = await requestIdentity();
    const res = await submitSafetyReport(
      { reason: str(formData, "reason"), targetUrl: str(formData, "targetUrl"), details: str(formData, "details"), name: str(formData, "name"), email: str(formData, "email") },
      { userId: session?.user.id ?? null, name: session?.user.name ?? null, email: session?.user.email ?? null, ipKey },
    );
    return { ok: true, data: { reference: res.reference, kind: res.kind }, message: t("Bildirimin alındı.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Telif / içerik kaldırma ──────────────────────────────── */
export async function submitCopyrightAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    if (isBot(formData)) return fakeOk();
    const t = await getT();
    const session = await getSession();
    const { ipKey } = await requestIdentity();
    const res = await submitCopyrightClaim(
      {
        name: str(formData, "name"),
        email: str(formData, "email"),
        rightsHolder: str(formData, "rightsHolder"),
        claimType: str(formData, "claimType"),
        url: str(formData, "url"),
        description: str(formData, "description"),
        declaration: formData.get("declaration") === "on",
      },
      { userId: session?.user.id ?? null, ipKey },
    );
    return { ok: true, data: { reference: res.ticketNo, kind: "ticket", reportNo: res.reportNo }, message: t("Başvurun alındı.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Çerez rızası ─────────────────────────────────────────── */
export async function saveCookieConsentAction(input: ConsentInput): Promise<ActionResult<{ preferences: boolean; analytics: boolean; marketing: boolean }>> {
  try {
    const t = await getT();
    const parsed = consentInputSchema.parse(input);
    const jar = await cookies();
    const existing = decodeConsent(jar.get(CONSENT_COOKIE)?.value);
    const anonId = existing?.anonId ?? randomUUID();
    const session = await getSession();
    const none = parsed.action === "withdraw" || parsed.action === "reject_optional";
    const choices = {
      preferences: none ? false : parsed.action === "accept_all" ? true : parsed.preferences,
      analytics: none ? false : parsed.action === "accept_all" ? true : parsed.analytics,
      marketing: none ? false : parsed.action === "accept_all" ? true : parsed.marketing,
    };
    await recordCookieConsent({ ...choices, action: parsed.action }, { anonId, userId: session?.user.id ?? null, policyVersion: CONSENT_POLICY_VERSION });
    jar.set(CONSENT_COOKIE, encodeConsent({ ...choices, version: CONSENT_POLICY_VERSION, anonId, at: Date.now() }), {
      path: "/",
      maxAge: CONSENT_MAX_AGE,
      sameSite: "lax",
      secure: env().NODE_ENV === "production",
      httpOnly: false, // istemci tarafı banner ve yazılımın okuyabilmesi için bilinçli olarak okunabilir
    });
    return { ok: true, data: choices, message: parsed.action === "withdraw" ? t("Rızan geri çekildi; yalnız zorunlu çerezler kullanılacak.") : t("Tercihlerin kaydedildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Yardım makalesi geri bildirimi ───────────────────────── */
export async function voteHelpfulAction(slug: string, helpful: boolean): Promise<ActionResult> {
  try {
    const t = await getT();
    z.string().regex(/^[a-z0-9-]{2,80}$/).parse(slug);
    const { ipKey } = await requestIdentity();
    const ok = await voteHelpArticle(slug, Boolean(helpful), ipKey);
    if (!ok) return { ok: false, error: t("Makale bulunamadı.") };
    return { ok: true, data: undefined, message: t("Geri bildirimin için teşekkürler.") };
  } catch (err) {
    return toActionError(err);
  }
}
