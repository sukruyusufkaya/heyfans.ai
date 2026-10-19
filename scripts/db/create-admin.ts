/**
 * Yönetici hesabı oluşturur veya mevcut kullanıcıya admin rolü atar.
 *   npm run admin:create -- <email> <rol> ["Ad Soyad"]
 * Parola terminalde sorulur (ekrana yazılmaz) ya da ADMIN_PASSWORD ortam değişkeninden okunur.
 * Genel kayıt formundan admin hesabı açılamaz; tek yol budur (ve süper yöneticinin paneli).
 */
import { createInterface } from "node:readline";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { getAuth } from "@/lib/auth/auth";
import { connectDb } from "@/lib/db/mongo";
import { ADMIN_ROLES, User, type AdminRole } from "@/models/identity";
import { ensureWallet } from "@/services/wallet/wallet";

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => {
        if (s.includes(question)) out.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

async function main() {
  const [email, role, ...nameParts] = process.argv.slice(2);
  if (!email || !role || !ADMIN_ROLES.includes(role as AdminRole)) {
    console.error(`Kullanım: npm run admin:create -- <email> <${ADMIN_ROLES.join("|")}> ["Ad Soyad"]`);
    process.exit(1);
  }
  const m = await connectDb();
  const db = m.connection.db!;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    await User.updateOne({ _id: existing._id }, { $addToSet: { roles: "admin" }, $set: { adminRole: role, status: "active" } });
    console.log(`✓ ${email} kullanıcısına ${role} rolü atandı. İlk admin girişinde 2FA kurulumu zorunludur.`);
  } else {
    const password = process.env.ADMIN_PASSWORD ?? (await ask("Parola (en az 12 karakter): ", true));
    if (password.length < 12) throw new Error("Parola en az 12 karakter olmalı.");
    const auth = await getAuth();
    const hash = await (await auth.$context).password.hash(password);
    const _id = new Types.ObjectId();
    const now = new Date();
    await db.collection("users").insertOne({ _id, name: nameParts.join(" ") || "Yönetici", email: email.toLowerCase(), emailVerified: true, image: null, roles: ["fan", "admin"], adminRole: role, status: "active", signupIntent: "fan", twoFactorEnabled: false, isDemo: false, createdAt: now, updatedAt: now });
    await db.collection("accounts").insertOne({ _id: new Types.ObjectId(), accountId: _id.toHexString(), providerId: "credential", userId: _id, password: hash, createdAt: now, updatedAt: now });
    await ensureWallet(_id);
    console.log(`✓ Admin hesabı oluşturuldu: ${email} (${role}). İlk girişte 2FA kurulumu zorunludur.`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Hata:", err.message);
  process.exit(1);
});
