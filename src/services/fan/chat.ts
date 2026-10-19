import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { aiStatus, } from "@/lib/ai/provider";
import { memoryEnabledFor } from "@/lib/ai/memory";
import { oid } from "@/lib/validation/common";
import { AiTwin, type ITwin } from "@/models/ai";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { Conversation, Message, type IConversation, type IMessage } from "@/models/social";
import { listConversations, openConversation, resolveBilling, type BillingMode } from "@/services/conversations/chat";
import { getPlatformSettings } from "@/services/platform/settings";
import { ensureWallet } from "@/services/wallet/wallet";

export interface ChatMessageView {
  id: string;
  role: "user" | "ai" | "system";
  body: string;
  createdAt: string;
  isMock: boolean;
  charged: number;
  safetyAction: "none" | "rewritten" | "blocked" | "escalated";
  failed: boolean;
}

export function toMessageView(m: IMessage): ChatMessageView {
  return {
    id: m._id.toString(),
    role: m.senderType,
    body: m.body,
    createdAt: new Date(m.createdAt).toISOString(),
    isMock: Boolean(m.ai?.isMock),
    charged: m.creditsCharged ?? 0,
    safetyAction: m.safety?.action ?? "none",
    failed: m.status === "failed",
  };
}

export interface ChatBillingView {
  mode: BillingMode | "blocked";
  credits: number;
  freeLeft: number | null;
  reason?: string;
}

/** Kredi modundaki mesaj başı ücret: twin fiyatı, platform üst sınırıyla kısıtlı. */
function messagePrice(twin: Pick<ITwin, "pricing">, settings: Awaited<ReturnType<typeof getPlatformSettings>>) {
  return Math.min(settings.chat.maxMessageCredits, Math.max(0, twin.pricing?.messageCredits ?? settings.chat.defaultMessageCredits));
}

/** /chat/[username] — sohbet ekranı verisi. */
export async function getChatPage(userId: string, username: string) {
  const data = await openConversation(userId, username); // creator/ikiz yoksa NotFound / FeatureUnavailable
  const [settings, memoryOn] = await Promise.all([getPlatformSettings(), memoryEnabledFor(oid(userId))]);
  const ai = aiStatus();
  const billing = data.billing as ChatBillingView;
  return {
    creator: {
      id: data.creator._id.toString(),
      username: data.creator.username,
      displayName: data.creator.displayName,
      headline: data.creator.headline ?? null,
      avatarUrl: data.creator.avatarUrl ?? null,
      coverUrl: data.creator.coverUrl ?? null,
      categories: data.creator.categories ?? [],
      verified: data.creator.verification?.identity === "verified",
      isOnline: Boolean(data.creator.isOnline),
      followers: data.creator.stats?.followers ?? 0,
      conversations: data.creator.stats?.conversations ?? 0,
      isSample: Boolean(data.creator.isSample),
    },
    twin: {
      rating: data.twin.stats?.avgRating ?? null,
      voice: Boolean(data.twin.features.voice),
      video: Boolean(data.twin.features.video),
      voicePerMinute: data.twin.pricing.voicePerMinuteCredits,
      videoPerMinute: data.twin.pricing.videoPerMinuteCredits,
    },
    conversationId: data.conversation._id.toString(),
    memoryEnabled: Boolean(data.conversation.memoryEnabled) && memoryOn,
    messages: data.messages.map(toMessageView),
    billing,
    balance: data.balance,
    messagePrice: messagePrice(data.twin, settings),
    maxInputChars: Math.min(4000, settings.chat.maxInputChars),
    ai: { available: ai.available, mock: ai.mock },
  };
}

/** Mesaj sonrası güncel faturalama + bakiye (istemci "kalan hak" göstergesi için). */
export async function getChatStatus(userId: string, username: string, conversationId?: string) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ username: username.toLowerCase(), status: "approved" }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("İçerik üreticisi bulunamadı.");
  const twin = await AiTwin.findOne({ creatorId: creator._id }).lean<ITwin>();
  if (!twin) throw new NotFoundError("AI ikizi bulunamadı.");
  const uid = oid(userId);
  const billing: ChatBillingView = await resolveBilling(uid, creator, twin).catch((e: AppError) => ({ mode: "blocked" as const, credits: 0, freeLeft: 0, reason: e.message }));
  const wallet = await ensureWallet(uid);
  // Akış bittikten sonra sunucudaki son kayıtlar: güvenlik filtresinin düzenlediği/engellediği yanıtlar istemciyle eşitlenir.
  const recent = conversationId ? await Message.find({ conversationId: oid(conversationId), userId: uid }).sort({ createdAt: -1 }).limit(3).lean<IMessage[]>() : [];
  return { billing, balance: wallet.balance, recent: recent.reverse().map(toMessageView) };
}

/** Yeni sohbet: mevcut konuşma arşivlenir (silinmez), aynı creator ile temiz bir konuşma açılır. */
export async function startNewConversation(userId: string, username: string) {
  await connectDb();
  const uid = oid(userId);
  const creator = await CreatorProfile.findOne({ username: username.toLowerCase(), status: "approved" }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("İçerik üreticisi bulunamadı.");
  const twin = await AiTwin.findOne({ creatorId: creator._id }).lean<ITwin>();
  if (!twin || twin.status !== "live" || !twin.features.chat) throw new AppError("Bu AI ikizi şu anda sohbete açık değil.", "twin_unavailable", 409);
  await Conversation.updateMany({ userId: uid, creatorId: creator._id, kind: "fan", status: "active" }, { $set: { status: "archived" } });
  const memoryOk = await memoryEnabledFor(uid);
  const conv = await Conversation.create({ userId: uid, creatorId: creator._id, twinId: twin._id, kind: "fan", memoryEnabled: memoryOk });
  return { conversationId: conv._id.toString() };
}

export interface ChatListRow {
  conversationId: string;
  creator: { username: string; displayName: string; avatarUrl: string | null; verified: boolean; isOnline: boolean; isSample: boolean };
  preview: string | null;
  lastAt: string | null;
  unread: number;
  status: IConversation["status"];
}

/** /chat — sohbet kutusu: arama + hepsi/okunmamış; creator başına en güncel konuşma. */
export async function getChatList(userId: string, opts: { filter: "all" | "unread"; q?: string; selected?: string }) {
  const rows = await listConversations(userId, { filter: opts.filter, q: opts.q });
  const seen = new Set<string>();
  const list: ChatListRow[] = [];
  for (const r of rows) {
    const key = r.conversation.creatorId.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    const c = r.creator!;
    list.push({
      conversationId: r.conversation._id.toString(),
      creator: { username: c.username, displayName: c.displayName, avatarUrl: c.avatarUrl ?? null, verified: c.verification?.identity === "verified", isOnline: Boolean(c.isOnline), isSample: Boolean(c.isSample) },
      preview: r.conversation.lastMessagePreview ?? null,
      lastAt: r.conversation.lastMessageAt ? new Date(r.conversation.lastMessageAt).toISOString() : null,
      unread: r.conversation.unreadForUser ?? 0,
      status: r.conversation.status,
    });
  }
  const selected = list.find((l) => l.creator.username === opts.selected) ?? list[0] ?? null;
  let preview: ChatMessageView[] = [];
  if (selected) {
    const msgs = await Message.find({ conversationId: oid(selected.conversationId) }).sort({ createdAt: -1 }).limit(8).lean<IMessage[]>();
    preview = msgs.reverse().map(toMessageView);
  }
  return { list, selected, preview };
}
