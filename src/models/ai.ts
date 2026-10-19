import { Schema } from "mongoose";
import { baseOptions, defineModel, StatusEventSchema, type ObjectId, type StatusEvent } from "./_shared";

export const TWIN_STATUSES = ["draft", "pending_review", "approved", "live", "paused", "rejected", "revoked"] as const;
export type TwinStatus = (typeof TWIN_STATUSES)[number];

/** Kişilik ayarları: 0–100 ölçekli kaydırıcılar + tercih alanları. */
export interface TwinPersona {
  displayName: string;
  shortBio: string;
  greeting: string;
  warmth: number; // samimiyet
  formality: number; // resmiyet
  humor: number;
  energy: number;
  messageLength: "short" | "medium" | "long";
  pace: "slow" | "normal" | "fast";
  language: string;
  emojiUsage: "none" | "low" | "medium" | "high";
  speakingStyle: string;
  catchphrases: string[];
  sampleReplies: string[];
}

export interface TwinBoundaries {
  allowedTopics: string[];
  blockedTopics: string[];
  customRules: string[];
  allowFlirt: boolean; // platform politikası her zaman üst sınırdır
  allowPersonalQuestions: boolean;
  allowMediaRequests: boolean;
  allowCustomRequests: boolean;
  escalateOnDistress: boolean;
  maxMessagesPerFanPerDay: number;
}

export interface TwinVoiceLikeness {
  voiceEnabled: boolean;
  videoEnabled: boolean;
  imageLikenessEnabled: boolean;
  voiceProfileStatus: "none" | "pending" | "ready" | "disabled";
  voiceSampleAssetIds: ObjectId[];
  pitch: number;
  speed: number;
  tone: "soft" | "neutral" | "energetic";
}

export interface ITwin {
  _id: ObjectId;
  creatorId: ObjectId;
  userId: ObjectId;
  status: TwinStatus;
  statusHistory: StatusEvent[];
  draft: { persona: TwinPersona; boundaries: TwinBoundaries; voice: TwinVoiceLikeness };
  currentVersion: number;
  liveVersionId?: ObjectId | null;
  pricing: { messageCredits: number; voicePerMinuteCredits: number; videoPerMinuteCredits: number; freeMessagesPerDay: number };
  features: { chat: boolean; voice: boolean; video: boolean };
  quality: { personaScore: number | null; knowledgeScore: number | null; safetyScore: number | null; lastTestAt?: Date | null };
  stats: { conversations: number; messages: number; avgRating: number | null };
  reviewNote?: string | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PersonaSchema = new Schema<TwinPersona>(
  {
    displayName: { type: String, default: "", maxlength: 80 },
    shortBio: { type: String, default: "", maxlength: 500 },
    greeting: { type: String, default: "", maxlength: 500 },
    warmth: { type: Number, min: 0, max: 100, default: 70 },
    formality: { type: Number, min: 0, max: 100, default: 30 },
    humor: { type: Number, min: 0, max: 100, default: 50 },
    energy: { type: Number, min: 0, max: 100, default: 60 },
    messageLength: { type: String, enum: ["short", "medium", "long"], default: "medium" },
    pace: { type: String, enum: ["slow", "normal", "fast"], default: "normal" },
    language: { type: String, default: "tr" },
    emojiUsage: { type: String, enum: ["none", "low", "medium", "high"], default: "low" },
    speakingStyle: { type: String, default: "", maxlength: 1000 },
    catchphrases: { type: [String], default: [] },
    sampleReplies: { type: [String], default: [] },
  },
  { _id: false },
);

const BoundariesSchema = new Schema<TwinBoundaries>(
  {
    allowedTopics: { type: [String], default: [] },
    blockedTopics: { type: [String], default: [] },
    customRules: { type: [String], default: [] },
    allowFlirt: { type: Boolean, default: false },
    allowPersonalQuestions: { type: Boolean, default: true },
    allowMediaRequests: { type: Boolean, default: false },
    allowCustomRequests: { type: Boolean, default: true },
    escalateOnDistress: { type: Boolean, default: true },
    maxMessagesPerFanPerDay: { type: Number, min: 1, max: 1000, default: 200 },
  },
  { _id: false },
);

const VoiceSchema = new Schema<TwinVoiceLikeness>(
  {
    voiceEnabled: { type: Boolean, default: false },
    videoEnabled: { type: Boolean, default: false },
    imageLikenessEnabled: { type: Boolean, default: false },
    voiceProfileStatus: { type: String, enum: ["none", "pending", "ready", "disabled"], default: "none" },
    voiceSampleAssetIds: { type: [Schema.Types.ObjectId], ref: "MediaAsset", default: [] },
    pitch: { type: Number, min: -10, max: 10, default: 0 },
    speed: { type: Number, min: 50, max: 150, default: 100 },
    tone: { type: String, enum: ["soft", "neutral", "energetic"], default: "neutral" },
  },
  { _id: false },
);

const TwinSchema = new Schema<ITwin>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: TWIN_STATUSES, default: "draft" },
    statusHistory: { type: [StatusEventSchema], default: [] },
    draft: {
      persona: { type: PersonaSchema, default: () => ({}) },
      boundaries: { type: BoundariesSchema, default: () => ({}) },
      voice: { type: VoiceSchema, default: () => ({}) },
    },
    currentVersion: { type: Number, default: 0 },
    liveVersionId: { type: Schema.Types.ObjectId, ref: "AiTwinVersion", default: null },
    pricing: {
      messageCredits: { type: Number, min: 0, max: 100, default: 2 },
      voicePerMinuteCredits: { type: Number, min: 0, max: 1000, default: 20 },
      videoPerMinuteCredits: { type: Number, min: 0, max: 1000, default: 40 },
      freeMessagesPerDay: { type: Number, min: 0, max: 50, default: 3 },
    },
    features: {
      chat: { type: Boolean, default: true },
      voice: { type: Boolean, default: false },
      video: { type: Boolean, default: false },
    },
    quality: {
      personaScore: { type: Number, default: null },
      knowledgeScore: { type: Number, default: null },
      safetyScore: { type: Number, default: null },
      lastTestAt: { type: Date, default: null },
    },
    stats: {
      conversations: { type: Number, default: 0 },
      messages: { type: Number, default: 0 },
      avgRating: { type: Number, default: null },
    },
    reviewNote: { type: String, default: null },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
