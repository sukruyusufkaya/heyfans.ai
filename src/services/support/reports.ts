import "server-only";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { connectDb } from "@/lib/db/mongo";
import { AppError } from "@/lib/errors";
import { ContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { REPORT_REASONS } from "@/models/safety";
import { createReport } from "@/services/moderation/moderation";
import { createSupportTicket, ticketSchema } from "./tickets";

export type ResolvedTarget = { targetType: "profile" | "content"; targetId: string; label: string };

const OWN_HOSTS = new Set<string>(["heyfans.ai", "www.heyfans.ai", "localhost", "127.0.0.1"]);
try {
  OWN_HOSTS.add(new URL(siteConfig.url).hostname);
} catch {
  /* geçersiz APP_URL: varsayılan sunucular yeterli */
}

/** Kullanıcının yapıştırdığı bağlantı bizim sitemize ait bir profil/içerik mi? Değilse null (talep yine de kaydedilir). */
export async function resolveTargetFromUrl(input: string | null | undefined): Promise<ResolvedTarget | null> {
  const value = (input ?? "").trim();
  if (!value || value.length > 500) return null;
  let path: string;
  if (value.startsWith("/")) {
    path = value.split(/[?#]/)[0] ?? "";
  } else {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    } catch {
      return null;
    }
    if (!OWN_HOSTS.has(url.hostname.toLowerCase())) return null;
    path = url.pathname;
  }
  await connectDb();
  const profile = /^\/creators\/([a-z0-9_.]{3,30})(?:\/|$)/i.exec(path);
  if (profile) {
    const c = await CreatorProfile.findOne({ username: profile[1]!.toLowerCase() }, { _id: 1, displayName: 1 }).lean();
    if (c) return { targetType: "profile", targetId: c._id.toString(), label: c.displayName };
  }
  const content = /^\/content\/([a-f0-9]{24})(?:\/|$)/i.exec(path);
  if (content) {
    const item = await ContentItem.findById(content[1], { _id: 1, title: 1 }).lean();
    if (item) return { targetType: "content", targetId: item._id.toString(), label: item.title };
  }
  return null;
}

/* ─── Güvenlik bildirimi ───────────────────────────────────── */
export const SAFETY_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  impersonation: "Kimliğe bürünme / izinsiz benzerlik",
  harassment: "Taciz veya tehdit",
  sexual_content: "Uygunsuz / cinsel içerik",
  minor_safety: "Reşit olmayanların güvenliği",
  hate: "Nefret söylemi",
  self_harm: "Kendine zarar / acil tehlike",
  spam: "Spam veya dolandırıcılık",
  copyright: "Telif hakkı",
  privacy: "Gizlilik ihlali",
  ai_misbehavior: "AI ikizinin uygunsuz davranışı",
  other: "Diğer",
};

export const safetyReportSchema = z.object({
  reason: z.enum(REPORT_REASONS, { error: "Lütfen bir bildirim türü seçin" }),
  targetUrl: z.string().trim().max(500, "Bağlantı en fazla 500 karakter olabilir").optional().default(""),
  details: z.string().trim().min(10, "Açıklama en az 10 karakter olmalı").max(3000, "Açıklama en fazla 3000 karakter olabilir"),
  name: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().toLowerCase().max(200).optional().default(""),
});

/**
 * Güvenlik bildirimi: giriş yapmış kullanıcı + çözümlenebilir hedef → doğrudan rapor/moderasyon vakası.
 * Misafir ya da hedef bulunamazsa → "safety" kategorisinde destek talebi (kritik türlerde acil öncelik).
 */
export async function submitSafetyReport(raw: unknown, actor: { userId?: string | null; name?: string | null; email?: string | null; ipKey?: string | null }) {
  const input = safetyReportSchema.parse(raw);
  const email = (actor.email || input.email).trim().toLowerCase();
  if (!actor.userId && !z.string().email().safeParse(email).success) {
    throw new AppError("Size ulaşabilmemiz için geçerli bir e-posta adresi girin.", "email_required");
  }
  const target = await resolveTargetFromUrl(input.targetUrl);
  const critical = input.reason === "minor_safety" || input.reason === "self_harm";

  if (actor.userId && target) {
    const res = await createReport({ id: actor.userId }, { targetType: target.targetType, targetId: target.targetId, reason: input.reason, details: input.details });
    return { kind: "report" as const, reference: res.reportNo };
  }
  const subject = `Güvenlik bildirimi: ${SAFETY_REASON_LABELS[input.reason]}`;
  const message = [
    `Bildirim türü: ${SAFETY_REASON_LABELS[input.reason]}`,
    input.targetUrl ? `İlgili bağlantı / hesap: ${input.targetUrl}${target ? ` (çözümlendi: ${target.targetType} · ${target.label})` : ""}` : "İlgili bağlantı: belirtilmedi",
    "",
    input.details,
  ].join("\n");
  const ticket = ticketSchema.parse({
    name: actor.name || input.name || "Misafir",
    email,
    category: "safety",
    subject,
    message,
    priority: critical ? "urgent" : "high",
  });
  const res = await createSupportTicket(ticket, { userId: actor.userId, ipKey: actor.ipKey });
  return { kind: "ticket" as const, reference: res.ticketNo };
}

/* ─── Telif / içerik kaldırma ──────────────────────────────── */
export const COPYRIGHT_CLAIM_TYPES = {
  copyright: "Telif hakkı ihlali",
  unauthorized_image: "İzinsiz görsel kullanımı",
  voice_likeness: "Ses benzerliği",
  impersonation: "Kimliğe bürünme",
} as const;

export const copyrightSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı").max(120),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta adresi girin").max(200),
  rightsHolder: z.string().trim().min(2, "Hak sahibini belirtin").max(160),
  claimType: z.enum(Object.keys(COPYRIGHT_CLAIM_TYPES) as [keyof typeof COPYRIGHT_CLAIM_TYPES, ...(keyof typeof COPYRIGHT_CLAIM_TYPES)[]], { error: "İhlal türünü seçin" }),
  url: z.string().trim().min(3, "İhlal edilen içerik bağlantısını girin").max(500),
  description: z.string().trim().min(20, "Açıklama en az 20 karakter olmalı").max(4000),
  declaration: z.literal(true, { error: "Beyanı onaylamanız gerekir" }),
});

