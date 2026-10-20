import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { IntlMessageFormat } from "intl-messageformat";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { localeForCountry, negotiateAcceptLanguage, resolveLocale } from "@/i18n/resolve";
import { createTranslator, formatMessage } from "@/i18n/translate";
import { createFormatters } from "@/i18n/formatters";
import { LOCALE_META } from "@/i18n/config";
import { CHUNKS, loadLocale, scan, TARGET_LOCALES } from "../../scripts/i18n/extract";

describe("dil seçimi", () => {
  it("öncelik: ?lang → çerez → hesap dili → konum → tarayıcı → varsayılan", () => {
    expect(resolveLocale({ param: "de", cookie: "fr", user: "es", country: "TR", acceptLanguage: "en" })).toEqual({ locale: "de", source: "param" });
    expect(resolveLocale({ param: "xx", cookie: "fr", user: "es", country: "TR" })).toEqual({ locale: "fr", source: "cookie" });
    expect(resolveLocale({ user: "es", country: "TR" })).toEqual({ locale: "es", source: "user" });
    expect(resolveLocale({ country: "SA", acceptLanguage: "en-US" })).toEqual({ locale: "ar", source: "country" });
    expect(resolveLocale({ acceptLanguage: "pt-BR,pt;q=0.9" })).toEqual({ locale: "pt", source: "browser" });
    expect(resolveLocale({})).toEqual({ locale: "tr", source: "default" });
  });
  it("konuma göre dil; çok dilli ülkede tarayıcı dili seçer, listede olmayan ülke İngilizce", () => {
    expect(localeForCountry("TR")).toBe("tr");
    expect(localeForCountry("BR")).toBe("pt");
    expect(localeForCountry("MX")).toBe("es");
    expect(localeForCountry("AT")).toBe("de");
    expect(localeForCountry("EG")).toBe("ar");
    expect(localeForCountry("CH", "fr-CH,fr;q=0.9")).toBe("fr");
    expect(localeForCountry("CH", "it-CH")).toBe("de");
    expect(localeForCountry("CA", "fr-CA")).toBe("fr");
    expect(localeForCountry("MA", "fr-FR")).toBe("fr");
    expect(localeForCountry("MA")).toBe("ar");
    expect(localeForCountry("NL")).toBe("en");
    expect(localeForCountry("JP")).toBe("en");
    expect(localeForCountry("XX")).toBeNull();
    expect(localeForCountry(null)).toBeNull();
  });
  it("Accept-Language q ağırlıklarına göre desteklenen ilk dili seçer", () => {
    expect(negotiateAcceptLanguage("nl-NL,de;q=0.8,en;q=0.9")).toBe("en");
    expect(negotiateAcceptLanguage("ja,zh;q=0.5")).toBeNull();
    expect(negotiateAcceptLanguage("*")).toBeNull();
  });
});

describe("çeviri motoru", () => {
  const catalog = {
    "{count} yeni mesaj": "{count, plural, one {# new message} other {# new messages}}",
    "Selin'in profili": "Selin's profile",
    "<b>{n}</b> içerik": "<b>{n}</b> posts",
  };
  it("katalogda varsa çevirir, yoksa Türkçe kaynağı gösterir", () => {
    const t = createTranslator("en", catalog);
    expect(t("{count} yeni mesaj", { count: 1 })).toBe("1 new message");
    expect(t("{count} yeni mesaj", { count: 3 })).toBe("3 new messages");
    expect(t("Selin'in profili")).toBe("Selin's profile");
    expect(t("Kaydet")).toBe("Kaydet");
    expect(t("{name} katıldı", { name: "Ece" })).toBe("Ece katıldı");
  });
  it("kesme işareti ICU kaçışı sayılmaz (Türkçe/Fransızca ekler)", () => {
    expect(formatMessage("tr", "'{name}' ve {name}'in", { name: "Ali" })).toBe("'Ali' ve Ali'in");
    expect(formatMessage("fr", "l'{item} d'{name}", { item: "abonnement", name: "Ana" })).toBe("l'abonnement d'Ana");
  });
  it("etiketli metin parçalara ayrılır; bozuk kalıp sayfayı düşürmez", () => {
    const t = createTranslator("en", catalog);
    expect(t.rich("<b>{n}</b> içerik", { n: 5, b: (c: string[]) => `[${c.join("")}]` }).join("")).toBe("[5] posts");
    expect(formatMessage("tr", "kapanmamış {süslü", {})).toBe("kapanmamış {süslü");
  });
  it("Arapça çoğul biçimleri", () => {
    const f = "{n, plural, zero {لا رسائل} one {رسالة واحدة} two {رسالتان} few {# رسائل} many {# رسالة} other {# رسالة}}";
    expect(formatMessage("ar", f, { n: 2 })).toBe("رسالتان");
    expect(formatMessage("ar", f, { n: 5 })).toBe("5 رسائل");
  });
});

