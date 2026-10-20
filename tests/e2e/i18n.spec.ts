import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DEMO_PASSWORD, loginViaApi } from "./helpers";

/** Çok dillilik: dil seçimi (parametre, çerez, seçici, tarayıcı, konum), yön ve istemci kataloğu bütünlüğü. */
const LOCALES = ["tr", "en", "ar", "es", "fr", "pt", "de"] as const;

function catalog(locale: string): Record<string, string> {
  if (locale === "tr") return {};
  const dir = path.join("src", "i18n", "messages", locale);
  return Object.assign({}, ...readdirSync(dir).map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8"))));
}
const tr = (locale: string, s: string) => catalog(locale)[s] || s;

/** Sayfa yüklenirken istemci "çeviri eksik" uyarısı vermemeli (geliştirme kipinde basılır). */
function collectMissing(page: Page) {
  const missing: string[] = [];
  page.on("console", (msg) => {
    if (msg.text().includes("[i18n]")) missing.push(msg.text());
  });
  return missing;
}

test.describe("çok dillilik", () => {
  for (const locale of LOCALES) {
    test(`?lang=${locale}: dil, yön ve başlık metinleri`, async ({ page }) => {
      const missing = collectMissing(page);
      await page.goto(`/?lang=${locale}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("link", { name: tr(locale, "Giriş Yap"), exact: true }).first()).toBeVisible();
      await page.goto("/login");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await page.goto("/pricing");
      await page.goto("/help");
      expect(missing, missing.join("\n")).toEqual([]);
    });
  }

  test("seçim çereze yazılır, sonraki sayfalarda korunur; dil seçici değiştirir", async ({ page, context }) => {
    await page.goto("/?lang=de");
    await page.goto("/explore");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    expect((await context.cookies()).find((c) => c.name === "hf_locale")?.value).toBe("de");

    await page.getByRole("button", { name: /Deutsch/ }).first().click();
    await page.getByRole("menuitem", { name: /Français/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    expect((await context.cookies()).find((c) => c.name === "hf_locale")?.value).toBe("fr");
  });

  test("ilk ziyarette tarayıcı diline göre seçilir", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "es-ES" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await ctx.close();
  });

  test("konum (IP ülkesi) tarayıcı dilinin önüne geçer", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "en-US", extraHTTPHeaders: { "x-vercel-ip-country": "BR" } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt");
    await ctx.close();
  });

  test("Arapça sayfa sağdan sola akar", async ({ page }) => {
    await page.goto("/explore?lang=ar");
    expect(await page.evaluate(() => getComputedStyle(document.body).direction)).toBe("rtl");
  });

  test("oturum açmış hayran: hesap dili ve uygulama sayfaları eksiksiz", async ({ page, context, request }) => {
    const missing = collectMissing(page);
    await loginViaApi(request, context, "fan@heyfans.local", DEMO_PASSWORD());
    for (const p of ["/app?lang=en", "/app/settings", "/app/wallet", "/app/notifications", "/explore"]) {
      await page.goto(p);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    }
    await page.goto("/app?lang=tr");
    expect(missing, missing.join("\n")).toEqual([]);
  });
});
