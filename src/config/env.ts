import "server-only";
import { z } from "zod";
import { m } from "@/i18n/m";

/**
 * Ortam değişkenleri tek noktadan, Zod ile doğrulanır.
 * Sağlayıcı anahtarları isteğe bağlıdır: eksikse ilgili özellik kapalı kalır ve
 * `integrationStatus()` admin paneline neyin eksik olduğunu bildirir.
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_MODE: z.enum(["development", "demo", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3070"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI zorunlu"), // i18n-ignore
  MONGODB_DB_NAME: z.string().default("heyfans"),

  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET en az 32 karakter olmalı"), // i18n-ignore
  AUTH_GOOGLE_ID: optional,
  AUTH_GOOGLE_SECRET: optional,
  AUTH_APPLE_ID: optional,
  AUTH_APPLE_SECRET: optional,
  ADMIN_MFA_ENFORCED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  AI_PROVIDER: z.enum(["none", "mock", "openai-compatible"]).default("none"),
  AI_API_KEY: optional,
  AI_BASE_URL: optional,
  AI_MODEL: optional,
  AI_EMBEDDING_MODEL: optional,
  AI_MONTHLY_BUDGET_USD: z.coerce.number().nonnegative().default(0),
  AI_PRICE_INPUT_PER_MTOK: z.coerce.number().nonnegative().default(0),
  AI_PRICE_OUTPUT_PER_MTOK: z.coerce.number().nonnegative().default(0),
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  VECTOR_SEARCH_MODE: z.enum(["local", "atlas"]).default("local"),

  PAYMENT_PROVIDER: z.enum(["none", "mock", "iyzico", "stripe"]).default("none"),
  PAYMENT_SECRET_KEY: optional,
  PAYMENT_API_KEY: optional,
  PAYMENT_WEBHOOK_SECRET: optional,

  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default(".data/uploads"),
  S3_ENDPOINT: optional,
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  S3_PUBLIC_BASE_URL: optional,

  EMAIL_PROVIDER: z.enum(["outbox", "resend"]).default("outbox"),
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("HEYFANS <no-reply@heyfans.ai>"), // i18n-ignore

  RTC_PROVIDER: z.enum(["none", "livekit"]).default("none"),
  LIVEKIT_URL: optional,
  LIVEKIT_API_KEY: optional,
  LIVEKIT_API_SECRET: optional,

  AGE_VERIFICATION_PROVIDER: z.enum(["none"]).default("none"),
  AGE_VERIFICATION_PROVIDER_KEY: optional,

  REDIS_URL: optional,
  CRON_SECRET: optional,
  DATA_ENCRYPTION_KEY: optional,
  MEDIA_SIGNING_SECRET: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    // i18n-ignore (geliştirici/işletim hatası)
    throw new Error(`Ortam yapılandırması geçersiz: ${issues}`);
  }
  const value = parsed.data;
  if (value.APP_MODE === "production") {
    if (value.AI_PROVIDER === "mock") throw new Error("Üretimde AI_PROVIDER=mock kullanılamaz."); // i18n-ignore (geliştirici/işletim hatası)
    if (value.PAYMENT_PROVIDER === "mock") throw new Error("Üretimde PAYMENT_PROVIDER=mock kullanılamaz."); // i18n-ignore (geliştirici/işletim hatası)
    if (value.STORAGE_PROVIDER === "local") throw new Error("Üretimde STORAGE_PROVIDER=local kullanılamaz (Vercel dosya sistemi kalıcı değil)."); // i18n-ignore (geliştirici/işletim hatası)
    if (!value.ADMIN_MFA_ENFORCED) throw new Error("Üretimde ADMIN_MFA_ENFORCED=false yapılamaz; admin oturumlarında 2FA zorunludur."); // i18n-ignore (geliştirici/işletim hatası)
  }
  cached = value;
  return value;
}

export const isProduction = () => env().APP_MODE === "production";
export const isDemo = () => env().APP_MODE === "demo";
export const allowsMockProviders = () => env().APP_MODE !== "production";

/** Admin paneli için entegrasyon özeti — sırları asla döndürmez. */
export function integrationStatus() {
  const e = env();
  return [
    {
      key: "ai",
      label: m("AI sağlayıcısı"),
      configured: e.AI_PROVIDER === "openai-compatible" && !!e.AI_API_KEY && !!e.AI_BASE_URL && !!e.AI_MODEL,
      mode: e.AI_PROVIDER,
      missing: e.AI_PROVIDER === "openai-compatible" ? ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL"].filter((k) => !e[k as keyof Env]) : ["AI_PROVIDER"],
    },
    {
      key: "payments",
      label: m("Ödeme sağlayıcısı"),
      configured: (e.PAYMENT_PROVIDER === "iyzico" || e.PAYMENT_PROVIDER === "stripe") && !!e.PAYMENT_SECRET_KEY && !!e.PAYMENT_WEBHOOK_SECRET,
      mode: e.PAYMENT_PROVIDER,
      missing: ["PAYMENT_PROVIDER", "PAYMENT_SECRET_KEY", "PAYMENT_WEBHOOK_SECRET"].filter((k) => !e[k as keyof Env] || e[k as keyof Env] === "none" || e[k as keyof Env] === "mock"),
    },
    {
      key: "storage",
      label: m("Medya depolama"),
      configured: e.STORAGE_PROVIDER === "s3" && !!e.S3_BUCKET && !!e.S3_ACCESS_KEY_ID && !!e.S3_SECRET_ACCESS_KEY,
      mode: e.STORAGE_PROVIDER,
      missing: e.STORAGE_PROVIDER === "s3" ? ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_ENDPOINT"].filter((k) => !e[k as keyof Env]) : ["STORAGE_PROVIDER=s3"],
    },
    {
      key: "email",
      label: m("E-posta gönderimi"),
      configured: e.EMAIL_PROVIDER === "resend" && !!e.RESEND_API_KEY,
      mode: e.EMAIL_PROVIDER,
      missing: e.EMAIL_PROVIDER === "resend" && !e.RESEND_API_KEY ? ["RESEND_API_KEY"] : e.EMAIL_PROVIDER === "outbox" ? ["EMAIL_PROVIDER=resend", "RESEND_API_KEY"] : [],
    },
    {
      key: "rtc",
      label: m("Sesli/görüntülü görüşme (RTC)"),
      configured: e.RTC_PROVIDER === "livekit" && !!e.LIVEKIT_URL && !!e.LIVEKIT_API_KEY && !!e.LIVEKIT_API_SECRET,
      mode: e.RTC_PROVIDER,
      missing: ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"].filter((k) => !e[k as keyof Env]),
    },
    {
      key: "age",
      label: m("Yaş doğrulama sağlayıcısı"),
      configured: false,
      mode: e.AGE_VERIFICATION_PROVIDER,
      missing: ["AGE_VERIFICATION_PROVIDER", "AGE_VERIFICATION_PROVIDER_KEY"],
    },
    {
      key: "oauth",
      label: m("Google / Apple ile giriş"),
      configured: !!(e.AUTH_GOOGLE_ID && e.AUTH_GOOGLE_SECRET) || !!(e.AUTH_APPLE_ID && e.AUTH_APPLE_SECRET),
      mode: [e.AUTH_GOOGLE_ID ? "google" : null, e.AUTH_APPLE_ID ? "apple" : null].filter(Boolean).join(",") || "none",
      missing: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_APPLE_ID", "AUTH_APPLE_SECRET"].filter((k) => !e[k as keyof Env]),
    },
    {
      key: "cron",
      label: m("Zamanlanmış işler (Vercel Cron)"),
      configured: !!e.CRON_SECRET,
      mode: e.CRON_SECRET ? "secret" : "none",
      missing: e.CRON_SECRET ? [] : ["CRON_SECRET"],
    },
  ];
}