describe("biçimlendiriciler", () => {
  const d = new Date("2026-03-05T14:07:00Z");
  it("dile göre para, sayı ve tarih", () => {
    expect(createFormatters("tr").formatMoney(123450)).toBe("₺1.234,50");
    expect(createFormatters("en").formatMoney(123450)).toMatch(/1,234\.50/);
    expect(createFormatters("de").formatNumber(1234567)).toBe("1.234.567");
    expect(createFormatters("ar").formatNumber(1234)).toMatch(/1[,٬]234/);
    expect(createFormatters("tr").formatPercent(1250)).toBe("%12,5");
    expect(createFormatters("en").formatPercent(1250)).toBe("12.5%");
    expect(createFormatters("fr").formatDate(d)).toMatch(/5 mars 2026/);
    expect(createFormatters("tr").formatDate(null)).toBe("—");
  });
  it("göreli zaman yerelleşir", () => {
    const now = new Date("2026-03-05T15:07:00Z");
    expect(createFormatters("en").formatRelative(d, now)).toMatch(/1 hr\. ago|1 hour ago/);
    expect(createFormatters("tr").formatRelative(new Date(now.getTime() - 86400_000), now)).toBe("dün");
  });
  it("Arapça sağdan sola, diğerleri soldan sağa", () => {
    expect(LOCALE_META.ar.dir).toBe("rtl");
    expect(Object.values(LOCALE_META).filter((m) => m.dir === "rtl")).toHaveLength(1);
  });
});

/** Mesajdaki değişken adları (ICU ayrıştırıcısıyla; çoğul dallarındaki düz kelimeler değişken sayılmaz). */
const placeholders = (s: string) => {
  const out = new Set<string>();
  const walk = (els: MessageFormatElement[]) => {
    for (const el of els) {
      if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) out.add(el.value);
      if (el.type === TYPE.plural || el.type === TYPE.select) {
        out.add(el.value);
        for (const o of Object.values(el.options)) walk(o.value);
      }
      if (el.type === TYPE.tag) walk(el.children);
    }
  };
  try {
    walk(parse(s.replace(/'/g, "''"), { ignoreTag: false }));
  } catch {
    out.add("__parse_error__");
  }
  return out;
};

describe("çeviri katalogları", () => {
  const { byChunk, areas } = scan();
  const all = CHUNKS.flatMap((c) => byChunk.get(c)!);

  it("üretilmiş istemci bölgeleri güncel (npm run i18n:extract)", () => {
    expect(JSON.parse(readFileSync("src/i18n/generated/areas.json", "utf8"))).toEqual(areas);
  });

  for (const locale of TARGET_LOCALES) {
    it(`${locale}: her metnin çevirisi var, değişkenler korunuyor, ICU geçerli`, () => {
      const cat = loadLocale(locale);
      const missing = all.filter((s) => !cat[s]?.trim());
      expect(missing.slice(0, 20), `${missing.length} eksik çeviri (npm run i18n:status)`).toEqual([]);
      const broken: string[] = [];
      for (const s of all) {
        const v = cat[s]!;
        const src = placeholders(s);
        const dst = placeholders(v);
        for (const p of dst) if (!src.has(p)) broken.push(`${p} kaynakta yok: ${s.slice(0, 60)}`);
        for (const p of src) if (!dst.has(p) && !/suffix/i.test(p)) broken.push(`${p} çeviride yok: ${s.slice(0, 60)}`);
        // Baştaki/sondaki boşluk yan yana birleştirilen metinleri ayırır; çeviride aynen korunmalı.
        if (/^\s/.test(s) !== /^\s/.test(v) || /\s$/.test(s) !== /\s$/.test(v)) broken.push(`kenar boşluğu farklı: ${JSON.stringify(s.slice(0, 50))}`);
        try {
          new IntlMessageFormat(v.replace(/'/g, "''"), LOCALE_META[locale].intl);
        } catch (e) {
          broken.push(`ICU hatası (${(e as Error).message}): ${v.slice(0, 60)}`);
        }
      }
      expect(broken.slice(0, 20)).toEqual([]);
    });
  }
});
