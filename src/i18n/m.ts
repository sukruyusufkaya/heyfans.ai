/**
 * Çeviri işaretçisi: metni olduğu gibi döndürür, yalnız `npm run i18n:extract` tarafından kataloğa alınması için işaretler.
 * Bileşen dışındaki sabitlerde (etiket haritaları, zod mesajları, seçenek listeleri) kullanılır; gösterirken `t(değer)` çağrılır.
 *
 *   const STATUS = { active: m("Aktif"), paused: m("Duraklatıldı") };
 *   <Badge>{t(STATUS[s])}</Badge>
 */
export function m<T extends string>(source: T): T {
  return source;
}
