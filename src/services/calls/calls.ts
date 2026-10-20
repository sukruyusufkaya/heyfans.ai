import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { AppError, FeatureUnavailableError, NotFoundError } from "@/lib/errors";
import { createRtcToken, rtcStatus } from "@/lib/rtc";
import { oid } from "@/lib/validation/common";
import { AiTwin, type ITwin } from "@/models/ai";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { CallSession, type ICallSession } from "@/models/social";
import { recordCreditEarning } from "@/services/billing/earnings";
import { assertNotSample, SAMPLE_PURCHASE_MESSAGE } from "@/services/creators/sample";
import { getPlatformSettings } from "@/services/platform/settings";
import { debitWallet, ensureWallet } from "@/services/wallet/wallet";
import { getT } from "@/i18n/server";

/** Görüşme ekranı için durum: özellik açık mı, RTC yapılandırılmış mı, ücret ve bakiye. */
export async function getCallAvailability(userId: string, username: string, kind: "voice" | "video") {
  await connectDb();
  const t = await getT();
  const creator = await CreatorProfile.findOne({ username: username.toLowerCase(), status: "approved" }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("İçerik üreticisi bulunamadı.");
  const twin = await AiTwin.findOne({ creatorId: creator._id }).lean<ITwin>();
  const settings = await getPlatformSettings();
  const wallet = await ensureWallet(userId);
  const rate = kind === "voice" ? (twin?.pricing.voicePerMinuteCredits ?? 0) : (twin?.pricing.videoPerMinuteCredits ?? 0);
  const reasons: string[] = [];
  if (creator.isSample) reasons.push(t(SAMPLE_PURCHASE_MESSAGE));
  if (!twin || twin.status !== "live") reasons.push(t("AI ikizi yayında değil."));
  if (kind === "voice" && (!twin?.features.voice || !settings.features.voiceCalls)) reasons.push(t("Bu creator sesli görüşmeyi etkinleştirmedi."));
  if (kind === "video" && (!twin?.features.video || !settings.features.videoCalls)) reasons.push(t("Bu creator görüntülü görüşmeyi etkinleştirmedi."));
  const rtc = rtcStatus();
  if (!rtc.configured) reasons.push(t("Gerçek zamanlı görüşme altyapısı (RTC) henüz yapılandırılmadı."));
  return { creator, twin, ratePerMinute: rate, balance: wallet.balance, available: reasons.length === 0, reasons, rtc };
}

export async function startCall(user: { id: string; name: string }, username: string, kind: "voice" | "video") {
  const a = await getCallAvailability(user.id, username, kind);
  assertNotSample(a.creator);
  if (!a.available) throw new FeatureUnavailableError(a.reasons.join(" "), a.rtc.missing);
  if (a.balance < a.ratePerMinute) throw new AppError("Görüşmeyi başlatmak için en az 1 dakikalık kredin olmalı.", "insufficient_credits", 402);
  await CallSession.updateMany({ userId: oid(user.id), status: "active" }, { $set: { status: "ended", endedAt: new Date(), endReason: "Yeni görüşme başlatıldı" /* i18n-ignore (kayıt notu) */ } });
  const session = await CallSession.create({
    userId: oid(user.id),
    creatorId: a.creator._id,
    twinId: a.twin!._id,
    kind,
    provider: "livekit",
    roomName: `call_${a.creator.username}_${Date.now()}`,
    ratePerMinute: a.ratePerMinute,
  });
  await tickCall(user.id, session._id.toString()); // ilk dakika peşin
  const token = await createRtcToken({ roomName: session.roomName, identity: `user_${user.id}`, name: user.name });
  return { sessionId: session._id.toString(), ...token };
}

/** Dakika faturalaması: istemci her 60 sn çağırır; dakika indeksi idempotency anahtarıdır. */
export async function tickCall(userId: string, sessionId: string) {
  await connectDb();
  const s = await CallSession.findOne({ _id: oid(sessionId), userId: oid(userId) });
  if (!s || s.status !== "active") throw new NotFoundError("Etkin görüşme bulunamadı.");
  const elapsedMin = Math.floor((Date.now() - s.startedAt.getTime()) / 60_000) + 1;
  while (s.minutesBilled < elapsedMin) {
    const minute = s.minutesBilled + 1;
    try {
      const entry = await debitWallet({
        userId,
        amount: s.ratePerMinute,
        type: s.kind === "voice" ? "spend_voice" : "spend_video",
        description: `${s.kind === "voice" ? "Sesli" : "Görüntülü"} görüşme — ${minute}. dakika`, // i18n-ignore (defter açıklaması saklanır)
        idempotencyKey: `call:${s._id.toString()}:${minute}`,
        creatorId: s.creatorId,
        refType: "CallSession",
        refId: s._id,
      });
      // i18n-ignore (hak ediş açıklaması saklanır)
      await recordCreditEarning({ creatorId: s.creatorId, sourceType: s.kind, credits: s.ratePerMinute, ledgerEntryId: entry._id, description: `${s.kind === "voice" ? "Sesli" : "Görüntülü"} görüşme` });
      s.minutesBilled = minute;
      s.creditsSpent += s.ratePerMinute;
    } catch (err) {
      s.status = "ended";
      s.endedAt = new Date();
      s.endReason = "Yetersiz kredi"; // i18n-ignore (kayıt notu)
      await s.save();
      throw err;
    }
  }
  s.lastTickAt = new Date();
  await s.save();
  return { minutesBilled: s.minutesBilled, creditsSpent: s.creditsSpent };
}

export async function endCall(userId: string, sessionId: string) {
  await connectDb();
  return CallSession.findOneAndUpdate(
    { _id: oid(sessionId), userId: oid(userId), status: "active" },
    { $set: { status: "ended", endedAt: new Date(), endReason: "Kullanıcı bitirdi" /* i18n-ignore (kayıt notu) */ } },
    { returnDocument: "after" },
  ).lean<ICallSession>();
}
