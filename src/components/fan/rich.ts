import { Children, type ReactNode } from "react";
import type { RichValues, Translator } from "@/i18n/translate";

/**
 * `t.rich` çıktısını anahtarlı düğümlere çevirir (React dizi-anahtarı uyarısı çıkmasın).
 * Kaynak metin `m("…")` ile işaretlenir ki katalog çıkarıcısı onu görsün:
 *
 *   rich(t, m("<b>{n}</b> içerik bulundu"), { n, b: (c) => <b>{c}</b> })
 */
export function rich(t: Translator, source: string, values: RichValues<ReactNode>): ReactNode {
  return Children.toArray(t.rich<ReactNode>(source, values));
}
