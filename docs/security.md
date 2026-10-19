# Güvenlik Notları

| Kontrol | Uygulama |
|---|---|
| Kimlik doğrulama | Better Auth: scrypt parola özeti, zorunlu e-posta doğrulama, şifre sıfırlamada tüm oturumların iptali, DB oturumları (30 gün, günlük yenileme), 5 dk çerez önbelleği, `hf.` önekli HttpOnly/SameSite çerezler, HTTPS'te Secure |
| Kaba kuvvet | Better Auth hız sınırı (giriş 8/dk, kayıt 5/dk, sıfırlama 5/5dk, TOTP 6/dk) + uygulama uçlarında MongoDB TTL'li sayaçlar (`rateLimit`) |
| Yönetici hesapları | Genel kayıttan admin açılamaz (kayıt kancası rolü `fan`'a zorlar); yalnız CLI/süper yönetici atar. Admin oturumu TOTP 2FA zorunlu (üretimde kapatılamaz). `/alfitechadminpanel` yalnız yönlendirmedir |
| Yetkilendirme | Rol + izin haritası (`src/lib/permissions`), sayfa (`requireAdmin`) ve eylem (`assertAdmin`) düzeyinde; kaynak sahipliği servis katmanında. Proxy yalnız yönlendirme kolaylığıdır |
| Hassas veri erişimi | Özel sohbetler creator'lara kapalı; admin için `conversations.read_sensitive` + açık vaka + gerekçe + denetim kaydı |
| Denetim | Değişmez `auditLogs` (güncelleme/silme şema düzeyinde engelli); IP SHA-256 özetlenir |
| CSRF | Server Actions: Next.js origin denetimi. Çerezli Route Handler'lar: `assertSameOrigin` |
| XSS | React kaçışı; `dangerouslySetInnerHTML` yalnız JSON-LD (JSON.stringify); CSP başlığı (`frame-ancestors 'none'`, `object-src 'none'`) |
| NoSQL enjeksiyonu | Tüm girdiler Zod ile ilkel tiplere daraltılır; kimlikler `objectIdSchema`; `strictQuery`; regex aramalarda `escapeRegex` |
| Para işlemleri | Sunucu fiyatlandırması, imzalı ve zaman damgalı webhook, olay tekilleştirme, tutar/para birimi eşleşmesi, idempotency anahtarları, koşullu atomik düşüm, değişmez defter, ters kayıtla iade |
| Dosya yükleme | Amaç bazlı MIME izin listesi, boyut sınırları, magic-bytes doğrulaması, özel kova + erişim kontrollü okuma, kısa ömürlü imzalı URL. Virüs/CSAM taraması: **sağlayıcı yok** (bkz. bilinen sınırlar) |
| AI güvenliği | Platform politikası istemin en üstünde ve creator kurallarından baskın; veri blokları etiket kaçışına karşı nötralize; giriş (kriz/reşit olmayan/şiddet/yasa dışı/enjeksiyon) ve çıkış (kişisel veri maskeleme, insan iddiası, platform dışı iletişim) filtreleri; AI etiketi zorunlu; hafıza yalnız izinle ve user×creator kapsamında |
| Gizli anahtarlar | Yalnız ortam değişkenleri; `.env` git dışı; IBAN AES-256-GCM ile şifreli, ekranda maskeli |
| Başlıklar | HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Yaş | 18+ beyan kaydı (düşük güvence); güçlü doğrulama sağlayıcı gerektirir; yetişkin özellikleri bayrakla kapalı |
| KVKK/GDPR altyapısı | Rıza kayıtları (creator rızaları, çerez tercihleri), veri silme/indirme talepleri, AI hafızası silme, saklama süreleri (bildirim 180 gün, analitik 400 gün TTL). Hukuki uygunluk kodla tamamlanmış sayılmaz |
