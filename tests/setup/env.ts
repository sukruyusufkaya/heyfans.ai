import { randomBytes } from "node:crypto";
import { vi } from "vitest";

// next/headers istek dışında çağrılırsa hata fırlatır; servisler bunu yakalar. Testte boş başlık döner.
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));

process.env.APP_MODE = "development";
process.env.APP_URL = "http://localhost:3070";
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27047/?replicaSet=rs0";
process.env.MONGODB_DB_NAME = `heyfans_test_${process.pid}`;
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("base64url");
process.env.AI_PROVIDER = "mock";
process.env.PAYMENT_PROVIDER = "mock";
process.env.PAYMENT_WEBHOOK_SECRET = "test_webhook_secret_123456";
process.env.EMAIL_PROVIDER = "outbox";
process.env.STORAGE_PROVIDER = "local";
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.MEDIA_SIGNING_SECRET = "test_media_secret";
