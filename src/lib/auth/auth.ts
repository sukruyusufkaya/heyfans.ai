import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { ObjectId, type Db, type MongoClient } from "mongodb";
import { env } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { sendAuthEmail } from "@/lib/email";
import { onUserCreated } from "@/services/users/lifecycle";
import { LOCALE_COOKIE } from "@/i18n/config";
import { COUNTRY_HEADER, resolveLocale } from "@/i18n/resolve";

const readCookie = (header: string | null | undefined, name: string) =>
  header?.split(";").map((c) => c.trim().split("=")).find(([k]) => k === name)?.[1] ?? null;

/** APP_URL kaynağı + (gerçek alan adlarında) www'li/www'siz eşi. localhost için yalnız kendisi. */
export function appOrigins(appUrl: string): string[] {
  const u = new URL(appUrl);
  if (!u.hostname.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) return [u.origin];
  const twin = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
  return [u.origin, `${u.protocol}//${twin}${u.port ? `:${u.port}` : ""}`];
}

function buildAuth(db: Db, client: MongoClient) {
  const e = env();
  // Yerelde istekler IP taşımaz (tek kova); geliştirme/testte sınırlar gevşetilir, üretimde aynen uygulanır.
  const devFactor = e.APP_MODE === "development" ? 10 : 1;
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (e.AUTH_GOOGLE_ID && e.AUTH_GOOGLE_SECRET) {
    socialProviders.google = { clientId: e.AUTH_GOOGLE_ID, clientSecret: e.AUTH_GOOGLE_SECRET };
  }
  if (e.AUTH_APPLE_ID && e.AUTH_APPLE_SECRET) {
    socialProviders.apple = { clientId: e.AUTH_APPLE_ID, clientSecret: e.AUTH_APPLE_SECRET };
  }

  return betterAuth({
    appName: "HEYFANS",
    baseURL: e.APP_URL,
    secret: e.BETTER_AUTH_SECRET,
    database: mongodbAdapter(db, { client, usePlural: true }),
    // Alan adının www'li/www'siz eşi de güvenilir (Vercel www → apex yönlendirse de önbellekte kalmış sayfalar için).
    // Apple, giriş dönüşünü appleid.apple.com'dan form POST ile gönderir; bu kaynak güvenilir olmalı.
    trustedOrigins: [...appOrigins(e.APP_URL), ...(socialProviders.apple ? ["https://appleid.apple.com"] : [])],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({ kind: "reset_password", to: user.email, name: user.name, url, locale: (user as { locale?: string | null }).locale });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({ kind: "verify_email", to: user.email, name: user.name, url, locale: (user as { locale?: string | null }).locale });
      },
    },
    socialProviders,
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google", "apple"] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    user: {
      additionalFields: {
        username: { type: "string", required: false, input: false },
        roles: { type: "string[]", required: false, input: false, defaultValue: ["fan"] },
        adminRole: { type: "string", required: false, input: false },
        status: { type: "string", required: false, input: false, defaultValue: "active" },
        signupIntent: { type: "string", required: false, input: true },
        acceptTerms: { type: "boolean", required: false, input: true },
        termsAcceptedAt: { type: "date", required: false, input: false },
        isDemo: { type: "boolean", required: false, input: false, defaultValue: false },
        locale: { type: "string", required: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            // Kayıttan yalnız fan|creator niyeti gelebilir; admin rolü asla buradan atanamaz.
            const { acceptTerms, ...rest } = user as typeof user & { acceptTerms?: unknown; signupIntent?: unknown };
            const intent = rest.signupIntent === "creator" ? "creator" : "fan";
            // E-posta ile kayıtta Kullanım Şartları + Gizlilik onayı sunucuda zorunlu ve zaman damgasıyla saklanır.
            if (ctx?.path === "/sign-up/email" && acceptTerms !== true) {
              throw new APIError("BAD_REQUEST", { message: "Kullanım Şartları ve Gizlilik Politikası onaylanmalı.", code: "TERMS_REQUIRED" });
            }
            // Hesap dili: kullanıcının seçimi (çerez) → konum → tarayıcı dili. E-postalar ve bildirimler bu dilde gider.
            const h = ctx?.request?.headers ?? ctx?.headers;
            const locale = resolveLocale({
              cookie: readCookie(h?.get("cookie"), LOCALE_COOKIE),
              country: h?.get(COUNTRY_HEADER),
              acceptLanguage: h?.get("accept-language"),
            }).locale;
            return {
              data: { ...rest, signupIntent: intent, roles: ["fan"], adminRole: null, status: "active", termsAcceptedAt: acceptTerms === true ? new Date() : null, locale },
            };
          },
          after: async (user) => {
            await onUserCreated({ userId: user.id, intent: (user as { signupIntent?: string }).signupIntent === "creator" ? "creator" : "fan" });
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            // Askıya alınmış / yasaklı hesap oturum açamaz.
            if (!ObjectId.isValid(session.userId)) return { data: session };
            const u = await db.collection("users").findOne({ _id: new ObjectId(session.userId) }, { projection: { status: 1 } });
            if (u && (u.status === "banned" || u.status === "suspended" || u.status === "deleted")) return false;
            return { data: session };
          },
        },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100 * devFactor,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 8 * devFactor },
        "/sign-up/email": { window: 60, max: 5 * devFactor },
        "/request-password-reset": { window: 300, max: 5 * devFactor },
        "/send-verification-email": { window: 300, max: 5 * devFactor },
        "/two-factor/verify-totp": { window: 60, max: 6 * devFactor },
      },
    },
    advanced: {
      useSecureCookies: e.APP_URL.startsWith("https://"),
      cookiePrefix: "hf",
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
    telemetry: { enabled: false },
    plugins: [
      twoFactor({
        issuer: "HEYFANS",
        skipVerificationOnEnable: false,
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof buildAuth>;

const g = globalThis as unknown as { __heyfansAuth?: Promise<Auth> };

/** Mongoose ile aynı MongoClient'ı kullanan tekil Better Auth örneği. */
export function getAuth(): Promise<Auth> {
  g.__heyfansAuth ??= (async () => {
    const m = await connectDb();
    const db = m.connection.db;
    if (!db) throw new Error("MongoDB bağlantısı hazır değil");
    return buildAuth(db as unknown as Db, m.connection.getClient() as unknown as MongoClient);
  })().catch((err) => {
    g.__heyfansAuth = undefined;
    throw err;
  });
  return g.__heyfansAuth;
}
