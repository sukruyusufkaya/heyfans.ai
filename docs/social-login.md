# Google ve Apple ile giriş — kurulum rehberi

Kod hazırdır (Better Auth). Anahtarlar tanımlanınca giriş ve kayıt sayfalarında ilgili düğme **kendiliğinden** görünür; tanımlı değilse düğme hiç gösterilmez.

| Değişken | Nereden |
|---|---|
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google Cloud Console → OAuth istemcisi |
| `AUTH_APPLE_ID` | Apple Developer → Services ID (ör. `ai.heyfans.web`) |
| `AUTH_APPLE_SECRET` | `npm run auth:apple-secret` ile üretilen JWT (en fazla 6 ay geçerli) |

Dönüş adresleri `APP_URL` üzerinden kurulur; canlıda `APP_URL=https://heyfans.ai` (veya kullanılan alan adı) olmalıdır.

- Google dönüş adresi: `https://heyfans.ai/api/auth/callback/google`
- Apple dönüş adresi: `https://heyfans.ai/api/auth/callback/apple`

Değerleri **Vercel → Project → Settings → Environment Variables (Production)** altına ve yerel üretim betikleri için `.env.production.local` dosyasına girin, ardından yeniden dağıtın.

## Google

1. <https://console.cloud.google.com> → yeni proje oluşturun (ör. "HEYFANS").
2. **Google Auth Platform → Branding (OAuth onay ekranı)**
   - Uygulama adı: HEYFANS · destek e-postası · logo: `public/brand/icon-512.png` (120×120'ye küçültülmüş kare)
   - Uygulama ana sayfası `https://heyfans.ai`, gizlilik `https://heyfans.ai/privacy`, şartlar `https://heyfans.ai/terms`
   - Yetkili alan adı: `heyfans.ai`
3. **Audience**: kullanıcı türü *External* → **Publish app** (Üretime al). Yalnız `openid`, `email`, `profile` kapsamları kullanıldığı için uygulama incelemesi gerekmez; logonun görünmesi için Google birkaç gün içinde marka doğrulaması yapabilir.
4. **Clients → Create client → Web application**
   - Authorized JavaScript origins: `https://heyfans.ai` (yerel deneme için ayrıca `http://localhost:3070`)
   - Authorized redirect URIs: `https://heyfans.ai/api/auth/callback/google` (yerel: `http://localhost:3070/api/auth/callback/google`)
5. Client ID → `AUTH_GOOGLE_ID`, Client secret → `AUTH_GOOGLE_SECRET`. Yeniden dağıtın.

## Apple

Ön koşul: **Apple Developer Program** üyeliği (yıllık ücretli; kurumsal hesap için D-U-N-S numarası). Apple `localhost` ve `http` adreslerini kabul etmez; deneme gerçek alan adında (veya https'li bir önizleme alan adında) yapılır.

1. <https://developer.apple.com/account> → **Certificates, Identifiers & Profiles → Identifiers**
   - **App IDs → +** → *App* → Bundle ID: `ai.heyfans.app` → *Capabilities*: **Sign in with Apple** işaretli → kaydet.
2. **Identifiers → Services IDs → +**
   - Açıklama: "HEYFANS Web", Identifier: `ai.heyfans.web` → bu değer **`AUTH_APPLE_ID`** olur.
   - **Sign in with Apple → Configure**: Primary App ID = `ai.heyfans.app`; *Domains and Subdomains*: `heyfans.ai`; *Return URLs*: `https://heyfans.ai/api/auth/callback/apple` → kaydet.
3. **Keys → +** → ad: "HEYFANS Sign in with Apple" → **Sign in with Apple** → Configure → Primary App ID `ai.heyfans.app` → kaydet → **`AuthKey_XXXXXXXXXX.p8` dosyasını indirin** (yalnız bir kez indirilebilir; depoya koymayın, parola yöneticisinde saklayın). *Key ID*'yi not edin.
4. **Team ID**: hesap sayfasının sağ üstündeki 10 karakterlik kimlik.
5. Gizli anahtarı üretin:
   ```bash
   npm run auth:apple-secret -- --team <TEAM_ID> --key <KEY_ID> --client ai.heyfans.web --p8 ./AuthKey_XXXXXXXXXX.p8
   ```
   Çıktı → **`AUTH_APPLE_SECRET`**. Bu değer en fazla **180 gün** geçerlidir; süre dolmadan aynı komutla yenileyip Vercel'de güncelleyin (takvime hatırlatma koyun).
6. **E-posta aktarımı (önerilir)**: Kullanıcılar "E-postamı gizle" seçerse adresleri `@privaterelay.appleid.com` olur. Bu adreslere doğrulama/şifre e-postası ulaşması için **Services → Sign in with Apple for Email Communication → Configure** altında `heyfans.ai` alan adını ve gönderen adresi (ör. `no-reply@heyfans.ai`) kaydedin; alan adında SPF kaydı (Resend) olmalıdır.
7. Yeniden dağıtın. Apple, kullanıcı adını yalnız **ilk girişte** iletir; sonraki girişlerde ad değişmez.

## Kontrol

- Giriş sayfasında yalnız tanımlı sağlayıcıların düğmesi görünür.
- İlk Google/Apple girişinde aynı e-postayla kayıtlı bir hesap varsa hesaplar bağlanır (Better Auth hesap bağlama, `trustedProviders: google, apple`).
- Kullanıcı sağlayıcı ekranında vazgeçerse ya da dönüşte hata olursa `/login?social=1&error=<kod>` adresine dönülür ve Türkçe mesaj gösterilir (`socialErrorMessage`, `src/features/auth/messages.ts`).
- `.p8` dosyaları `.gitignore`'dadır; yine de proje klasörü dışında saklayın.
- Apple dönüşü `appleid.apple.com`'dan POST ile gelir; uygulama bu kaynağı Apple tanımlıyken otomatik olarak güvenilir sayar (`src/lib/auth/auth.ts`).
