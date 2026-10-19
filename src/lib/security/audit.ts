import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { ClientSession } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { AuditLog } from "@/models/safety";

export interface AuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string; // ör. "creator.approve", "refund.approve", "conversation.sensitive_read"
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  severity?: "info" | "notice" | "critical";
  metadata?: Record<string, unknown>;
}

export function hashIp(ip: string | null | undefined) {
  if (!ip) return null;
  return createHash("sha256").update(`hf-ip:${ip}`).digest("hex").slice(0, 32);
}

async function requestMeta() {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    return { ipHash: hashIp(ip), userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
  } catch {
    return { ipHash: null, userAgent: null }; // istek dışı (betik/iş) bağlam
  }
}

/** Kritik işlemler için değişmez denetim kaydı yazar. */
export async function audit(input: AuditInput, session?: ClientSession) {
  await connectDb();
  const meta = await requestMeta();
  await AuditLog.create(
    [
      {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        reason: input.reason ?? null,
        severity: input.severity ?? "info",
        metadata: input.metadata ?? {},
        ...meta,
      },
    ],
    { session },
  );
}
