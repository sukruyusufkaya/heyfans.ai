"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronLeft, Coins, Flag, Gift, ImageIcon, MoreVertical, Mic, Plus, RotateCcw, ShieldAlert, ShieldCheck, Trash2, Video, Zap } from "lucide-react";
import { toast } from "sonner";
import { Verified } from "@/components/creator/creator-cards";
import { ConfirmDialog } from "@/components/fan/confirm-dialog";
import { ReportDialog } from "@/components/fan/report-dialog";
import { AiTwinLabel, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/display";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { chatStatusAction, deleteConversationAction, newConversationAction } from "@/features/fan/actions";
import { cn, formatNumber, formatTime } from "@/lib/utils";

export interface ChatMsg {
  id: string;
  role: "user" | "ai" | "system";
  body: string;
  createdAt: string;
  isMock: boolean;
  charged: number;
  safetyAction: "none" | "rewritten" | "blocked" | "escalated";
  failed: boolean;
  pending?: boolean;
  streaming?: boolean;
  retryKey?: string;
  clientError?: boolean;
}

export interface ChatBilling {
  mode: "free_daily" | "subscription" | "credits" | "test" | "blocked";
  credits: number;
  freeLeft: number | null;
  reason?: string;
}

interface Props {
  conversationId: string;
  creator: { username: string; displayName: string; avatarUrl: string | null; verified: boolean; isOnline: boolean; isSample?: boolean };
  twin: { voice: boolean; video: boolean };
  initialMessages: ChatMsg[];
  initialBilling: ChatBilling;
  initialBalance: number;
  messagePrice: number;
  maxInputChars: number;
  ai: { available: boolean; mock: boolean };
  memoryEnabled: boolean;
}

type StreamEvent =
  | { type: "meta"; conversationId: string; userMessageId: string; charged: number; balance: number | null; billing: ChatBilling["mode"] }
  | { type: "delta"; text: string }
  | { type: "done"; aiMessageId: string; isMock: boolean; safetyAction: string }
  | { type: "error"; message: string; code: string };

const STARTERS = ["Bugün nasılsın?", "Bana kendinden bahseder misin?", "Bu hafta için bir önerin var mı?"];

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400_000);
  if (d.toDateString() === today.toDateString()) return "Bugün";
  if (d.toDateString() === yesterday.toDateString()) return "Dün";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(d);
}

function billingText(b: ChatBilling, price: number) {
  switch (b.mode) {
    case "subscription":
      return b.freeLeft != null ? `Üyeliğin kapsamında · bugün ${b.freeLeft} mesaj hakkın kaldı` : "Üyeliğin kapsamında · sınırsız sohbet";
    case "free_daily":
      return b.freeLeft != null ? `Bugün ${b.freeLeft} ücretsiz mesaj hakkın kaldı` : "Bu sohbet şu an ücretsiz";
    case "credits":
      return `Mesaj başına ${b.credits || price} kredi`;
    case "blocked":
      return b.reason ?? "Bugünlük mesaj sınırına ulaştın.";
    default:
      return "";
  }
}

