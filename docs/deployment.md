# Dağıtım (Vercel + MongoDB Atlas)

## 1. MongoDB Atlas
1. **Bu proje için ayrı bir küme/proje** açın (mevcut paylaşımlı küme 500 koleksiyon sınırına yakın; bu uygulama ~57 koleksiyon kullanır). Bölge: Frankfurt (Vercel `fra1` ile aynı).
2. Veritabanı kullanıcısı (yalnız bu DB'ye `readWrite`), ağ erişimi: Vercel için `0.0.0.0/0` + güçlü parola veya Vercel Secure Compute.
3. İlk kurulum (indeksler + varsayılan ayarlar): yerelden `MONGODB_URI=<atlas> npm run db:init`.
4. RAG için Atlas Vector Search indeksi `knowledgeChunks` koleksiyonunda, adı `knowledge_vector`:
   ```json
   { "fields": [
     { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
     { "type": "filter", "path": "creatorId" },
     { "type": "filter", "path": "active" } ] }
   ```
   ve `VECTOR_SEARCH_MODE=atlas`.
5. İlk süper yönetici: `npm run admin:create -- admin@alanadi.com super_admin` (parola terminalde sorulur; ilk girişte 2FA kurulumu zorunlu).

## 2. Vercel
1. Depoyu Vercel projesine bağlayın (Framework: Next.js; `vercel.json` bölge `fra1` ve cron tanımı içerir).
2. Ortam değişkenlerini **Production** ve **Preview** için ayrı girin (bkz. `docs/environment.md`). Preview için ayrı bir Atlas veritabanı kullanın.
3. Medya: Cloudflare R2 kovası (özel) + CORS (`PUT` ve `GET`, origin = APP_URL). Vercel fonksiyonları 4,5 MB gövde sınırına sahip olduğundan yüklemeler **imzalı URL ile doğrudan R2'ye** yapılır.
4. Ödeme webhook adresi: `https://<alan>/api/webhooks/payments/<iyzico|stripe>`.
5. OAuth dönüş adresleri: `https://<alan>/api/auth/callback/google` ve `/apple`.
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
- [ ] Canlı ortam duman testi: `/`, `/explore`, kayıt → doğrulama e-postası, giriş, `/app`, `/admin` (2FA)

## 4. Canlı ortam duman testi (smoke)
`BASE_URL=https://<alan> npx playwright test tests/e2e/smoke.spec.ts`
