/**
 * "Sign in with Apple" için AUTH_APPLE_SECRET üretir (ES256 imzalı JWT, en fazla 6 ay geçerli).
 *
 *   npm run auth:apple-secret -- --team <TEAM_ID> --key <KEY_ID> --client <SERVICES_ID> --p8 <AuthKey_XXXX.p8> [--days 180]
 *
 * - TEAM_ID: Apple Developer hesabının sağ üstündeki 10 karakterlik takım kimliği
 * - KEY_ID: "Sign in with Apple" yetkili anahtarın kimliği (Keys ekranı)
 * - SERVICES_ID: Identifiers → Services IDs altında oluşturulan kimlik (ör. ai.heyfans.web) = AUTH_APPLE_ID
 * - .p8: anahtar yalnız bir kez indirilir; depoya KOYMAYIN, parola yöneticisinde saklayın.
 * Çıktıyı AUTH_APPLE_SECRET olarak girin ve süre dolmadan (takvime not alın) yeniden üretin.
 */
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), []),
);
const { team, key, client, p8 } = args;
const days = Math.min(180, Number(args.days ?? 180));
if (!team || !key || !client || !p8) {
  console.error("Kullanım: npm run auth:apple-secret -- --team <TEAM_ID> --key <KEY_ID> --client <SERVICES_ID> --p8 <AuthKey.p8> [--days 180]");
  process.exit(1);
}

const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid: key, typ: "JWT" };
const payload = { iss: team, iat: now, exp: now + days * 86400, aud: "https://appleid.apple.com", sub: client };
const input = `${b64url(header)}.${b64url(payload)}`;
const signature = sign("sha256", Buffer.from(input), { key: createPrivateKey(readFileSync(p8, "utf8")), dsaEncoding: "ieee-p1363" }).toString("base64url");

console.log(`${input}.${signature}`);
console.error(`\n✓ AUTH_APPLE_SECRET üretildi · geçerlilik: ${new Date((now + days * 86400) * 1000).toLocaleDateString("tr-TR")} tarihine kadar (${days} gün).`);
