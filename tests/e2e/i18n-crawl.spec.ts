import { expect, test, type Page } from "@playwright/test";
import { DEMO_PASSWORD, loginViaApi } from "./helpers";

/**
 * Çok dillilik taraması: her rol, alanındaki sayfaları Türkçe dışı bir dilde dolaşır.
 * İstemci bileşeninin çeviremediği (istemci kataloğunda olmayan) metin ve 5xx yanıt kalmamalı.
 * Geliştirme kipinde çalışır (eksik metin uyarısı yalnız orada basılır).
 */
const LOCALE = process.env.I18N_CRAWL_LOCALE ?? "en";

const ROUTES = {
  visitor: [
    "/", "/explore", "/trending", "/categories", "/categories/yasam-tarzi", "/creators/meliserturk", "/how-it-works", "/for-creators",
    "/pricing", "/about", "/help", "/help/ai-ikizi-nedir", "/contact", "/trust-and-safety", "/privacy", "/terms", "/creator-agreement",
    "/community-guidelines", "/copyright", "/cookies", "/login", "/register", "/forgot-password", "/reset-password", "/verify",
  ],
  fan: [
    "/app", "/app/experiences", "/app/favorites", "/app/following", "/app/gifts", "/app/notifications", "/app/personalization",
    "/app/profile", "/app/settings", "/app/subscriptions", "/app/wallet", "/chat", "/chat/meliserturk", "/creators/meliserturk/content",
    "/creators/meliserturk/membership", "/experiences/voice/meliserturk", "/experiences/video/meliserturk", "/onboarding/creator",
  ],
  creator: [
    "/studio", "/studio/ai-twin", "/studio/analytics", "/studio/boundaries", "/studio/content", "/studio/content/new", "/studio/conversations",
    "/studio/earnings", "/studio/fans", "/studio/knowledge", "/studio/memberships", "/studio/payouts", "/studio/personality", "/studio/profile",
    "/studio/requests", "/studio/settings", "/studio/test", "/studio/voice",
  ],
  admin: [
    "/admin", "/admin/ai-operations", "/admin/ai-twins", "/admin/analytics", "/admin/content", "/admin/creators", "/admin/finance",
    "/admin/moderation", "/admin/reports", "/admin/settings", "/admin/users",
  ],
} as const;

const ACCOUNTS: Record<Exclude<keyof typeof ROUTES, "visitor">, string> = {
  fan: "fan@heyfans.local",
  creator: "melis@heyfans.local",
  admin: "admin@heyfans.local",
};

async function crawl(page: Page, routes: readonly string[]) {
  const missing = new Map<string, string>();
  const errors: string[] = [];
  let current = "";
  page.on("console", (msg) => {
    const text = msg.text();
    const m = text.match(/\[i18n\] istemci kataloğunda yok.*\): (".+")$/);
    if (m && !missing.has(m[1]!)) missing.set(m[1]!, current);
  });
  await page.goto(`/?lang=${LOCALE}`);
  for (const path of routes) {
    current = path;
    const res = await page.goto(path, { waitUntil: "load" });
    if ((res?.status() ?? 0) >= 500) errors.push(`${path} → ${res?.status()}`);
    await expect(page.locator("html")).toHaveAttribute("lang", LOCALE);
  }
  const report = [...missing].map(([s, p]) => `${p}: ${s}`);
  expect(errors, errors.join("\n")).toEqual([]);
  expect(report, report.join("\n")).toEqual([]);
}

test.describe(`çok dillilik taraması (${LOCALE})`, () => {
  test.describe.configure({ timeout: 900_000 });

  test("ziyaretçi sayfaları", async ({ page }) => {
    await crawl(page, ROUTES.visitor);
  });

  for (const role of ["fan", "creator", "admin"] as const) {
    test(`${role} sayfaları`, async ({ page, context, request }) => {
      await loginViaApi(request, context, ACCOUNTS[role], DEMO_PASSWORD());
      await crawl(page, ROUTES[role]);
    });
  }
});