TwinSchema.index({ creatorId: 1 }, { unique: true });
TwinSchema.index({ status: 1, updatedAt: -1 });

export const AiTwin = defineModel<ITwin>("AiTwin", TwinSchema, "aiTwins");

/** Her "incelemeye gönder" bir sürüm üretir; canlı sürüm değiştirilemez anlık görüntüdür. */
export interface ITwinVersion {
  _id: ObjectId;
  twinId: ObjectId;
  creatorId: ObjectId;
  version: number;
  snapshot: { persona: TwinPersona; boundaries: TwinBoundaries; voice: TwinVoiceLikeness; knowledgeSourceIds: ObjectId[] };
  status: "pending_review" | "approved" | "rejected" | "superseded" | "live";
  submittedBy: ObjectId;
  reviewedBy?: ObjectId | null;
  reviewNote?: string | null;
  changeSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TwinVersionSchema = new Schema<ITwinVersion>(
  {
    twinId: { type: Schema.Types.ObjectId, ref: "AiTwin", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    version: { type: Number, required: true },
    snapshot: {
      persona: { type: PersonaSchema, required: true },
      boundaries: { type: BoundariesSchema, required: true },
      voice: { type: VoiceSchema, required: true },
      knowledgeSourceIds: { type: [Schema.Types.ObjectId], default: [] },
    },
    status: { type: String, enum: ["pending_review", "approved", "rejected", "superseded", "live"], default: "pending_review" },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewNote: { type: String, default: null },
    changeSummary: { type: String, maxlength: 500 },
  },
  baseOptions,
);
TwinVersionSchema.index({ twinId: 1, version: -1 }, { unique: true });
TwinVersionSchema.index({ status: 1, createdAt: 1 });

export const AiTwinVersion = defineModel<ITwinVersion>("AiTwinVersion", TwinVersionSchema, "aiTwinVersions");

export const KNOWLEDGE_STATUSES = ["uploaded", "validating", "extracting", "chunking", "embedding", "indexed", "failed", "disabled"] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export interface IKnowledgeSource {
  _id: ObjectId;
  creatorId: ObjectId;
  twinId: ObjectId;
  type: "text" | "file" | "url" | "faq";
  title: string;
  status: KnowledgeStatus;
  approved: boolean;
  assetId?: ObjectId | null;
  url?: string | null;
  text?: string | null;
  mime?: string | null;
  sizeBytes?: number;
  chunkCount: number;
  tokenCount: number;
  error?: string | null;
  indexedAt?: Date | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeSourceSchema = new Schema<IKnowledgeSource>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    twinId: { type: Schema.Types.ObjectId, ref: "AiTwin", required: true },
    type: { type: String, enum: ["text", "file", "url", "faq"], required: true },
    title: { type: String, required: true, maxlength: 200 },
    status: { type: String, enum: KNOWLEDGE_STATUSES, default: "uploaded" },
    approved: { type: Boolean, default: true },
    assetId: { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null },
    url: { type: String, default: null },
    text: { type: String, default: null, maxlength: 200_000 },
    mime: { type: String, default: null },
    sizeBytes: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    tokenCount: { type: Number, default: 0 },
    error: { type: String, default: null },
    indexedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
KnowledgeSourceSchema.index({ creatorId: 1, createdAt: -1 });
KnowledgeSourceSchema.index({ twinId: 1, status: 1 });

export const KnowledgeSource = defineModel<IKnowledgeSource>("KnowledgeSource", KnowledgeSourceSchema, "knowledgeSources");

/**
 * Atlas Vector Search indeksi (üretim):
 * { "fields": [ { "type": "vector", "path": "embedding", "numDimensions": <model>, "similarity": "cosine" },
 *               { "type": "filter", "path": "creatorId" }, { "type": "filter", "path": "active" } ] }
 */
export interface IKnowledgeChunk {
  _id: ObjectId;
  creatorId: ObjectId;
  twinId: ObjectId;
  sourceId: ObjectId;
  idx: number;
  text: string;
  tokenCount: number;
  embedding: number[];
  embeddingModel: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    twinId: { type: Schema.Types.ObjectId, ref: "AiTwin", required: true },
    sourceId: { type: Schema.Types.ObjectId, ref: "KnowledgeSource", required: true },
    idx: { type: Number, required: true },
    text: { type: String, required: true, maxlength: 8000 },
    tokenCount: { type: Number, default: 0 },
    embedding: { type: [Number], default: [] },
    embeddingModel: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  baseOptions,
);
KnowledgeChunkSchema.index({ creatorId: 1, active: 1 });
KnowledgeChunkSchema.index({ sourceId: 1, idx: 1 }, { unique: true });

export const KnowledgeChunk = defineModel<IKnowledgeChunk>("KnowledgeChunk", KnowledgeChunkSchema, "knowledgeChunks");

export const JOB_TYPES = ["knowledge.ingest", "media.process", "notifications.fanout", "earnings.release", "subscriptions.expire"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export interface IIngestionJob {
  _id: ObjectId;
  type: JobType;
  payload: Record<string, unknown>;
  status: "queued" | "running" | "succeeded" | "failed";
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedUntil?: Date | null;
  lastError?: string | null;
  finishedAt?: Date | null;
  dedupeKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const IngestionJobSchema = new Schema<IIngestionJob>(
  {
    type: { type: String, enum: JOB_TYPES, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["queued", "running", "succeeded", "failed"], default: "queued" },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    runAfter: { type: Date, default: () => new Date() },
    lockedUntil: { type: Date, default: null },
    lastError: { type: String, default: null },
    finishedAt: { type: Date, default: null },
    dedupeKey: { type: String, default: null },
  },
  { ...baseOptions, minimize: false },
);
IngestionJobSchema.index({ status: 1, runAfter: 1 });
IngestionJobSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } });

export const IngestionJob = defineModel<IIngestionJob>("IngestionJob", IngestionJobSchema, "ingestionJobs");

export interface IAiUsageRecord {
  _id: ObjectId;
  kind: "chat" | "embedding" | "moderation" | "test_chat" | "evaluation";
  provider: string;
  model: string;
  userId?: ObjectId | null;
  creatorId?: ObjectId | null;
  twinId?: ObjectId | null;
  conversationId?: ObjectId | null;
  messageId?: ObjectId | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costMicroUsd: number; // 1 USD = 1_000_000
  status: "ok" | "error" | "blocked";
  errorCode?: string | null;
  isMock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AiUsageRecordSchema = new Schema<IAiUsageRecord>(
  {
    kind: { type: String, enum: ["chat", "embedding", "moderation", "test_chat", "evaluation"], required: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    twinId: { type: Schema.Types.ObjectId, ref: "AiTwin", default: null },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
    messageId: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    costMicroUsd: { type: Number, default: 0 },
    status: { type: String, enum: ["ok", "error", "blocked"], default: "ok" },
    errorCode: { type: String, default: null },
    isMock: { type: Boolean, default: false },
  },
  baseOptions,
);
AiUsageRecordSchema.index({ createdAt: -1 });
AiUsageRecordSchema.index({ creatorId: 1, createdAt: -1 });
AiUsageRecordSchema.index({ provider: 1, model: 1, createdAt: -1 });

export const AiUsageRecord = defineModel<IAiUsageRecord>("AiUsageRecord", AiUsageRecordSchema, "aiUsageRecords");
