import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { oid } from "@/lib/validation/common";
import { SupportTicket, type ISupportTicket } from "@/models/platform";

export const TICKET_CATEGORIES = ["account", "payments", "ai_twin", "creator", "safety", "technical", "legal", "other"] as const;

export const TICKET_CATEGORY_LABELS: Record<(typeof TICKET_CATEGORIES)[number], string> = {
  account: "Hesap ve üyelik",
  payments: "Ödemeler ve krediler",
  ai_twin: "AI ikizi",
  creator: "İçerik üreticisi başvurusu",
  safety: "Güvenlik ve gizlilik",
  technical: "Teknik sorun",
  legal: "Hukuki / telif",
  other: "Diğer",
};

export const ticketSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı").max(120, "Ad soyad en fazla 120 karakter olabilir"),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta adresi girin").max(200),
  category: z.enum(TICKET_CATEGORIES, { error: "Lütfen bir konu seçin" }),
  subject: z.string().trim().min(3, "Konu en az 3 karakter olmalı").max(200, "Konu en fazla 200 karakter olabilir"),
  message: z.string().trim().min(10, "Mesaj en az 10 karakter olmalı").max(5000, "Mesaj en fazla 5000 karakter olabilir"),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});
export type TicketInput = z.input<typeof ticketSchema>;

function newTicketNo() {
  return `DST-${Date.now().toString(36).toUpperCase().slice(-4)}${randomInt(1000, 9999)}`;
}

/**
 * Destek talebi oluşturur (giriş yapılmış ya da misafir). Hız sınırı: IP başına ve e-posta başına saatte 5.
 * Dönüş: kullanıcıya gösterilecek talep numarası.
 */
export async function createSupportTicket(raw: unknown, actor: { userId?: string | null; ipKey?: string | null } = {}) {
  const input = ticketSchema.parse(raw);
  await connectDb();
  await rateLimit("support_ticket_ip", actor.ipKey ?? "anon", 8, 3600);
  await rateLimit("support_ticket_email", input.email, 5, 3600);

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const doc = await SupportTicket.create({
        ticketNo: newTicketNo(),
        userId: actor.userId ? oid(actor.userId) : null,
        name: input.name,
        email: input.email,
        category: input.category,
        subject: input.subject,
        message: input.message,
        priority: input.priority ?? "normal",
        status: "open",
      } satisfies Partial<ISupportTicket>);
      return { ticketNo: doc.ticketNo };
    } catch (err) {
      lastErr = err;
      if ((err as { code?: number })?.code !== 11000) throw err; // yalnız numara çakışmasında yeniden dene
    }
  }
  console.error("[support:ticket] numara üretilemedi", lastErr);
  throw new AppError("Talebin kaydedilemedi. Lütfen biraz sonra tekrar dene.", "ticket_failed", 500);
}
