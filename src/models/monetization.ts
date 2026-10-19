import { Schema } from "mongoose";
import {
  baseOptions,
  defineModel,
  immutable,
  intValidator,
  MoneySchema,
  StatusEventSchema,
  type Money,
  type ObjectId,
  type StatusEvent,
} from "./_shared";

export const PLAN_TIERS = ["free", "basic", "premium", "vip"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

/** creatorId=null + scope=platform → platform üyeliği; aksi halde creator aboneliği. */
export interface IMembershipPlan {
  _id: ObjectId;
  scope: "creator" | "platform";
  creatorId?: ObjectId | null;
  tier: PlanTier;
  name: string;
  description?: string;
  benefits: string[];
  entitlements: {
    contentAccess: "none" | "basic" | "premium" | "vip";
    unlimitedChat: boolean;
    dailyChatAllowance: number;
    monthlyCredits: number;
    customRequests: boolean;
    prioritySupport: boolean;
  };
  priceMonthly: Money;
  priceYearly?: Money | null;
  isPopular: boolean;
  status: "active" | "archived";
  order: number;
  providerRefs: Record<string, string>;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const MembershipPlanSchema = new Schema<IMembershipPlan>(
  {
    scope: { type: String, enum: ["creator", "platform"], required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    tier: { type: String, enum: PLAN_TIERS, required: true },
    name: { type: String, required: true, maxlength: 60 },
    description: { type: String, maxlength: 300 },
    benefits: { type: [String], default: [] },
    entitlements: {
      contentAccess: { type: String, enum: ["none", "basic", "premium", "vip"], default: "none" },
      unlimitedChat: { type: Boolean, default: false },
      dailyChatAllowance: { type: Number, default: 0 },
      monthlyCredits: { type: Number, default: 0, validate: intValidator },
      customRequests: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },
    priceMonthly: { type: MoneySchema, required: true },
    priceYearly: { type: MoneySchema, default: null },
    isPopular: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "archived"], default: "active" },
    order: { type: Number, default: 0 },
    providerRefs: { type: Schema.Types.Mixed, default: {} },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, minimize: false },
);
MembershipPlanSchema.pre("validate", function () {
  if (this.scope === "creator" && !this.creatorId) this.invalidate("creatorId", "Creator planı creatorId gerektirir");
  if (this.scope === "platform" && this.creatorId) this.invalidate("creatorId", "Platform planı creatorId içermez");
});
MembershipPlanSchema.index({ scope: 1, creatorId: 1, status: 1, order: 1 });
export const MembershipPlan = defineModel<IMembershipPlan>("MembershipPlan", MembershipPlanSchema, "membershipPlans");

export const SUBSCRIPTION_STATUSES = ["pending", "active", "past_due", "canceled", "expired"] as const;
export interface ISubscription {
  _id: ObjectId;
  userId: ObjectId;
  planId: ObjectId;
  scope: "creator" | "platform";
  creatorId?: ObjectId | null;
  tier: PlanTier;
  status: (typeof SUBSCRIPTION_STATUSES)[number];
  interval: "month" | "year";
  price: Money;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | null;
  provider: string;
  providerSubscriptionId?: string | null;
  lastTransactionId?: ObjectId | null;
  history: StatusEvent[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: Schema.Types.ObjectId, ref: "MembershipPlan", required: true },
    scope: { type: String, enum: ["creator", "platform"], required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    tier: { type: String, enum: PLAN_TIERS, required: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, default: "pending" },
    interval: { type: String, enum: ["month", "year"], default: "month" },
    price: { type: MoneySchema, required: true },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
    provider: { type: String, required: true },
    providerSubscriptionId: { type: String, default: null },
    lastTransactionId: { type: Schema.Types.ObjectId, ref: "PaymentTransaction", default: null },
    history: { type: [StatusEventSchema], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ creatorId: 1, status: 1 });
// Aynı kullanıcı aynı creator'a aynı anda tek etkin abonelik
SubscriptionSchema.index(
  { userId: 1, scope: 1, creatorId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["active", "past_due"] } } },
);
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
export const Subscription = defineModel<ISubscription>("Subscription", SubscriptionSchema, "subscriptions");

