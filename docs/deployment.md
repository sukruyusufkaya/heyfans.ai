# Dağıtım (Vercel + MongoDB Atlas)

## 1. MongoDB Atlas
1. Küme: platform ~57 koleksiyon kullanır. Ücretsiz/paylaşımlı katman (M0/Flex) **toplam 500 koleksiyon** sınırlıdır. 2026-10-19 itibarıyla `websites` kümesi **500/500 dolu** (diğer projeler) → ya bu proje için **yeni bir Atlas projesi + ücretsiz M0 küme** açın, ya `websites` kümesini **M10+**'e yükseltin, ya da kullanılmayan veritabanlarını silin (bkz. D-37). Bölge: Frankfurt (Vercel `fra1` ile aynı). Veritabanı adı **`heyfans_platform`** (aynı kümede eski tanıtım sitesi `heyfans` veritabanını kullanır; asla aynı ad verilmez).
2. Veritabanı kullanıcısı (yalnız bu DB'ye `readWrite`), ağ erişimi: Vercel için `0.0.0.0/0` + güçlü parola veya Vercel Secure Compute.
3. İlk kurulum (indeksler + varsayılan ayarlar + temel veriler: kategoriler, hediye kataloğu, platform planları, yasal taslaklar, ana sayfa bölümleri, yardım makaleleri). Üretim değişkenlerini depoya girmeyen `.env.production.local` dosyasına yazıp yerelden çalıştırın:
   ```bash
   npm run db:init:prod
   ```
   Tekrar çalıştırılabilir; yalnız eksik kayıtları ekler, admin panelindeki düzenlemelerin üzerine yazmaz.
4. RAG için Atlas Vector Search indeksi `knowledgeChunks` koleksiyonunda, adı `knowledge_vector`:
   ```json
   { "fields": [
     { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
     { "type": "filter", "path": "creatorId" },
     { "type": "filter", "path": "active" } ] }
   ```
   ve `VECTOR_SEARCH_MODE=atlas`.
5. **Örnek profiller** (kurgusal Türk karakterler, "Örnek profil" etiketli, satın alınamaz — D-35). R2 değişkenleri `.env.production.local`'da tanımlı olmalı (içerik görselleri R2'ye yüklenir); AI sağlayıcısı tanımlıysa bilgi tabanı da indekslenir:
   ```bash
   npm run db:samples:prod
   ```
   AI sağlayıcısı sonradan bağlanırsa aynı komutu `--reindex` ile; gerçek creator'lar katılınca `--remove --yes` ile kaldırın.
6. Süper yönetici + demo hesaplar (hayran, creator, creator adayı ve her yönetici rolü). Parolalar yerel `DEMO-HESAPLAR.local.md` dosyasına yazılır (depoya girmez); süper yönetici parolası yalnız ortam değişkeninden okunur. Yöneticiler ilk girişte 2FA kurar:
   ```bash
   ADMIN_EMAIL=yonetici@alanadi.com ADMIN_PASSWORD='…' npm run db:demo-accounts:prod
   ```
   Yalnız yönetici gerekiyorsa: `npx tsx --conditions=react-server --env-file=.env.production.local scripts/db/create-admin.ts <email> super_admin`.

### Veriyi saklamak için gerekenler
| Ne | Neden | Durum |
|---|---|---|
| MongoDB Atlas kümesi (500 koleksiyon sınırında yer veya M10+) | Tüm kayıtlar (kullanıcı, creator, sohbet, ödeme, defterler) | `websites` kümesi dolu → karar bekliyor |
| Atlas **yedekleme** (M10+ sürekli yedek / M0'da zamanlanmış `mongodump`) | M0'da otomatik yedek yok | Kurulmadı |
| Ayrı Atlas veritabanı kullanıcısı (yalnız `heyfans_platform` için `readWrite`) + ağ erişimi | Vercel'den bağlantı, en az yetki | Mevcut kullanıcı tüm kümeye erişebiliyor → ayrı kullanıcı önerilir |
| Cloudflare R2 kovası (özel) + API anahtarı | Profil/içerik görselleri, yüklemeler (üretim yerel diski reddeder) | Yok |
| Atlas Vector Search indeksi | AI ikizi bilgi tabanı araması (RAG) | AI sağlayıcısı seçilince |
| `DATA_ENCRYPTION_KEY` (sabit, yedekli) | Telefon ve IBAN şifreleme; kaybolursa bu veriler okunamaz | `.env.production.local`'da üretildi → parola yöneticisine yedekleyin |
| Resend + alan adı (SPF/DKIM) | Kayıt doğrulama ve şifre sıfırlama e-postaları | Yok |
| KVKK: VERBİS kaydı, aydınlatma metni, saklama-imha politikası | Telefon/kimlik gibi kişisel verilerin işlenmesi | Hukuk incelemesi |

## 2. Vercel
1. Depoyu Vercel projesine bağlayın (Framework: Next.js; `vercel.json` bölge `fra1` ve cron tanımı içerir).
2. Ortam değişkenlerini **Production** ve **Preview** için ayrı girin (bkz. `docs/environment.md`). Preview için ayrı bir Atlas veritabanı kullanın.
3. Medya: Cloudflare R2 kovası (özel) + CORS (`PUT` ve `GET`, origin = APP_URL). Vercel fonksiyonları 4,5 MB gövde sınırına sahip olduğundan yüklemeler **imzalı URL ile doğrudan R2'ye** yapılır.
4. Ödeme webhook adresi: `https://<alan>/api/webhooks/payments/<iyzico|stripe>`.
5. Google / Apple ile giriş: adım adım kurulum [`docs/social-login.md`](social-login.md) (dönüş adresleri `https://<alan>/api/auth/callback/google` ve `/apple`; Apple gizli anahtarı `npm run auth:apple-secret`).
6. Cron: `vercel.json` → `/api/cron/jobs` her 10 dk; `CRON_SECRET` tanımlı olmalı.
7. Gerçek zamanlı görüşme: LiveKit Cloud projesi + ses ajanı (LiveKit Agents) ayrı çalışan olarak; Vercel'de WebSocket sunucusu çalıştırılmaz.

## 3. Yayın öncesi kontrol listesi
- [ ] `npm run typecheck && npm run lint && npm test && npm run build` yeşil
- [ ] `APP_MODE=production`, mock sağlayıcı yok, `ADMIN_MFA_ENFORCED=true`
- [ ] Yasal metinler hukuk onayından geçti (Admin → CMS → yasal sayfa "approved")
- [ ] Ödeme sağlayıcısı sandbox'ta uçtan uca (ödeme, webhook, iade) doğrulandı
- [ ] AI sağlayıcısı + gömme modeli doğrulandı; aylık bütçe tanımlandı
- [ ] E-posta alan adı (SPF/DKIM) doğrulandı
- [ ] R2 kovası özel; herkese açık okuma yalnız `public/` öneki için (CDN)
- [ ] Seed çalıştırılmadı (üretimde engellidir); demo hesap yok
- [ ] `db:init:prod` + (isteğe bağlı) `db:samples:prod` ve `db:demo-accounts:prod` çalıştırıldı; bir örnek profilde "Örnek profil" etiketi görünüyor, abonelik/satın alma "Bu ürün satın alınamıyor" diyor
- [ ] Canlı ortam duman testi: `/`, `/explore`, kayıt → doğrulama e-postası, giriş, `/app`, `/admin` (2FA)

## 4. Canlı ortam duman testi (smoke)
`BASE_URL=https://<alan> npx playwright test tests/e2e/smoke.spec.ts`
