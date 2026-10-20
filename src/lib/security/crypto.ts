import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";

function key(): Buffer {
  const raw = env().DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY tanımlı değil (hassas alan şifrelemesi için gerekli)."); // i18n-ignore (geliştirici/günlük hatası)
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("DATA_ENCRYPTION_KEY 32 baytlık base64 değer olmalı."); // i18n-ignore (geliştirici/günlük hatası)
  return buf;
}

/** AES-256-GCM; çıktı: v1.<iv>.<tag>.<veri> (base64url). */
export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptField(payload: string): string {
  const [v, iv, tag, data] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Şifreli alan biçimi geçersiz"); // i18n-ignore (geliştirici/günlük hatası)
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function maskIban(iban: string) {
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  return `${clean.slice(0, 4)} **** **** **** ${clean.slice(-4)}`;
}

/** TR IBAN: 26 karakter + mod-97 doğrulaması. */
export function isValidTrIban(iban: string) {
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^TR\d{24}$/.test(clean)) return false;
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

/** Özel medya için kısa ömürlü imzalı belirteç. */
export function signMediaToken(assetId: string, userId: string, ttlSec = 300) {
  const secret = env().MEDIA_SIGNING_SECRET ?? env().BETTER_AUTH_SECRET;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${assetId}.${userId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyMediaToken(assetId: string, userId: string, token: string) {
  const secret = env().MEDIA_SIGNING_SECRET ?? env().BETTER_AUTH_SECRET;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  const expected = createHmac("sha256", secret).update(`${assetId}.${userId}.${exp}`).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
