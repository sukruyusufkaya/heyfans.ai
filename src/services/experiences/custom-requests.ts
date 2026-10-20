import "server-only";
import { z } from "zod";
import { connectDb, withTransaction } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { assertTransition, CUSTOM_REQUEST_LABELS, CUSTOM_REQUEST_TRANSITIONS } from "@/lib/state-machines";
import { oid } from "@/lib/validation/common";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { MediaAsset } from "@/models/content";
import { CustomRequest, type CustomRequestStatus, type ICustomRequest } from "@/models/monetization";
import { AiTwin } from "@/models/ai";
import { recordCreditEarning } from "@/services/billing/earnings";
import { assertNotSample } from "@/services/creators/sample";
import { notify } from "@/services/notifications/notifications";
import { debitWallet, reverseLedgerEntry } from "@/services/wallet/wallet";
import { m } from "@/i18n/m";

export const customRequestSchema = z.object({
  username: z.string().trim().toLowerCase().max(30),
  type: z.enum(["photo", "video", "audio", "message", "other"]),
  title: z.string().trim().min(3, m("Başlık en az 3 karakter")).max(120),
  details: z.string().trim().min(10, m("Lütfen talebini biraz daha detaylandır")).max(3000),
  priceCredits: z.number().int().min(10, m("En az 10 kredi")).max(100_000),
  dueAt: z.coerce.date().nullable().optional(),
  submit: z.boolean().default(true),
});

/**
 * Hayran talebi oluşturur. "submit" ise kredi bloke edilir (spend_custom_request defter kaydı);
 * red/iptalde ters kayıtla iade edilir, tamamlanınca creator hak edişi oluşur.
 */
