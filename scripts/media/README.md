# Demo görsellerinin yeniden üretimi

Seed görselleri (kurgusal Türk creator karakterleri) yerelde, yalnız metinden üretilmiştir. Referans ekran görüntüleri kullanılmaz.

- Model: Realistic Vision V6.0 B1 (`SG161222/Realistic_Vision_V6.0_B1_noVAE`, `Realistic_Vision_V6.0_NV_B1_fp16.safetensors`) + VAE `stabilityai/sd-vae-ft-mse` — lisans **CreativeML OpenRAIL-M** (çıktıların ticari kullanımına izin verir; zararlı/yanıltıcı kullanım yasaktır).
- Karakter ve istem kaynağı: `scripts/db/characters.json` → `specs.py`.
- Seçilen adaylar: `selection.json` (her aday elle incelendi; açık giyim, kişi taklidi riski, anlamsız yazı, ikinci yüz içerenler elendi).

## Kurulum (CUDA GPU)

Ayrı bir sanal ortam önerilir (proje bağımlılığı değildir): `torch` (CUDA), `diffusers`, `transformers`, `accelerate`, `safetensors`, `pillow`.
Model dosyaları `<models>/rv6_fp16.safetensors` ve `<models>/vae/` altına indirilir.

## Komutlar

Ortam değişkenleri: `HF_CHARACTERS=scripts/db/characters.json`, `HF_PRIVATE_EXPORT=scripts/db/seed-media`.

```bash
python -I scripts/media/generate.py candidates <models> <aday_klasörü> all
```

```bash
python -I scripts/media/generate.py finalize <models> <aday_klasörü> scripts/media/selection.json public/images/seed
```

Çıktılar: `public/images/seed/{creators,categories}/*.webp` (herkese açık) ve `scripts/db/seed-media/content/*.webp` (seed sırasında erişim kontrollü depolamaya yüklenir). Her dosyanın modeli ve istemi `scripts/media/manifest.json` kaydında tutulur (herkese açık sunulmaz). Aynı tohumlar (seed) ile aynı adaylar üretilir.
