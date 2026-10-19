import { describe, expect, it } from "vitest";
import { reverseSplit, splitCreditSpend, splitDirectPayment, type RevenueRules } from "@/services/billing/revenue";

const rules: RevenueRules = {
  creatorShareBps: 7000,
  basis: "net_after_fees_and_tax",
  processingFeeBps: 349,
  processingFeeFixedMinor: 25,
  vatBps: 2000,
  deductAiCostFromCreator: false,
  holdDays: 7,
  minPayoutMinor: 50000,
};

describe("gelir paylaşımı", () => {
  it("₺399 abonelikte brüt → ücret → KDV → net → %70 pay tamsayı ve tutarlı", () => {
    const s = splitDirectPayment(39_900, rules);
    expect(s.processingFeeMinor).toBe(Math.round(39_900 * 0.0349) + 25); // 1418
    expect(s.taxMinor).toBe(39_900 - Math.round(39_900 / 1.2)); // 6650
    expect(s.netMinor).toBe(39_900 - s.processingFeeMinor - s.taxMinor);
    expect(s.creatorShareMinor).toBe(Math.floor(s.netMinor * 0.7));
    expect(s.creatorShareMinor + s.platformFeeMinor).toBe(s.netMinor);
    for (const v of Object.values(s)) expect(Number.isInteger(v)).toBe(true);
  });

  it("sıfır tutarda ücret kesilmez", () => {
    expect(splitDirectPayment(0, rules)).toMatchObject({ processingFeeMinor: 0, netMinor: 0, creatorShareMinor: 0 });
  });

  it("negatif veya kesirli tutar reddedilir", () => {
    expect(() => splitDirectPayment(-1, rules)).toThrow();
    expect(() => splitDirectPayment(10.5, rules)).toThrow();
  });

  it("kredi harcaması: kredi değeri üzerinden, ek kesinti yok", () => {
    const s = splitCreditSpend(25, 40, rules);
    expect(s.grossMinor).toBe(1000);
    expect(s.netMinor).toBe(1000);
    expect(s.creatorShareMinor).toBe(700);
  });

  it("AI maliyeti kuralı açıksa net'ten düşülür", () => {
    const s = splitCreditSpend(25, 40, { ...rules, deductAiCostFromCreator: true }, 100);
    expect(s.netMinor).toBe(900);
    expect(s.creatorShareMinor).toBe(630);
  });

  it("kısmi iade orantılı negatif ters kayıt üretir", () => {
    const s = splitDirectPayment(20_000, rules);
    const r = reverseSplit(s, 10_000);
    expect(r.grossMinor).toBe(-10_000);
    expect(r.creatorShareMinor).toBe(-Math.round(s.creatorShareMinor / 2));
    expect(r.creatorShareMinor + r.platformFeeMinor).toBe(r.netMinor);
  });
});