/** Telif talebi: yüksek öncelikli "legal" talebi + bağlantı bizim profil/içeriğimize çözülürse moderasyon raporu. */
export async function submitCopyrightClaim(raw: unknown, actor: { userId?: string | null; ipKey?: string | null }) {
  const input = copyrightSchema.parse(raw);
  const target = await resolveTargetFromUrl(input.url);
  const message = [
    `Hak sahibi: ${input.rightsHolder}`,
    `İhlal türü: ${COPYRIGHT_CLAIM_TYPES[input.claimType]}`,
    `İhlal edilen içerik: ${input.url}${target ? ` (çözümlendi: ${target.targetType} · ${target.label})` : " (sitemizde eşleşen kayıt bulunamadı)"}`,
    "",
    input.description,
    "",
    "Beyan: Başvuru sahibi, bilgilerin doğru olduğunu ve hak sahibi ya da yetkili temsilcisi olduğunu beyan etmiştir.",
  ].join("\n");
  const ticket = await createSupportTicket(
    { name: input.name, email: input.email, category: "legal", subject: `Telif / içerik kaldırma: ${COPYRIGHT_CLAIM_TYPES[input.claimType]}`, message, priority: "high" },
    { userId: actor.userId, ipKey: actor.ipKey },
  );
  let reportNo: string | null = null;
  if (target) {
    try {
      const reporter = actor.userId ? { id: actor.userId } : { email: input.email };
      const res = await createReport(reporter, { targetType: target.targetType, targetId: target.targetId, reason: input.claimType === "impersonation" ? "impersonation" : "copyright", details: `Telif talebi ${ticket.ticketNo}: ${input.description}`.slice(0, 3000) });
      reportNo = res.reportNo;
    } catch (err) {
      console.error("[support:copyright] rapor oluşturulamadı", err); // talep kaydı korunur
    }
  }
  return { ticketNo: ticket.ticketNo, reportNo };
}
