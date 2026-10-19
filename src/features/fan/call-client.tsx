"use client";
import * as React from "react";
import Link from "next/link";
import { Camera, CameraOff, Coins, Loader2, MessageCircle, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { AiTwinLabel } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/display";
import { cn, formatNumber } from "@/lib/utils";

type Phase = "idle" | "connecting" | "live" | "ended";

interface Props {
  username: string;
  kind: "voice" | "video";
  creator: { displayName: string; avatarUrl: string | null };
  ratePerMinute: number;
  initialBalance: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (sec: number) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; code?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: url.endsWith("/end") });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: (json as { error?: string }).error ?? "İşlem tamamlanamadı.", code: (json as { code?: string }).code };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "Bağlantı kurulamadı." };
  }
}

/** Canlı görüşme istemcisi: /api/calls (başlat/tick/bitir) + livekit-client. Yalnız RTC yapılandırılmışsa render edilir. */
export function CallClient({ username, kind, creator, ratePerMinute, initialBalance }: Props) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [balance, setBalance] = React.useState(initialBalance);
  const [elapsed, setElapsed] = React.useState(0);
  const [spent, setSpent] = React.useState(0);
  const [minutes, setMinutes] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [speakerOff, setSpeakerOff] = React.useState(false);
  const [cameraOn, setCameraOn] = React.useState(kind === "video");
  const [remoteCount, setRemoteCount] = React.useState(0);
  const [endReason, setEndReason] = React.useState<string | null>(null);

  const sessionId = React.useRef<string | null>(null);
  const roomRef = React.useRef<import("livekit-client").Room | null>(null);
  const audioHost = React.useRef<HTMLDivElement>(null);
  const remoteVideo = React.useRef<HTMLVideoElement>(null);
  const localVideo = React.useRef<HTMLVideoElement>(null);
  const startedAt = React.useRef(0);
  const tickBusy = React.useRef(false);

  const affordableMinutes = ratePerMinute > 0 ? Math.floor(balance / ratePerMinute) : null;
  const canStart = ratePerMinute === 0 || balance >= ratePerMinute;

  const finish = React.useCallback(async (reason: string, callServer = true) => {
    const id = sessionId.current;
    sessionId.current = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
    if (audioHost.current) audioHost.current.innerHTML = "";
    setPhase("ended");
    setEndReason(reason);
    if (id && callServer) {
      const res = await post<{ balance: number; creditsSpent: number | null; minutesBilled: number | null }>("/api/calls/end", { sessionId: id });
      if (res.ok) {
        setBalance(res.data.balance);
        if (res.data.creditsSpent != null) setSpent(res.data.creditsSpent);
        if (res.data.minutesBilled != null) setMinutes(res.data.minutesBilled);
      }
    }
  }, []);

  // Süre sayacı + dakikalık faturalama (60 sn)
  React.useEffect(() => {
    if (phase !== "live") return;
    const clockId = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    const tickId = setInterval(async () => {
      const id = sessionId.current;
      if (!id || tickBusy.current) return;
      tickBusy.current = true;
      const res = await post<{ minutesBilled: number; creditsSpent: number; balance: number }>("/api/calls/tick", { sessionId: id });
      tickBusy.current = false;
      if (res.ok) {
        setBalance(res.data.balance);
        setSpent(res.data.creditsSpent);
        setMinutes(res.data.minutesBilled);
      } else if (res.status === 402 || res.status === 404) {
        toast.error(res.status === 402 ? "Yetersiz kredi: görüşme sona erdi." : "Görüşme sunucuda sona ermiş.");
        void finish(res.status === 402 ? "Yetersiz kredi nedeniyle görüşme sona erdi." : "Görüşme sona erdi.", false);
      }
    }, 60_000);
    return () => {
      clearInterval(clockId);
      clearInterval(tickId);
    };
  }, [phase, finish]);

  // Sayfadan ayrılırken görüşmeyi bitir (faturalama durur)
  React.useEffect(() => {
    const onUnload = () => {
      if (sessionId.current) void fetch("/api/calls/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionId.current }), keepalive: true });
    };
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      onUnload();
      roomRef.current?.disconnect();
    };
  }, []);

  async function start() {
    setPhase("connecting");
    setEndReason(null);
    const res = await post<{ sessionId: string; url: string; token: string; balance: number }>("/api/calls/start", { username, kind });
    if (!res.ok) {
      setPhase("idle");
      toast.error(res.error);
      return;
    }
    sessionId.current = res.data.sessionId;
    try {
      const lk = await import("livekit-client");
      const room = new lk.Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(lk.RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === lk.Track.Kind.Video && remoteVideo.current) track.attach(remoteVideo.current);
        else if (track.kind === lk.Track.Kind.Audio && audioHost.current) audioHost.current.appendChild(track.attach());
      });
      room.on(lk.RoomEvent.TrackUnsubscribed, (track) => track.detach());
      const sync = () => setRemoteCount(room.remoteParticipants.size);
      room.on(lk.RoomEvent.ParticipantConnected, sync);
      room.on(lk.RoomEvent.ParticipantDisconnected, sync);
      room.on(lk.RoomEvent.Disconnected, () => {
        if (sessionId.current) void finish("Bağlantı sona erdi.");
      });
      await room.connect(res.data.url, res.data.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      if (kind === "video") {
        await room.localParticipant.setCameraEnabled(true);
        const pub = room.localParticipant.getTrackPublication(lk.Track.Source.Camera);
        if (pub?.track && localVideo.current) pub.track.attach(localVideo.current);
      }
      sync();
      startedAt.current = Date.now();
      setElapsed(0);
      setBalance(res.data.balance);
      setSpent(ratePerMinute);
      setMinutes(1);
      setPhase("live");
    } catch (err) {
      console.error("[call:connect]", err);
      toast.error("Görüşmeye bağlanılamadı. Mikrofon/kamera iznini ve bağlantını kontrol et.");
      await finish("Bağlantı kurulamadı.");
    }
  }

  async function toggleMic() {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(muted);
    setMuted(!muted);
  }
  async function toggleCamera() {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setCameraEnabled(!cameraOn);
    setCameraOn(!cameraOn);
  }
  function toggleSpeaker() {
    const next = !speakerOff;
    setSpeakerOff(next);
    audioHost.current?.querySelectorAll("audio").forEach((a) => (a.muted = next));
    if (remoteVideo.current) remoteVideo.current.muted = next;
  }

  const live = phase === "live";
  const lowBalance = live && ratePerMinute > 0 && balance < ratePerMinute;

  return (
    <div>
      <div className={cn("relative overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#1f1428_0%,#3a0f33_60%,#5a0f45_100%)] text-white", kind === "video" ? "aspect-[16/10]" : "min-h-[360px]")}>
        <div ref={audioHost} className="hidden" aria-hidden />
        {kind === "video" && (
          <>
            <video ref={remoteVideo} autoPlay playsInline className={cn("absolute inset-0 size-full object-cover", !live && "hidden")} />
            <video ref={localVideo} autoPlay playsInline muted className={cn("absolute bottom-4 right-4 z-10 aspect-video w-32 rounded-xl border border-white/30 object-cover shadow-lg sm:w-44", (!live || !cameraOn) && "hidden")} />
          </>
        )}
        <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-extrabold backdrop-blur">
            <span className={cn("size-1.5 rounded-full", live ? "animate-pulse bg-[#2ee59d]" : "bg-white/50")} aria-hidden />
            {live ? "Canlı" : phase === "connecting" ? "Bağlanıyor…" : phase === "ended" ? "Görüşme bitti" : "Hazır"}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-extrabold backdrop-blur" aria-live="off">
            {clock(elapsed)}
            {affordableMinutes != null && !live ? ` · bakiyen ~${affordableMinutes} dk` : ""}
          </span>
        </div>
        <div className={cn("relative z-0 flex h-full min-h-[360px] flex-col items-center justify-center gap-3 px-6 py-16 text-center", kind === "video" && live && remoteCount > 0 && "opacity-0")}>
          <span className={cn("rounded-full p-1.5", live && remoteCount > 0 && "animate-pulse-soft ring-4 ring-white/30")}>
            <Avatar src={creator.avatarUrl} name={creator.displayName} size={104} ring={false} />
          </span>
          <p className="text-lg font-black tracking-[-0.03em]">{creator.displayName}</p>
          <AiTwinLabel size="md" className="bg-white/90" />
          <p className="max-w-xs text-xs text-white/75">
            {phase === "idle" && "Hazır olduğunda görüşmeyi başlat. Mikrofon izni istenecek."}
            {phase === "connecting" && "Güvenli bağlantı kuruluyor…"}
            {live && (remoteCount > 0 ? "AI ikizi seninle konuşuyor…" : "AI ikizinin odaya katılması bekleniyor…")}
            {phase === "ended" && (endReason ?? "Görüşme sona erdi.")}
          </p>
        </div>
        {lowBalance && (
          <p role="alert" className="absolute inset-x-4 bottom-20 z-10 rounded-xl bg-danger/90 px-4 py-2 text-center text-[11px] font-bold">
            Bakiyen bir sonraki dakikaya yetmiyor; görüşme otomatik sona erecek.
          </p>
        )}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-3 bg-gradient-to-t from-black/50 to-transparent px-4 pb-5 pt-10">
          {live ? (
            <>
              <CtrlButton label={muted ? "Mikrofonu aç" : "Mikrofonu kapat"} onClick={toggleMic} active={muted}>
                {muted ? <MicOff /> : <Mic />}
              </CtrlButton>
              <CtrlButton label={speakerOff ? "Sesi aç" : "Sesi kapat"} onClick={toggleSpeaker} active={speakerOff}>
                {speakerOff ? <VolumeX /> : <Volume2 />}
              </CtrlButton>
              {kind === "video" && (
                <CtrlButton label={cameraOn ? "Kamerayı kapat" : "Kamerayı aç"} onClick={toggleCamera} active={!cameraOn}>
                  {cameraOn ? <Camera /> : <CameraOff />}
                </CtrlButton>
              )}
              <CtrlButton label="Aramayı bitir" onClick={() => finish("Görüşmeyi sen bitirdin.")} danger>
                <PhoneOff />
              </CtrlButton>
              <Link href={`/chat/${username}`} aria-label="Yazılı sohbete geç" className="grid size-12 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 [&_svg]:size-5">
                <MessageCircle />
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={phase === "connecting" || !canStart}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-500 px-7 text-sm font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600 disabled:opacity-60"
            >
              {phase === "connecting" ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
              {phase === "ended" ? "Yeniden başlat" : kind === "voice" ? "Sesli görüşmeyi başlat" : "Görüntülü görüşmeyi başlat"}
            </button>
          )}
        </div>
      </div>

      {!canStart && !live && (
        <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs">
          <p className="font-semibold text-ink-soft">
            Görüşmeyi başlatmak için en az {formatNumber(ratePerMinute)} kredi gerekiyor. Bakiyen: {formatNumber(balance)}.
          </p>
          <Link href="/app/wallet" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-500 px-4 text-[11px] font-extrabold text-white hover:bg-brand-600">
            <Coins className="size-3.5" /> Kredi yükle
          </Link>
        </div>
      )}

      <dl className="mt-4 grid gap-3 rounded-2xl border border-line-soft bg-[#fbf9fc] p-4 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Görüşme süresi</dt>
          <dd className="font-extrabold tabular-nums">{clock(elapsed)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Dakika ücreti</dt>
          <dd className="font-extrabold">{formatNumber(ratePerMinute)} kredi</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Bu görüşmede harcanan</dt>
          <dd className="font-extrabold tabular-nums">
            {formatNumber(spent)} kredi{minutes ? ` (${minutes} dk)` : ""}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Kalan bakiye</dt>
          <dd className="font-extrabold tabular-nums">{formatNumber(balance)} kredi</dd>
        </div>
      </dl>
    </div>
  );
}

function CtrlButton({ children, label, onClick, active, danger }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "grid size-12 place-items-center rounded-full text-white backdrop-blur transition-colors [&_svg]:size-5",
        danger ? "bg-danger hover:brightness-110" : active ? "bg-white/35" : "bg-white/15 hover:bg-white/25",
      )}
    >
      {children}
    </button>
  );
}
