import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { RateLimitError } from "@/lib/errors";
import { RateLimit } from "@/models/platform";

/**
 * Sabit pencereli sayaç (MongoDB, TTL'li). Serverless ortamda ek altyapı gerektirmez.
 * Aşılırsa RateLimitError fırlatır.
 */
export async function rateLimit(bucket: string, key: string, limit: number, windowSec: number) {
  await connectDb();
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSec * 1000)) * windowSec * 1000;
  const id = `${bucket}:${key}:${windowStart}`;
  const doc = await RateLimit.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowSec * 1000 * 2) } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  if ((doc?.count ?? 0) > limit) {
    throw new RateLimitError(Math.ceil((windowStart + windowSec * 1000 - now) / 1000));
  }
  return { remaining: Math.max(0, limit - (doc?.count ?? 0)) };
}
