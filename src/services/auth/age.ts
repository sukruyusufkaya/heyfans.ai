import "server-only";
import { ageFromBirthDate, ageProviderStatus } from "@/lib/age";
import { connectDb, getNativeDb } from "@/lib/db/mongo";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid } from "@/lib/validation/common";
import { AgeVerificationRecord, User } from "@/models/identity";

export const MIN_AGE = 18;

export interface AgeStatus {
  state: "none" | "declared_adult" | "under_18";
  record: { method: "self_declared" | "provider"; assuranceLevel: "none" | "low" | "high"; over18: boolean | null; at: string | null } | null;
  provider: { configured: boolean; provider: string };
}

/** Kullanıcının yaş kaydı durumu. Beyan (self_declared/low) güçlü doğrulama SAYILMAZ. */
export async function getAgeStatus(userId: string): Promise<AgeStatus> {
  await connectDb();
  const uid = oid(userId);
  const latest = await AgeVerificationRecord.findOne({ userId: uid }).sort({ createdAt: -1 }).lean();
  const p = ageProviderStatus();
  const provider = { configured: p.configured, provider: p.provider };
  if (!latest) return { state: "none", record: null, provider };
  const record = {
    method: latest.method,
    assuranceLevel: latest.assuranceLevel,
    over18: latest.over18 ?? null,
    at: (latest.verifiedAt ?? latest.createdAt)?.toISOString() ?? null,
  };
  return { state: latest.over18 === true ? "declared_adult" : latest.over18 === false ? "under_18" : "none", record, provider };
}

/** "YYYY-MM-DD" → geçerli takvim tarihi (yerel gün) veya null. */
function parseCalendarDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const local = new Date(y, mo - 1, d);
  if (local.getFullYear() !== y || local.getMonth() !== mo - 1 || local.getDate() !== d) return null;
  return { y, mo, d, local };
}

async function revokeAllSessions(userId: string) {
  const db = await getNativeDb();
  const id = oid(userId);
  // Better Auth userId'yi sürüme göre ObjectId ya da string tutabilir; ikisini de kapsa.
  await db.collection("sessions").deleteMany({ userId: { $in: [id, id.toHexString()] } } as never);
}

/**
 * Yaş beyanı kaydı. `over18` doğum tarihinden hesaplanır; istemciden alınmaz.
 * - 18+: kayıt (self_declared, low) + kullanıcıya doğum tarihi yazılır. Bu, güçlü yaş doğrulaması DEĞİLDİR.
 * - 18 altı: kayıt "failed" olur, hesap "suspended" (neden: age_under_18) yapılır, tüm oturumlar kapatılır; doğum tarihi saklanmaz.
 */
export async function recordSelfDeclaredAge(userId: string, birthDate: string) {
  await connectDb();
  const uid = oid(userId);
  const parsed = parseCalendarDate(birthDate);
  if (!parsed) throw new AppError("Geçerli bir doğum tarihi gir.", "invalid_birth_date");
  const now = new Date();
  if (parsed.local.getTime() > now.getTime()) throw new AppError("Doğum tarihi gelecekte olamaz.", "invalid_birth_date");
  const age = ageFromBirthDate(parsed.local, now);
  if (age > 120) throw new AppError("Geçerli bir doğum tarihi gir.", "invalid_birth_date");
  const over18 = age >= MIN_AGE;

  if (over18) {
    const existing = await AgeVerificationRecord.exists({ userId: uid, over18: true });
    if (!existing) {
      await AgeVerificationRecord.create({ userId: uid, method: "self_declared", status: "verified", assuranceLevel: "low", over18: true, verifiedAt: now });
    }
    await User.updateOne({ _id: uid }, { $set: { birthDate: new Date(Date.UTC(parsed.y, parsed.mo - 1, parsed.d)) } });
    await audit({ actorId: userId, action: "age.self_declared_adult", targetType: "User", targetId: userId, metadata: { assurance: "low" } });
    return { over18: true as const };
  }

  await AgeVerificationRecord.create({ userId: uid, method: "self_declared", status: "failed", assuranceLevel: "low", over18: false });
  await User.updateOne({ _id: uid }, { $set: { status: "suspended", statusReason: "age_under_18" } });
  await revokeAllSessions(userId);
  await audit({ actorId: userId, action: "age.under_18_suspend", targetType: "User", targetId: userId, severity: "notice" });
  return { over18: false as const };
}
