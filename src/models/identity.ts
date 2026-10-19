import { Schema } from "mongoose";
import { baseOptions, defineModel, type ObjectId } from "./_shared";

export const USER_ROLES = ["fan", "creator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = [
  "super_admin",
  "operations_admin",
  "creator_manager",
  "moderation_specialist",
  "finance_manager",
  "ai_operations_manager",
  "support_agent",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const USER_STATUSES = ["active", "suspended", "banned", "deleted"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * `users` koleksiyonu Better Auth tarafından yönetilir (kayıt, e-posta doğrulama, oturum).
 * Bu Mongoose modeli okuma ve rol/durum gibi platform alanlarını güncellemek içindir;
 * parola/oturum alanlarına dokunmaz (onlar `accounts`/`sessions` koleksiyonlarında).
 */
export interface IUser {
  _id: ObjectId;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  username?: string | null;
  roles: UserRole[];
  adminRole?: AdminRole | null;
  status: UserStatus;
  statusReason?: string | null;
  signupIntent?: "fan" | "creator" | null;
  twoFactorEnabled?: boolean;
  birthDate?: Date | null;
  lastSeenAt?: Date | null;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String, default: null },
    username: { type: String, lowercase: true, trim: true, default: null },
    roles: { type: [String], enum: USER_ROLES, default: ["fan"] },
    adminRole: { type: String, enum: [...ADMIN_ROLES, null], default: null },
    status: { type: String, enum: USER_STATUSES, default: "active" },
    statusReason: { type: String, default: null, maxlength: 1000 },
    signupIntent: { type: String, enum: ["fan", "creator", null], default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    birthDate: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, strict: false },
);
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: "string" } } });
UserSchema.index({ roles: 1, status: 1 });
UserSchema.index({ createdAt: -1 });

export const User = defineModel<IUser>("User", UserSchema, "users");

export interface IUserPreferences {
  _id: ObjectId;
  userId: ObjectId;
  interests: string[]; // kategori slug'ları
  vibes: string[];
  recommendationsEnabled: boolean;
  personalizationConsent: boolean;
  aiMemoryEnabled: boolean;
  marketingConsent: boolean;
  locale: "tr" | "en";
  notifications: {
    email: boolean;
    push: boolean;
    newContent: boolean;
    messages: boolean;
    promotions: boolean;
  };
  fanOnboarding: { step: number; completedAt?: Date | null };
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    interests: { type: [String], default: [] },
    vibes: { type: [String], default: [] },
    recommendationsEnabled: { type: Boolean, default: true },
    personalizationConsent: { type: Boolean, default: false },
    aiMemoryEnabled: { type: Boolean, default: false },
    marketingConsent: { type: Boolean, default: false },
    locale: { type: String, enum: ["tr", "en"], default: "tr" },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      newContent: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
    },
    fanOnboarding: {
      step: { type: Number, default: 0 },
      completedAt: { type: Date, default: null },
    },
  },
  baseOptions,
);
UserPreferencesSchema.index({ userId: 1 }, { unique: true });

export const UserPreferences = defineModel<IUserPreferences>("UserPreferences", UserPreferencesSchema, "userPreferences");

export const AGE_VERIFICATION_STATUSES = ["pending", "verified", "failed", "expired"] as const;

/** Kimlik belgesi saklanmaz; yalnız sonuç, yöntem ve sağlayıcı referansı. */
export interface IAgeVerificationRecord {
  _id: ObjectId;
  userId: ObjectId;
  method: "self_declared" | "provider";
  provider?: string | null;
  providerRef?: string | null;
  status: (typeof AGE_VERIFICATION_STATUSES)[number];
  assuranceLevel: "none" | "low" | "high";
  over18: boolean | null;
  verifiedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AgeVerificationRecordSchema = new Schema<IAgeVerificationRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, enum: ["self_declared", "provider"], required: true },
    provider: { type: String, default: null },
    providerRef: { type: String, default: null },
    status: { type: String, enum: AGE_VERIFICATION_STATUSES, default: "pending" },
    assuranceLevel: { type: String, enum: ["none", "low", "high"], default: "none" },
    over18: { type: Boolean, default: null },
    verifiedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  baseOptions,
);
AgeVerificationRecordSchema.index({ userId: 1, createdAt: -1 });

export const AgeVerificationRecord = defineModel<IAgeVerificationRecord>(
  "AgeVerificationRecord",
  AgeVerificationRecordSchema,
  "ageVerificationRecords",
);
