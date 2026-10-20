import "server-only";
import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import { env } from "@/config/env";

/**
 * Serverless uyumlu tek bağlantı: Mongoose bağlantısı globalThis üzerinde önbelleklenir,
 * Better Auth aynı MongoClient'ı (`getMongoClient`) kullanır.
 */
type Cache = { conn?: typeof mongoose; promise?: Promise<typeof mongoose> };
const g = globalThis as unknown as { __heyfansMongo?: Cache };
const cache: Cache = (g.__heyfansMongo ??= {});

// NoSQL enjeksiyonu: tüm dış girdiler Zod ile ilkel tiplere (string/number/boolean) daraltılır;
// strictQuery şemada olmayan alanlarla filtrelemeyi engeller. Ayrıca bkz. lib/validation/ids.ts.
mongoose.set("strictQuery", true);

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    const { MONGODB_URI, MONGODB_DB_NAME } = env();
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB_NAME,
        maxPoolSize: 10,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 8000,
        autoIndex: env().APP_MODE !== "production",
      })
      .catch((err) => {
        cache.promise = undefined;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function getMongoClient() {
  const m = await connectDb();
  return m.connection.getClient();
}

export async function getNativeDb() {
  const m = await connectDb();
  const db = m.connection.db;
  if (!db) throw new Error("MongoDB bağlantısı hazır değil"); // i18n-ignore (geliştirici/günlük hatası)
  return db;
}

/** Transaction yardımcısı — hata durumunda otomatik geri alınır, geçici hatalarda yeniden dener. */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const m = await connectDb();
  const session = await m.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
