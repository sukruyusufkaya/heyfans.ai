import { afterAll, describe, expect, it } from "vitest";
import mongoose, { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import type { SessionUser } from "@/lib/auth/session";
import { AgeVerificationRecord, User, UserPreferences } from "@/models";
import { resolvePostLoginDestination } from "@/services/auth/post-login";
import { makeUser } from "./helpers";

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

const sessionOf = async (id: string, over: Partial<SessionUser> = {}): Promise<SessionUser> => {
  const u = await User.findById(id).lean();
  return { id, name: u!.name, email: u!.email, emailVerified: true, image: null, username: null, roles: ["fan"], adminRole: null, status: "active", twoFactorEnabled: false, signupIntent: "fan", locale: null, ...over };
};

describe("giriş sonrası yönlendirme · şart onayı (Google/Apple kaydı)", () => {
  it("şartları onaylamamış kullanıcı /consent'e gider; next korunur", async () => {
    await connectDb();
    const id = await makeUser(["fan"]);
    expect(await resolvePostLoginDestination(await sessionOf(id))).toBe("/consent");
    expect(await resolvePostLoginDestination(await sessionOf(id), "/app/wallet")).toBe("/consent?next=%2Fapp%2Fwallet");
  });

  it("onay sonrası normal akış devam eder (yaş → karşılama → hedef)", async () => {
    const id = await makeUser(["fan"], { termsAcceptedAt: new Date() });
    expect(await resolvePostLoginDestination(await sessionOf(id), "/explore")).toBe("/age-verification?next=%2Fexplore");
    await AgeVerificationRecord.create({ userId: new Types.ObjectId(id), method: "self_declared", status: "verified", assuranceLevel: "low", over18: true, verifiedAt: new Date() });
    await UserPreferences.create({ userId: new Types.ObjectId(id), fanOnboarding: { step: 4, completedAt: new Date() } });
    expect(await resolvePostLoginDestination(await sessionOf(id), "/explore")).toBe("/explore");
  });

  it("creator niyeti veritabanından okunur: oturum çerezi 'fan' dese de başvuru otomatik başlar", async () => {
    const id = await makeUser(["fan"], { termsAcceptedAt: new Date(), signupIntent: "creator" });
    await AgeVerificationRecord.create({ userId: new Types.ObjectId(id), method: "self_declared", status: "verified", assuranceLevel: "low", over18: true, verifiedAt: new Date() });
    expect(await resolvePostLoginDestination(await sessionOf(id, { signupIntent: "fan" }))).toBe("/onboarding/creator?start=1");
  });

  it("yöneticiler şart kapısına takılmaz", async () => {
    const id = await makeUser(["fan", "admin"], { adminRole: "support_agent" });
    expect(await resolvePostLoginDestination(await sessionOf(id, { roles: ["fan", "admin"], adminRole: "support_agent" }))).toBe("/admin");
  });
});
