import type { IPlatformSettings } from "@/models/platform";

export type RevenueRules = IPlatformSettings["revenue"];

export interface EarningSplit {
  grossMinor: number;
  processingFeeMinor: number;
  taxMinor: number;
  netMinor: number;
  creatorShareMinor: number;
  platformFeeMinor: number;
  shareBps: number;
}

/**
 * Doğrudan ödemeler (abonelik, içerik satışı) için gelir paylaşımı.
 * Fiyatlar KDV dahildir: vergi = brüt − brüt / (1 + KDV).
 * Net = brüt − ödeme kuruluşu ücreti − vergi. Creator payı = net × shareBps / 10000 (aşağı yuvarlanır,
 * kalan kuruş platformda kalır). Tüm tutarlar tamsayı kuruştur.
 */
export function splitDirectPayment(grossMinor: number, rules: RevenueRules, aiCostMinor = 0): EarningSplit {
  if (!Number.isInteger(grossMinor) || grossMinor < 0) throw new Error("grossMinor negatif olmayan tamsayı olmalı"); // i18n-ignore (geliştirici hatası)
  const processingFeeMinor = grossMinor === 0 ? 0 : Math.round((grossMinor * rules.processingFeeBps) / 10_000) + rules.processingFeeFixedMinor;
  const taxMinor = rules.vatBps > 0 ? grossMinor - Math.round((grossMinor * 10_000) / (10_000 + rules.vatBps)) : 0;
  let netMinor = Math.max(0, grossMinor - processingFeeMinor - taxMinor);
  if (rules.deductAiCostFromCreator) netMinor = Math.max(0, netMinor - aiCostMinor);
  const creatorShareMinor = Math.floor((netMinor * rules.creatorShareBps) / 10_000);
  return {
    grossMinor,
    processingFeeMinor,
    taxMinor,
    netMinor,
    creatorShareMinor,
    platformFeeMinor: netMinor - creatorShareMinor,
    shareBps: rules.creatorShareBps,
  };
}

/**
 * Kredi harcamaları (sohbet, hediye, bahşiş, görüşme): ödeme ücreti ve KDV kredi satın alımında
 * oluştuğundan burada tekrar kesilmez; 1 kredinin net değeri `credits.valueMinor` ile ayarlanır.
 */
export function splitCreditSpend(credits: number, creditValueMinor: number, rules: RevenueRules, aiCostMinor = 0): EarningSplit {
  if (!Number.isInteger(credits) || credits < 0) throw new Error("credits negatif olmayan tamsayı olmalı"); // i18n-ignore (geliştirici hatası)
  const grossMinor = credits * creditValueMinor;
  let netMinor = grossMinor;
  if (rules.deductAiCostFromCreator) netMinor = Math.max(0, netMinor - aiCostMinor);
  const creatorShareMinor = Math.floor((netMinor * rules.creatorShareBps) / 10_000);
  return {
    grossMinor,
    processingFeeMinor: 0,
    taxMinor: 0,
    netMinor,
    creatorShareMinor,
    platformFeeMinor: netMinor - creatorShareMinor,
    shareBps: rules.creatorShareBps,
  };
}

/** İade için orantılı ters bölüşüm (negatif değerler). */
export function reverseSplit(split: EarningSplit, refundMinor: number): EarningSplit {
  if (refundMinor <= 0 || split.grossMinor === 0) throw new Error("Geçersiz iade tutarı"); // i18n-ignore (geliştirici hatası)
  const ratio = Math.min(1, refundMinor / split.grossMinor);
  const neg = (v: number) => -Math.round(v * ratio);
  const creatorShareMinor = neg(split.creatorShareMinor);
  const netMinor = neg(split.netMinor);
  return {
    grossMinor: -Math.min(refundMinor, split.grossMinor),
    processingFeeMinor: neg(split.processingFeeMinor),
    taxMinor: neg(split.taxMinor),
    netMinor,
    creatorShareMinor,
    platformFeeMinor: netMinor - creatorShareMinor,
    shareBps: split.shareBps,
  };
}
