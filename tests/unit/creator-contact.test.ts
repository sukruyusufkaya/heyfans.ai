import { describe, expect, it } from "vitest";
import { appOrigins } from "@/lib/auth/auth";
import { formatNational, maskPhone, normalizePhone, normalizeSocial } from "@/lib/creator-contact";

describe("telefon", () => {
  it("TR cep numarasını farklı yazımlardan E.164'e çevirir", () => {
    for (const raw of ["532 123 45 67", "05321234567", "+90 532 123 45 67", "0090 532 1234567", "(532) 123-45-67"]) {
      const r = normalizePhone("TR", raw);
      expect(r).toMatchObject({ ok: true, e164: "+905321234567", display: "532 123 45 67" });
    }
  });
  it("TR'de sabit hat / eksik hane reddedilir", () => {
    expect(normalizePhone("TR", "212 123 45 67").ok).toBe(false);
    expect(normalizePhone("TR", "532 123").ok).toBe(false);
    expect(normalizePhone("XX", "5321234567").ok).toBe(false);
  });
  it("yabancı numaralar ülke uzunluğuna göre doğrulanır", () => {
    expect(normalizePhone("DE", "01512 3456789")).toMatchObject({ ok: true, e164: "+4915123456789" });
    expect(normalizePhone("NL", "6 12345678")).toMatchObject({ ok: true, e164: "+31612345678" });
  });
  it("maske yalnız ilk ve son iki haneyi gösterir", () => {
    expect(maskPhone("+905321234567")).toBe("+90 5** *** ** 67");
    expect(maskPhone("+905321234567")).not.toContain("123");
    expect(formatNational("TR", "5321234567")).toBe("532 123 45 67");
  });
});

describe("sosyal hesap", () => {
  it("bağlantıdan ve @ ile yazılandan kullanıcı adını ayıklar", () => {
    expect(normalizeSocial("instagram", "https://www.instagram.com/Melis.Erturk/?hl=tr")).toEqual({ ok: true, handle: "melis.erturk", url: "https://www.instagram.com/melis.erturk/" });
    expect(normalizeSocial("tiktok", "@melis_tt")).toEqual({ ok: true, handle: "melis_tt", url: "https://www.tiktok.com/@melis_tt" });
    expect(normalizeSocial("youtube", "youtube.com/@MelisVlog")).toMatchObject({ ok: true, handle: "melisvlog" });
    expect(normalizeSocial("x", "twitter.com/melis")).toMatchObject({ ok: true, handle: "melis", url: "https://x.com/melis" });
    expect(normalizeSocial("twitch", "twitch.tv/melisyayin")).toMatchObject({ ok: true, url: "https://www.twitch.tv/melisyayin" });
  });
  it("platform kurallarına uymayanlar reddedilir", () => {
    expect(normalizeSocial("instagram", "ab..c").ok).toBe(false);
    expect(normalizeSocial("x", "bu_ad_on_bes_karakterden_uzun").ok).toBe(false);
    expect(normalizeSocial("twitch", "abc").ok).toBe(false);
    expect(normalizeSocial("instagram", "").ok).toBe(false);
  });
  it("web sitesi https'e çevrilir; javascript: gibi şemalar kabul edilmez", () => {
    expect(normalizeSocial("website", "alanadi.com")).toMatchObject({ ok: true, url: "https://alanadi.com" });
    expect(normalizeSocial("website", "javascript:alert(1)").ok).toBe(false);
  });
});

describe("kimlik doğrulama · güvenilir kaynaklar", () => {
  it("alan adının www'li ve www'siz hâlleri birlikte güvenilir; localhost tek", () => {
    expect(appOrigins("https://heyfans.ai")).toEqual(["https://heyfans.ai", "https://www.heyfans.ai"]);
    expect(appOrigins("https://www.heyfans.ai/")).toEqual(["https://www.heyfans.ai", "https://heyfans.ai"]);
    expect(appOrigins("http://localhost:3070")).toEqual(["http://localhost:3070"]);
  });
});
