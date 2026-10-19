# Test Rehberi

## Birim + entegrasyon (Vitest)

```bash
npm test
```

- `tests/unit/*` — saf mantık: gelir paylaşımı, RBAC izin haritası, durum makineleri, güvenlik motoru (kriz, reşit olmayan, enjeksiyon, kişisel veri maskeleme), persona istemi sıralaması, bilgi tabanı parçalama, MIME imzası, IBAN.
- `tests/integration/*` — **gerçek MongoDB replika seti** (`mongodb-memory-server`, makinedeki `mongod` ikilisiyle; transaction'lar dahil):
  - Cüzdan: eşzamanlı çift harcama engeli, idempotency, değişmez defter, tek seferlik ters kayıt.
  - Ödeme: TEST sağlayıcı → imzalı webhook → hak tanımı; geçersiz imza; tekrar olay; tutar manipülasyonu; içerik satın alma erişimi + creator hak edişi; iade (erişim iptali + hak ediş ters kaydı); abonelik hakları; kendi planını alma engeli.
  - AI: ücretsiz kota → kredi faturalaması, AI etiketi, mock işareti, hak ediş; idempotent gönderim; kriz yanıtı; başkasının sohbetine erişim engeli; hafıza izni ve creator izolasyonu; ikiz yaşam döngüsü (rıza → inceleme → onay → yayın → rıza geri çekme).
  - Özel talepler: kredi blokesi, ret iadesi, tamamlanınca hak ediş.

Testler her dosya için ayrı veritabanı kullanır ve sonunda siler. Dış servis anahtarı gerekmez; AI ve ödeme için deterministik **mock** sağlayıcılar kullanılır (üretimde bu sağlayıcılar yüklenemez).

## Uçtan uca (Playwright)

```bash
npm run test:e2e
```

Dev sunucusunu (3070) ve seed edilmiş yerel veritabanını kullanır. Senaryolar `tests/e2e/` altında: kayıt → e-posta doğrulama (dev outbox) → giriş → hayran karşılama → keşfet → takip → favori → AI sohbeti → abonelik satın alma (TEST ödemesi) → premium içerik → creator başvurusu → admin onayı → AI ikizi oluşturma/inceleme/onay → içerik yayını → içerik satın alma → finansal hareket → creator hak edişi → yetkisiz erişim engelleri. Ayrıntılı liste dosya başlarında.

## Statik denetimler

```bash
npm run typecheck
```

```bash
npm run lint
```
