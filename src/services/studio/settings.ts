import "server-only";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { UserPreferences, type IUserPreferences } from "@/models/identity";

export const notificationPrefsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  messages: z.boolean(),
  promotions: z.boolean(),
});
export type StudioNotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export async function getNotificationPrefs(userId: string): Promise<StudioNotificationPrefs> {
  await connectDb();
  const p = await UserPreferences.findOne({ userId: oid(userId) }, { notifications: 1 }).lean<Pick<IUserPreferences, "notifications">>();
  const n = p?.notifications;
  return { email: n?.email ?? true, push: n?.push ?? false, messages: n?.messages ?? true, promotions: n?.promotions ?? false };
}

export async function saveNotificationPrefs(userId: string, raw: unknown) {
  const prefs = notificationPrefsSchema.parse(raw);
  await connectDb();
  await UserPreferences.updateOne(
    { userId: oid(userId) },
    { $set: Object.fromEntries(Object.entries(prefs).map(([k, v]) => [`notifications.${k}`, v])) },
    { upsert: true },
  );
  return prefs;
}
