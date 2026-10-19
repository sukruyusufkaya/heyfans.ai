import { Schema } from "mongoose";
import { baseOptions, defineModel, type ObjectId } from "./_shared";

export interface IFollow {
  _id: ObjectId;
  followerId: ObjectId;
  creatorId: ObjectId;
  notify: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const FollowSchema = new Schema<IFollow>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    notify: { type: Boolean, default: true },
  },
  baseOptions,
);
FollowSchema.index({ followerId: 1, creatorId: 1 }, { unique: true });
FollowSchema.index({ creatorId: 1, createdAt: -1 });
export const Follow = defineModel<IFollow>("Follow", FollowSchema, "follows");

export const FAVORITE_TARGETS = ["creator", "content", "twin"] as const;
export interface IFavorite {
  _id: ObjectId;
  userId: ObjectId;
  targetType: (typeof FAVORITE_TARGETS)[number];
  targetId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: FAVORITE_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  baseOptions,
);
FavoriteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
FavoriteSchema.index({ targetType: 1, targetId: 1 });
export const Favorite = defineModel<IFavorite>("Favorite", FavoriteSchema, "favorites");

export const CONVERSATION_STATUSES = ["active", "archived", "deleted", "reported", "blocked"] as const;
export interface IConversation {
  _id: ObjectId;
  userId: ObjectId; // fan (test sohbetinde creator'ın kendisi)
  creatorId: ObjectId;
  twinId: ObjectId;
  kind: "fan" | "test";
  status: (typeof CONVERSATION_STATUSES)[number];
  title?: string | null;
  lastMessageAt?: Date | null;
  lastMessagePreview?: string | null;
  unreadForUser: number;
  messageCount: number;
  creditsSpent: number;
  memoryEnabled: boolean;
  deletedAt?: Date | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    twinId: { type: Schema.Types.ObjectId, ref: "AiTwin", required: true },
    kind: { type: String, enum: ["fan", "test"], default: "fan" },
    status: { type: String, enum: CONVERSATION_STATUSES, default: "active" },
    title: { type: String, default: null, maxlength: 120 },
    lastMessageAt: { type: Date, default: null },
    lastMessagePreview: { type: String, default: null, maxlength: 200 },
    unreadForUser: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    creditsSpent: { type: Number, default: 0 },
    memoryEnabled: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
ConversationSchema.index({ userId: 1, kind: 1, status: 1, lastMessageAt: -1 });
ConversationSchema.index({ creatorId: 1, kind: 1, lastMessageAt: -1 });
export const Conversation = defineModel<IConversation>("Conversation", ConversationSchema, "conversations");

export interface IMessage {
  _id: ObjectId;
  conversationId: ObjectId;
  userId: ObjectId;
  creatorId: ObjectId;
  senderType: "user" | "ai" | "system";
  body: string;
  media: { assetId: ObjectId; kind: string }[];
  status: "pending" | "sent" | "streaming" | "completed" | "failed" | "blocked";
  creditsCharged: number;
  ledgerEntryId?: ObjectId | null;
  ai?: {
    provider: string;
    model: string;
    usageRecordId?: ObjectId | null;
    isMock: boolean;
    label: "ai_generated";
    citations: { sourceId: ObjectId; title: string }[];
  } | null;
  safety: { inputFlagged: boolean; outputFlagged: boolean; categories: string[]; action: "none" | "rewritten" | "blocked" | "escalated" };
  idempotencyKey?: string | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    senderType: { type: String, enum: ["user", "ai", "system"], required: true },
    body: { type: String, default: "", maxlength: 8000 },
    media: { type: [new Schema({ assetId: Schema.Types.ObjectId, kind: String }, { _id: false })], default: [] },
    status: { type: String, enum: ["pending", "sent", "streaming", "completed", "failed", "blocked"], default: "sent" },
    creditsCharged: { type: Number, default: 0 },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: "WalletLedgerEntry", default: null },
    ai: {
      type: new Schema(
        {
          provider: String,
          model: String,
          usageRecordId: { type: Schema.Types.ObjectId, default: null },
          isMock: { type: Boolean, default: false },
          label: { type: String, enum: ["ai_generated"], default: "ai_generated" },
          citations: { type: [new Schema({ sourceId: Schema.Types.ObjectId, title: String }, { _id: false })], default: [] },
        },
        { _id: false },
      ),
      default: null,
    },
    safety: {
      inputFlagged: { type: Boolean, default: false },
      outputFlagged: { type: Boolean, default: false },
      categories: { type: [String], default: [] },
      action: { type: String, enum: ["none", "rewritten", "blocked", "escalated"], default: "none" },
    },
    idempotencyKey: { type: String, default: null },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index(
  { conversationId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);
MessageSchema.index({ creatorId: 1, createdAt: -1 });
export const Message = defineModel<IMessage>("Message", MessageSchema, "messages");

/** AI hafızası: daima user × creator kapsamlı — creator'lar arası sızıntı yok. */
export interface IConversationMemory {
  _id: ObjectId;
  userId: ObjectId;
  creatorId: ObjectId;
  fact: string;
  category: "preference" | "personal" | "context" | "other";
  source: "auto" | "user";
  sourceMessageId?: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const ConversationMemorySchema = new Schema<IConversationMemory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    fact: { type: String, required: true, maxlength: 500 },
    category: { type: String, enum: ["preference", "personal", "context", "other"], default: "other" },
    source: { type: String, enum: ["auto", "user"], default: "auto" },
    sourceMessageId: { type: Schema.Types.ObjectId, ref: "Message", default: null },
  },
  baseOptions,
);
ConversationMemorySchema.index({ userId: 1, creatorId: 1, createdAt: -1 });
export const ConversationMemory = defineModel<IConversationMemory>("ConversationMemory", ConversationMemorySchema, "conversationMemories");

export const NOTIFICATION_TYPES = [
  "message",
  "new_content",
  "subscription",
  "payment",
  "gift",
  "custom_request",
  "moderation",
  "system",
  "follow",
  "payout",
  "twin_review",
  "creator_review",
] as const;
export interface INotification {
  _id: ObjectId;
  userId: ObjectId;
  type: (typeof NOTIFICATION_TYPES)[number];
  title: string;
  body?: string;
  link?: string | null;
  actorImage?: string | null;
  readAt?: Date | null;
  data: Record<string, unknown>;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, maxlength: 1000 },
    link: { type: String, default: null },
    actorImage: { type: String, default: null },
    readAt: { type: Date, default: null },
    data: { type: Schema.Types.Mixed, default: {} },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, minimize: false },
);
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });
export const Notification = defineModel<INotification>("Notification", NotificationSchema, "notifications");
