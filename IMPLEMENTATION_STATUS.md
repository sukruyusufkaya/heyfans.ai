# HEYFANS — Uygulama Durumu

Durum değerleri: `Not Started` · `UI Complete` · `Backend Connected` · `Tested` · `Production Ready`
"Production Ready" ancak dış entegrasyonlar (ödeme, AI, RTC, e-posta, depolama) canlı anahtarla doğrulandıktan sonra verilir.

Son güncelleme: 2026-10-19

## Altyapı
| Bileşen | Durum | Not |
|---|---|---|
| Next.js 16.4 iskeleti, tasarım token'ları, UI kütüphanesi | Backend Connected | |
| MongoDB modeli (55 koleksiyon), indeksler, seed | Tested | Yerel replika seti; seed `--reset` doğrulandı |
| Better Auth (e-posta/şifre, doğrulama, sıfırlama, 2FA, OAuth hazır) | Backend Connected | Google/Apple anahtarı yok |
| RBAC (7 admin rolü, izin haritası) | Backend Connected | |
| Cüzdan defteri (atomik, idempotent) | Backend Connected | Seed sırasında yetersiz bakiye koruması doğrulandı |
| Ödeme soyutlaması + imzalı webhook + iade | Backend Connected | Yalnız TEST (mock) sağlayıcı; iyzico iskelet, Stripe adaptörü test edilmedi |
| AI geçidi + persona/bilgi/hafıza/güvenlik + akışlı sohbet | Backend Connected | Gerçek sağlayıcı anahtarı yok → test modu |
| Medya (local/S3) + MIME imza doğrulaması | Backend Connected | S3/R2 anahtarı yok |
| İş kuyruğu + Vercel Cron | Backend Connected | |
| RTC (LiveKit) | UI yok / adaptör hazır | LiveKit anahtarı + ses ajanı yok |

