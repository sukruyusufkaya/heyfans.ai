import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { enqueueJob, processJobs, publishScheduledContent } from "@/services/jobs/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron: Authorization: Bearer <CRON_SECRET>. Bekleyen işleri ve periyodik bakımı yürütür. */
export async function GET(request: Request) {
  const secret = env().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const hour = new Date().toISOString().slice(0, 13);
  await enqueueJob("subscriptions.expire", {}, { dedupeKey: `subs-expire:${hour}` });
  const scheduledPublished = await publishScheduledContent();
  const result = await processJobs(20, 45_000);
  return NextResponse.json({ ok: true, scheduledPublished, ...result });
}
