import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallScreen } from "@/components/fan/call-screen";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { usernameSchema } from "@/lib/validation/common";
import { getCallAvailability } from "@/services/calls/calls";

export const metadata: Metadata = { title: "Sesli Görüşme" };
export const dynamic = "force-dynamic";

export default async function VoiceCallPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = await params;
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) notFound();
  const { user } = await requireUser(`/experiences/voice/${raw}`);
  let data: Awaited<ReturnType<typeof getCallAvailability>>;
  try {
    data = await getCallAvailability(user.id, parsed.data, "voice");
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") notFound();
    throw err;
  }
  return <CallScreen kind="voice" data={data} />;
}
