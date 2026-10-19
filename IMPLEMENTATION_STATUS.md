# HEYFANS — Uygulama Durumu

Durum değerleri: `Not Started` · `UI Complete` · `Backend Connected` · `Tested` · `Production Ready`
**Tested** = gerçek veritabanıyla HTTP/betik/headless tarayıcı ile doğrulandı (375/1440 px taşma ve konsol hatası kontrolü dahil). **Production Ready** hiçbir sayfaya verilmedi: dış entegrasyonların (ödeme, AI, RTC, e-posta, depolama) canlı anahtarla doğrulanması ve hukuk onayı gerekir.

Son güncelleme: 2026-10-19 · Rotalar: 74/74 + 9 yardımcı (`/checkout/test/[id]`, `/checkout/result`, `/login/two-factor`, `/login/continue`, `/reset-password`, `/security/mfa`, `/help/[slug]`, `/studio/content/[id]/edit`, `/dev/outbox`)

## Altyapı
| Bileşen | Durum | Not |
|---|---|---|
| Next.js 16.4 iskeleti, tasarım token'ları, UI kütüphanesi, 6 layout | Tested | `next build` başarılı |
| MongoDB modeli (52 model), indeksler, seed, `db:init` | Tested | Şema belgesi otomatik üretilir |
| Better Auth (e-posta/şifre, doğrulama, sıfırlama, TOTP 2FA, yedek kodlar) | Tested | Google/Apple anahtarı yok (düğmeler devre dışı) |
| RBAC (7 admin rolü) + anlık rol/durum tazeleme | Tested | Rol bazlı erişim ve eylem reddi HTTP ile doğrulandı |
| Cüzdan defteri (atomik, idempotent, değişmez) | Tested | Eşzamanlı çift harcama testi |
| Ödeme soyutlaması + imzalı webhook + iade + hak ediş | Tested (TEST sağlayıcı) | Canlı sağlayıcı yok; Stripe adaptörü doğrulanmadı, iyzico iskelet |
| AI geçidi + persona/RAG/hafıza/güvenlik + akış | Tested (test sağlayıcı) | Gerçek model anahtarı yok |
| Medya (local/S3) + MIME imza doğrulaması + erişim kontrollü okuma | Tested (local) | R2/S3 anahtarı yok; virüs taraması yok |
| İş kuyruğu + Vercel Cron (indeksleme, zamanlanmış yayın, abonelik süre sonu) | Tested | |
| RTC (LiveKit) + dakika faturalaması | Backend Connected | LiveKit + ses ajanı yok; canlı yol denenemedi |
| Bakım modu, AI aylık bütçesi | Tested | |
| Testler | 42 birim/entegrasyon + Playwright duman/yolculuk | `docs/testing.md` |

