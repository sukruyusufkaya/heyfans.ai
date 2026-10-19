import { expect, test, type Page } from "@playwright/test";
import { DEMO_PASSWORD, expectNoHorizontalScroll, loginViaApi } from "./helpers";

/**
 * Mobil (Pixel 7) duyarlılık: anahtar sayfalar yüklenir, yatay taşma yok, konsolda hata yok.
 * Yalnız "mobile" projesinde çalışır (playwright.config.ts → testMatch).
 */
type Role = "guest" | "fan" | "creator" | "admin";
const EMAIL: Record<Exclude<Role, "guest">, string> = {
  fan: "fan@heyfans.local",
  creator: "sophie@heyfans.local",
  admin: "admin@heyfans.local",
};

const ROUTES: { role: Role; path: string }[] = [
  { role: "guest", path: "/" },
  { role: "guest", path: "/explore" },
  { role: "guest", path: "/creators/sophielane" },
  { role: "guest", path: "/pricing" },
  { role: "guest", path: "/help" },
  { role: "guest", path: "/login" },
  { role: "guest", path: "/register" },
  { role: "fan", path: "/app" },
  { role: "fan", path: "/chat/sophielane" },
  { role: "fan", path: "/app/wallet" },
  { role: "fan", path: "/checkout?type=credit_pack&pack=credits_100" },
  { role: "creator", path: "/studio" },
  { role: "creator", path: "/studio/content" },
  { role: "admin", path: "/admin" },
  { role: "admin", path: "/admin/finance" },
];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()} (${m.location().url})`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

test.beforeAll(() => {
  expect(DEMO_PASSWORD(), "SEED_DEMO_PASSWORD (.env) gerekli").toBeTruthy();
});

for (const { role, path } of ROUTES) {
  test(`mobil: ${role} ${path}`, async ({ page, context, request }) => {
    test.setTimeout(120_000);
    if (role !== "guest") await loginViaApi(request, context, EMAIL[role]);
    const errors = collectErrors(page);

    const res = await page.goto(path, { waitUntil: "load" });
    expect(res?.status(), `HTTP durumu: ${path}`).toBeLessThan(400);
    if (role !== "guest") await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("main, [role=main], body").first()).toBeVisible();
    // Geç yüklenen bileşenler/akış için kısa yerleşme süresi
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(400);

    const ok = await expectNoHorizontalScroll(page);
    if (!ok) {
      const info = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(ok, `yatay taşma (${path}): scrollWidth=${info.scrollWidth} > clientWidth=${info.clientWidth}`).toBe(true);
    }
    expect(errors, `konsol/sayfa hataları (${path})`).toEqual([]);
  });
}
