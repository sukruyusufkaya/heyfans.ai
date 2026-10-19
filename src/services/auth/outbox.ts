import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { escapeRegex } from "@/lib/validation/common";
import { DevOutbox } from "@/models/platform";

export interface OutboxItem {
  id: string;
  to: string;
  subject: string;
  kind: string;
  createdAt: string;
  links: string[];
  text: string;
}

const URL_RE = /https?:\/\/[^\s<>"')]+/g;

/** Yalnız geliştirme/demo: en son e-postaları ve içindeki bağlantıları listeler. */
export async function listOutbox(opts: { to?: string; limit?: number } = {}): Promise<OutboxItem[]> {
  await connectDb();
  const filter = opts.to ? { to: new RegExp(`^${escapeRegex(opts.to)}`, "i") } : {};
  const rows = await DevOutbox.find(filter).sort({ createdAt: -1 }).limit(Math.min(opts.limit ?? 30, 100)).lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    to: r.to,
    subject: r.subject,
    kind: r.kind,
    createdAt: r.createdAt.toISOString(),
    links: [...new Set((r.text.match(URL_RE) ?? []).map((u) => u.replace(/[.,;]+$/, "")))],
    text: r.text,
  }));
}
