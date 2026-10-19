import "server-only";
import { Types } from "mongoose";
import { connectDb, withTransaction } from "@/lib/db/mongo";
import { AppError, FeatureUnavailableError, NotFoundError } from "@/lib/errors";
import { retrieveKnowledge } from "@/lib/ai/knowledge";
import { extractAndStoreMemories, loadMemories, memoryEnabledFor } from "@/lib/ai/memory";
import { buildSystemPrompt } from "@/lib/ai/persona";
import { costMicroUsd, getAiProvider, type ChatMessage } from "@/lib/ai/provider";
import { checkInput, checkOutput, CRISIS_MESSAGE } from "@/lib/ai/safety";
import { rateLimit } from "@/lib/security/rate-limit";
import { oid } from "@/lib/validation/common";
import { AiTwin, AiTwinVersion, AiUsageRecord, type ITwin, type ITwinVersion } from "@/models/ai";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { Subscription, MembershipPlan, type IMembershipPlan } from "@/models/monetization";
import { AnalyticsEvent } from "@/models/platform";
import { Conversation, Message, type IConversation, type IMessage } from "@/models/social";
import { recordCreditEarning } from "@/services/billing/earnings";
import { getPlatformSettings } from "@/services/platform/settings";
import { assertAiBudget, assertNotInMaintenance } from "@/services/platform/guards";
import { debitWallet, ensureWallet, reverseLedgerEntry } from "@/services/wallet/wallet";

export type ChatEvent =
  | { type: "meta"; conversationId: string; userMessageId: string; charged: number; balance: number | null; billing: BillingMode }
  | { type: "delta"; text: string }
  | { type: "done"; aiMessageId: string; isMock: boolean; safetyAction: string }
  | { type: "error"; message: string; code: string };

export type BillingMode = "free_daily" | "subscription" | "credits" | "test";

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Fan için creator sohbet hakkı: abonelik → günlük ücretsiz → kredi. */
export async function resolveBilling(userId: Types.ObjectId, creator: Pick<ICreatorProfile, "_id">, twin: Pick<ITwin, "pricing" | "draft">) {
  const settings = await getPlatformSettings();
  const today = startOfDay();
  const [sentToday, freeUsedToday, sub] = await Promise.all([
    Message.countDocuments({ userId, creatorId: creator._id, senderType: "user", createdAt: { $gte: today } }),
    Message.countDocuments({ userId, creatorId: creator._id, senderType: "user", creditsCharged: 0, createdAt: { $gte: today } }),
    Subscription.findOne({ userId, scope: "creator", creatorId: creator._id, status: { $in: ["active", "past_due"] }, currentPeriodEnd: { $gt: new Date() } }, { planId: 1 }).lean(),
  ]);
  const dailyCap = twin.draft?.boundaries?.maxMessagesPerFanPerDay ?? 200;
  if (sentToday >= dailyCap) throw new AppError("Bugünlük mesaj sınırına ulaştın. Yarın tekrar görüşelim!", "daily_cap", 429);
  const price = Math.min(settings.chat.maxMessageCredits, Math.max(0, twin.pricing?.messageCredits ?? settings.chat.defaultMessageCredits));
  if (sub) {
    const plan = await MembershipPlan.findById(sub.planId, { entitlements: 1 }).lean<IMembershipPlan>();
    if (plan?.entitlements.unlimitedChat) return { mode: "subscription" as BillingMode, credits: 0, freeLeft: null };
    if (plan && plan.entitlements.dailyChatAllowance > freeUsedToday) return { mode: "subscription" as BillingMode, credits: 0, freeLeft: plan.entitlements.dailyChatAllowance - freeUsedToday };
  }
  const freePerDay = twin.pricing?.freeMessagesPerDay ?? settings.chat.freeMessagesPerDay;
  if (freeUsedToday < freePerDay) return { mode: "free_daily" as BillingMode, credits: 0, freeLeft: freePerDay - freeUsedToday };
  if (price === 0) return { mode: "free_daily" as BillingMode, credits: 0, freeLeft: null };
  return { mode: "credits" as BillingMode, credits: price, freeLeft: 0 };
}