## Sayfalar
| # | Sayfa | Route | Durum | Eksik / blokaj |
|---|---|---|---|---|
| 1 | Ana Sayfa | `/` | Backend Connected | Gerçek creator fotoğrafları yok (temsili görsel) |
| 2 | Keşfet | `/explore` | Not Started | |
| 3 | Trendler | `/trending` | Not Started | |
| 4 | Kategoriler | `/categories` | Not Started | |
| 5 | Kategori Detayı | `/categories/[slug]` | Not Started | |
| 6 | İçerik Üreticisi Profili | `/creators/[username]` | Not Started | |
| 7 | Nasıl Çalışır? | `/how-it-works` | Not Started | |
| 8 | İçerik Üreticileri İçin | `/for-creators` | Not Started | |
| 9 | Fiyatlandırma | `/pricing` | Not Started | |
| 10 | Hakkımızda | `/about` | Not Started | |
| 11 | Giriş Yap | `/login` | Not Started | |
| 12 | Kayıt Ol | `/register` | Not Started | |
| 13 | Şifremi Unuttum | `/forgot-password` | Not Started | |
| 14 | Hesap Doğrulama | `/verify` | Not Started | |
| 15 | Hayran Karşılama | `/onboarding/fan` | Not Started | |
| 16 | İçerik Üreticisi Karşılama | `/onboarding/creator` | Not Started | |
| 17 | Yaş Doğrulama | `/age-verification` | Not Started | Referans görsel yok |
| 18 | Hayran Ana Paneli | `/app` | Not Started | |
| 19 | Takip Ettiklerim | `/app/following` | Not Started | |
| 20 | Favorilerim | `/app/favorites` | Not Started | |
| 21 | Sohbet Kutusu | `/chat` | Not Started | |
| 22 | AI İkiziyle Sohbet | `/chat/[username]` | Not Started | |
| 23 | Sesli Görüşme | `/experiences/voice/[username]` | Not Started | RTC |
| 24 | Görüntülü Görüşme | `/experiences/video/[username]` | Not Started | RTC |
| 25 | İçerik Galerisi | `/creators/[username]/content` | Not Started | |
| 26 | Premium İçerik Detayı | `/content/[id]` | Not Started | |
| 27 | Üyelik Seçimi | `/creators/[username]/membership` | Not Started | |
| 28 | Ödeme | `/checkout` | Not Started | |
| 29 | Kredi ve Cüzdan | `/app/wallet` | Not Started | |
| 30 | Aboneliklerim | `/app/subscriptions` | Not Started | |
| 31 | Özel Deneyimler | `/app/experiences` | Not Started | |
| 32 | Hediyeler ve Bahşişler | `/app/gifts` | Not Started | |
| 33 | Bildirimler | `/app/notifications` | Not Started | |
| 34 | Profilim | `/app/profile` | Not Started | |
| 35 | Kişiselleştirme ve AI Hafızası | `/app/personalization` | Not Started | |
| 36 | Hesap ve Ödeme Ayarları | `/app/settings` | Not Started | |
| 37 | Genel Panel | `/studio` | Not Started | |
| 38 | AI İkizim | `/studio/ai-twin` | Not Started | |
| 39 | Kişilik Stüdyosu | `/studio/personality` | Not Started | |
| 40 | Bilgi Tabanı | `/studio/knowledge` | Not Started | |
| 41 | Ses ve Görünüm | `/studio/voice` | Not Started | |
| 42 | Sınırlar ve İzinler | `/studio/boundaries` | Not Started | |
| 43 | AI İkizi Test Alanı | `/studio/test` | Not Started | |
| 44 | İçerik Kütüphanesi | `/studio/content` | Not Started | |
| 45 | İçerik Oluşturma | `/studio/content/new` | Not Started | |
| 46 | Üyelik Yönetimi | `/studio/memberships` | Not Started | |
| 47 | Özel Talepler | `/studio/requests` | Not Started | |
| 48 | Sohbetler | `/studio/conversations` | Not Started | |
| 49 | Hayranlar ve Kitle | `/studio/fans` | Not Started | |
| 50 | Gelirler | `/studio/earnings` | Not Started | |
| 51 | Ödemeler | `/studio/payouts` | Not Started | |
| 52 | Analitik | `/studio/analytics` | Not Started | |
| 53 | Profil Düzenleyici | `/studio/profile` | Not Started | |
| 54 | Stüdyo Ayarları | `/studio/settings` | Not Started | |
| 55 | Admin Genel Paneli | `/admin` | Not Started | |
| 56 | Creator Yönetimi | `/admin/creators` | Not Started | |
| 57 | Kullanıcı Yönetimi | `/admin/users` | Not Started | |
| 58 | AI İkizi Yönetimi | `/admin/ai-twins` | Not Started | |
| 59 | İçerik Moderasyonu | `/admin/moderation` | Not Started | |
| 60 | Raporlar ve İtirazlar | `/admin/reports` | Not Started | |
| 61 | Finans ve İşlemler | `/admin/finance` | Not Started | |
| 62 | AI Operasyonları | `/admin/ai-operations` | Not Started | |
| 63 | Platform Analitiği | `/admin/analytics` | Not Started | |
| 64 | CMS ve Kampanyalar | `/admin/content` | Not Started | |
| 65 | Platform Ayarları | `/admin/settings` | Not Started | |
| 66 | Yardım Merkezi | `/help` | Not Started | |
| 67 | İletişim | `/contact` | Not Started | |
| 68 | Güven ve Güvenlik | `/trust-and-safety` | Not Started | |
| 69 | Gizlilik Politikası | `/privacy` | Not Started | Hukuki onay gerekli |
| 70 | Kullanım Şartları | `/terms` | Not Started | Hukuki onay gerekli |
| 71 | Creator Sözleşmesi | `/creator-agreement` | Not Started | Hukuki onay gerekli |
| 72 | Topluluk Kuralları | `/community-guidelines` | Not Started | Hukuki onay gerekli |
| 73 | Telif ve İçerik Kaldırma | `/copyright` | Not Started | Hukuki onay gerekli |
| 74 | Çerez Politikası | `/cookies` | Not Started | Hukuki onay gerekli |
