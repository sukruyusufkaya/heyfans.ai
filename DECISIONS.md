# HEYFANS — Karar Günlüğü

Her karar: tarih · karar · gerekçe · durum. "KULLANICI ONAYI" işaretli kararlar varsayılanla ilerler ama kesinleşmesi için ürün sahibinin onayı gerekir.

## Teknik kararlar (kesin)

| # | Tarih | Karar | Gerekçe |
|---|---|---|---|
| D-01 | 2026-10-19 | **Next.js 16.4 App Router + React 19.3 + TypeScript 5.9 strict** | Vercel ile birebir uyumlu güncel kararlı sürüm. TS 7 (native) Next tip denetimiyle henüz doğrulanmadığı için 5.9'da kalındı. `cacheComponents` kapalı: uygulamanın büyük kısmı oturuma bağlı dinamik içerik; public sayfalarda `revalidate` + etiketli önbellek yeterli. |
| D-02 | 2026-10-19 | **Tailwind CSS 4 + Radix (radix-ui) + shadcn tarzı yerel bileşenler** (`src/components/ui`) | shadcn/ui'nin "kodu projeye kopyala" modeli; bileşenler referans HTML'lerden çıkarılan token'larla yeniden stillendi. |
| D-03 | 2026-10-19 | **Mongoose 9.11 (domain) + MongoDB Node driver 7.7 (Better Auth)** tek `MongoClient` paylaşır | Mongoose şema/doğrulama/indeks; auth kütüphanesi yerel sürücüyü ister. Bağlantı `globalThis` üzerinde önbelleklenir (serverless). |
| D-04 | 2026-10-19 | **Better Auth 1.7** (e-posta+şifre, e-posta doğrulama, şifre sıfırlama, DB oturumları, Google/Apple OAuth, TOTP 2FA, dahili hız sınırı) | Bakımı süren, Next.js + MongoDB adaptörlü, MFA eklentili tek çözüm. Auth.js credentials akışı doğrulama/sıfırlama için elle yazım gerektiriyordu. |
| D-05 | 2026-10-19 | Para: **tamsayı küçük birim** (`amountMinor`, kuruş) + `currency` (ISO 4217). Kredi: tamsayı. | Kayan nokta hatası yok. |
| D-06 | 2026-10-19 | **Değişmez defter** (`walletLedger`, `creatorEarnings`): güncelleme/silme şema düzeyinde engellenir; düzeltme = ters kayıt. Bakiye düşümü `balance >= tutar` koşullu `$inc` + transaction + benzersiz `idempotencyKey`. | Çift harcama ve geçmiş bozulması engellenir. |
| D-07 | 2026-10-19 | Ödeme kesinleşmesi **yalnız imzalı webhook** ile. `PaymentProvider` soyutlaması; `mock` sağlayıcı yalnız `APP_MODE≠production` iken etkin ve arayüzde "TEST ÖDEMESİ" olarak etiketli; o da HMAC imzalı webhook'tan geçer. | Frontend'den gelen "başarılı" bilgisine güvenilmez. |
| D-08 | 2026-10-19 | AI: sağlayıcıdan bağımsız **AI Gateway** (OpenAI uyumlu HTTP, akışlı). `mock` sağlayıcı yalnız geliştirme/test, yanıtlar "Test yanıtı" etiketli. Sağlayıcı yoksa sohbet kapalı ve kullanıcıya söylenir. | Gerçek sağlayıcı olmadan AI çalışıyormuş gibi davranılmaz. |
| D-09 | 2026-10-19 | RAG: parçalar `knowledgeChunks`'ta; Atlas'ta `$vectorSearch` (creatorId filtreli), yerel/test ortamında uygulama içi kosinüs (creator başına sınırlı). | Yerel MongoDB Community `$vectorSearch` desteklemez. |
| D-10 | 2026-10-19 | Arka plan işleri: `ingestionJobs` koleksiyonu + kilitli kuyruk; tetikleme `after()` (istek sonrası) + Vercel Cron `/api/cron/jobs` (`CRON_SECRET`). | Vercel'de kalıcı işçi yok. |
| D-11 | 2026-10-19 | Medya: `StorageProvider` (`local` geliştirme / `s3` = S3 uyumlu: R2, S3, MinIO). Özel medya yalnız erişim denetimi sonrası kısa ömürlü imzalı URL ile. | MongoDB'de dosya tutulmaz; Vercel dosya sistemi kalıcı değil. |
| D-12 | 2026-10-19 | E-posta: `EmailProvider` (`outbox` geliştirme: `devOutbox` koleksiyonu + `/dev/outbox`, `resend` üretim). | Anahtarsız geliştirme; üretimde gerçek gönderim. |
| D-13 | 2026-10-19 | Gerçek zamanlı ses/görüntü: **LiveKit** adaptörü (token üretimi sunucuda). Yapılandırılmamışsa ekran "Yapılandırılmadı" durumunu gösterir. | Vercel'de WebSocket/RTC sunucusu çalıştırılamaz. |
| D-14 | 2026-10-19 | Yaş doğrulama: `AgeVerificationProvider` arayüzü; sağlayıcı yokken yalnız "beyan" (düşük güvence) kaydı tutulur, **yetişkin özellikleri `features.adultContent=false`** ile kapalı. Kimlik belgesi saklanmaz. | Beyan güçlü doğrulama sayılmaz. |
| D-15 | 2026-10-19 | Yetkilendirme: kullanıcıda `roles[]` (fan, creator, admin) + `adminRole`; izinler `src/lib/permissions` içindeki rol→izin haritasından; kaynak bazlı kontroller servislerde. Admin oturumu **TOTP 2FA** zorunlu. `/alfitechadminpanel` yalnız `/admin`'e yönlendirir. | Gizli URL güvenlik sayılmaz. |
| D-16 | 2026-10-19 | Hız sınırı: MongoDB TTL'li sabit pencere (`rateLimits`); `REDIS_URL` verilirse ileride Redis adaptörü. | Ek altyapısız serverless uyumu. |
| D-17 | 2026-10-19 | i18n: tipli sözlük (`src/i18n`), yalnız `tr` etkin; arayüz kabuğu (menü, buton, hata, durum) sözlükten; CMS içerikleri yerel alanlı. | 74 sayfada her metni ağır bir kütüphaneye bağlamadan İngilizce'ye hazır mimari. |
| D-18 | 2026-10-19 | Mutasyonlar: form işlemleri **Server Actions** (Next'in origin denetimi = CSRF koruması) → servis katmanı; akış/webhook/medya/cron/genel GET için **Route Handlers** (`/api/...`). | Daha az kod, uçtan uca tip güvenliği. |
| D-19 | 2026-10-19 | `APP_MODE` = `development` \| `demo` \| `production`. Seed kayıtları `isDemo:true`; demo modunda başlıkta "DEMO VERİLER" rozeti. Üretimde mock sağlayıcılar reddedilir. | Demo verisi gerçek metrik gibi sunulmaz. |
| D-20 | 2026-10-19 | Koleksiyon sadeleştirmeleri: `creatorCategories` → `creatorProfiles.categories[]` (çok anahtarlı indeks); `aiTwinSettings` → `aiTwins.draft` + `aiTwinVersions.snapshot`; `userRoles` → `users.roles[]`. Eklenenler: `paymentWebhookEvents`, `giftCatalog`, `helpArticles`, `cookieConsents`, `rateLimits`, `devOutbox`. | Tek belge içinde atomik okuma/yazma; webhook tekilleştirme ve yardım araması için gerekli. |
| D-21 | 2026-10-19 | Yerel geliştirme DB'si: makinedeki **MongoDB 8.2** tek düğümlü replika seti (port 27047, `.data/mongo`) → transaction destekli. Testler `mongodb-memory-server` (yerel ikili ile). | Paylaşımlı Atlas kümesi 500 koleksiyon sınırına yakın (bkz. KULLANICI ONAYI K-06). |
| D-22 | 2026-10-19 | Tasarım referanslarındaki `assets/*.jpg` dosyaları UI parçaları içeren ekran kırpıntıları → **kullanılmadı**. Seed medyası için temsili görseller (bkz. K-11). | Talimat: ekran görüntüsü kırpılarak kullanılmaz. |

## KULLANICI ONAYI bekleyen kararlar (varsayılanla ilerleniyor)

| # | Konu | Varsayılan / öneri | Etki |
|---|---|---|---|
| K-01 | Ödeme sağlayıcısı | **iyzico** (TR: abonelik, pazaryeri alt üye işyeri ile gelir paylaşımı, iade); yurt dışı için Stripe Connect yalnız uygun tüzel kişilikle. Adaptör iskeletleri hazır, canlı anahtar yok. | Canlı ödeme yapılamaz; yalnız TEST ödemesi. |
| K-02 | Ödeme alan ülke / tüzel kişilik | Türkiye, TRY | Vergi (KDV) ve fatura kuralları |
| K-03 | Hedef ülkeler | TR öncelikli | KVKK + GDPR altyapısı ikisine de hazır |
| K-04 | Yetişkin içerik kapsamı | **Kapalı** (`features.adultContent=false`) | Açılması hukuki görüş + güçlü yaş doğrulama gerektirir |
| K-05 | Gelir paylaşımı tanımı | %70 creator, **net** üzerinden: brüt − ödeme kuruluşu ücreti − KDV (fiyatlar KDV dahil) = net; AI maliyeti platformda kalır. Tümü `platformSettings.revenue` ile değiştirilebilir. | Hak ediş hesapları |
| K-06 | Üretim MongoDB Atlas kümesi | Bu proje için **ayrı küme/proje** önerilir (mevcut paylaşımlı küme 500 koleksiyon sınırına yakın; bu uygulama ~50 koleksiyon açar) | Dağıtım |
| K-07 | AI modeli/sağlayıcısı | OpenAI uyumlu uç (OpenAI, Gemini OpenAI-uyumlu, OpenRouter, yerel Ollama). Gömme modeli aynı sağlayıcıdan. | Sohbet + RAG |
| K-08 | Ses/görüntü altyapısı | LiveKit Cloud (+ TTS/STT sağlayıcısı) | Sesli/görüntülü görüşme |
| K-09 | Alan adı | heyfans.ai (varsayım) | APP_URL, e-posta alan adı, OAuth dönüş adresleri |
| K-10 | E-posta sağlayıcısı | Resend | Doğrulama/sıfırlama e-postaları |
| K-11 | Medya depolama + seed görselleri | Cloudflare R2 (S3 uyumlu). Seed creator fotoğrafları için: lisanslı fotoğraf ya da yerel üretim (≈2,5 GB model indirmesi gerekir). | Görsel kalite |