async function loadLiveTwin(username: string) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ username: username.toLowerCase(), status: "approved" }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("İçerik üreticisi bulunamadı.");
  const twin = await AiTwin.findOne({ creatorId: creator._id }).lean<ITwin>();
  if (!twin || twin.status !== "live" || !twin.features.chat) throw new FeatureUnavailableError(`${creator.displayName} adlı creator'ın AI ikizi şu anda sohbete açık değil.`);
  return { creator, twin };
}

/** Sohbet ekranı verisi + gerekirse yeni konuşma. */
export async function openConversation(userId: string, username: string) {
  const { creator, twin } = await loadLiveTwin(username);
  const uid = oid(userId);
  let conv = await Conversation.findOne({ userId: uid, creatorId: creator._id, kind: "fan", status: { $in: ["active", "archived", "reported"] } }).sort({ updatedAt: -1 }).lean<IConversation>();
  if (!conv) {
    const memoryOk = await memoryEnabledFor(uid);
    const created = await Conversation.create({ userId: uid, creatorId: creator._id, twinId: twin._id, kind: "fan", memoryEnabled: memoryOk });
    conv = created.toObject();
    await CreatorProfile.updateOne({ _id: creator._id }, { $inc: { "stats.conversations": 1 } });
    await AiTwin.updateOne({ _id: twin._id }, { $inc: { "stats.conversations": 1 } });
    await AnalyticsEvent.create({ type: "chat_started", userId: uid, creatorId: creator._id, props: {} });
  } else if (conv.unreadForUser > 0) {
    await Conversation.updateOne({ _id: conv._id }, { $set: { unreadForUser: 0 } });
  }
  const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: -1 }).limit(60).lean<IMessage[]>();
  const billing = await resolveBilling(uid, creator, twin).catch((e: AppError) => ({ mode: "blocked" as const, credits: 0, freeLeft: 0, reason: e.message }));
  const wallet = await ensureWallet(uid);
  return { creator, twin, conversation: conv, messages: messages.reverse(), billing, balance: wallet.balance };
}

const enc = new TextEncoder();
const line = (e: ChatEvent) => enc.encode(`${JSON.stringify(e)}\n`);

/**
 * Mesaj gönderir ve AI yanıtını NDJSON akışı olarak döndürür.
 * Sıra: yetki → hız sınırı → güvenlik(giriş) → (transaction: kullanıcı mesajı + kredi düşümü)
 *       → persona+bilgi+hafıza → model akışı → güvenlik(çıkış) → kayıt + kullanım + hak ediş.
 * Model hatasında harcanan kredi ters kayıtla iade edilir.
 */
