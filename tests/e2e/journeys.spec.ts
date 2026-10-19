import { expect, test, type BrowserContext, type Cookie, type Page } from "@playwright/test";
import { ObjectId } from "mongodb";
import { BASE, closeDb, db, latestEmailLink, loginViaApi, uid } from "./helpers";

/**
 * Uçtan uca yolculuk (20 adım): hayran kaydı → doğrulama → giriş → yaş + karşılama → keşif/takip/favori → AI sohbeti →
 * abonelik (TEST ödeme) → premium içerik; creator kaydı → başvuru → admin onayı → ikiz → içerik satışı → finans → yetki kontrolleri.
 * Adımlar birbirine bağlıdır (describe.serial); durum modül değişkenleriyle taşınır. Her çalıştırma benzersiz kullanıcılar üretir.
 */
const run = uid();
const PASSWORD = "E2e-Test-12345";
const fan = { name: `E2E Hayran ${run}`, email: `e2e.${run}.fan@test.local` };
const creator = {
  name: `E2E Creator ${run}`,
  email: `e2e.${run}.creator@test.local`,
  username: `e2e_${run}`,
  twinName: `E2E İkiz ${run}`,
};
const CONTENT_TITLE = `E2E Özel Not ${run}`;
const CONTENT_BODY = `E2E içerik gövdesi ${run}: yalnızca satın alanlar okuyabilir.`;
const PERSONA_STYLE = `Samimi ve kısa cümleler kurar; E2E ${run}.`;

let fanCookies: Cookie[] = [];
let creatorCookies: Cookie[] = [];
let fanUserId = "";
let premiumContentId = "";
let contentId = "";
let contentTxId = "";
let subTxId = "";

const ADMIN_EMAIL = "admin@heyfans.local";
const FINANCE_EMAIL = "finance@heyfans.local";

/* ─── yardımcılar ─────────────────────────────────────── */
async function submitRegister(page: Page, who: { name: string; email: string }, intent: "fan" | "creator") {
  await page.goto(intent === "creator" ? "/register?intent=creator" : "/register");
  await expect(page.getByRole("radio", { name: intent === "creator" ? /İçerik Üreticisiyim/ : /Hayranım/ })).toBeChecked();
  await page.getByLabel("Ad soyad").fill(who.name);
  await page.getByLabel("E-posta adresi").fill(who.email);
  await page.locator("#reg-password").fill(PASSWORD);

  // Koşullar kabul edilmeden gönderilemez
  await page.getByRole("button", { name: "Hesap Oluştur" }).click();
  await expect(page.getByText("Devam etmek için koşulları kabul etmelisin.")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);

  await page.locator("#reg-terms").click();
  await page.getByRole("button", { name: "Hesap Oluştur" }).click();
  await expect(page).toHaveURL(/\/verify\?email=/);
  await expect(page.getByRole("heading", { name: /E-postanı kontrol et/ })).toBeVisible();
  await expect(page.getByText(who.email)).toBeVisible();

  const user = await (await db()).collection("users").findOne({ email: who.email });
  expect(user, "kullanıcı kaydı oluşmalı").toBeTruthy();
  expect(user?.emailVerified).toBeFalsy();
  expect(user?.signupIntent).toBe(intent);
}

async function verifyEmail(page: Page, email: string) {
  const link = await latestEmailLink(email, "verify_email");
  await page.goto(link);
  await expect(page).toHaveURL(/\/verify\?verified=1/);
  await expect(page.getByRole("heading", { name: /doğrulandı/ })).toBeVisible();
  const user = await (await db()).collection("users").findOne({ email });
  expect(user?.emailVerified).toBe(true);
}

/** Doğrulama bağlantısı otomatik oturum açar; giriş ekranını sınamak için çerezleri temizler. */
async function uiLogin(page: Page, context: BrowserContext, email: string) {
  await context.clearCookies();
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
}

async function declareAdult(page: Page) {
  await expect(page).toHaveURL(/\/age-verification/);
  await page.locator("#age-birth").fill("1990-05-15");
  // Doğum tarihi + beyan onayı zorunlu: onaysız gönderim hata verir
  await page.getByRole("button", { name: "Beyanı Kaydet" }).click();
  await expect(page.getByText("Beyanı onaylamalısın.")).toBeVisible();
  await page.locator("#age-declared").click();
  await page.getByRole("button", { name: "Beyanı Kaydet" }).click();
}

