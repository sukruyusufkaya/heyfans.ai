# Ortam Değişkenleri

Tümü `src/config/env.ts` içinde Zod ile doğrulanır. Sırlar asla istemci paketine girmez (hiçbiri `NEXT_PUBLIC_` değildir). Üretimde (`APP_MODE=production`) şu yapılandırmalar başlangıçta **hata** verir: `AI_PROVIDER=mock`, `PAYMENT_PROVIDER=mock`, `STORAGE_PROVIDER=local`, `ADMIN_MFA_ENFORCED=false`, `EMAIL_PROVIDER=outbox`.

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `APP_MODE` | evet | `development` · `demo` · `production` |
| `APP_URL` | evet | Kök URL (OAuth dönüşleri, e-posta bağlantıları, CSRF origin denetimi) |
| `MONGODB_URI` | evet | Replika seti bağlantısı (transaction gerekir). Atlas: `mongodb+srv://…` |
| `MONGODB_DB_NAME` | hayır | Varsayılan `heyfans` |
| `BETTER_AUTH_SECRET` | evet | ≥32 karakter rastgele (oturum/çerez imzası, 2FA sırrı şifrelemesi) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | hayır | Google ile giriş (dönüş: `<APP_URL>/api/auth/callback/google`) |
| `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` | hayır | Apple ile giriş (dönüş: `<APP_URL>/api/auth/callback/apple`) |
| `ADMIN_MFA_ENFORCED` | hayır | Varsayılan `true`; yalnız yerelde `false` yapılabilir |
| `AI_PROVIDER` | hayır | `none` · `mock` (yalnız geliştirme) · `openai-compatible` |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI için | OpenAI uyumlu uç (OpenAI, Gemini `…/v1beta/openai`, OpenRouter, Ollama `http://localhost:11434/v1`) |
| `AI_EMBEDDING_MODEL` / `AI_EMBEDDING_DIMENSIONS` | RAG için | Gömme modeli ve boyutu (Atlas vektör indeksiyle aynı) |
| `AI_PRICE_INPUT_PER_MTOK` / `AI_PRICE_OUTPUT_PER_MTOK` | hayır | Maliyet takibi (USD / 1M token) |
| `AI_MONTHLY_BUDGET_USD` | hayır | Bilgi amaçlı bütçe |
| `VECTOR_SEARCH_MODE` | hayır | `local` (uygulama içi kosinüs) · `atlas` (`$vectorSearch`, indeks adı `knowledge_vector`) |
| `PAYMENT_PROVIDER` | hayır | `none` · `mock` (yalnız geliştirme) · `iyzico` (iskelet) · `stripe` |
| `PAYMENT_API_KEY` / `PAYMENT_SECRET_KEY` | ödeme için | Sağlayıcı anahtarları |
| `PAYMENT_WEBHOOK_SECRET` | ödeme için | Webhook imza sırrı (`/api/webhooks/payments/<sağlayıcı>`) |
| `STORAGE_PROVIDER` | evet (üretimde `s3`) | `local` · `s3` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | s3 için | Cloudflare R2/AWS S3/MinIO. Kova **özel** olmalı |
| `S3_PUBLIC_BASE_URL` | hayır | Herkese açık varlıklar (avatar/kapak) için CDN kökü |
| `EMAIL_PROVIDER` / `RESEND_API_KEY` / `EMAIL_FROM` | üretimde | `resend`; gönderen alan adı doğrulanmalı |
| `RTC_PROVIDER` / `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | görüşme için | LiveKit Cloud |
| `AGE_VERIFICATION_PROVIDER` / `AGE_VERIFICATION_PROVIDER_KEY` | hayır | Yaş güvencesi sağlayıcısı (seçilmedi) |
| `CRON_SECRET` | üretimde | Vercel Cron → `/api/cron/jobs` (Bearer) |
| `DATA_ENCRYPTION_KEY` | evet | 32 bayt base64 (IBAN vb. AES-256-GCM) |
| `MEDIA_SIGNING_SECRET` | evet | Özel medya imzalı belirteçleri |
| `REDIS_URL` | hayır | İleride hız sınırı için (şimdilik MongoDB) |
| `SEED_DEMO_PASSWORD` | yalnız seed | Demo hesap parolası (≥10 karakter) |

Rastgele değer üretimi:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
