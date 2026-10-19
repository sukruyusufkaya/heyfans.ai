import { Schema } from "mongoose";
import { baseOptions, defineModel, StatusEventSchema, type ObjectId, type StatusEvent } from "./_shared";

export const CREATOR_STATUSES = ["onboarding", "pending_review", "approved", "suspended", "rejected"] as const;
export type CreatorStatus = (typeof CREATOR_STATUSES)[number];

export const SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube", "x", "website"] as const;

export interface ICreatorProfile {
  _id: ObjectId;
  userId: ObjectId;
  username: string;
  displayName: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  avatarAssetId?: ObjectId | null;
  coverAssetId?: ObjectId | null;
  categories: string[]; // kategori slug'ları
  tags: string[];
  location?: string;
  languages: string[];
  socialLinks: { platform: (typeof SOCIAL_PLATFORMS)[number]; handle: string; url?: string; verified: boolean }[];
  status: CreatorStatus;
  statusHistory: StatusEvent[];
  verification: {
    identity: "none" | "pending" | "verified" | "rejected";
    social: "none" | "pending" | "verified" | "rejected";
    verifiedAt?: Date | null;
  };
  onboarding: {
    step: number;
    completedSteps: string[];
    data: Record<string, unknown>;
    submittedAt?: Date | null;
  };
  stats: {
    followers: number;
    posts: number;
    likes: number;
    conversations: number;
    subscribers: number;
  };
  featured: { isFeatured: boolean; rank: number };
  isOnline: boolean;
  lastActiveAt?: Date | null;
  payoutsEnabled: boolean;
  defaultCurrency: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CreatorProfileSchema = new Schema<ICreatorProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_.]{3,30}$/, "Kullanıcı adı 3-30 karakter: harf, rakam, _ ve ."],
    },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    headline: { type: String, maxlength: 140 },
    bio: { type: String, maxlength: 1500 },
    avatarUrl: { type: String, default: null },
    coverUrl: { type: String, default: null },
    avatarAssetId: { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null },
    coverAssetId: { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null },
    categories: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    location: { type: String, maxlength: 80 },
    languages: { type: [String], default: ["tr"] },
    socialLinks: {
      type: [
        new Schema(
          {
            platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
            handle: { type: String, required: true, maxlength: 120 },
            url: { type: String, maxlength: 500 },
            verified: { type: Boolean, default: false },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    status: { type: String, enum: CREATOR_STATUSES, default: "onboarding" },
    statusHistory: { type: [StatusEventSchema], default: [] },
    verification: {
      identity: { type: String, enum: ["none", "pending", "verified", "rejected"], default: "none" },
      social: { type: String, enum: ["none", "pending", "verified", "rejected"], default: "none" },
      verifiedAt: { type: Date, default: null },
    },
    onboarding: {
      step: { type: Number, default: 1 },
      completedSteps: { type: [String], default: [] },
      data: { type: Schema.Types.Mixed, default: {} },
      submittedAt: { type: Date, default: null },
    },
    stats: {
      followers: { type: Number, default: 0 },
      posts: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      conversations: { type: Number, default: 0 },
      subscribers: { type: Number, default: 0 },
    },
    featured: {
      isFeatured: { type: Boolean, default: false },
      rank: { type: Number, default: 0 },
    },
    isOnline: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: null },
    payoutsEnabled: { type: Boolean, default: false },
    defaultCurrency: { type: String, default: "TRY" },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, minimize: false },
);
CreatorProfileSchema.index({ userId: 1 }, { unique: true });
CreatorProfileSchema.index({ username: 1 }, { unique: true });
CreatorProfileSchema.index({ status: 1, categories: 1, "stats.followers": -1 });
CreatorProfileSchema.index({ status: 1, "featured.isFeatured": 1, "featured.rank": 1 });
CreatorProfileSchema.index({ status: 1, createdAt: -1 });
CreatorProfileSchema.index({ displayName: "text", username: "text", headline: "text", tags: "text" }, { default_language: "none" });

export const CreatorProfile = defineModel<ICreatorProfile>("CreatorProfile", CreatorProfileSchema, "creatorProfiles");

export const CREATOR_APPLICATION_STATUSES = ["draft", "submitted", "in_review", "approved", "rejected", "changes_requested"] as const;

/** Admin'in incelediği creator başvurusu (onboarding'in kesinleşmiş anlık görüntüsü). */
export interface ICreatorApplication {
  _id: ObjectId;
  userId: ObjectId;
  creatorId: ObjectId;
  status: (typeof CREATOR_APPLICATION_STATUSES)[number];
  snapshot: Record<string, unknown>;
  checklist: { key: string; label: string; passed: boolean | null }[];
  reviewerId?: ObjectId | null;
  decisionNote?: string | null;
  submittedAt?: Date | null;
  decidedAt?: Date | null;
  history: StatusEvent[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CreatorApplicationSchema = new Schema<ICreatorApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    status: { type: String, enum: CREATOR_APPLICATION_STATUSES, default: "draft" },
    snapshot: { type: Schema.Types.Mixed, default: {} },
    checklist: {
      type: [new Schema({ key: String, label: String, passed: { type: Boolean, default: null } }, { _id: false })],
      default: [],
    },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decisionNote: { type: String, default: null, maxlength: 2000 },
    submittedAt: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
    history: { type: [StatusEventSchema], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, minimize: false },
);
CreatorApplicationSchema.index({ status: 1, submittedAt: 1 });
CreatorApplicationSchema.index({ creatorId: 1, createdAt: -1 });

export const CreatorApplication = defineModel<ICreatorApplication>("CreatorApplication", CreatorApplicationSchema, "creatorApplications");

export const VERIFICATION_TYPES = ["identity", "social", "likeness"] as const;

/** Kimlik belgesi saklanmaz: harici sağlayıcı referansı veya admin incelemesi sonucu tutulur. */
export interface ICreatorVerificationRequest {
  _id: ObjectId;
  creatorId: ObjectId;
  userId: ObjectId;
  type: (typeof VERIFICATION_TYPES)[number];
  status: "pending" | "in_review" | "verified" | "rejected" | "expired";
  provider: string; // "manual" | sağlayıcı adı
  providerRef?: string | null;
  evidence: { kind: string; value: string }[]; // ör. sosyal hesap bağlantısı, doğrulama kodu
  reviewerId?: ObjectId | null;
  decisionNote?: string | null;
  decidedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CreatorVerificationRequestSchema = new Schema<ICreatorVerificationRequest>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: VERIFICATION_TYPES, required: true },
    status: { type: String, enum: ["pending", "in_review", "verified", "rejected", "expired"], default: "pending" },
    provider: { type: String, default: "manual" },
    providerRef: { type: String, default: null },
    evidence: { type: [new Schema({ kind: String, value: String }, { _id: false })], default: [] },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decisionNote: { type: String, default: null },
    decidedAt: { type: Date, default: null },
  },
  baseOptions,
);
CreatorVerificationRequestSchema.index({ creatorId: 1, type: 1, createdAt: -1 });
CreatorVerificationRequestSchema.index({ status: 1, createdAt: 1 });

