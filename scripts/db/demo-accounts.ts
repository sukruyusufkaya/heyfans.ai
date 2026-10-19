/**
 * Demo hesaplar — farklı rollerde giriş yapılabilir test hesapları (ÜRETİMDE DE çalışır; önce `db:init`).
 *
 *   npm run db:demo-accounts                    → oluştur / eksikleri tamamla (parolalar korunur)
 *   npm run db:demo-accounts -- --remove --yes  → demo hesapları ve demo creator profilini sil
 *
 * - Parolalar ilk çalıştırmada rastgele üretilir ve YALNIZ yerel `scripts/db/demo-accounts.local.json` dosyasında
 *   tutulur (.gitignore'da); okunabilir özet `DEMO-HESAPLAR.local.md` dosyasına yazılır. Konsola parola yazılmaz.
 * - Süper yönetici: ADMIN_EMAIL + ADMIN_PASSWORD ortam değişkenlerinden (parola dosyaya yazılmaz).
 * - E-postalar `@heyfans.test` (RFC 2606 ayrılmış alan adı; e-posta teslim edilmez, yalnız giriş kimliği).
 * - Demo creator (Selin Kaya) bir "Örnek profil"dir: Studio'ya girilebilir, satın alma kapalıdır (D-35).
 * - Üretimde ADMIN_MFA_ENFORCED=true ise yönetici hesapları ilk girişte 2FA kurar.
 */
