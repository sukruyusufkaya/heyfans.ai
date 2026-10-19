# Bilinen Sınırlar ve Entegrasyon Gereksinimleri

Çalışan özelliklerle yalnız tasarlanmış/bekleyen özellikler ayrı tutulmuştur.

## Dış entegrasyon nedeniyle tamamlanamayanlar
| Alan | Durum | Gerekli olan |
|---|---|---|
| Canlı ödeme | Yalnız **TEST** (mock) sağlayıcı uçtan uca çalışır (ödeme → imzalı webhook → hak tanımı → iade). Stripe adaptörü yazıldı ama gerçek anahtarla doğrulanmadı; iyzico adaptörü iskelet | Sağlayıcı kararı (K-01), tüzel kişilik, sandbox anahtarları, pazaryeri (alt üye işyeri) sözleşmesi |
| Abonelik yenileme | İlk dönem ödemesi ve süre sonu kapatma çalışır; otomatik yenileme (recurring) webhook'ları sağlayıcıya göre eklenecek | Seçilen sağlayıcının abonelik API'si |
| Creator ödemeleri (payout) | Hesap (şifreli IBAN), talep, admin onayı ve "ödendi" işaretleme çalışır; para transferi elle/sağlayıcıyla yapılır. `features.payouts` varsayılan kapalı | Pazaryeri/payout API'si, finansal uygunluk |
| AI sohbet | Test modunda deterministik yanıtlar ("Test yanıtı"). Gerçek model OpenAI uyumlu uçla hazır | `AI_*` anahtarları, model seçimi (K-07) |
| Gömme/RAG | Yerelde uygulama içi kosinüs; Atlas `$vectorSearch` kodu hazır, indeks tanımı belgede | Atlas vektör indeksi + gömme modeli |
| Sesli/görüntülü görüşme | Yetki, dakika faturalaması ve LiveKit belirteci hazır; ses/görüntü AI ajanı (STT→LLM→TTS) yok | LiveKit Cloud + ses ajanı + TTS/STT sağlayıcısı (K-08) |
| Ses/görünüm benzerliği üretimi | Rıza, kimlik koşulu ve aç/kapa denetimi hazır; üretim modeli yok, `features.likenessGeneration=false` | Lisanslı ses klonlama / video sağlayıcısı + hukuki onay |
| E-posta | Yerelde `devOutbox`; Resend adaptörü hazır | Resend anahtarı + alan adı doğrulaması (K-10) |
| Medya depolama | Yerel disk (geliştirme); S3/R2 adaptörü ve imzalı yükleme hazır | R2/S3 kovası (K-11) |
| Virüs/CSAM taraması | Yükleme sonrası "skipped" olarak işaretlenir; içerik moderasyon akışı devrede | Tarama sağlayıcısı (ör. ClamAV servisi, PhotoDNA benzeri) |
| Yaş doğrulama | 18+ beyan (düşük güvence) kaydı; güçlü doğrulama yok, yetişkin özellikleri kapalı | Yaş güvencesi sağlayıcısı |
| Kimlik doğrulama (creator) | Admin incelemesiyle; belge saklanmaz | KYC sağlayıcısı |
| Sosyal hesap sahipliği | Biyografi kodu ile elle doğrulama | Instagram/TikTok/YouTube OAuth uygulamaları |
| Google/Apple ile giriş | Kod hazır, düğmeler yapılandırılmadıysa devre dışı | OAuth istemci kimlikleri |
| Mobil uygulamalar | Web uygulaması mobil uyumlu; mağaza uygulaması yok | — |
| i18n | Mimari hazır, yalnız Türkçe | İngilizce çeviri |

## Ürün/hukuk kararı bekleyenler
- Yasal metinler **taslaktır** ("Hukuki onay gerekli" etiketiyle yayında) — hukuk uzmanı onayı şart.
- Gelir paylaşımı (%70/%30) "net" tanımı varsayılan değerlerle (`platformSettings.revenue`); finansal onay gerekli (K-05).
- Yetişkin içerik kapsamı: kapalı (K-04).

## Ajan doğrulamalarından çıkan açık noktalar
- Bildirim tercihleri (e-posta/push) kaydedilir; e-posta/push dağıtımı henüz yok, bildirimler uygulama içidir.
- `security.sessionMaxAgeDays` ve `security.maxLoginAttempts` ayarları kaydedilir ama Better Auth yapılandırması statik olduğundan dinamik uygulanmaz (değişiklik dağıtım gerektirir; arayüz uyarır).
- AI ikizi kalite puanları (`twin.quality`) için otomatik değerlendirme hattı yok; Test Alanı uydurma puan göstermez.
- Keşfet'te konum filtresi yok (creator konumu serbest metin).
- Admin CMS ana sayfa bölümlerinin sırasını değiştirmez (yalnız metin/CTA).
- Sesli/görüntülü görüşmenin canlı yolu (LiveKit istemcisi + dakika faturalaması) derlenir ama RTC anahtarı olmadan uçtan uca denenemedi.
- Admin sayfalarında `loading.tsx` olduğundan izin reddi HTTP 200 + akışlı yönlendirme ile döner (içerik sızmaz).

## Teknik sınırlar
- Seed creator görselleri temsili degrade kompozisyonlardır (tasarım ZIP'lerindeki görseller UI içeren ekran kırpıntıları olduğu için kullanılmadı). Gerçek creator yüklemeleri otomatik olarak görünür.
- Hız sınırı MongoDB üzerinde; çok yüksek trafikte Redis adaptörü önerilir.
- Trend skorları analitik olaylarından basit ağırlıklı hesapla üretilir; anomali/bot filtrelemesi yok.
- AI hafıza çıkarımı kural tabanlıdır (LLM çağrısı yok); kullanıcı düzenleyip silebilir.
