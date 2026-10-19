import { Schema } from "mongoose";
import { baseOptions, defineModel, immutable, StatusEventSchema, type ObjectId, type StatusEvent } from "./_shared";

export const MODERATION_TARGETS = ["content", "message", "twin", "profile", "user", "custom_request"] as const;
export type ModerationTarget = (typeof MODERATION_TARGETS)[number];
export const MODERATION_STATUSES = ["open", "in_review", "actioned", "dismissed", "escalated"] as const;

export interface IModerationCase {
  _id: ObjectId;
  caseNo: string;
  targetType: ModerationTarget;
  targetId: ObjectId;
  creatorId?: ObjectId | null;
  subjectUserId?: ObjectId | null;
  source: "auto" | "report" | "manual" | "pre_publish";
  reason: string;
  categories: string[];
  riskScore: number; // 0-100
  priority: "low" | "medium" | "high" | "critical";
  status: (typeof MODERATION_STATUSES)[number];
  assignedTo?: ObjectId | null;
  decision?: { action: "none" | "warn" | "hide" | "remove" | "suspend_user" | "pause_twin" | "revoke_twin"; note: string; by: ObjectId; at: Date } | null;
  reportIds: ObjectId[];
  history: StatusEvent[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const ModerationCaseSchema = new Schema<IModerationCase>(
  {
    caseNo: { type: String, required: true },
    targetType: { type: String, enum: MODERATION_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    subjectUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, enum: ["auto", "report", "manual", "pre_publish"], required: true },
    reason: { type: String, required: true, maxlength: 500 },
    categories: { type: [String], default: [] },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: { type: String, enum: MODERATION_STATUSES, default: "open" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decision: {
      type: new Schema(
        {
          action: { type: String, enum: ["none", "warn", "hide", "remove", "suspend_user", "pause_twin", "revoke_twin"] },
          note: String,
          by: { type: Schema.Types.ObjectId, ref: "User" },
          at: Date,
        },
        { _id: false },
      ),
      default: null,
    },
    reportIds: { type: [Schema.Types.ObjectId], ref: "Report", default: [] },
    history: { type: [StatusEventSchema], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
ModerationCaseSchema.index({ caseNo: 1 }, { unique: true });
ModerationCaseSchema.index({ status: 1, priority: 1, createdAt: 1 });
ModerationCaseSchema.index({ targetType: 1, targetId: 1 });
export const ModerationCase = defineModel<IModerationCase>("ModerationCase", ModerationCaseSchema, "moderationCases");

export const REPORT_REASONS = [
  "impersonation",
  "harassment",
  "sexual_content",
  "minor_safety",
  "hate",
  "self_harm",
  "spam",
  "copyright",
  "privacy",
  "ai_misbehavior",
  "other",
] as const;
export interface IReport {
  _id: ObjectId;
  reportNo: string;
  reporterId?: ObjectId | null;
  reporterEmail?: string | null;
  targetType: ModerationTarget;
  targetId: ObjectId;
  creatorId?: ObjectId | null;
  reason: (typeof REPORT_REASONS)[number];
  details?: string;
  status: "open" | "triaged" | "resolved" | "rejected";
  caseId?: ObjectId | null;
  resolutionNote?: string | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const ReportSchema = new Schema<IReport>(
  {
    reportNo: { type: String, required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reporterEmail: { type: String, default: null },
    targetType: { type: String, enum: MODERATION_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 3000 },
    status: { type: String, enum: ["open", "triaged", "resolved", "rejected"], default: "open" },
    caseId: { type: Schema.Types.ObjectId, ref: "ModerationCase", default: null },
    resolutionNote: { type: String, default: null },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
ReportSchema.index({ reportNo: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 });
export const Report = defineModel<IReport>("Report", ReportSchema, "reports");

export interface IAppeal {
  _id: ObjectId;
  appealNo: string;
  userId: ObjectId;
  caseId: ObjectId;
  reason: string;
  status: "open" | "in_review" | "upheld" | "overturned";
  decidedBy?: ObjectId | null;
  decisionNote?: string | null;
  history: StatusEvent[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const AppealSchema = new Schema<IAppeal>(
  {
    appealNo: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    caseId: { type: Schema.Types.ObjectId, ref: "ModerationCase", required: true },
    reason: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: ["open", "in_review", "upheld", "overturned"], default: "open" },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decisionNote: { type: String, default: null },
    history: { type: [StatusEventSchema], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
AppealSchema.index({ appealNo: 1 }, { unique: true });
AppealSchema.index({ status: 1, createdAt: 1 });
AppealSchema.index({ caseId: 1, userId: 1 }, { unique: true });
export const Appeal = defineModel<IAppeal>("Appeal", AppealSchema, "appeals");

/** Değişmez denetim kaydı. */
export interface IAuditLog {
  _id: ObjectId;
  actorId?: ObjectId | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  severity: "info" | "notice" | "critical";
  ipHash?: string | null;
  userAgent?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, default: null },
    action: { type: String, required: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    reason: { type: String, default: null, maxlength: 1000 },
    severity: { type: String, enum: ["info", "notice", "critical"], default: "info" },
    ipHash: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 300 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { ...baseOptions, minimize: false },
);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
immutable(AuditLogSchema, "Denetim kaydı");
export const AuditLog = defineModel<IAuditLog>("AuditLog", AuditLogSchema, "auditLogs");