export async function sendChatMessage(params: { userId: string; conversationId: string; text: string; idempotencyKey: string; mode?: "fan" | "test" }): Promise<ReadableStream<Uint8Array>> {
  await connectDb();
  const uid = oid(params.userId);
  const text = params.text.trim();
  const settings = await getPlatformSettings();
  if (!text) throw new AppError("Mesaj boş olamaz.", "empty");
  if (text.length > settings.chat.maxInputChars) throw new AppError(`Mesaj en fazla ${settings.chat.maxInputChars} karakter olabilir.`, "too_long");

  // "reported": bildirilen sohbet moderasyonda işaretli kalır ama hayran kullanmaya devam edebilir.
  const conv = await Conversation.findOne({ _id: oid(params.conversationId), userId: uid, status: { $in: ["active", "reported"] } }).lean<IConversation>();
  if (!conv) throw new NotFoundError("Sohbet bulunamadı.");
  const isTest = conv.kind === "test";
  const creator = await CreatorProfile.findById(conv.creatorId).lean<ICreatorProfile>();
  const twin = await AiTwin.findById(conv.twinId).lean<ITwin>();
  if (!creator || !twin) throw new NotFoundError("AI ikizi bulunamadı.");
  if (isTest) {
    if (!creator.userId.equals(uid)) throw new AppError("Test sohbeti yalnız creator'a açıktır.", "forbidden", 403);
  } else if (creator.status !== "approved" || twin.status !== "live" || !twin.features.chat) {
    throw new FeatureUnavailableError("Bu AI ikizi şu anda sohbete açık değil.");
  }

  const provider = getAiProvider(); // yapılandırma yoksa FeatureUnavailableError
  if (!isTest) await assertNotInMaintenance(null);
  await assertAiBudget();
  await rateLimit("chat", params.userId, isTest ? 60 : 20, 60);

  // Mükerrer gönderim: aynı anahtar → mevcut mesajın sonucu
  const dup = await Message.findOne({ conversationId: conv._id, idempotencyKey: params.idempotencyKey }).lean();
  if (dup) throw new AppError("Bu mesaj zaten gönderildi.", "duplicate", 409);

  const verdict = checkInput(text, { adultContentEnabled: settings.features.adultContent });
  const billing = isTest ? { mode: "test" as BillingMode, credits: 0 } : await resolveBilling(uid, creator, twin);
  const blocked = verdict.action === "block" || verdict.action === "crisis" || verdict.action === "rewrite";

  // Kullanıcı mesajı + (gerekirse) kredi düşümü atomik
  const { userMessage, ledgerEntryId, balanceAfter } = await withTransaction(async (session) => {
    const msgId = new Types.ObjectId();
    let entryId: Types.ObjectId | null = null;
    let balance: number | null = null;
    const charge = blocked ? 0 : billing.credits;
    if (charge > 0) {
      const entry = await debitWallet(
        { userId: uid, amount: charge, type: "spend_message", description: `${creator.displayName} AI ikizi ile mesaj`, idempotencyKey: `msg:${conv._id.toString()}:${params.idempotencyKey}`, creatorId: creator._id, refType: "Message", refId: msgId },
        session,
      );
      entryId = entry._id;
      balance = entry.balanceAfter;
    }
    const [m] = await Message.create(
      [
        {
          _id: msgId,
          conversationId: conv._id,
          userId: uid,
          creatorId: creator._id,
          senderType: "user",
          body: text,
          status: "sent",
          creditsCharged: charge,
          ledgerEntryId: entryId,
          safety: { inputFlagged: verdict.categories.length > 0, outputFlagged: false, categories: verdict.categories, action: blocked ? (verdict.action === "crisis" ? "escalated" : "blocked") : "none" },
          idempotencyKey: params.idempotencyKey,
        },
      ],
      { session },
    );
    await Conversation.updateOne(
      { _id: conv._id },
      { $set: { lastMessageAt: new Date(), lastMessagePreview: text.slice(0, 120) }, $inc: { messageCount: 1, creditsSpent: charge } },
      { session },
    );
    return { userMessage: m!, ledgerEntryId: entryId, balanceAfter: balance };
  });
  if (!isTest) await AnalyticsEvent.create({ type: "chat_message", userId: uid, creatorId: creator._id, props: { billing: billing.mode } });

  const history = await Message.find({ conversationId: conv._id, _id: { $ne: userMessage._id }, status: { $in: ["sent", "completed"] } })
    .sort({ createdAt: -1 })
    .limit(16)
    .lean<IMessage[]>();

  let persona = twin.draft.persona;
  let boundaries = twin.draft.boundaries;
  if (!isTest && twin.liveVersionId) {
    const live = await AiTwinVersion.findById(twin.liveVersionId).lean<ITwinVersion>();
    if (live) {
      persona = live.snapshot.persona;
      boundaries = live.snapshot.boundaries;
    }
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(line({ type: "meta", conversationId: conv._id.toString(), userMessageId: userMessage._id.toString(), charged: userMessage.creditsCharged, balance: balanceAfter, billing: billing.mode }));

      // Güvenlik girişte durdurduysa: modele gitmeden sabit güvenli yanıt
      if (blocked) {
        const body = verdict.action === "crisis" ? CRISIS_MESSAGE : verdict.userMessage ?? "Bu konuda yardımcı olamam.";
        const ai = await Message.create({
          conversationId: conv._id,
          userId: uid,
          creatorId: creator._id,
          senderType: "system",
          body,
          status: "completed",
          safety: { inputFlagged: true, outputFlagged: false, categories: verdict.categories, action: verdict.action === "crisis" ? "escalated" : "blocked" },
        });
        controller.enqueue(line({ type: "delta", text: body }));
        controller.enqueue(line({ type: "done", aiMessageId: ai._id.toString(), isMock: false, safetyAction: verdict.action }));
        controller.close();
        return;
      }

      const started = Date.now();
      let output = "";
      try {
        const [knowledge, memoryOn] = await Promise.all([retrieveKnowledge(creator._id, text, { provider }).catch(() => []), isTest ? Promise.resolve(false) : memoryEnabledFor(uid)]);
        const memories = memoryOn && conv.memoryEnabled ? await loadMemories(uid, creator._id) : [];
        const system = buildSystemPrompt({
          creatorName: creator.displayName,
          persona,
          boundaries,
          knowledge: knowledge.map((k) => ({ title: k.title, text: k.text })),
          memories,
          adultContentEnabled: settings.features.adultContent,
          mode: isTest ? "test" : "fan",
        });
        const messages: ChatMessage[] = [
          { role: "system", content: system },
          ...history.reverse().map((m) => ({ role: (m.senderType === "user" ? "user" : "assistant") as ChatMessage["role"], content: m.body.slice(0, 2000) })),
          { role: "user", content: text },
        ];
        const result = await provider.chatStream(messages, { maxTokens: settings.ai.maxOutputTokens, temperature: settings.ai.temperature });
        for await (const delta of result.stream) {
          output += delta;
          controller.enqueue(line({ type: "delta", text: delta }));
        }
        const usage = await result.usage;
        const out = checkOutput(output, { adultContentEnabled: settings.features.adultContent });
        const finalText = out.text.trim() || "…";
        const usageRecord = await AiUsageRecord.create({
          kind: isTest ? "test_chat" : "chat",
          provider: provider.name,
          model: provider.model,
          userId: uid,
          creatorId: creator._id,
          twinId: twin._id,
          conversationId: conv._id,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          latencyMs: Date.now() - started,
          costMicroUsd: costMicroUsd(usage),
          status: out.action === "allow" ? "ok" : "blocked",
          isMock: provider.isMock,
        });
        const aiMsg = await Message.create({
          conversationId: conv._id,
          userId: uid,
          creatorId: creator._id,
          senderType: "ai",
          body: finalText,
          status: "completed",
          ai: { provider: provider.name, model: provider.model, usageRecordId: usageRecord._id, isMock: provider.isMock, label: "ai_generated", citations: knowledge.map((k) => ({ sourceId: k.sourceId, title: k.title })) },
          safety: { inputFlagged: verdict.categories.length > 0, outputFlagged: out.action !== "allow", categories: out.categories, action: out.action === "allow" ? "none" : "rewritten" },
        });
        await AiUsageRecord.updateOne({ _id: usageRecord._id }, { $set: { messageId: aiMsg._id } }).catch(() => undefined);
        if (out.action !== "allow") controller.enqueue(line({ type: "delta", text: `\n\n[Güvenlik filtresi yanıtı düzenledi]` }));
        await Conversation.updateOne({ _id: conv._id }, { $set: { lastMessageAt: new Date(), lastMessagePreview: finalText.slice(0, 120) }, $inc: { messageCount: 1 } });
        if (!isTest) {
          await AiTwin.updateOne({ _id: twin._id }, { $inc: { "stats.messages": 1 } });
          if (ledgerEntryId) await recordCreditEarning({ creatorId: creator._id, sourceType: "chat", credits: userMessage.creditsCharged, ledgerEntryId, description: "AI ikizi sohbeti" });
          if (memoryOn && conv.memoryEnabled) await extractAndStoreMemories(uid, creator._id, text, userMessage._id).catch(() => 0);
        }
        controller.enqueue(line({ type: "done", aiMessageId: aiMsg._id.toString(), isMock: provider.isMock, safetyAction: out.action }));
      } catch (err) {
        console.error("[chat:stream]", err);
        if (ledgerEntryId) await reverseLedgerEntry(ledgerEntryId, "AI yanıtı üretilemedi").catch((e) => console.error("[chat:refund]", e));
        await Message.updateOne({ _id: userMessage._id }, { $set: { status: "failed" } });
        await AiUsageRecord.create({ kind: isTest ? "test_chat" : "chat", provider: provider.name, model: provider.model, userId: uid, creatorId: creator._id, twinId: twin._id, conversationId: conv._id, status: "error", errorCode: "provider_error", latencyMs: Date.now() - started, isMock: provider.isMock });
        controller.enqueue(line({ type: "error", message: ledgerEntryId ? "AI ikizi şu anda yanıt veremedi. Harcanan kredi iade edildi." : "AI ikizi şu anda yanıt veremedi. Lütfen tekrar dene.", code: "provider_error" }));
      } finally {
        controller.close();
      }
    },
  });
}

