import { Schema } from "mongoose";
import { baseOptions, defineModel, MoneySchema, StatusEventSchema, type Money, type ObjectId, type StatusEvent } from "./_shared";
import { m } from "@/i18n/m";

export interface ICategory {
  _id: ObjectId;
  slug: string;
  name: string;
  description?: string;
  icon: string; // lucide ikon adı
  parentSlug?: string | null;
  order: number;
  isActive: boolean;
  coverUrl?: string | null;
  heroTitle?: string;
  heroText?: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9-]{2,60}$/ },
    name: { type: String, required: true, maxlength: 80 },
    description: { type: String, maxlength: 500 },
    icon: { type: String, default: "sparkles" },
    parentSlug: { type: String, default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    coverUrl: { type: String, default: null },
    heroTitle: { type: String, maxlength: 120 },
    heroText: { type: String, maxlength: 600 },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentSlug: 1, order: 1 });

export const Category = defineModel<ICategory>("Category", CategorySchema, "categories");

export const MEDIA_KINDS = ["image", "video", "audio", "document"] as const;

export interface IMediaAsset {
  _id: ObjectId;
  ownerId: ObjectId;
  creatorId?: ObjectId | null;
  kind: (typeof MEDIA_KINDS)[number];
  purpose: "avatar" | "cover" | "content" | "content_preview" | "knowledge" | "voice_sample" | "deliverable" | "cms";
  mime: string;
  sizeBytes: number;
  storageKey: string;
  visibility: "public" | "private";
  status: "pending_upload" | "uploaded" | "ready" | "quarantined" | "rejected" | "deleted";
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  checksumSha256?: string | null;
  scan: { status: "pending" | "clean" | "flagged" | "skipped"; provider?: string | null; checkedAt?: Date | null };
  previewKey?: string | null; // bulanık/küçük genel önizleme
  originalName?: string | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    kind: { type: String, enum: MEDIA_KINDS, required: true },
    purpose: {
      type: String,
      enum: ["avatar", "cover", "content", "content_preview", "knowledge", "voice_sample", "deliverable", "cms"],
      required: true,
    },
    mime: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    storageKey: { type: String, required: true },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    status: { type: String, enum: ["pending_upload", "uploaded", "ready", "quarantined", "rejected", "deleted"], default: "pending_upload" },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    durationSec: { type: Number, default: null },
    checksumSha256: { type: String, default: null },
    scan: {
      status: { type: String, enum: ["pending", "clean", "flagged", "skipped"], default: "pending" },
      provider: { type: String, default: null },
      checkedAt: { type: Date, default: null },
    },
    previewKey: { type: String, default: null },
    originalName: { type: String, default: null, maxlength: 255 },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
MediaAssetSchema.index({ storageKey: 1 }, { unique: true });
MediaAssetSchema.index({ ownerId: 1, createdAt: -1 });
MediaAssetSchema.index({ creatorId: 1, purpose: 1 });

export const MediaAsset = defineModel<IMediaAsset>("MediaAsset", MediaAssetSchema, "mediaAssets");

export const CONTENT_TYPES = ["photo", "video", "audio", "text", "collection"] as const;
export const CONTENT_STATUSES = ["draft", "in_review", "published", "hidden", "removed"] as const;
export const CONTENT_ACCESS = ["public", "followers", "subscribers", "purchase"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type ContentAccess = (typeof CONTENT_ACCESS)[number];

export interface IContentItem {
  _id: ObjectId;
  creatorId: ObjectId;
  type: (typeof CONTENT_TYPES)[number];
  title: string;
  caption?: string;
  status: ContentStatus;
  statusHistory: StatusEvent[];
  access: ContentAccess;
  minPlanTier?: "basic" | "premium" | "vip" | null;
  price?: Money | null; // access=purchase için
  mediaAssetIds: ObjectId[];
  previewAssetId?: ObjectId | null;
  coverUrl?: string | null; // genel (bulanık/temsili) kapak
  categories: string[];
  tags: string[];
  isAiGenerated: boolean;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  stats: { likes: number; comments: number; views: number; purchases: number; revenueMinor: number };
  moderation: { state: "none" | "pending" | "approved" | "flagged" | "removed"; caseId?: ObjectId | null };
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContentItemSchema = new Schema<IContentItem>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    type: { type: String, enum: CONTENT_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    caption: { type: String, maxlength: 4000 },
    status: { type: String, enum: CONTENT_STATUSES, default: "draft" },
    statusHistory: { type: [StatusEventSchema], default: [] },
    access: { type: String, enum: CONTENT_ACCESS, default: "public" },
    minPlanTier: { type: String, enum: ["basic", "premium", "vip", null], default: null },
    price: { type: MoneySchema, default: null },
    mediaAssetIds: { type: [Schema.Types.ObjectId], ref: "MediaAsset", default: [] },
    previewAssetId: { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null },
    coverUrl: { type: String, default: null },
    categories: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    isAiGenerated: { type: Boolean, default: false },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    stats: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      revenueMinor: { type: Number, default: 0 },
    },
    moderation: {
      state: { type: String, enum: ["none", "pending", "approved", "flagged", "removed"], default: "none" },
      caseId: { type: Schema.Types.ObjectId, ref: "ModerationCase", default: null },
    },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
ContentItemSchema.pre("validate", function () {
  if (this.access === "purchase" && (!this.price || this.price.amountMinor <= 0)) {
    this.invalidate("price", m("Satın alma gerektiren içerik için fiyat zorunlu"));
  }
});
ContentItemSchema.index({ creatorId: 1, status: 1, publishedAt: -1 });
ContentItemSchema.index({ status: 1, publishedAt: -1 });
ContentItemSchema.index({ status: 1, "stats.likes": -1 });
ContentItemSchema.index({ "moderation.state": 1, updatedAt: -1 });

export const ContentItem = defineModel<IContentItem>("ContentItem", ContentItemSchema, "contentItems");

/** İçerik erişim hakkı; tekil satın alma veya hediye. Abonelik erişimi dinamik hesaplanır. */
export interface IContentAccessGrant {
  _id: ObjectId;
  userId: ObjectId;
  contentId: ObjectId;
  creatorId: ObjectId;
  source: "purchase" | "gift" | "admin";
  transactionId?: ObjectId | null;
  grantedAt: Date;
  revokedAt?: Date | null;
  revokeReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContentAccessGrantSchema = new Schema<IContentAccessGrant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contentId: { type: Schema.Types.ObjectId, ref: "ContentItem", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    source: { type: String, enum: ["purchase", "gift", "admin"], required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: "PaymentTransaction", default: null },
    grantedAt: { type: Date, default: () => new Date() },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null },
  },
  baseOptions,
);
ContentAccessGrantSchema.index({ userId: 1, contentId: 1 }, { unique: true });
ContentAccessGrantSchema.index({ creatorId: 1, createdAt: -1 });

export const ContentAccessGrant = defineModel<IContentAccessGrant>("ContentAccessGrant", ContentAccessGrantSchema, "contentAccessGrants");