## Sayfalar
| # | Sayfa | Route | Durum | Eksik / blokaj |
|---|---|---|---|---|
| 1 | Ana Sayfa | `/` | Tested | Demo creator fotoğrafları yerelde üretilmiş kurgusal Türk karakterler (D-33) |
| 2 | Keşfet | `/explore` | Tested | Konum filtresi yok (veride konum araması yok) |
| 3 | Trendler | `/trending` | Tested | Demo ortamda olaylar seed verisi |
| 4 | Kategoriler | `/categories` | Tested | |
| 5 | Kategori Detayı | `/categories/[slug]` | Tested | |
| 6 | İçerik Üreticisi Profili | `/creators/[username]` | Tested | |
| 7 | Nasıl Çalışır? | `/how-it-works` | Tested | Uydurma kullanıcı yorumu yok |
| 8 | İçerik Üreticileri İçin | `/for-creators` | Tested | Kazanç örneği "örnek senaryo" |
| 9 | Fiyatlandırma | `/pricing` | Tested | |
| 10 | Hakkımızda | `/about` | Tested | Şirket bilgisi/tarih eklenmedi |
| 11 | Giriş Yap | `/login` | Tested | Sosyal giriş anahtarsız |
| 12 | Kayıt Ol | `/register` | Tested | Şartlar onayı sunucuda zorunlu |
| 13 | Şifremi Unuttum | `/forgot-password` | Tested | Gerçek e-posta sağlayıcısı yok (outbox) |
| 14 | Hesap Doğrulama | `/verify` | Tested | 〃 |
| 15 | Hayran Karşılama | `/onboarding/fan` | Tested | |
| 16 | İçerik Üreticisi Karşılama | `/onboarding/creator` | Tested | KYC ve sosyal OAuth sağlayıcısı yok (admin incelemesi) |
| 17 | Yaş Doğrulama | `/age-verification` | Tested | Yalnız beyan (düşük güvence); referans tasarım yoktu |
| 18 | Hayran Ana Paneli | `/app` | Tested | |
| 19 | Takip Ettiklerim | `/app/following` | Tested | |
| 20 | Favorilerim | `/app/favorites` | Tested | |
| 21 | Sohbet Kutusu | `/chat` | Tested | |
| 22 | AI İkiziyle Sohbet | `/chat/[username]` | Tested | Test AI sağlayıcısı |
| 23 | Sesli Görüşme | `/experiences/voice/[username]` | Backend Connected | RTC yapılandırılmadı → dürüst "kullanılamıyor" durumu test edildi |
| 24 | Görüntülü Görüşme | `/experiences/video/[username]` | Backend Connected | 〃 |
| 25 | İçerik Galerisi | `/creators/[username]/content` | Tested | |
| 26 | Premium İçerik Detayı | `/content/[id]` | Tested | |
| 27 | Üyelik Seçimi | `/creators/[username]/membership` | Tested | |
| 28 | Ödeme | `/checkout` | Tested (TEST ödeme) | Canlı sağlayıcı yok; kart bilgisi sağlayıcı sayfasında |
| 29 | Kredi ve Cüzdan | `/app/wallet` | Tested | |
| 30 | Aboneliklerim | `/app/subscriptions` | Tested | Otomatik yenileme sağlayıcıya bağlı |
| 31 | Özel Deneyimler | `/app/experiences` | Tested | |
| 32 | Hediyeler ve Bahşişler | `/app/gifts` | Tested | |
| 33 | Bildirimler | `/app/notifications` | Tested | E-posta/push dağıtımı yok (uygulama içi) |
| 34 | Profilim | `/app/profile` | Tested | |
| 35 | Kişiselleştirme ve AI Hafızası | `/app/personalization` | Tested | |
| 36 | Hesap ve Ödeme Ayarları | `/app/settings` | Tested | Hesap silme/veri indirme destek talebiyle işlenir |
| 37 | Genel Panel | `/studio` | Tested | |
| 38 | AI İkizim | `/studio/ai-twin` | Tested | |
| 39 | Kişilik Stüdyosu | `/studio/personality` | Tested | |
| 40 | Bilgi Tabanı | `/studio/knowledge` | Tested | Atlas vektör indeksi üretimde kurulacak |
| 41 | Ses ve Görünüm | `/studio/voice` | Tested | Ses sentezi/benzerlik sağlayıcısı yok (özellikler kapalı) |
| 42 | Sınırlar ve İzinler | `/studio/boundaries` | Tested | |
| 43 | AI İkizi Test Alanı | `/studio/test` | Tested | Otomatik kalite puanlama hattı yok |
| 44 | İçerik Kütüphanesi | `/studio/content` | Tested | |
| 45 | İçerik Oluşturma | `/studio/content/new` | Tested | |
| 46 | Üyelik Yönetimi | `/studio/memberships` | Tested | |
| 47 | Özel Talepler | `/studio/requests` | Tested | |
| 48 | Sohbetler | `/studio/conversations` | Tested | Mesaj içeriği bilinçli olarak gösterilmez |
| 49 | Hayranlar ve Kitle | `/studio/fans` | Tested | |
| 50 | Gelirler | `/studio/earnings` | Tested | |
| 51 | Ödemeler | `/studio/payouts` | Tested | `features.payouts` kapalı; para transferi sağlayıcısı yok |
| 52 | Analitik | `/studio/analytics` | Tested | |
| 53 | Profil Düzenleyici | `/studio/profile` | Tested | |
| 54 | Stüdyo Ayarları | `/studio/settings` | Tested | |
| 55 | Admin Genel Paneli | `/admin` | Tested | |
| 56 | Creator Yönetimi | `/admin/creators` | Tested | |
| 57 | Kullanıcı Yönetimi | `/admin/users` | Tested | |
| 58 | AI İkizi Yönetimi | `/admin/ai-twins` | Tested | |
| 59 | İçerik Moderasyonu | `/admin/moderation` | Tested | Otomatik görsel tarama sağlayıcısı yok |
| 60 | Raporlar ve İtirazlar | `/admin/reports` | Tested | |
| 61 | Finans ve İşlemler | `/admin/finance` | Tested | Banka mutabakatı sağlayıcı gerektirir |
| 62 | AI Operasyonları | `/admin/ai-operations` | Tested | GPU/kapasite telemetrisi yok |
| 63 | Platform Analitiği | `/admin/analytics` | Tested | Trafik kaynağı izlenmiyor (bilinçli) |
| 64 | CMS ve Kampanyalar | `/admin/content` | Tested | Bölüm sıralaması düzenlenemiyor |
| 65 | Platform Ayarları | `/admin/settings` | Tested | `security.sessionMaxAgeDays/maxLoginAttempts` kaydedilir ama dinamik uygulanmaz |
| 66 | Yardım Merkezi | `/help` | Tested | |
| 67 | İletişim | `/contact` | Tested | |
| 68 | Güven ve Güvenlik | `/trust-and-safety` | Tested | |
| 69 | Gizlilik Politikası | `/privacy` | Tested | **Taslak — hukuki onay gerekli** |
| 70 | Kullanım Şartları | `/terms` | Tested | **Taslak — hukuki onay gerekli** |
| 71 | Creator Sözleşmesi | `/creator-agreement` | Tested | **Taslak — hukuki onay gerekli** |
| 72 | Topluluk Kuralları | `/community-guidelines` | Tested | **Taslak — hukuki onay gerekli** |
| 73 | Telif ve İçerik Kaldırma | `/copyright` | Tested | **Taslak — hukuki onay gerekli** |
| 74 | Çerez Politikası | `/cookies` | Tested | **Taslak — hukuki onay gerekli** |
