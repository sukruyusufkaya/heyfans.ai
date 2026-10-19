import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";

/** .env'den değer okur (E2E yalnız yerel/demo ortamda çalışır). */
export function envValue(key: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const line = readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).replace(/^"|"$/g, "") : "";
  } catch {
    return "";
  }
}

export const DEMO_PASSWORD = () => envValue("SEED_DEMO_PASSWORD");
export const BASE = process.env.BASE_URL ?? "http://localhost:3070";

let client: MongoClient | null = null;
export async function db() {
  client ??= new MongoClient(envValue("MONGODB_URI"));
  await client.connect();
  return client.db(envValue("MONGODB_DB_NAME") || "heyfans");
}
export async function closeDb() {
  await client?.close();
  client = null;
}

/** API ile giriş (UI giriş akışı ayrı testte); oturum çerezini bağlama ekler. */
export async function loginViaApi(request: APIRequestContext, context: BrowserContext, email: string, password = DEMO_PASSWORD()) {
  const res = await request.post(`${BASE}/api/auth/sign-in/email`, { data: { email, password }, headers: { Origin: BASE } });
  if (!res.ok()) throw new Error(`Giriş başarısız (${res.status()}): ${await res.text()}`);
  const cookies = (await request.storageState()).cookies;
  await context.addCookies(cookies);
}

/** Dev outbox'tan son e-postadaki ilk bağlantı. */
export async function latestEmailLink(to: string, kind: string) {
  const d = await db();
  for (let i = 0; i < 20; i++) {
    const mail = await d.collection("devOutbox").find({ to, kind }).sort({ createdAt: -1 }).limit(1).next();
    const link = mail?.text?.match(/https?:\/\/\S+/)?.[0];
    if (link) return link;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`E-posta bulunamadı: ${to} (${kind})`);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return overflow <= 1;
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
