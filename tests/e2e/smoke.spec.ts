import { expect, test } from "@playwright/test";

/** Duman testi: kritik genel sayfalar açılır, korumalı alanlar girişe yönlendirir. (Canlı ortamda da çalışır.) */
const PUBLIC = [
  ["/", "Öne Çıkan İçerik Üreticileri"],
  ["/explore", "Keşfet"],
  ["/trending", "Trend"],
  ["/categories", "Kategori"],
  ["/how-it-works", "Nasıl Çalışır"],
  ["/for-creators", "İçerik Üretici"],
  ["/pricing", "Ücretsiz"],
  ["/about", "HEYFANS"],
  ["/help", "Yardım"],
  ["/contact", "Bize"],
  ["/trust-and-safety", "Güven"],
  ["/privacy", "Gizlilik"],
  ["/terms", "Kullanım"],
  ["/creator-agreement", "Creator"],
  ["/community-guidelines", "Topluluk"],
  ["/copyright", "Telif"],
  ["/cookies", "Çerez"],
  ["/login", "Giriş"],
  ["/register", "Hesab"],
  ["/forgot-password", "Şifre"],
] as const;

for (const [path, text] of PUBLIC) {
  test(`genel sayfa açılır: ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("main")).toContainText(text);
  });
}

for (const path of ["/app", "/chat", "/studio", "/admin", "/app/wallet", "/checkout"]) {
  test(`korumalı alan girişe yönlendirir: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  });
}

test("gizli admin yolu yalnız yönlendirmedir", async ({ page }) => {
  await page.goto("/alfitechadminpanel");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});

test("bilinmeyen creator 404", async ({ page }) => {
  const res = await page.goto("/creators/boyle-biri-yok-123");
  expect(res?.status()).toBe(404);
});
