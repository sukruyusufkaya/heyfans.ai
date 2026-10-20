"use server";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/mongo";
import { User } from "@/models/identity";
import { isLocale, LOCALE_COOKIE, type Locale } from "./config";

/** Kullanıcının dil seçimi: çereze (tüm ziyaretler) ve oturum varsa hesaba (e-posta/bildirim dili, diğer cihazlar) yazılır. */
export async function setLocaleAction(locale: string): Promise<{ ok: boolean; locale?: Locale }> {
  if (!isLocale(locale)) return { ok: false };
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: env().APP_URL.startsWith("https://") });
  const session = await getSession().catch(() => null);
  if (session) {
    await connectDb();
    await User.updateOne({ _id: session.user.id }, { $set: { locale } });
  }
  return { ok: true, locale };
}
