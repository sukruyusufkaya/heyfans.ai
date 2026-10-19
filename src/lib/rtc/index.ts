import "server-only";
import { env } from "@/config/env";
import { FeatureUnavailableError } from "@/lib/errors";

export function rtcStatus() {
  const e = env();
  const configured = e.RTC_PROVIDER === "livekit" && !!e.LIVEKIT_URL && !!e.LIVEKIT_API_KEY && !!e.LIVEKIT_API_SECRET;
  return { configured, provider: e.RTC_PROVIDER, missing: configured ? [] : ["RTC_PROVIDER=livekit", "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] };
}

/**
 * LiveKit oda belirteci. AI tarafı (STT → LLM → TTS ajanı) LiveKit Agents ile ayrı bir
 * çalışan olarak bağlanır; bu uygulama yalnız yetki, faturalama ve belirteç üretir.
 */
export async function createRtcToken(input: { roomName: string; identity: string; name: string; ttlSec?: number }) {
  const status = rtcStatus();
  if (!status.configured) throw new FeatureUnavailableError("Sesli/görüntülü görüşme altyapısı henüz yapılandırılmadı.", status.missing);
  const e = env();
  const { AccessToken } = await import("livekit-server-sdk");
  const at = new AccessToken(e.LIVEKIT_API_KEY!, e.LIVEKIT_API_SECRET!, { identity: input.identity, name: input.name, ttl: input.ttlSec ?? 3600 });
  at.addGrant({ room: input.roomName, roomJoin: true, canPublish: true, canSubscribe: true });
  return { url: e.LIVEKIT_URL!, token: await at.toJwt() };
}
