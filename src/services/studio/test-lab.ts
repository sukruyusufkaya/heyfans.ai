import "server-only";
import { NotFoundError } from "@/lib/errors";
import { oid } from "@/lib/validation/common";
import { Conversation, Message, type IConversation, type IMessage } from "@/models/social";
import { openTestConversation } from "@/services/conversations/chat";

export interface TestMessageView {
  id: string;
  role: "user" | "ai" | "system";
  body: string;
  createdAt: string;
  isMock: boolean;
  citations: string[];
  safetyAction: "none" | "rewritten" | "blocked" | "escalated";
  safetyCategories: string[];
}

const view = (m: IMessage): TestMessageView => ({
  id: m._id.toString(),
  role: m.senderType,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
  isMock: Boolean(m.ai?.isMock),
  citations: (m.ai?.citations ?? []).map((c) => c.title),
  safetyAction: m.safety?.action ?? "none",
  safetyCategories: m.safety?.categories ?? [],
});

/** Test sohbeti (kind="test"): yoksa oluşturur, `reset` ile arşivleyip yenisini açar. */
export async function getTestSession(userId: string, reset = false) {
  const { conversation, messages, twin } = await openTestConversation(userId, reset);
  return { conversationId: conversation._id.toString(), messages: messages.map(view), twinStatus: twin.status, quality: twin.quality };
}

/** Probe değerlendirmesi için belirli test mesajlarını (güvenlik/atıf bilgisiyle) okur. */
export async function getTestMessages(userId: string, conversationId: string, ids: string[]) {
  const conv = await Conversation.findOne({ _id: oid(conversationId), userId: oid(userId), kind: "test" }).lean<IConversation>();
  if (!conv) throw new NotFoundError("Test sohbeti bulunamadı.");
  const rows = await Message.find({ conversationId: conv._id, _id: { $in: ids.map((i) => oid(i)) } }).lean<IMessage[]>();
  return rows.map(view);
}
