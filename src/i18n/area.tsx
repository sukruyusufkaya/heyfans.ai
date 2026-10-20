import "server-only";
import { I18nProvider } from "./client";
import { getClientMessages, type ClientArea } from "./server";

/** Bölge layout'larında: o bölgenin istemci bileşenlerinin ihtiyaç duyduğu çevirileri sağlar (kök kataloğa eklenir). */
export async function AreaMessages({ area, children }: { area: ClientArea; children: React.ReactNode }) {
  return <I18nProvider messages={await getClientMessages(area)}>{children}</I18nProvider>;
}