export async function createCustomRequest(userId: string, raw: unknown) {
  const input = customRequestSchema.parse(raw);
  await connectDb();
  const creator = await CreatorProfile.findOne({ username: input.username, status: "approved" }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("İçerik üreticisi bulunamadı.");
  if (creator.userId.equals(oid(userId))) throw new AppError("Kendine özel talep gönderemezsin.", "self_request");
  assertNotSample(creator);
  const twin = await AiTwin.findOne({ creatorId: creator._id }, { draft: 1 }).lean();
  if (twin && twin.draft?.boundaries?.allowCustomRequests === false) throw new AppError("Bu creator şu anda özel talep kabul etmiyor.", "requests_closed", 403);

  return withTransaction(async (session) => {
    const status: CustomRequestStatus = input.submit ? "pending" : "draft";
    const [doc] = await CustomRequest.create(
      [
        {
          fanId: oid(userId),
          creatorId: creator._id,
          type: input.type,
          title: input.title,
          details: input.details,
          priceCredits: input.priceCredits,
          dueAt: input.dueAt ?? null,
          status,
          history: [{ from: null, to: status, by: oid(userId), at: new Date() }],
        },
      ],
      { session },
    );
    if (input.submit) {
      const entry = await debitWallet(
        { userId, amount: input.priceCredits, type: "spend_custom_request", description: `Özel talep: ${input.title}` /* i18n-ignore (defter açıklaması saklanır) */, idempotencyKey: `creq:hold:${doc!._id.toString()}`, creatorId: creator._id, refType: "CustomRequest", refId: doc!._id },
        session,
      );
      doc!.holdEntryId = entry._id;
      await doc!.save({ session });
      await notify(creator.userId.toString(), { type: "custom_request", title: m("Yeni özel talep"), body: input.title, link: "/studio/requests" }, session);
    }
    return doc!.toObject() as ICustomRequest;
  });
}

async function load(id: string) {
  const doc = await CustomRequest.findById(oid(id));
  if (!doc) throw new NotFoundError("Talep bulunamadı.");
  return doc;
}

function push(doc: InstanceType<typeof CustomRequest>, to: CustomRequestStatus, by: string, note?: string) {
  assertTransition(CUSTOM_REQUEST_TRANSITIONS, doc.status, to, CUSTOM_REQUEST_LABELS);
  doc.history.push({ from: doc.status, to, by: oid(by), note, at: new Date() });
  doc.status = to;
}

/** Hayran: taslağı gönder (kredi blokesi) veya beklemedeki talebi iptal et (iade). */
export async function fanUpdateRequest(userId: string, id: string, action: "submit" | "cancel") {
  await connectDb();
  const doc = await load(id);
  if (!doc.fanId.equals(oid(userId))) throw new NotFoundError("Talep bulunamadı.");
  await withTransaction(async (session) => {
    if (action === "submit") {
      push(doc, "pending", userId);
      const entry = await debitWallet(
        { userId, amount: doc.priceCredits, type: "spend_custom_request", description: `Özel talep: ${doc.title}` /* i18n-ignore (defter açıklaması saklanır) */, idempotencyKey: `creq:hold:${doc._id.toString()}`, creatorId: doc.creatorId, refType: "CustomRequest", refId: doc._id },
        session,
      );
      doc.holdEntryId = entry._id;
    } else {
      if (!["draft", "pending", "approved"].includes(doc.status)) throw new AppError("Bu aşamada talep iptal edilemez.", "cannot_cancel");
      push(doc, "canceled", userId, "Hayran tarafından iptal edildi"); // i18n-ignore (durum geçmişi notu)
      if (doc.holdEntryId && !doc.refundEntryId) {
        const refund = await reverseLedgerEntry(doc.holdEntryId, "Özel talep iptali" /* i18n-ignore (defter notu saklanır) */, userId, session);
        doc.refundEntryId = refund._id;
      }
    }
    await doc.save({ session });
  });
  return doc.toObject();
}

/** Creator: incele → onayla/reddet → işleme al → teslim et (tamamla). */
export async function creatorUpdateRequest(userId: string, id: string, action: "review" | "approve" | "reject" | "start" | "complete", payload: { note?: string; deliverableAssetIds?: string[] } = {}) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ userId: oid(userId) }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("Creator profili bulunamadı.");
  const doc = await load(id);
  if (!doc.creatorId.equals(creator._id)) throw new NotFoundError("Talep bulunamadı.");
  await withTransaction(async (session) => {
    const map = { review: "in_review", approve: "approved", reject: "rejected", start: "processing", complete: "completed" } as const;
    push(doc, map[action], userId, payload.note);
    if (payload.note) doc.creatorNote = payload.note.slice(0, 2000);
    if (action === "reject" && doc.holdEntryId && !doc.refundEntryId) {
      const refund = await reverseLedgerEntry(doc.holdEntryId, "Özel talep reddedildi" /* i18n-ignore (defter notu saklanır) */, userId, session);
      doc.refundEntryId = refund._id;
    }
    if (action === "complete") {
      const ids = (payload.deliverableAssetIds ?? []).map((i) => oid(i));
      if (ids.length) {
        const owned = await MediaAsset.countDocuments({ _id: { $in: ids }, ownerId: oid(userId), status: "ready" }).session(session);
        if (owned !== ids.length) throw new AppError("Teslim dosyalarından biri geçersiz.", "asset_invalid");
      } else if (doc.type !== "message") {
        throw new AppError("Teslim için en az bir dosya ekleyin.", "deliverable_required");
      }
      doc.deliverableAssetIds = ids;
      // i18n-ignore (hak ediş açıklaması saklanır)
      if (doc.holdEntryId) await recordCreditEarning({ creatorId: creator._id, sourceType: "custom_request", credits: doc.priceCredits, ledgerEntryId: doc.holdEntryId, description: `Özel talep: ${doc.title}` }, session);
    }
    await doc.save({ session });
    const titles = { review: m("Talebin incelemede"), approve: m("Talebin onaylandı"), reject: m("Talebin reddedildi (kredi iade edildi)"), start: m("Talebin hazırlanıyor"), complete: m("Talebin tamamlandı") };
    await notify(doc.fanId.toString(), { type: "custom_request", title: titles[action], body: doc.title, link: "/app/experiences" }, session);
  });
  return doc.toObject();
}

export async function listFanRequests(userId: string, status?: CustomRequestStatus | "all") {
  await connectDb();
  const q: Record<string, unknown> = { fanId: oid(userId) };
  if (status && status !== "all") q.status = status;
  const rows = await CustomRequest.find(q).sort({ createdAt: -1 }).limit(100).lean<ICustomRequest[]>();
  const creators = await CreatorProfile.find({ _id: { $in: rows.map((r) => r.creatorId) } }, { displayName: 1, username: 1, avatarUrl: 1 }).lean();
  const map = new Map(creators.map((c) => [c._id.toString(), c]));
  return rows.map((r) => ({ request: r, creator: map.get(r.creatorId.toString()) ?? null }));
}

export async function listCreatorRequests(userId: string, status?: CustomRequestStatus | "all") {
  await connectDb();
  const creator = await CreatorProfile.findOne({ userId: oid(userId) }, { _id: 1 }).lean();
  if (!creator) throw new NotFoundError("Creator profili bulunamadı.");
  const q: Record<string, unknown> = { creatorId: creator._id, status: { $ne: "draft" } };
  if (status && status !== "all") q.status = status;
  const rows = await CustomRequest.find(q).sort({ createdAt: -1 }).limit(200).lean<ICustomRequest[]>();
  const { User } = await import("@/models/identity");
  const fans = await User.find({ _id: { $in: rows.map((r) => r.fanId) } }, { name: 1, image: 1 }).lean();
  const map = new Map(fans.map((f) => [f._id.toString(), f]));
  return rows.map((r) => ({ request: r, fan: map.get(r.fanId.toString()) ?? null }));
}
