# HEYFANS — Mimari

Tek Next.js uygulaması; altı deneyim alanı ortak kullanıcı, yetki, veritabanı ve olay sistemini paylaşır.

```
Tarayıcı ──► proxy.ts (iyimser oturum çerezi denetimi, güvenlik başlıkları)
          ──► App Router
                (public)   PublicLayout        10 sayfa   SSR + revalidate, SEO
                (auth)     AuthLayout           7 sayfa   Better Auth istemcisi
                (fan)      FanLayout           19 sayfa   oturum zorunlu
                (studio)   CreatorStudioLayout 18 sayfa   roles ∋ creator
                (admin)    AdminLayout         11 sayfa   roles ∋ admin + 2FA + izin
                (support)  SupportLegalLayout   9 sayfa   CMS'ten yasal taslaklar
          ──► Server Actions ─┐
          ──► /api/* Route Handlers (akış, webhook, medya, cron, arama)
                              ▼
                    src/services/<domain>  (iş kuralları, yetki, transaction)
                              ▼
                    src/models (Mongoose şemaları, indeksler, yaşam döngüsü)
                              ▼
                    MongoDB (Atlas üretim / yerel replika seti geliştirme)

Dış sağlayıcı adaptörleri (src/lib/*):  ai · payments · storage · email · rtc · age-verification
```

## Katmanlar

| Katman | Yer | Kural |
|---|---|---|
| Rota/sayfa | `src/app/(grup)/...` | Veri okuma servis çağrısıyla; iş kuralı yazılmaz. |
| Özellik bileşenleri | `src/features/<alan>/` | Sayfaya özgü istemci bileşenleri + server action'lar. |
| Ortak bileşenler | `src/components/ui`, `src/components/layouts`, `src/components/{public,fan,creator,admin}` | Token'lı tasarım sistemi. |
| Servisler | `src/services/<domain>` | Tek yetki ve iş kuralı noktası; `ServiceContext` (actor) alır. |
| Modeller | `src/models` | Mongoose şema + TS tipi + indeks + doğrulama. |
| Altyapı | `src/lib/{db,auth,permissions,ai,payments,storage,email,rtc,age,validation,security}` | Sağlayıcı soyutlamaları. |
| Yapılandırma | `src/config` | `env.ts` (Zod ile doğrulanan ortam), `site.ts`, `navigation.ts`. |

## Kimlik ve yetki
- Better Auth: `users`, `sessions`, `accounts`, `verifications`, `twoFactors` koleksiyonları. Kullanıcıda ek alanlar: `username`, `roles[]`, `adminRole`, `status`, `signupIntent`.
- `getSession()` (sunucu) → `requireUser()`, `requireCreator()`, `requireAdmin(permission)`. Proxy yalnız yönlendirme kolaylığıdır; gerçek kontrol layout + servis katmanında.
- Admin rolleri → izin haritası: `src/lib/permissions/roles.ts`. Hassas veri (özel sohbet) erişimi `conversations.read_sensitive` izni + gerekçe + vaka numarası ister ve `auditLogs`'a yazılır.

## Para akışı
```
Fan ödeme başlatır (sunucu fiyatı hesaplar) → paymentTransactions(created, idempotencyKey)
  → sağlayıcı ödeme oturumu → imzalı webhook → paymentWebhookEvents (eventId tekil)
  → transaction: transaction=succeeded · hak tanımı (kredi defteri / abonelik / içerik erişimi)
                 · creatorEarnings (brüt→net→pay)  · bildirim · audit
Kredi harcama: wallets.balance koşullu $inc + walletLedger kaydı (idempotencyKey tekil) tek transaction'da.
İade/chargeback: yeni ters defter kayıtları; geçmiş değişmez.
```

## AI ikizi
```
Mesaj → yetki/abonelik/kredi → hız sınırı → Safety(giriş) → Persona Engine (kişilik + sınırlar + platform politikası)
      → Knowledge Engine (yalnız creatorId'ye ait, onaylı kaynaklar) → Memory Engine (yalnız user×creator kapsamı, izinliyse)
      → Orchestrator (token bütçesi, model, akış) → Safety(çıkış) → mesaj "AI İkizi" etiketiyle kaydedilir
      → aiUsageRecords (token, gecikme, maliyet)  · hata olursa kredi iadesi (ters kayıt)
```
- Ortak temel model + persona + RAG + hafıza + güvenlik katmanı; ikiz başına model eğitimi yok.
- İstem enjeksiyonu savunması: kullanıcı/bilgi tabanı metni sistem talimatlarından ayrılmış bloklarda, "veri" olarak işaretlenir; creator sınırları platform politikasını aşamaz (politika her zaman son ve baskın).

## Arka plan işleri
`ingestionJobs` (bilgi tabanı işleme, medya türevleri, bildirim yayını). `after()` ile anında, `/api/cron/jobs` ile periyodik; `lockedUntil` ile çakışma önlenir.

## Ortamlar
`APP_MODE`: development (mock sağlayıcılara izin) · demo (seed verisi + "DEMO VERİLER" rozeti) · production (mock reddedilir, eksik yapılandırma özelliği kapatır ve admin paneline bildirilir: `/admin/settings` → "Entegrasyon durumu").

Ayrıntılar: `docs/` (veritabanı, API, ortam değişkenleri, dağıtım, test, güvenlik, bilinen sınırlar).