export interface IWallet {
  _id: ObjectId;
  userId: ObjectId;
  balance: number; // kredi, tamsayı
  lifetimePurchased: number;
  lifetimeSpent: number;
  status: "active" | "frozen";
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    balance: { type: Number, default: 0, min: [0, "Bakiye negatif olamaz"], validate: intValidator },
    lifetimePurchased: { type: Number, default: 0 },
    lifetimeSpent: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "frozen"], default: "active" },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, optimisticConcurrency: true },
);
WalletSchema.index({ userId: 1 }, { unique: true });
export const Wallet = defineModel<IWallet>("Wallet", WalletSchema, "wallets");

export const LEDGER_TYPES = [
  "purchase",
  "subscription_grant",
  "bonus",
  "spend_message",
  "spend_voice",
  "spend_video",
  "spend_content",
  "spend_custom_request",
  "gift_sent",
  "tip_sent",
  "refund",
  "reversal",
  "adjustment",
  "refund_debit",
] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

/** Değişmez kredi defteri. amount işaretli: + giriş, − çıkış. */
export interface IWalletLedgerEntry {
  _id: ObjectId;
  walletId: ObjectId;
  userId: ObjectId;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  creatorId?: ObjectId | null;
  refType?: string | null;
  refId?: ObjectId | null;
  reversesEntryId?: ObjectId | null;
  description: string;
  idempotencyKey: string;
  actorId?: ObjectId | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const WalletLedgerSchema = new Schema<IWalletLedgerEntry>(
  {
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: LEDGER_TYPES, required: true },
    amount: { type: Number, required: true, validate: intValidator },
    balanceAfter: { type: Number, required: true, min: 0, validate: intValidator },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    refType: { type: String, default: null },
    refId: { type: Schema.Types.ObjectId, default: null },
    reversesEntryId: { type: Schema.Types.ObjectId, ref: "WalletLedgerEntry", default: null },
    description: { type: String, required: true, maxlength: 300 },
    idempotencyKey: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
WalletLedgerSchema.index({ idempotencyKey: 1 }, { unique: true });
WalletLedgerSchema.index({ userId: 1, createdAt: -1 });
WalletLedgerSchema.index({ creatorId: 1, type: 1, createdAt: -1 });
WalletLedgerSchema.index({ reversesEntryId: 1 }, { unique: true, partialFilterExpression: { reversesEntryId: { $type: "objectId" } } });
immutable(WalletLedgerSchema, "Cüzdan defteri");
export const WalletLedgerEntry = defineModel<IWalletLedgerEntry>("WalletLedgerEntry", WalletLedgerSchema, "walletLedger");

export const TRANSACTION_KINDS = ["credit_purchase", "subscription", "content_purchase", "custom_request", "tip"] as const;
export const TRANSACTION_STATUSES = ["created", "pending", "succeeded", "failed", "canceled", "refunded", "partially_refunded", "chargeback"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export interface IPaymentTransaction {
  _id: ObjectId;
  userId: ObjectId;
  kind: (typeof TRANSACTION_KINDS)[number];
  status: TransactionStatus;
  amount: Money; // KDV dahil brüt
  refundedMinor: number;
  provider: string;
  providerSessionId?: string | null;
  providerPaymentId?: string | null;
  creatorId?: ObjectId | null;
  item: {
    type: "credit_pack" | "plan" | "content" | "custom_request" | "tip";
    refId?: ObjectId | null;
    packKey?: string | null;
    credits?: number | null;
    interval?: "month" | "year" | null;
    label: string;
  };
  idempotencyKey: string;
  history: StatusEvent[];
  failureReason?: string | null;
  succeededAt?: Date | null;
  isTest: boolean; // mock sağlayıcı
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: TRANSACTION_KINDS, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, default: "created" },
    amount: { type: MoneySchema, required: true },
    refundedMinor: { type: Number, default: 0, validate: intValidator },
    provider: { type: String, required: true },
    providerSessionId: { type: String, default: null },
    providerPaymentId: { type: String, default: null },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    item: {
      type: { type: String, enum: ["credit_pack", "plan", "content", "custom_request", "tip"], required: true },
      refId: { type: Schema.Types.ObjectId, default: null },
      packKey: { type: String, default: null },
      credits: { type: Number, default: null },
      interval: { type: String, enum: ["month", "year", null], default: null },
      label: { type: String, required: true, maxlength: 200 },
    },
    idempotencyKey: { type: String, required: true },
    history: { type: [StatusEventSchema], default: [] },
    failureReason: { type: String, default: null },
    succeededAt: { type: Date, default: null },
    isTest: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, optimisticConcurrency: true },
);
PaymentTransactionSchema.index({ idempotencyKey: 1 }, { unique: true });
PaymentTransactionSchema.index({ provider: 1, providerSessionId: 1 }, { unique: true, partialFilterExpression: { providerSessionId: { $type: "string" } } });
PaymentTransactionSchema.index({ userId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ creatorId: 1, status: 1, createdAt: -1 });
PaymentTransactionSchema.index({ status: 1, createdAt: -1 });
export const PaymentTransaction = defineModel<IPaymentTransaction>("PaymentTransaction", PaymentTransactionSchema, "paymentTransactions");

/** Webhook tekilleştirme: aynı olay iki kez işlenmez. */
export interface IPaymentWebhookEvent {
  _id: ObjectId;
  provider: string;
  eventId: string;
  type: string;
  transactionId?: ObjectId | null;
  payloadHash: string;
  status: "received" | "processed" | "ignored" | "failed";
  error?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true },
    type: { type: String, required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: "PaymentTransaction", default: null },
    payloadHash: { type: String, required: true },
    status: { type: String, enum: ["received", "processed", "ignored", "failed"], default: "received" },
    error: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  baseOptions,
);
PaymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
export const PaymentWebhookEvent = defineModel<IPaymentWebhookEvent>("PaymentWebhookEvent", PaymentWebhookEventSchema, "paymentWebhookEvents");

