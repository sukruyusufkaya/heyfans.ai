# HEYFANS — AI İkizi Destekli Creator & Hayran Platformu

İçerik üreticilerinin yetkilendirilmiş AI ikizlerini oluşturup yönettiği, hayranların bu ikizlerle sohbet edip abonelik/kredi/özel içerikle etkileşime geçtiği, tüm platformun Admin Panel'den yönetildiği Türkçe web platformu.

- **Yığın:** Next.js 16.4 (App Router) · React 19.3 · TypeScript (strict) · Tailwind CSS 4 · Radix UI · MongoDB (Mongoose 9) · Better Auth · Recharts · Vitest · Playwright
- **74 sayfa:** Herkese açık site (10) · Kimlik & karşılama (7) · Hayran deneyimi (19) · Creator Studio (18) · Platform Admin (11) · Destek & Yasal (9). Durum: [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md)
- **Belgeler:** [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`DECISIONS.md`](DECISIONS.md) · [`docs/`](docs/) (veritabanı, API, ortam, dağıtım, test, güvenlik, bilinen sınırlar, entegrasyonlar, geliştirme kuralları)

## Hızlı başlangıç (yerel)

Gereksinimler: Node.js ≥ 22, MongoDB 8 (yerel ikili) veya bir Atlas replika seti.

```bash
npm install
```

```bash
cp .env.example .env
```

`.env` içinde `BETTER_AUTH_SECRET`, `DATA_ENCRYPTION_KEY`, `MEDIA_SIGNING_SECRET`, `CRON_SECRET`, `SEED_DEMO_PASSWORD` değerlerini üretin (bkz. `docs/environment.md`). Yerel geliştirmede `AI_PROVIDER=mock` ve `PAYMENT_PROVIDER=mock` test modlarıdır ve arayüzde açıkça "Test" olarak etiketlenir.

```bash
npm run db:start
```

(Ayrı terminalde; yerel MongoDB'yi 27047 portunda tek düğümlü replika seti olarak başlatır.)

```bash
npm run db:seed -- --reset
```

```bash
npm run dev
```

→ http://localhost:3070 · Demo hesaplar: `fan@heyfans.local`, `melis@heyfans.local` (creator), `admin@heyfans.local` (süper yönetici) — parola `.env` → `SEED_DEMO_PASSWORD`. Yerelde gönderilen e-postalar: http://localhost:3070/dev/outbox

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu (3070) |
| `npm run build` / `npm start` | Üretim derlemesi / sunucusu |
| `npm run typecheck` | TypeScript denetimi |
| `npm run lint` | ESLint |
| `npm test` | Birim + MongoDB entegrasyon testleri (bellek içi replika seti) |
| `npm run test:e2e` | Playwright uçtan uca testleri |
| `npm run db:start` | Yerel MongoDB replika seti |
| `npm run db:seed [-- --reset]` | Demo verisi (üretimde çalışmaz) |
| `npm run db:init` | İndeksler + platform ayarları + temel veriler (yalnız eksikleri ekler; üretimde ilk kurulum) |
| `npm run db:samples [-- --reindex \| --remove --yes]` | Kurgusal "Örnek profil"leri içe aktar / kaldır (üretimde de çalışır, satın alma kapalı) |
| `npm run admin:create -- <email> <rol>` | Admin hesabı oluşturma (genel kayıttan admin açılamaz) |
| `npm run jobs:run` | Kuyruktaki işleri bir kez işle |

## Demo ve üretim ayrımı

`APP_MODE=development|demo|production`. Seed kayıtları `isDemo:true` işaretlidir; demo modunda istatistiklerin yanında "DEMO VERİLER" rozeti görünür. Üretimde test (mock) AI/ödeme sağlayıcıları ve yerel dosya depolaması **reddedilir**; eksik entegrasyonlar ilgili özelliği kapatır ve Admin → Platform Ayarları → Entegrasyon durumu ekranında listelenir.

## Dağıtım

Vercel + MongoDB Atlas: [`docs/deployment.md`](docs/deployment.md).