import { randomInt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import mongoose, { Types } from "mongoose";
import { env } from "@/config/env";
import { getAuth } from "@/lib/auth/auth";
import { connectDb } from "@/lib/db/mongo";
import { getStorage } from "@/lib/storage";
import { AgeVerificationRecord, CreatorProfile, User, UserPreferences, type AdminRole } from "@/models";
import { ADMIN_ROLE_LABELS } from "@/lib/permissions";
import { ensureWallet } from "@/services/wallet/wallet";
import { importSampleCreator, removeSampleCreator } from "./sample-lib";
import { CHARACTERS } from "./shared";

const args = new Set(process.argv.slice(2));
const DOMAIN = "heyfans.test";
const SECRETS_FILE = path.join("scripts", "db", "demo-accounts.local.json");
const SUMMARY_FILE = "DEMO-HESAPLAR.local.md";

type Kind = "fan" | "fan_new" | "creator" | "applicant" | "admin";
interface DemoAccount {
  key: string;
  email: string;
  name: string;
  kind: Kind;
  adminRole?: AdminRole;
  title: string;
  note: string;
  start: string;
}

const ACCOUNTS: DemoAccount[] = [
  { key: "hayran", email: `hayran@${DOMAIN}`, name: "Ece Demir", kind: "fan", title: "Hayran (hazır hesap)", note: "Yaş beyanı ve ilgi alanları tamam; örnek profilleri takip edip AI ikizleriyle günlük ücretsiz mesajla sohbet edebilir.", start: "/app" },
  { key: "yenihayran", email: `yenihayran@${DOMAIN}`, name: "Can Yıldız", kind: "fan_new", title: "Hayran (ilk giriş)", note: "Karşılama akışı tamamlanmamış: yaş doğrulama ve ilgi alanı seçimini baştan dener.", start: "/app" },
  { key: "creator", email: `creator@${DOMAIN}`, name: "Selin Kaya", kind: "creator", title: "İçerik üreticisi (onaylı, Örnek profil)", note: "Creator Studio, AI ikizi, içerik ve bilgi tabanı yönetimi. Profili \"Örnek profil\" etiketlidir; satın alma kapalıdır.", start: "/studio" },
  { key: "basvuru", email: `basvuru@${DOMAIN}`, name: "Deniz Aksoy", kind: "applicant", title: "Creator adayı (başvuru başlamamış)", note: "Yeni aşamalı başvuru sihirbazını (telefon, Instagram, TikTok… tek tek) uçtan uca dener; başvuru Admin → Creator'lar ekranına düşer.", start: "/onboarding/creator" },
  { key: "operasyon", email: `operasyon@${DOMAIN}`, name: "Operasyon Demo", kind: "admin", adminRole: "operations_admin", title: ADMIN_ROLE_LABELS.operations_admin, note: "Kullanıcı ve creator yönetimi, genel operasyon.", start: "/admin" },
  { key: "creatoryonetici", email: `creatoryonetici@${DOMAIN}`, name: "Creator Yöneticisi Demo", kind: "admin", adminRole: "creator_manager", title: ADMIN_ROLE_LABELS.creator_manager, note: "Creator başvurularını inceler/onaylar, telefon numarasını gerekçeyle açabilir.", start: "/admin/creators" },
  { key: "moderasyon", email: `moderasyon@${DOMAIN}`, name: "Moderasyon Demo", kind: "admin", adminRole: "moderation_specialist", title: ADMIN_ROLE_LABELS.moderation_specialist, note: "Bildirimler, içerik moderasyonu, hassas sohbet incelemesi.", start: "/admin/moderation" },
  { key: "finans", email: `finans@${DOMAIN}`, name: "Finans Demo", kind: "admin", adminRole: "finance_manager", title: ADMIN_ROLE_LABELS.finance_manager, note: "İşlemler, iadeler, hak edişler ve ödeme talepleri.", start: "/admin/finance" },
  { key: "aiops", email: `aiops@${DOMAIN}`, name: "AI Operasyon Demo", kind: "admin", adminRole: "ai_operations_manager", title: ADMIN_ROLE_LABELS.ai_operations_manager, note: "AI ikizleri, kullanım ve bütçe izleme.", start: "/admin/ai-operations" },
  { key: "destek", email: `destek@${DOMAIN}`, name: "Destek Demo", kind: "admin", adminRole: "support_agent", title: ADMIN_ROLE_LABELS.support_agent, note: "Kullanıcı desteği; finans ve hassas sohbet verilerine erişemez.", start: "/admin" },
];

/** Okunması kolay ama güçlü parola: büyük/küçük harf + rakam + simge, 16 karakter. */
function strongPassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#%*-+?"];
  const all = sets.join("");
  const chars = sets.map((s) => s[randomInt(s.length)]!);
  while (chars.length < 16) chars.push(all[randomInt(all.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

function loadSecrets(): Record<string, string> {
  if (!existsSync(SECRETS_FILE)) return {};
  return JSON.parse(readFileSync(SECRETS_FILE, "utf8")) as Record<string, string>;
}

async function upsertLoginUser(a: { email: string; name: string; roles: string[]; adminRole?: AdminRole | null; intent: "fan" | "creator"; password: string; isDemo: boolean }) {
  const db = mongoose.connection.db!;
  const auth = await getAuth();
  const hash = await (await auth.$context).password.hash(a.password);
  const now = new Date();
  const existing = await User.findOne({ email: a.email }, { _id: 1 }).lean();
  const _id = (existing?._id as Types.ObjectId | undefined) ?? new Types.ObjectId();
  if (!existing) {
    await db.collection("users").insertOne({ _id, name: a.name, email: a.email, emailVerified: true, image: null, roles: a.roles, adminRole: a.adminRole ?? null, status: "active", signupIntent: a.intent, twoFactorEnabled: false, termsAcceptedAt: now, isDemo: a.isDemo, createdAt: now, updatedAt: now });
  } else {
    await db.collection("users").updateOne({ _id }, { $set: { name: a.name, emailVerified: true, status: "active", adminRole: a.adminRole ?? null, updatedAt: now }, $addToSet: { roles: { $each: a.roles } } });
  }
  // Parola her çalıştırmada kayıttaki değere eşitlenir (tek doğruluk kaynağı yerel dosya / ortam değişkeni).
  await db.collection("accounts").updateOne(
    { userId: _id, providerId: "credential" },
    { $set: { password: hash, updatedAt: now }, $setOnInsert: { _id: new Types.ObjectId(), accountId: _id.toHexString(), userId: _id, providerId: "credential", createdAt: now } },
    { upsert: true },
  );
  await ensureWallet(_id);
  return _id;
}

async function declareAdult(userId: Types.ObjectId) {
  await AgeVerificationRecord.updateOne({ userId }, { $setOnInsert: { userId, method: "self_declared", status: "verified", assuranceLevel: "low", over18: true, verifiedAt: new Date() } }, { upsert: true });
}

async function create() {
  const e = env();
  const secrets = loadSecrets();
  const storage = getStorage();
  const rows: { a: DemoAccount; password: string }[] = [];
  let creatorSkipped = false;

  for (const a of ACCOUNTS) {
    const password = (secrets[a.key] ??= strongPassword());
    if (a.kind === "admin") {
      await upsertLoginUser({ email: a.email, name: a.name, roles: ["fan", "admin"], adminRole: a.adminRole, intent: "fan", password, isDemo: true });
    } else if (a.kind === "fan" || a.kind === "fan_new") {
      const id = await upsertLoginUser({ email: a.email, name: a.name, roles: ["fan"], intent: "fan", password, isDemo: true });
      if (a.kind === "fan") {
        await declareAdult(id);
        await UserPreferences.updateOne({ userId: id }, { $set: { interests: ["seyahat", "moda", "yemek"], vibes: ["samimi", "eglenceli"], personalizationConsent: true, aiMemoryEnabled: true }, $setOnInsert: { userId: id, fanOnboarding: { step: 4, completedAt: new Date() } } }, { upsert: true });
      }
    } else if (a.kind === "applicant") {
      const id = await upsertLoginUser({ email: a.email, name: a.name, roles: ["fan"], intent: "creator", password, isDemo: true });
      await declareAdult(id);
    } else if (a.kind === "creator") {
      const id = await upsertLoginUser({ email: a.email, name: a.name, roles: ["fan", "creator"], intent: "creator", password, isDemo: true });
      await declareAdult(id);
      const selin = CHARACTERS.creators.find((c) => c.username === "selinkaya");
      if (!selin) throw new Error("characters.json içinde selinkaya bulunamadı.");
      const r = await importSampleCreator({ ...selin, pending: false }, storage, { userId: id });
      if (r === "skipped") {
        creatorSkipped = true;
        console.warn("! selinkaya kullanıcı adı bu veritabanında örnek olmayan bir creator'da; demo creator profili oluşturulmadı.");
      }
    }
    rows.push({ a, password });
    console.log(`✓ ${a.title} — ${a.email}`);
  }

  // Süper yönetici (kullanıcının kendi hesabı): parola yalnız ortam değişkeninden okunur, dosyaya yazılmaz.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) throw new Error("ADMIN_PASSWORD en az 12 karakter olmalı.");
    await upsertLoginUser({ email: adminEmail, name: process.env.ADMIN_NAME?.trim() || "Yusuf Kaya", roles: ["fan", "admin"], adminRole: "super_admin", intent: "fan", password: adminPassword, isDemo: false });
    console.log(`✓ Süper Yönetici — ${adminEmail}`);
  }

  writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2) + "\n", "utf8");
  const base = e.APP_URL.replace(/\/$/, "");
  const lines = [
    "# HEYFANS demo hesapları",
    "",
    `> Ortam: \`${e.APP_MODE}\` · veritabanı: \`${e.MONGODB_DB_NAME}\` · adres: ${base} · güncelleme: ${new Date().toLocaleString("tr-TR")}`,
    "> Bu dosya ve `scripts/db/demo-accounts.local.json` depoya girmez (.gitignore). Paylaşmayın.",
    "",
    "| Rol | E-posta | Parola | Başlangıç | Ne için |",
    "|---|---|---|---|---|",
    ...(adminEmail ? [`| **Süper Yönetici** | ${adminEmail} | (sizin belirlediğiniz parola) | ${base}/admin | Tüm yönetim yetkileri |`] : []),
    ...rows.map(({ a, password }) => `| ${a.title} | ${a.email} | \`${password}\` | ${base}${a.start} | ${a.note}${a.kind === "creator" && creatorSkipped ? " ⚠ Bu veritabanında creator profili oluşturulamadı (selinkaya kullanıcı adı dolu); yerel demo verisinde creator için melis@heyfans.local kullanın." : ""} |`),
    "",
    "Notlar:",
    "- `@heyfans.test` adresleri gerçek değildir; e-posta almaz, yalnız giriş için kullanılır (parola sıfırlama çalışmaz).",
    "- Yönetici hesapları üretimde ilk girişte iki adımlı doğrulama (2FA) kurulumu ister.",
    "- Demo creator profili \"Örnek profil\" etiketlidir; abonelik/satın alma kapalıdır.",
    "- Kaldırmak için: `npm run db:demo-accounts -- --remove --yes` (süper yönetici hesabına dokunulmaz).",
    "",
  ];
  writeFileSync(SUMMARY_FILE, lines.join("\n"), "utf8");
  console.log(`\n✓ ${rows.length} demo hesap hazır. Parolalar: ${SUMMARY_FILE} (yerel, depoya girmez).`);
}

async function remove() {
  const users = await User.find({ email: { $regex: `@${DOMAIN.replace(/\./g, "\\.")}$` }, isDemo: true }, { _id: 1, email: 1 }).lean();
  if (!args.has("--yes")) {
    console.log(`${users.length} demo hesap (ve demo creator profili) silinecek. Onaylamak için: npm run db:demo-accounts -- --remove --yes`);
    return;
  }
  const storage = getStorage();
  const ids = users.map((u) => u._id);
  for (const p of await CreatorProfile.find({ userId: { $in: ids } }, { _id: 1, userId: 1, username: 1 }).lean()) await removeSampleCreator(p, storage, new RegExp(`@${DOMAIN.replace(/\./g, "\\.")}$`));
  const db = mongoose.connection.db!;
  await Promise.all([
    db.collection("accounts").deleteMany({ userId: { $in: ids } }),
    db.collection("sessions").deleteMany({ userId: { $in: ids } }),
    UserPreferences.deleteMany({ userId: { $in: ids } }),
    AgeVerificationRecord.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
  console.log(`✓ ${users.length} demo hesap kaldırıldı.`);
}

async function main() {
  await connectDb();
  if (args.has("--remove")) return remove();
  return create();
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Demo hesap hatası:", err.message ?? err);
    process.exit(1);
  });