/** Fan sohbet listesi (sohbet kutusu). */
export async function listConversations(userId: string, opts: { filter?: "all" | "unread"; q?: string } = {}) {
  await connectDb();
  const q: Record<string, unknown> = { userId: oid(userId), kind: "fan", status: { $in: ["active", "archived", "reported"] } };
  if (opts.filter === "unread") q.unreadForUser = { $gt: 0 };
  const convs = await Conversation.find(q).sort({ lastMessageAt: -1, updatedAt: -1 }).limit(100).lean<IConversation[]>();
  const creators = await CreatorProfile.find({ _id: { $in: convs.map((c) => c.creatorId) } }, { displayName: 1, username: 1, avatarUrl: 1, isOnline: 1, verification: 1 }).lean();
  const map = new Map(creators.map((c) => [c._id.toString(), c]));
  let rows = convs.map((c) => ({ conversation: c, creator: map.get(c.creatorId.toString()) })).filter((r) => r.creator);
  if (opts.q) {
    const term = opts.q.toLocaleLowerCase("tr-TR");
    rows = rows.filter((r) => r.creator!.displayName.toLocaleLowerCase("tr-TR").includes(term) || r.creator!.username.includes(term));
  }
  return rows;
}

/** Kullanıcı sohbeti siler: mesajlar silinir, konuşma "deleted" işaretlenir (finansal defter etkilenmez). */
export async function deleteConversation(userId: string, conversationId: string) {
  await connectDb();
  const conv = await Conversation.findOne({ _id: oid(conversationId), userId: oid(userId) });
  if (!conv) throw new NotFoundError("Sohbet bulunamadı.");
  await Message.deleteMany({ conversationId: conv._id });
  conv.status = "deleted";
  conv.deletedAt = new Date();
  conv.lastMessagePreview = null;
  await conv.save();
}

/** Test alanı için creator'ın kendi ikiziyle test konuşması (üretimden ayrı: kind="test"). */
export async function openTestConversation(userId: string, reset = false) {
  await connectDb();
  const uid = oid(userId);
  const creator = await CreatorProfile.findOne({ userId: uid }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("Creator profili bulunamadı.");
  const twin = await AiTwin.findOne({ creatorId: creator._id }).lean<ITwin>();
  if (!twin) throw new NotFoundError("Önce AI ikizini oluştur.");
  if (reset) await Conversation.updateMany({ userId: uid, creatorId: creator._id, kind: "test", status: "active" }, { $set: { status: "archived" } });
  let conv = await Conversation.findOne({ userId: uid, creatorId: creator._id, kind: "test", status: "active" }).lean<IConversation>();
  if (!conv) conv = (await Conversation.create({ userId: uid, creatorId: creator._id, twinId: twin._id, kind: "test", title: "Test oturumu" })).toObject();
  const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 }).limit(100).lean<IMessage[]>();
  return { creator, twin, conversation: conv, messages };
}
