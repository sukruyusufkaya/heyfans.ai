import "server-only";
import type { ClientSession } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { Notification, type INotification } from "@/models/social";

/**
 * `title` / `body` kaynak (Türkçe) ICU kalıbıdır; değişkenler `params` ile verilir ve `data.params` içinde saklanır.
 * Bildirim gösterilirken okuyanın dilinde çevrilir: `t(n.title, n.data?.params)` (ör. "{plan} planına yeni bir abone katıldı.").
 */
export interface NotifyInput {
  type: INotification["type"];
  title: string;
  body?: string;
  params?: Record<string, string | number>;
  link?: string | null;
  actorImage?: string | null;
  data?: Record<string, unknown>;
}

/** Uygulama içi bildirim oluşturur (e-posta/push tercihleri ileride bu noktadan dağıtılır). */
export async function notify(userId: string, input: NotifyInput, session?: ClientSession) {
  await connectDb();
  const { params, ...rest } = input;
  await Notification.create([{ userId: oid(userId), ...rest, data: params ? { ...(input.data ?? {}), params } : (input.data ?? {}) }], { session });
}

export async function listNotifications(userId: string, opts: { filter?: "all" | "unread" | INotification["type"]; page?: number; pageSize?: number } = {}) {
  await connectDb();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const q: Record<string, unknown> = { userId: oid(userId) };
  if (opts.filter === "unread") q.readAt = null;
  else if (opts.filter && opts.filter !== "all") q.type = opts.filter;
  const [items, total, unread] = await Promise.all([
    Notification.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<INotification[]>(),
    Notification.countDocuments(q),
    Notification.countDocuments({ userId: oid(userId), readAt: null }),
  ]);
  return { items, total, unread, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await connectDb();
  const q: Record<string, unknown> = { userId: oid(userId), readAt: null };
  if (ids?.length) q._id = { $in: ids.map((i) => oid(i)) };
  const res = await Notification.updateMany(q, { $set: { readAt: new Date() } });
  return res.modifiedCount;
}

export async function deleteNotification(userId: string, id: string) {
  await connectDb();
  await Notification.deleteOne({ _id: oid(id), userId: oid(userId) });
}