export interface IRefund {
  _id: ObjectId;
  transactionId: ObjectId;
  userId: ObjectId;
  amount: Money;
  reason: string;
  kind: "refund" | "chargeback";
  status: "requested" | "approved" | "processing" | "succeeded" | "rejected" | "failed";
  requestedBy: ObjectId;
  approvedBy?: ObjectId | null;
  providerRefundId?: string | null;
  history: StatusEvent[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const RefundSchema = new Schema<IRefund>(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: "PaymentTransaction", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: MoneySchema, required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    kind: { type: String, enum: ["refund", "chargeback"], default: "refund" },
    status: { type: String, enum: ["requested", "approved", "processing", "succeeded", "rejected", "failed"], default: "requested" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    providerRefundId: { type: String, default: null },
    history: { type: [StatusEventSchema], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
RefundSchema.index({ transactionId: 1, createdAt: -1 });
RefundSchema.index({ status: 1, createdAt: -1 });
export const Refund = defineModel<IRefund>("Refund", RefundSchema, "refunds");

export const EARNING_SOURCES = ["subscription", "content", "tip", "gift", "chat", "voice", "video", "custom_request"] as const;

/** Değişmez hak ediş defteri: brüt → kesintiler → net → creator payı. İade = negatif ters kayıt. */
export interface ICreatorEarning {
  _id: ObjectId;
  creatorId: ObjectId;
  sourceType: (typeof EARNING_SOURCES)[number];
  transactionId?: ObjectId | null;
  ledgerEntryId?: ObjectId | null;
  grossMinor: number;
  processingFeeMinor: number;
  taxMinor: number;
  netMinor: number;
  platformFeeMinor: number;
  creatorShareMinor: number;
  shareBps: number;
  currency: string;
  availableAt: Date;
  reversesEarningId?: ObjectId | null;
  payoutRequestId?: ObjectId | null;
  description: string;
  idempotencyKey: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const CreatorEarningSchema = new Schema<ICreatorEarning>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    sourceType: { type: String, enum: EARNING_SOURCES, required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: "PaymentTransaction", default: null },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: "WalletLedgerEntry", default: null },
    grossMinor: { type: Number, required: true, validate: intValidator },
    processingFeeMinor: { type: Number, required: true, validate: intValidator },
    taxMinor: { type: Number, required: true, validate: intValidator },
    netMinor: { type: Number, required: true, validate: intValidator },
    platformFeeMinor: { type: Number, required: true, validate: intValidator },
    creatorShareMinor: { type: Number, required: true, validate: intValidator },
    shareBps: { type: Number, required: true },
    currency: { type: String, default: "TRY" },
    availableAt: { type: Date, required: true },
    reversesEarningId: { type: Schema.Types.ObjectId, ref: "CreatorEarning", default: null },
    payoutRequestId: { type: Schema.Types.ObjectId, ref: "PayoutRequest", default: null },
    description: { type: String, required: true, maxlength: 300 },
    idempotencyKey: { type: String, required: true },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
CreatorEarningSchema.index({ idempotencyKey: 1 }, { unique: true });
CreatorEarningSchema.index({ creatorId: 1, createdAt: -1 });
CreatorEarningSchema.index({ creatorId: 1, sourceType: 1, createdAt: -1 });
immutable(CreatorEarningSchema, "Creator hak ediş defteri");
export const CreatorEarning = defineModel<ICreatorEarning>("CreatorEarning", CreatorEarningSchema, "creatorEarnings");

export interface IPayoutAccount {
  _id: ObjectId;
  creatorId: ObjectId;
  type: "iban";
  holderName: string;
  ibanMasked: string;
  ibanEncrypted: string; // AES-256-GCM, DATA_ENCRYPTION_KEY
  bankName?: string | null;
  status: "unverified" | "verified" | "rejected";
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const PayoutAccountSchema = new Schema<IPayoutAccount>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    type: { type: String, enum: ["iban"], default: "iban" },
    holderName: { type: String, required: true, maxlength: 120 },
    ibanMasked: { type: String, required: true },
    ibanEncrypted: { type: String, required: true, select: false },
    bankName: { type: String, default: null },
    status: { type: String, enum: ["unverified", "verified", "rejected"], default: "unverified" },
    isDefault: { type: Boolean, default: true },
  },
  baseOptions,
);
PayoutAccountSchema.index({ creatorId: 1 });
export const PayoutAccount = defineModel<IPayoutAccount>("PayoutAccount", PayoutAccountSchema, "payoutAccounts");

export const PAYOUT_STATUSES = ["requested", "approved", "processing", "paid", "rejected", "failed", "canceled"] as const;
export interface IPayoutRequest {
  _id: ObjectId;
  creatorId: ObjectId;
  amount: Money;
  payoutAccountId: ObjectId;
  status: (typeof PAYOUT_STATUSES)[number];
  history: StatusEvent[];
  reviewedBy?: ObjectId | null;
  providerRef?: string | null;
  note?: string | null;
  idempotencyKey: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const PayoutRequestSchema = new Schema<IPayoutRequest>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    amount: { type: MoneySchema, required: true },
    payoutAccountId: { type: Schema.Types.ObjectId, ref: "PayoutAccount", required: true },
    status: { type: String, enum: PAYOUT_STATUSES, default: "requested" },
    history: { type: [StatusEventSchema], default: [] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    providerRef: { type: String, default: null },
    note: { type: String, default: null },
    idempotencyKey: { type: String, required: true },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, optimisticConcurrency: true },
);
PayoutRequestSchema.index({ idempotencyKey: 1 }, { unique: true });
PayoutRequestSchema.index({ creatorId: 1, createdAt: -1 });
PayoutRequestSchema.index({ status: 1, createdAt: 1 });
export const PayoutRequest = defineModel<IPayoutRequest>("PayoutRequest", PayoutRequestSchema, "payoutRequests");

export interface IGiftCatalogItem {
  _id: ObjectId;
  key: string;
  name: string;
  icon: string;
  credits: number;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const GiftCatalogSchema = new Schema<IGiftCatalogItem>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true, maxlength: 40 },
    icon: { type: String, default: "gift" },
    credits: { type: Number, required: true, min: 1, validate: intValidator },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  baseOptions,
);
GiftCatalogSchema.index({ key: 1 }, { unique: true });
export const GiftCatalogItem = defineModel<IGiftCatalogItem>("GiftCatalogItem", GiftCatalogSchema, "giftCatalog");

/** Hediye ve bahşiş tek koleksiyonda: kind ile ayrılır (spec: gifts + tips). */
export interface IGift {
  _id: ObjectId;
  kind: "gift" | "tip";
  senderId: ObjectId;
  creatorId: ObjectId;
  giftKey?: string | null;
  credits: number;
  message?: string | null;
  isAnonymous: boolean;
  ledgerEntryId: ObjectId;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const GiftSchema = new Schema<IGift>(
  {
    kind: { type: String, enum: ["gift", "tip"], required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    giftKey: { type: String, default: null },
    credits: { type: Number, required: true, min: 1, validate: intValidator },
    message: { type: String, default: null, maxlength: 300 },
    isAnonymous: { type: Boolean, default: false },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: "WalletLedgerEntry", required: true },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
GiftSchema.index({ senderId: 1, createdAt: -1 });
GiftSchema.index({ creatorId: 1, createdAt: -1 });
export const Gift = defineModel<IGift>("Gift", GiftSchema, "gifts");

export const CUSTOM_REQUEST_STATUSES = [
  "draft",
  "pending",
  "in_review",
  "approved",
  "processing",
  "completed",
  "rejected",
  "canceled",
] as const;
export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];

export interface ICustomRequest {
  _id: ObjectId;
  fanId: ObjectId;
  creatorId: ObjectId;
  type: "photo" | "video" | "audio" | "message" | "other";
  title: string;
  details: string;
  priceCredits: number;
  dueAt?: Date | null;
  status: CustomRequestStatus;
  history: StatusEvent[];
  holdEntryId?: ObjectId | null; // kredi bloke (harcama) kaydı
  refundEntryId?: ObjectId | null;
  deliverableAssetIds: ObjectId[];
  creatorNote?: string | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const CustomRequestSchema = new Schema<ICustomRequest>(
  {
    fanId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", required: true },
    type: { type: String, enum: ["photo", "video", "audio", "message", "other"], required: true },
    title: { type: String, required: true, maxlength: 120 },
    details: { type: String, required: true, maxlength: 3000 },
    priceCredits: { type: Number, required: true, min: 0, validate: intValidator },
    dueAt: { type: Date, default: null },
    status: { type: String, enum: CUSTOM_REQUEST_STATUSES, default: "draft" },
    history: { type: [StatusEventSchema], default: [] },
    holdEntryId: { type: Schema.Types.ObjectId, ref: "WalletLedgerEntry", default: null },
    refundEntryId: { type: Schema.Types.ObjectId, ref: "WalletLedgerEntry", default: null },
    deliverableAssetIds: { type: [Schema.Types.ObjectId], ref: "MediaAsset", default: [] },
    creatorNote: { type: String, default: null, maxlength: 2000 },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, optimisticConcurrency: true },
);
CustomRequestSchema.index({ fanId: 1, createdAt: -1 });
CustomRequestSchema.index({ creatorId: 1, status: 1, createdAt: -1 });
export const CustomRequest = defineModel<ICustomRequest>("CustomRequest", CustomRequestSchema, "customRequests");