export const CreatorVerificationRequest = defineModel<ICreatorVerificationRequest>(
  "CreatorVerificationRequest",
  CreatorVerificationRequestSchema,
  "creatorVerificationRequests",
);

export const CONSENT_KINDS = ["ai_twin_persona", "knowledge_use", "voice_likeness", "image_likeness", "video_likeness"] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/** Açık rıza kaydı. Geri çekme yeni kayıt değil `revokedAt` ile işaretlenir; metin sürümü ve özeti saklanır. */
export interface ICreatorConsent {
  _id: ObjectId;
  creatorId: ObjectId;
  userId: ObjectId;
  kind: ConsentKind;
  granted: boolean;
  textVersion: string;
  textHash: string;
  grantedAt: Date;
  revokedAt?: Date | null;
  revokeReason?: string | null;
  ipHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CreatorConsentSchema = new Schema<ICreatorConsent>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: CONSENT_KINDS, required: true },
    granted: { type: Boolean, required: true },
    textVersion: { type: String, required: true },
    textHash: { type: String, required: true },
    grantedAt: { type: Date, default: () => new Date() },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null },
    ipHash: { type: String, default: null },
  },
  baseOptions,
);
CreatorConsentSchema.index({ creatorId: 1, kind: 1, revokedAt: 1 });

export const CreatorConsent = defineModel<ICreatorConsent>("CreatorConsent", CreatorConsentSchema, "creatorConsents");