export function ChatClient({ conversationId, creator, twin, initialMessages, initialBilling, initialBalance, messagePrice, maxInputChars, ai, memoryEnabled }: Props) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<ChatMsg[]>(initialMessages);
  const [billing, setBilling] = React.useState<ChatBilling>(initialBilling);
  const [balance, setBalance] = React.useState(initialBalance);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [insufficient, setInsufficient] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const scroller = React.useRef<HTMLDivElement>(null);
  const textarea = React.useRef<HTMLTextAreaElement>(null);
  const stickToBottom = React.useRef(true);

  const needCredits = billing.mode === "credits" ? billing.credits || messagePrice : 0;
  const lowBalance = billing.mode === "credits" && balance < needCredits;
  const blockedReason = !ai.available
    ? "AI sağlayıcısı henüz yapılandırılmadığı için sohbet şu anda kapalı. Geçmiş mesajlarını okuyabilirsin."
    : billing.mode === "blocked"
      ? (billing.reason ?? "Bugünlük mesaj sınırına ulaştın. Yarın tekrar görüşelim!")
      : null;
  const composerDisabled = Boolean(blockedReason) || lowBalance || insufficient;

  // Yeni mesajda (veya akışta) alta kaydır
  React.useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  // Textarea otomatik yükseklik
  React.useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const refreshStatus = React.useCallback(async () => {
    const res = await chatStatusAction(creator.username, conversationId);
    if (!res.ok) return;
    setBilling(res.data.billing);
    setBalance(res.data.balance);
    setInsufficient(false);
    // Sunucudaki kayıtlarla eşitle (güvenlik filtresi yanıtı değiştirmiş olabilir)
    setMessages((prev) =>
      prev.map((m) => {
        const server = res.data.recent.find((r) => r.id === m.id);
        return server ? { ...m, body: server.body, role: server.role, safetyAction: server.safetyAction, isMock: server.isMock, charged: server.charged, failed: server.failed, streaming: false } : m;
      }),
    );
    router.refresh(); // üst çubuktaki kredi/okunmamış sayaçları
  }, [creator.username, conversationId, router]);

  async function send(raw: string, retry?: { key: string; tmpId: string }) {
    const text = raw.trim();
    if (!text || sending || composerDisabled) return;
    const key = retry?.key ?? crypto.randomUUID();
    const tmpId = retry?.tmpId ?? `tmp-${key}`;
    const aiTmpId = `ai-${key}`;
    setSending(true);
    stickToBottom.current = true;
    setMessages((m) =>
      retry
        ? m.map((x) => (x.id === tmpId ? { ...x, failed: false, pending: true, retryKey: undefined } : x))
        : [...m, { id: tmpId, role: "user", body: text, createdAt: new Date().toISOString(), isMock: false, charged: 0, safetyAction: "none", failed: false, pending: true }],
    );
    setInput("");

    let res: Response;
    try {
      res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, idempotencyKey: key }),
      });
    } catch {
      setMessages((m) => m.map((x) => (x.id === tmpId ? { ...x, pending: false, failed: true, retryKey: key } : x)));
      toast.error("Bağlantı kurulamadı. Mesajı tekrar deneyebilirsin.");
      setSending(false);
      return;
    }

    if (!res.ok || !res.body) {
      const j = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
      if (res.status === 409 && j?.code === "duplicate") {
        toast.info("Bu mesaj zaten gönderilmişti; sohbet yenileniyor.");
        window.location.reload();
        return;
      }
      setMessages((m) => m.filter((x) => x.id !== tmpId));
      setInput(text);
      if (res.status === 402 || j?.code === "insufficient_credits") setInsufficient(true);
      else toast.error(j?.error ?? "Mesaj gönderilemedi.");
      setSending(false);
      void refreshStatus();
      return;
    }

    let aiAdded = false;
    const ensureAi = () => {
      if (aiAdded) return;
      aiAdded = true;
      setMessages((m) => [...m, { id: aiTmpId, role: "ai", body: "", createdAt: new Date().toISOString(), isMock: ai.mock, charged: 0, safetyAction: "none", failed: false, streaming: true }]);
    };
    let finished = false;
    const handle = (ev: StreamEvent) => {
      if (ev.type === "meta") {
        setMessages((m) => m.map((x) => (x.id === tmpId ? { ...x, id: ev.userMessageId, pending: false, charged: ev.charged } : x)));
        if (ev.balance != null) setBalance(ev.balance);
        setBilling((b) => ({ ...b, mode: ev.billing }));
        ensureAi();
      } else if (ev.type === "delta") {
        ensureAi();
        setMessages((m) => m.map((x) => (x.id === aiTmpId ? { ...x, body: x.body + ev.text } : x)));
      } else if (ev.type === "done") {
        finished = true;
        setMessages((m) => m.map((x) => (x.id === aiTmpId ? { ...x, id: ev.aiMessageId, streaming: false, isMock: ev.isMock } : x)));
      } else if (ev.type === "error") {
        finished = true;
        setMessages((m) => [
          ...m.filter((x) => x.id !== aiTmpId),
          { id: `err-${key}`, role: "system", body: ev.message, createdAt: new Date().toISOString(), isMock: false, charged: 0, safetyAction: "none", failed: false, clientError: true },
        ]);
      }
    };

    try {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl = buf.indexOf("\n");
        while (nl >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) handle(JSON.parse(line) as StreamEvent);
          nl = buf.indexOf("\n");
        }
      }
    } catch {
      if (!finished) {
        setMessages((m) => [
          ...m.map((x) => (x.id === aiTmpId ? { ...x, streaming: false } : x)),
          { id: `err-${key}`, role: "system", body: "Bağlantı koptu. Yanıt kaydedilmiş olabilir; sohbeti yenileyerek kontrol et.", createdAt: new Date().toISOString(), isMock: false, charged: 0, safetyAction: "none", failed: false, clientError: true },
        ]);
      }
    } finally {
      setSending(false);
      void refreshStatus();
    }
  }

  const timeline = React.useMemo(() => {
    const out: ({ kind: "day"; label: string; id: string } | { kind: "msg"; msg: ChatMsg })[] = [];
    let last = "";
    for (const m of messages) {
      const label = dayLabel(m.createdAt);
      if (label !== last) {
        out.push({ kind: "day", label, id: `${m.id}-day` });
        last = label;
      }
      out.push({ kind: "msg", msg: m });
    }
    return out;
  }, [messages]);

  return (
    <section
      aria-label={`${creator.displayName} AI ikizi ile sohbet`}
      className={cn(
        "flex flex-col overflow-hidden bg-white",
        // Mobil: tam ekran (üst çubuğun altından, alt menünün üstünde); masaüstü: kart
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-[70px] max-lg:z-[45]",
        "lg:hf-card lg:h-[calc(100dvh-232px)] lg:min-h-[560px]",
      )}
    >
      {/* Üst bilgi */}
      <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
        <Link href="/chat" className="grid size-9 shrink-0 place-items-center rounded-full text-muted-strong hover:bg-soft lg:hidden" aria-label="Sohbet listesine dön">
          <ChevronLeft className="size-5" />
        </Link>
        <Link href={`/creators/${creator.username}`} className="shrink-0" aria-label={`${creator.displayName} profili`}>
          <Avatar src={creator.avatarUrl} name={creator.displayName} size={44} online={creator.isOnline} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-extrabold">
            <span className="truncate">{creator.displayName}</span> {creator.verified && <Verified />}
            <AiTwinLabel className="ml-1 shrink-0" />
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" aria-hidden /> {creator.isSample ? "Örnek profil · AI ikizi" : "Yetkilendirilmiş AI ikizi"}{creator.isOnline ? " · Çevrimiçi" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={`/experiences/voice/${creator.username}`} aria-label="Sesli görüşme başlat" className="hidden size-10 place-items-center rounded-full border border-line text-muted-strong hover:bg-soft sm:grid">
            <Mic className="size-[18px]" />
          </Link>
          <Link href={`/experiences/video/${creator.username}`} aria-label="Görüntülü görüşme başlat" className="hidden size-10 place-items-center rounded-full border border-line text-muted-strong hover:bg-soft sm:grid">
            <Video className="size-[18px]" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="grid size-10 place-items-center rounded-full border border-line text-muted-strong hover:bg-soft" aria-label="Sohbet seçenekleri">
              <MoreVertical className="size-[18px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href={`/creators/${creator.username}`}>
                  <ShieldCheck /> Profili gör
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/experiences/voice/${creator.username}`}>
                  <Mic /> Sesli görüşme
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/experiences/video/${creator.username}`}>
                  <Video /> Görüntülü görüşme
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/creators/${creator.username}/content`}>
                  <ImageIcon /> Özel içerikler
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/app/gifts?to=${creator.username}`}>
                  <Gift /> Hediye gönder
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setNewOpen(true)}>
                <Plus /> Yeni sohbet
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger">
                <Trash2 /> Sohbeti sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ConfirmDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="Yeni sohbet başlat"
        description="Mevcut konuşma arşivlenir ve temiz bir sohbet açılır. AI hafızan açıksa tercihlerin korunur."
        confirmLabel="Yeni sohbet"
        onConfirm={async () => {
          const res = await newConversationAction(creator.username);
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast.success(res.message ?? "Yeni sohbet başlatıldı.");
          router.refresh();
          return true;
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Sohbeti sil"
        description="Bu konuşmadaki tüm mesajlar kalıcı olarak silinir. Kredi hareketlerin cüzdan geçmişinde kalır. Bu işlem geri alınamaz."
        confirmLabel="Sohbeti sil"
        tone="danger"
        onConfirm={async () => {
          const res = await deleteConversationAction(conversationId);
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast.success("Sohbet silindi.");
          router.push("/chat");
          return true;
        }}
      />

      {/* Mesajlar */}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_80%_10%,#fff3fa_0%,#fff_55%)] px-3 py-5 scrollbar-thin sm:px-6"
        role="log"
        aria-live="polite"
        aria-label="Sohbet mesajları"
      >
        <div className="mx-auto flex w-fit max-w-full items-center gap-1.5 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-[10px] font-bold text-brand-600">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden /> {creator.isSample ? "Bu görüşme kurgusal bir örnek profilin AI ikiziyle yapılmaktadır." : "Bu görüşme yetkilendirilmiş bir AI ikiziyle yapılmaktadır."}
        </div>
        {memoryEnabled && (
          <p className="text-center text-[10px] text-muted">
            AI hafızası açık — bu sohbetten çıkarılan bilgiler yalnız bu içerik üreticisi için saklanır.{" "}
            <Link href="/app/personalization" className="font-bold text-brand-500 hover:underline">
              Yönet
            </Link>
          </p>
        )}

        {messages.length === 0 ? (
          <div className="mx-auto mt-6 max-w-sm text-center">
            <Avatar src={creator.avatarUrl} name={creator.displayName} size={64} className="mx-auto" />
            <p className="mt-3 text-sm font-extrabold">{creator.displayName}&apos;in AI ikiziyle konuş</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">İçerik üreticisinin onaylı yapay zekâ temsilcisi seninle sohbet etmeye hazır. Bir mesajla başla.</p>
            {!composerDisabled && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      textarea.current?.focus();
                    }}
                    className="rounded-full border border-brand-200 bg-white px-3.5 py-2 text-[11px] font-bold text-brand-600 hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {timeline.map((item) => {
          if (item.kind === "day") {
            return (
              <p key={item.id} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
                {item.label}
              </p>
            );
          }
          const m = item.msg;
          if (m.role === "system") {
            const crisis = m.safetyAction === "escalated";
            return (
              <div
                key={m.id}
                role={m.clientError ? "alert" : undefined}
                className={cn(
                  "mx-auto flex max-w-[92%] items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs leading-relaxed sm:max-w-[80%]",
                  crisis ? "border-danger/25 bg-danger-soft text-ink" : "border-[#f3dca8] bg-warning-soft text-ink-soft",
                )}
              >
                <ShieldAlert className={cn("mt-0.5 size-4 shrink-0", crisis ? "text-danger" : "text-warning")} aria-hidden />
                <div>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  {m.clientError && m.body.startsWith("Bağlantı koptu") && (
                    <button type="button" onClick={() => window.location.reload()} className="mt-1.5 text-[11px] font-extrabold text-brand-600 hover:underline">
                      Sohbeti yenile
                    </button>
                  )}
                </div>
              </div>
            );
          }
          const mine = m.role === "user";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[86%] sm:max-w-[72%]", mine && "flex flex-col items-end")}>
                {!mine && (
                  <div className="mb-1 flex items-center gap-1.5">
                    <AiTwinLabel />
                    {m.isMock && (
                      <Badge tone="warn" size="sm" title="Bu yanıt test amaçlı sahte bir sağlayıcıdan geldi">
                        Test yanıtı
                      </Badge>
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
                    mine ? "rounded-br-md bg-brand-500 text-white shadow-[var(--shadow-pink)]" : "rounded-bl-md bg-[#f4f2f6] text-ink",
                    m.pending && "opacity-70",
                    m.failed && "border border-danger/40 bg-danger-soft text-ink shadow-none",
                  )}
                >
                  {m.streaming && !m.body ? (
                    <span className="inline-flex items-center gap-1 py-1" aria-label="AI ikizi yazıyor">
                      {[0, 1, 2].map((i) => (
                        <i key={i} className="size-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${i * 160}ms` }} />
                      ))}
                    </span>
                  ) : (
                    m.body
                  )}
                </div>
                <div className={cn("mt-1 flex items-center gap-2 text-[10px] text-muted", mine && "flex-row-reverse")}>
                  <span>{m.pending ? "Gönderiliyor…" : formatTime(m.createdAt)}</span>
                  {mine && m.charged > 0 && <span>−{m.charged} kredi</span>}
                  {mine && m.failed && !m.retryKey && <span className="font-bold text-danger">Gönderilemedi{m.charged === 0 ? "" : " · kredi iade edildi"}</span>}
                  {mine && m.retryKey && (
                    <button type="button" onClick={() => send(m.body, { key: m.retryKey!, tmpId: m.id })} className="inline-flex items-center gap-1 font-extrabold text-danger hover:underline">
                      <RotateCcw className="size-3" /> Tekrar dene
                    </button>
                  )}
                  {!mine && !m.streaming && m.safetyAction === "rewritten" && <span>Güvenlik filtresi düzenledi</span>}
                  {!mine && !m.streaming && !m.id.startsWith("ai-") && (
                    <ReportDialog
                      targetType="message"
                      targetId={m.id}
                      title="Yanıtı bildir"
                      trigger={
                        <button type="button" className="inline-flex items-center gap-1 font-bold text-muted hover:text-danger" aria-label="Bu yanıtı bildir">
                          <Flag className="size-3" /> Bildir
                        </button>
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Yazma alanı */}
      <div className="border-t border-line bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        {(blockedReason || lowBalance || insufficient) && (
          <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-xs">
            <p className="font-semibold text-ink-soft">
              {blockedReason ?? `Yetersiz kredi: bu mesaj için ${needCredits || messagePrice} kredi gerekiyor, bakiyen ${formatNumber(balance)}.`}
            </p>
            {!blockedReason && (
              <Button asChild size="sm" shape="pill">
                <Link href="/app/wallet">
                  <Coins /> Kredi yükle
                </Link>
              </Button>
            )}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className={cn("flex items-end gap-2 rounded-[20px] border border-line bg-[#faf8fb] p-2 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100", composerDisabled && "opacity-70")}
        >
          <label htmlFor="chat-input" className="sr-only">
            Mesajını yaz
          </label>
          <textarea
            id="chat-input"
            ref={textarea}
            value={input}
            rows={1}
            maxLength={maxInputChars}
            disabled={composerDisabled}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={composerDisabled ? "Mesaj gönderilemiyor" : "Mesajını yaz..."}
            className="max-h-[140px] min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-[#b2a6b3] disabled:cursor-not-allowed"
          />
          <Button type="submit" size="icon" aria-label="Mesajı gönder" disabled={composerDisabled || sending || !input.trim()} loading={sending}>
            {!sending && <ArrowUp />}
          </Button>
        </form>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Zap className="size-3 text-brand-500" aria-hidden /> {billingText(billing, messagePrice)}
          </span>
          <span className="flex items-center gap-3">
            {input.length > maxInputChars * 0.8 && <span>{input.length}/{maxInputChars}</span>}
            <Link href="/app/wallet" className="inline-flex items-center gap-1 font-extrabold text-brand-500 hover:underline" aria-label={`Kredi bakiyesi ${formatNumber(balance)}`}>
              <Coins className="size-3" /> {formatNumber(balance)} kredi
            </Link>
          </span>
        </div>
        <p className="mt-1.5 px-1 text-[10px] leading-snug text-muted">
          Yanıtlar yapay zekâ tarafından üretilir ve gerçek kişi değildir. {twin.voice || twin.video ? "" : "Bu ikiz şu anda yalnız yazılı sohbete açık."}
        </p>
      </div>
    </section>
  );
}