const termsAndPreInfo = async (page: Page) => {
  await page.getByRole("checkbox", { name: /Kullanım Şartları/ }).click();
  await page.getByRole("checkbox", { name: /Ön Bilgilendirme/ }).click();
};

/** Ödeme sayfası → TEST sağlayıcı → onay → sonuç sayfası; işlem kimliğini döndürür. */
async function payWithTestProvider(page: Page) {
  await expect(page).toHaveURL(/\/checkout\?/);
  await expect(page.getByText("TEST ÖDEMESİ").first()).toBeVisible();
  const pay = page.getByRole("button", { name: "Test ödemesine geç" });
  await expect(pay).toBeDisabled(); // şartlar kabul edilmeden ödeme başlatılamaz
  await termsAndPreInfo(page);
  await expect(pay).toBeEnabled();
  await pay.click();
  await page.waitForURL(/\/checkout\/test\//);
  await expect(page.getByRole("heading", { name: "Ödemeyi onayla" })).toBeVisible();
  await page.getByRole("button", { name: /Ödemeyi onayla \(test\)/ }).click();
  await page.waitForURL(/\/checkout\/result\?tx=/);
  await expect(page.locator("h1", { hasText: "Ödemen alındı" })).toBeVisible();
  await expect(page.getByText("TEST ÖDEMESİ").first()).toBeVisible();
  const tx = new URL(page.url()).searchParams.get("tx");
  expect(tx).toMatch(/^[a-f0-9]{24}$/);
  return tx!;
}

test.describe.serial("Uçtan uca yolculuk", () => {
  // Yakalanmamış tarayıcı istisnaları (React/JS çökmeleri) hiçbir adımda olmamalı.
  let pageErrors: string[] = [];
  test.beforeEach(({ page }) => {
    pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
  });
  test.afterEach(() => {
    expect(pageErrors, "yakalanmamış sayfa hataları").toEqual([]);
  });
  test.afterAll(async () => {
    await closeDb();
  });

  /* ─── HAYRAN ──────────────────────────────────────────── */
  test("1 · Hayran /register arayüzünden kaydolur (koşullar zorunlu)", async ({ page }) => {
    await submitRegister(page, fan, "fan");
    fanUserId = String((await (await db()).collection("users").findOne({ email: fan.email }))!._id);
  });

  test("2 · E-posta doğrulaması: devOutbox bağlantısı açılır", async ({ page }) => {
    await verifyEmail(page, fan.email);
  });

  test("3 · /login arayüzünden giriş (yanlış şifre reddedilir)", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    await page.locator("#login-email").fill(fan.email);
    await page.locator("#login-password").fill("Yanlis-Sifre-999");
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page.locator("#login-form-error")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await page.locator("#login-password").fill(PASSWORD);
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await page.waitForURL(/\/age-verification/);
    fanCookies = await context.cookies();
    expect(fanCookies.some((c) => c.name.includes("session_token"))).toBe(true);
  });

  test("4 · Yaş beyanı + hayran karşılama sihirbazı", async ({ page, context }) => {
    test.setTimeout(150_000);
    await context.addCookies(fanCookies);
    await page.goto("/age-verification");
    await declareAdult(page);
    await page.waitForURL(/\/onboarding\/fan/);

    // 18+ kaydı oluştu
    const rec = await (await db()).collection("ageVerificationRecords").findOne({ userId: new ObjectId(fanUserId) });
    expect(rec?.over18).toBe(true);

    // En az 3 ilgi alanı seçilmeden devam edilemez
    const next = page.getByRole("button", { name: /Devam Et/ });
    await expect(next).toBeDisabled();
    const interests = page.getByRole("group", { name: "İlgi alanları" }).getByRole("checkbox");
    await expect(interests.first()).toBeVisible();
    for (let i = 0; i < 3; i++) await interests.nth(i).click();
    await expect(page.getByText("3 alan seçildi")).toBeVisible();
    await next.click(); // → ruh halleri
    await expect(page.getByRole("heading", { name: /enerji/ })).toBeVisible();
    await page.getByRole("group", { name: "Ruh halleri" }).getByRole("checkbox").first().click();
    await next.click(); // → izinler
    await expect(page.getByRole("heading", { name: /sen yönet/ })).toBeVisible();
    await next.click(); // → özet
    await expect(page.getByRole("heading", { name: /Özetin burada/ })).toBeVisible();
    await page.getByRole("button", { name: /HEYFANS'a Başla/ }).click();
    await page.waitForURL(/\/app$/);

    const prefs = await (await db()).collection("userPreferences").findOne({ userId: new ObjectId(fanUserId) });
    expect(prefs?.fanOnboarding?.completedAt).toBeTruthy();
    expect(prefs?.interests?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  test("5 · /explore: 'Melis' araması sonuç verir", async ({ page, context }) => {
    await context.addCookies(fanCookies);
    await page.goto("/explore");
    await page.getByLabel(/İçerik üreticisi adı, kategori veya ilgi alanı/).fill("Melis");
    await page.getByRole("button", { name: "Ara", exact: true }).click();
    await expect(page).toHaveURL(/[?&]q=Melis/);
    await expect(page.getByRole("heading", { name: "Arama Sonuçları" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Melis Ertürk profili" }).first()).toBeVisible();
    // Olmayan bir arama boş durum gösterir
    await page.goto("/explore?q=zzzzyokboyleads");
    await expect(page.getByText("Aramana uygun içerik üreticisi bulunamadı")).toBeVisible();
  });

  test("6 · Melis takip edilir", async ({ page, context }) => {
    await context.addCookies(fanCookies);
    await page.goto("/creators/meliserturk");
    await expect(page.getByRole("heading", { level: 1, name: /Melis Ertürk/ })).toBeVisible();
    const follow = page.getByRole("button", { name: "Takip Et", exact: true });
    await follow.click();
    const following = page.getByRole("button", { name: "Takip ediliyor" });
    await expect(following).toHaveAttribute("aria-pressed", "true");
    // İyimser arayüz anında güncellenir; sunucu kaydı tamamlanana kadar bekle (yoksa gezinme isteği iptal eder)
    await expect(following).toBeEnabled();
    await expect
      .poll(async () => (await db()).collection("follows").countDocuments({ followerId: new ObjectId(fanUserId) }))
      .toBe(1);
    await page.reload();
    await expect(page.getByRole("button", { name: "Takip ediliyor" })).toBeVisible();
  });

  test("7 · Melis favorilere eklenir ve /app/favorites'te görünür", async ({ page, context }) => {
    await context.addCookies(fanCookies);
    await page.goto("/app/favorites");
    await expect(page.getByText("Henüz favori içerik üreticin yok")).toBeVisible();

    await page.goto("/explore?q=Melis");
    const card = page.locator("article", { hasText: "Melis Ertürk" }).first();
    await card.getByRole("button", { name: "Favorilere ekle" }).click();
    const unfav = card.getByRole("button", { name: "Favorilerden çıkar" });
    await expect(unfav).toHaveAttribute("aria-pressed", "true");
    await expect(unfav).toBeEnabled(); // sunucu eylemi bitti (iyimser güncelleme kesinleşti)
    await expect
      .poll(async () => (await db()).collection("favorites").countDocuments({ userId: new ObjectId(fanUserId), targetType: "creator" }))
      .toBe(1);

    await page.goto("/app/favorites");
    await expect(page.getByRole("link", { name: "Melis Ertürk profili" }).first()).toBeVisible();
    await expect(page.getByText("Henüz favori içerik üreticin yok")).toHaveCount(0);
  });

  test("8 · AI sohbeti: mesaj gönderilir, AI İkizi etiketli 'Test yanıtı' akışı gelir", async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.addCookies(fanCookies);
    await page.goto("/chat/meliserturk");
    const box = page.getByLabel("Mesajını yaz");
    await expect(box).toBeEnabled();
    const message = `Merhaba Melis, bu bir E2E mesajıdır ${run}`;
    await box.fill(message);
    await page.getByRole("button", { name: "Mesajı gönder" }).click();

    const log = page.getByRole("log", { name: "Sohbet mesajları" });
    await expect(log).toContainText(message);
    await expect(log.getByText("Test yanıtı", { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(log.getByText("AI İkizi", { exact: true })).toBeVisible();
    await expect(page.getByLabel("AI ikizi yazıyor")).toHaveCount(0); // akış tamamlandı

    // Kayıt: kullanıcı mesajı + dolu AI yanıtı
    const d = await db();
    const conv = await d.collection("conversations").findOne({ userId: new ObjectId(fanUserId), kind: "fan" });
    expect(conv).toBeTruthy();
    await expect
      .poll(async () => (await d.collection("messages").find({ conversationId: conv!._id }).toArray()).map((m) => m.senderType).sort(), { timeout: 20_000 })
      .toEqual(expect.arrayContaining(["user", "ai"]));
    const ai = await d.collection("messages").findOne({ conversationId: conv!._id, senderType: "ai" });
    expect(ai?.body?.length ?? 0).toBeGreaterThan(5);
  });

  test("9 · Abonelik: üyelik → ödeme → TEST onayı → sonuç → /app/subscriptions", async ({ page, context }) => {
    test.setTimeout(150_000);
    await context.addCookies(fanCookies);

    // Önce: Melis'in Temel seviye abonelere özel içeriği kilitli
    const d = await db();
    const melis = await d.collection("creatorProfiles").findOne({ username: "meliserturk" });
    const premium = await d.collection("contentItems").findOne({ creatorId: melis!._id, status: "published", access: "subscribers", minPlanTier: "basic" });
    expect(premium, "seed: basic seviye aboneye özel içerik").toBeTruthy();
    premiumContentId = String(premium!._id);
    await page.goto(`/content/${premiumContentId}`);
    await expect(page.getByText("Bu içerik üyelere özel.")).toBeVisible();

    await page.goto("/creators/meliserturk/membership");
    await expect(page.getByRole("heading", { name: "Sana en uygun üyeliği seç" })).toBeVisible();
    await page.getByRole("link", { name: "Temel planını seç" }).click();
    subTxId = await payWithTestProvider(page);

    const tx = await d.collection("paymentTransactions").findOne({ _id: new ObjectId(subTxId) });
    expect(tx?.status).toBe("succeeded");
    expect(tx?.kind).toBe("subscription");
    expect(tx?.userId.toString()).toBe(fanUserId);

    await page.goto("/app/subscriptions");
    await expect(page.getByRole("heading", { name: "Aboneliklerim" })).toBeVisible();
    await expect(page.getByText("Melis Ertürk").first()).toBeVisible();
    await expect(page.getByText("Aktif", { exact: true }).first()).toBeVisible();
    const sub = await d.collection("subscriptions").findOne({ userId: new ObjectId(fanUserId), creatorId: melis!._id });
    expect(sub?.status).toBe("active");
  });

  test("10 · Premium (abonelere özel) içerik kilidi açık görüntülenir", async ({ page, context }) => {
    await context.addCookies(fanCookies);
    const title = String((await (await db()).collection("contentItems").findOne({ _id: new ObjectId(premiumContentId) }))!.title);
    await page.goto(`/content/${premiumContentId}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("Bu içerik üyelere özel.")).toHaveCount(0);
    await expect(page.getByText("Yalnızca senin için")).toHaveCount(0);
    await expect(page.getByText("Güvenli erişim")).toBeVisible();
  });

  /* ─── CREATOR ─────────────────────────────────────────── */
  test("11 · Creator kaydı → doğrulama → giriş → yaş → 7 adımlı (soru soru) başvuru → incelemede", async ({ page, context }) => {
    test.setTimeout(240_000);
    await context.clearCookies();
    await submitRegister(page, { name: creator.name, email: creator.email }, "creator");
    await verifyEmail(page, creator.email);
    await uiLogin(page, context, creator.email);
    await page.waitForURL(/\/age-verification/);
    await declareAdult(page);
    await page.waitForURL(/\/onboarding\/creator/);
    creatorCookies = await context.cookies();

    const next = (name = "Devam Et") => page.getByRole("button", { name, exact: true }).click();

    // 1 · Profil (soru soru)
    await expect(page.getByRole("heading", { name: /Seni tanıyalım/ })).toBeVisible();
    await page.locator("#cr-name").fill(creator.name);
    await page.locator("#cr-username").fill(creator.username);
    await next();
    await next(); // kategori zorunlu
    await expect(page.getByText("En az bir kategori seç.")).toBeVisible();
    await page.getByRole("group", { name: "Kategoriler" }).getByRole("checkbox").first().click();
    await next();
    await page.locator("#cr-headline").fill("E2E testi için örnek creator profili");
    await next("İletişime Devam Et");

    // 2 · İletişim (telefon zorunlu, şifreli saklanır)
    await page.locator("#cr-phone").fill("1234");
    await next();
    await expect(page.locator("#cr-phone-error")).toBeVisible();
    await page.locator("#cr-phone").fill("5321234567");
    await next();
    await page.locator("#cr-contact-consent").click();
    await next("Sosyal Medyaya Devam Et");

    // 3 · Sosyal medya (her platform tek soru)
    await page.locator("#cr-social-instagram").fill(`https://www.instagram.com/${creator.username}/`);
    await page.getByRole("radio", { name: "1 bin – 10 bin" }).click();
    await next();
    for (const p of ["tiktok", "youtube", "x", "twitch", "kick"]) {
      await expect(page.locator(`#cr-social-${p}`)).toBeVisible();
      await page.getByRole("button", { name: "Bu platformu kullanmıyorum" }).click();
    }
    await expect(page.locator("#cr-social-website")).toBeVisible();
    await next(); // boş bırakılan platform atlanır
    await expect(page.getByRole("radiogroup", { name: "Ana platform" })).toBeVisible();
    await next("Doğrulamaya Devam Et");

    // 4 · Doğrula
    await expect(page.getByRole("heading", { name: /olduğunu göster/ })).toBeVisible();
    await page.locator("#cr-legal").fill("E2E Test Kullanıcısı");
    await page.locator("#cr-birth").fill("1990");
    await page.getByRole("button", { name: "AI İkizine Devam Et" }).click();
    await expect(page.getByText("Bilgilerin doğruluğunu onaylamalısın.")).toBeVisible(); // beyan zorunlu
    await page.locator("#cr-declared").click();
    await page.getByRole("button", { name: "AI İkizine Devam Et" }).click();

    // 5 · AI ikizi (açık rıza zorunlu)
    await expect(page.getByRole("heading", { name: /tanıştır/ })).toBeVisible();
    await page.locator("#cr-twin-name").fill(creator.twinName);
    await page.locator("#cr-twin-bio").fill("E2E ikizi: test amaçlı kısa biyografi.");
    await page.locator("#cr-twin-greet").fill("Merhaba! Ben E2E ikizi. Bugün ne konuşalım?");
    await page.getByRole("button", { name: "Özelleştirmeye Devam Et" }).click();
    await expect(page.getByText("AI ikizi için açık rıza vermelisin.")).toBeVisible();
    await page.locator("#cr-consent-persona").click();
    await page.getByRole("button", { name: "Özelleştirmeye Devam Et" }).click();

    // 6 · Özelleştir (bilgi tabanı izni sonra Studio'dan verilecek)
    await expect(page.getByRole("heading", { name: /senin tarzın/ })).toBeVisible();
    await page.getByRole("button", { name: "İncelemeye Devam Et" }).click();

    // 7 · İncele + gönder
    await expect(page.getByRole("heading", { name: /Son bir kontrol/ })).toBeVisible();
    await expect(page.getByText("Başvuruyu göndermeden önce şu adımları tamamla")).toHaveCount(0);
    await page.getByRole("button", { name: "Başvuruyu Gönder" }).click();
    await expect(page.getByRole("heading", { name: /Başvurun\s+incelemede/ })).toBeVisible();

    const d = await db();
    const user = await d.collection("users").findOne({ email: creator.email });
    const profile = await d.collection("creatorProfiles").findOne({ userId: user!._id });
    expect(profile?.status).toBe("pending_review");
    expect(profile?.username).toBe(creator.username);
    expect(profile?.contact?.phoneMasked).toBe("+90 5** *** ** 67");
    expect(JSON.stringify(profile)).not.toContain("5321234567"); // telefon düz metin saklanmaz
    expect(profile?.socialLinks?.[0]).toMatchObject({ platform: "instagram", handle: creator.username, audience: "1k_10k", primary: true });
    const app = await d.collection("creatorApplications").findOne({ creatorId: profile!._id });
    expect(["submitted", "in_review"]).toContain(app?.status);
  });

  test("12 · Admin /admin/creators arayüzünden başvuruyu onaylar", async ({ page, context, request }) => {
    test.setTimeout(120_000);
    await loginViaApi(request, context, ADMIN_EMAIL);
    await page.goto(`/admin/creators?q=${encodeURIComponent(creator.username)}`);
    await expect(page.getByRole("heading", { name: "İçerik Üreticisi Yönetimi" })).toBeVisible();
    await page.getByRole("link", { name: `${creator.name} başvurusunu incele` }).click();
    await expect(page.getByRole("heading", { name: "Başvuru İncelemesi" })).toBeVisible();
    await expect(page.getByText("Doğrulama Bekleyen").first()).toBeVisible();

    await page.getByRole("button", { name: "Onayla", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Creator başvurusunu onayla" })).toBeVisible();
    await dialog.getByRole("button", { name: "Başvuruyu onayla" }).click();
    await expect(page.getByText("İşlem tamamlandı.").or(page.getByText(/onaylandı/i)).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Onayla", exact: true })).toHaveCount(0);

    const d = await db();
    await expect
      .poll(async () => (await d.collection("creatorProfiles").findOne({ username: creator.username }))?.status)
      .toBe("approved");
    const user = await d.collection("users").findOne({ email: creator.email });
    expect(user?.roles).toContain("creator");
  });

  test("13 · Creator kişilik ikizini düzenler ve rızaları verir", async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.addCookies(creatorCookies);
    await page.goto("/studio/personality");
    await expect(page.getByRole("heading", { name: "Kişilik Stüdyosu" })).toBeVisible();
    const style = PERSONA_STYLE;
    await page.locator("#pe-style").fill(style);
    await page.locator("#pe-greet").fill("Selam! E2E ikizi burada, ne konuşalım?");
    await page.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
    await expect(page.getByText("Kaydedildi.").or(page.getByText(/kaydedildi/i)).first()).toBeVisible();

    const d = await db();
    const profile = await d.collection("creatorProfiles").findOne({ username: creator.username });
    await expect
      .poll(async () => (await d.collection("aiTwins").findOne({ creatorId: profile!._id }))?.draft?.persona?.speakingStyle)
      .toBe(style);
    await page.reload();
    await expect(page.locator("#pe-style")).toHaveValue(style);

    // Bilgi tabanı rızası Studio'dan verilir (kişilik rızası sihirbazda verilmişti)
    await page.goto("/studio/ai-twin");
    await expect(page.getByText("AI ikizi kişiliği")).toBeVisible();
    await page.getByRole("button", { name: "İzin ver" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /Bilgi tabanı kullanımı iznini ver/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Okudum, izin veriyorum" }).click();
    await expect(page.getByRole("button", { name: "İzin ver" })).toHaveCount(0);
    await expect(page.getByText("İzin verildi")).toHaveCount(2);
    const consents = await d.collection("creatorConsents").find({ creatorId: profile!._id }).toArray();
    const active = consents.filter((c) => c.granted && !c.revokedAt).map((c) => c.kind);
    expect(active).toEqual(expect.arrayContaining(["ai_twin_persona", "knowledge_use"]));
  });

  test("14 · Creator ikizi /studio/ai-twin'den incelemeye gönderir", async ({ page, context, request }) => {
    test.setTimeout(150_000);
    const d = await db();
    const profile = await d.collection("creatorProfiles").findOne({ username: creator.username });

    // Başvuru gönderimi 1. sürümü zaten incelemeye düşürür: Studio bunu gösterir, yeniden gönder düğmesi yoktur.
    await context.addCookies(creatorCookies);
    await page.goto("/studio/ai-twin");
    await expect(page.getByText("Sürümün inceleniyor.")).toBeVisible();
    await expect(page.getByRole("button", { name: /İncelemeye gönder|tekrar gönder/ })).toHaveCount(0);

    // Admin düzenleme ister (ret) → creator Studio'dan düzeltip yeniden gönderir
    await context.clearCookies();
    await loginViaApi(request, context, ADMIN_EMAIL);
    await page.goto(`/admin/ai-twins?q=${encodeURIComponent(creator.username)}`);
    await page.getByRole("link", { name: `${creator.twinName} ikizini yönet` }).click();
    await page.getByRole("button", { name: "Reddet", exact: true }).click();
    const reject = page.getByRole("dialog");
    await reject.getByLabel(/Ret gerekçesi/).fill("E2E: kişilik tarifi güncellenmeli, lütfen düzeltip tekrar gönder.");
    await reject.getByRole("button", { name: "Reddet", exact: true }).click();
    await expect.poll(async () => (await d.collection("aiTwins").findOne({ creatorId: profile!._id }))?.status).toBe("rejected");

    await context.clearCookies();
    await context.addCookies(creatorCookies);
    await page.goto("/studio/ai-twin");
    await expect(page.getByText("Reddedildi", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/kişilik tarifi güncellenmeli/).first()).toBeVisible();
    await page.getByRole("button", { name: "Düzeltip tekrar gönder" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Değişiklik özeti/).fill(`E2E ${run}: kişilik güncellendi`);
    await dialog.getByRole("button", { name: "Gönder", exact: true }).click();
    await expect(page.getByText("Sürümün inceleniyor.")).toBeVisible();
    await expect(page.getByText("İncelemede", { exact: true }).first()).toBeVisible();

    const twin = await d.collection("aiTwins").findOne({ creatorId: profile!._id });
    expect(twin?.status).toBe("pending_review");
    const v = await d.collection("aiTwinVersions").findOne({ twinId: twin!._id, status: "pending_review" });
    expect(v?.changeSummary).toContain(run);
    expect(v?.snapshot?.persona?.speakingStyle).toBe(PERSONA_STYLE); // 13. adımdaki düzenleme sürüme girdi
  });

  test("15 · Admin ikizi onaylar, creator yayına alır → 'Yayında'", async ({ page, context, request }) => {
    test.setTimeout(150_000);
    await loginViaApi(request, context, ADMIN_EMAIL);
    await page.goto(`/admin/ai-twins?q=${encodeURIComponent(creator.username)}`);
    await page.getByRole("link", { name: `${creator.twinName} ikizini yönet` }).click();
    await page.getByRole("button", { name: "Sürümü Onayla" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /sürümünü onayla/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Onayla", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sürümü Onayla" })).toHaveCount(0);

    const d = await db();
    const profile = await d.collection("creatorProfiles").findOne({ username: creator.username });
    await expect.poll(async () => (await d.collection("aiTwins").findOne({ creatorId: profile!._id }))?.status).toBe("approved");

    // Creator yayına alır
    await context.clearCookies();
    await context.addCookies(creatorCookies);
    await page.goto("/studio/ai-twin");
    await expect(page.getByText("Onaylandı", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Yayına al" }).click();
    await expect(page.getByText("Yayında", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Duraklat" })).toBeVisible();
    await expect.poll(async () => (await d.collection("aiTwins").findOne({ creatorId: profile!._id }))?.status).toBe("live");

    // Hayran tarafında profil artık AI sohbetine açık
    await context.clearCookies();
    await page.goto(`/creators/${creator.username}`);
    await expect(page.getByRole("link", { name: /AI İkizimle Sohbet Et/ })).toBeVisible();
  });

  test("16 · Creator /studio/content/new ile satın alınabilir (49 TL) içerik yayınlar", async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.addCookies(creatorCookies);
    await page.goto("/studio/content/new");
    await expect(page.getByRole("heading", { name: "İçerik Oluşturma" })).toBeVisible();
    await page.getByText("Metin", { exact: true }).click();
    await page.locator("#c-title").fill(CONTENT_TITLE);
    await page.locator("#c-cap").fill(CONTENT_BODY);
    await page.locator("#c-access").selectOption("purchase");
    // fiyat girilmeden yayınlanamaz
    await expect(page.getByText("Tekil satın alma için en az ₺1 fiyat gir.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Yayınla" })).toBeDisabled();
    await page.locator("#c-price").fill("49");
    await page.getByRole("button", { name: "Yayınla" }).click();
    await page.waitForURL(/\/studio\/content(\?|$)/);
    await expect(page.getByText(CONTENT_TITLE).first()).toBeVisible();

    const d = await db();
    const profile = await d.collection("creatorProfiles").findOne({ username: creator.username });
    const item = await d.collection("contentItems").findOne({ creatorId: profile!._id, title: CONTENT_TITLE });
    expect(item?.status).toBe("published");
    expect(item?.access).toBe("purchase");
    expect(item?.price?.amountMinor).toBe(4900);
    contentId = String(item!._id);
  });

  test("17 · Hayran içeriği satın alır (TEST ödeme) ve görüntüler", async ({ page, context }) => {
    test.setTimeout(150_000);
    await context.addCookies(fanCookies);
    await page.goto(`/content/${contentId}`);
    await expect(page.getByRole("heading", { level: 1, name: CONTENT_TITLE })).toBeVisible();
    await expect(page.getByText("Bu içerik sana özel olabilir.")).toBeVisible();
    await expect(page.getByText(CONTENT_BODY)).toHaveCount(0); // kilitliyken gövde sızmaz
    await expect(page.getByText("₺49", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "İçeriğin kilidini aç" }).click();
    contentTxId = await payWithTestProvider(page);

    const tx = await (await db()).collection("paymentTransactions").findOne({ _id: new ObjectId(contentTxId) });
    expect(tx?.kind).toBe("content_purchase");
    expect(tx?.status).toBe("succeeded");
    expect(tx?.amount?.amountMinor).toBe(4900);

    await page.goto(`/content/${contentId}`);
    await expect(page.getByRole("heading", { level: 1, name: CONTENT_TITLE })).toBeVisible();
    await expect(page.getByText(CONTENT_BODY)).toBeVisible();
    await expect(page.getByText("Bu içerik sana özel olabilir.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "İçeriğin kilidini aç" })).toHaveCount(0);
  });

  test("18 · Finans kaydı: admin /admin/finance'ta işlem görünür, DB'de 'succeeded'", async ({ page, context, request }) => {
    await loginViaApi(request, context, ADMIN_EMAIL);
    await page.goto("/admin/finance");
    await page.getByPlaceholder(/İşlem kimliği/).fill(contentTxId);
    await page.getByRole("button", { name: "Filtrele" }).click();
    await expect(page).toHaveURL(/[?&]q=/);
    const row = page.getByRole("row").filter({ hasText: `TXN-${contentTxId.slice(-6).toUpperCase()}` });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Premium içerik");
    await expect(row).toContainText("Başarılı");
    await expect(row).toContainText("TEST");
    await expect(row).toContainText(fan.name);
    await expect(row).toContainText("₺49");

    // Ürün adıyla ve tür filtresiyle de bulunur
    await page.goto(`/admin/finance?q=${encodeURIComponent(CONTENT_TITLE)}&kind=content_purchase&status=succeeded`);
    await expect(page.getByRole("row").filter({ hasText: CONTENT_TITLE })).toHaveCount(1);

    const d = await db();
    const tx = await d.collection("paymentTransactions").findOne({ _id: new ObjectId(contentTxId) });
    expect(tx?.status).toBe("succeeded");
    expect(tx?.isTest).toBe(true);
    const sub = await d.collection("paymentTransactions").findOne({ _id: new ObjectId(subTxId) });
    expect(sub?.status).toBe("succeeded");
  });

  test("19 · Creator /studio/earnings'te içerik satışı hak edişini görür", async ({ page, context }) => {
    await context.addCookies(creatorCookies);
    const d = await db();
    const earning = await d.collection("creatorEarnings").findOne({ transactionId: new ObjectId(contentTxId) });
    expect(earning, "hak ediş kaydı").toBeTruthy();
    expect(earning?.sourceType).toBe("content");
    expect(earning?.grossMinor).toBe(4900);
    expect(earning?.creatorShareMinor).toBeGreaterThan(0);

    await page.goto("/studio/earnings");
    await expect(page.getByRole("heading", { name: "Gelirler" })).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: CONTENT_TITLE });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("İçerik satışı");
    await expect(row).toContainText("₺49");
  });

  /* ─── YETKİ ───────────────────────────────────────────── */
  test("20 · Yetkisiz erişim engellenir", async ({ page, context, request }) => {
    test.setTimeout(150_000);
    const d = await db();

    // Misafir
    await context.clearCookies();
    for (const path of ["/app", "/studio", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    }

    // Hayran: /admin → hayran paneli, /studio → creator karşılaması
    await context.addCookies(fanCookies);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/studio");
    await expect(page).toHaveURL(/\/onboarding\/creator/);
    await expect(page.getByRole("heading", { name: /Kendi AI ikizini/ })).toBeVisible();

    // Creator: /admin → engelli
    await context.clearCookies();
    await context.addCookies(creatorCookies);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/app$/);

    // Creator başkasının sohbetini API ile açamaz
    const conv = await d.collection("conversations").findOne({ userId: new ObjectId(fanUserId), kind: "fan" });
    expect(conv).toBeTruthy();
    const foreign = await context.request.post(`${BASE}/api/chat/${conv!._id}/messages`, {
      data: { text: "Başkasının sohbetine yazmaya çalışıyorum", idempotencyKey: `e2e-foreign-${run}` },
      headers: { Origin: BASE },
    });
    expect(foreign.status()).toBe(404);
    const foreignText = await d.collection("messages").countDocuments({ conversationId: conv!._id, body: /Başkasının sohbetine/ });
    expect(foreignText).toBe(0);

    // Oturumsuz API çağrısı 401
    await context.clearCookies();
    const anon = await context.request.post(`${BASE}/api/chat/${conv!._id}/messages`, {
      data: { text: "anonim", idempotencyKey: `e2e-anon-${run}` },
      headers: { Origin: BASE },
    });
    expect(anon.status()).toBe(401);

    // finance@: finans açılır, moderasyon reddedilir
    await loginViaApi(request, context, FINANCE_EMAIL);
    await page.goto("/admin/finance");
    await expect(page).toHaveURL(/\/admin\/finance/);
    await expect(page.getByRole("heading", { name: /Finans|Ödeme/ }).first()).toBeVisible();
    await page.goto("/admin/moderation");
    await expect(page).toHaveURL(/\/admin\?denied=1/);
    await expect(page.getByRole("alert").filter({ hasText: "erişim yetkiniz yok" })).toBeVisible();
  });
});
