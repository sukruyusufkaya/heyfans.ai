"use client";
import * as React from "react";
import { LOCALE_META, SOURCE_LOCALE, type Locale } from "./config";
import { createTranslator, type Catalog, type Translator } from "./translate";
import { createFormatters, type Formatters } from "./formatters";

interface I18nValue {
  locale: Locale;
  messages: Catalog;
}

const I18nContext = React.createContext<I18nValue>({ locale: SOURCE_LOCALE, messages: {} });

const warned = new Set<string>();
const devMissing =
  process.env.NODE_ENV === "development"
    ? (source: string) => {
        if (warned.has(source) || warned.size > 300) return;
        warned.add(source);
        console.warn(`[i18n] istemci kataloğunda yok (sunucuda çevirip prop olarak geçin ya da npm run i18n:extract çalıştırın): ${JSON.stringify(source.slice(0, 80))}`);
      }
    : undefined;

/**
 * Dil bağlamı. Kök layout dili + kök kataloğu, bölge layout'ları kendi alt kataloğunu verir; iç içe sağlayıcılar birleşir.
 */
export function I18nProvider({ locale, messages, children }: { locale?: Locale; messages: Catalog; children: React.ReactNode }) {
  const parent = React.useContext(I18nContext);
  const value = React.useMemo<I18nValue>(
    () => ({ locale: locale ?? parent.locale, messages: Object.keys(parent.messages).length ? { ...parent.messages, ...messages } : messages }),
    [locale, parent, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return React.useContext(I18nContext).locale;
}

export function useDirection(): "ltr" | "rtl" {
  return LOCALE_META[useLocale()].dir;
}

/** İstemci bileşenlerinde çevirmen: `const t = useT(); t("Kaydet")`. */
export function useT(): Translator {
  const { locale, messages } = React.useContext(I18nContext);
  return React.useMemo(() => createTranslator(locale, messages, locale === SOURCE_LOCALE ? undefined : devMissing), [locale, messages]);
}

/** İstemci bileşenlerinde dile göre sayı/para/tarih biçimleri. */
export function useFormatters(): Formatters {
  const locale = useLocale();
  return React.useMemo(() => createFormatters(locale), [locale]);
}
