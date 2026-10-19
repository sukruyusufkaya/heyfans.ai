import { Schema } from "mongoose";
import { baseOptions, defineModel, StatusEventSchema, type ObjectId, type StatusEvent } from "./_shared";

export interface ICmsPage {
  _id: ObjectId;
  slug: string; // ör. "privacy", "terms", "about"
  locale: "tr" | "en";
  kind: "legal" | "marketing" | "help";
  title: string;
  summary?: string;
  sections: { id: string; heading: string; body: string }[];
  status: "draft" | "published";
  legalReview: "not_required" | "draft_requires_legal_review" | "approved";
  version: number;
  effectiveDate?: Date | null;
  updatedBy?: ObjectId | null;
  publishedAt?: Date | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const CmsPageSchema = new Schema<ICmsPage>(
  {
    slug: { type: String, required: true, match: /^[a-z0-9-]{2,60}$/ },
    locale: { type: String, enum: ["tr", "en"], default: "tr" },
    kind: { type: String, enum: ["legal", "marketing", "help"], required: true },
    title: { type: String, required: true, maxlength: 160 },
    summary: { type: String, maxlength: 600 },
    sections: {
      type: [new Schema({ id: String, heading: { type: String, maxlength: 200 }, body: { type: String, maxlength: 20000 } }, { _id: false })],
      default: [],
    },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    legalReview: { type: String, enum: ["not_required", "draft_requires_legal_review", "approved"], default: "not_required" },
    version: { type: Number, default: 1 },
    effectiveDate: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    publishedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
CmsPageSchema.index({ slug: 1, locale: 1 }, { unique: true });
export const CmsPage = defineModel<ICmsPage>("CmsPage", CmsPageSchema, "cmsPages");

export const HOMEPAGE_SECTION_TYPES = ["hero", "featured_creators", "trending_categories", "announcement", "banner", "stats", "cta"] as const;
export interface IHomepageSection {
  _id: ObjectId;
  key: string;
  page: "home" | "explore" | "trending" | "categories" | "pricing" | "about" | "how-it-works" | "for-creators";
  type: (typeof HOMEPAGE_SECTION_TYPES)[number];
  title?: string;
  subtitle?: string;
  config: Record<string, unknown>;
  order: number;
  isActive: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  updatedBy?: ObjectId | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const HomepageSectionSchema = new Schema<IHomepageSection>(
  {
    key: { type: String, required: true },
    page: {
      type: String,
      enum: ["home", "explore", "trending", "categories", "pricing", "about", "how-it-works", "for-creators"],
      default: "home",
    },
    type: { type: String, enum: HOMEPAGE_SECTION_TYPES, required: true },
    title: { type: String, maxlength: 200 },
    subtitle: { type: String, maxlength: 600 },
    config: { type: Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, minimize: false },
);
HomepageSectionSchema.index({ page: 1, key: 1 }, { unique: true });
HomepageSectionSchema.index({ page: 1, isActive: 1, order: 1 });
export const HomepageSection = defineModel<IHomepageSection>("HomepageSection", HomepageSectionSchema, "homepageSections");

export interface ICampaign {
  _id: ObjectId;
  name: string;
  type: "banner" | "credit_bonus" | "discount" | "announcement";
  status: "draft" | "scheduled" | "active" | "ended" | "archived";
  startsAt?: Date | null;
  endsAt?: Date | null;
  audience: "all" | "fans" | "creators" | "new_users";
  config: { headline?: string; body?: string; ctaLabel?: string; ctaUrl?: string; bonusPercent?: number; discountPercent?: number; imageUrl?: string };
  metrics: { impressions: number; clicks: number; conversions: number };
  createdBy?: ObjectId | null;
  history: StatusEvent[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true, maxlength: 120 },
    type: { type: String, enum: ["banner", "credit_bonus", "discount", "announcement"], required: true },
    status: { type: String, enum: ["draft", "scheduled", "active", "ended", "archived"], default: "draft" },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    audience: { type: String, enum: ["all", "fans", "creators", "new_users"], default: "all" },
    config: {
      headline: String,
      body: String,
      ctaLabel: String,
      ctaUrl: String,
      bonusPercent: { type: Number, min: 0, max: 100 },
      discountPercent: { type: Number, min: 0, max: 90 },
      imageUrl: String,
    },
    metrics: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    history: { type: [StatusEventSchema], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
CampaignSchema.index({ status: 1, startsAt: 1 });
export const Campaign = defineModel<ICampaign>("Campaign", CampaignSchema, "campaigns");

/** Tekil platform ayarı belgesi (key="global"). Finansal kurallar ve özellik bayrakları buradan okunur. */
export interface IPlatformSettings {
  _id: ObjectId;
  key: "global";
  revenue: {
    creatorShareBps: number; // 7000 = %70
    basis: "net_after_fees_and_tax";
    processingFeeBps: number; // ödeme kuruluşu yüzdesi
    processingFeeFixedMinor: number;
    vatBps: number; // fiyatlar KDV dahil kabul edilir
    deductAiCostFromCreator: boolean;
    holdDays: number; // hak edişin kullanılabilir olma süresi
    minPayoutMinor: number;
  };
  credits: {
    valueMinor: number; // 1 kredinin hak ediş hesabındaki değeri (kuruş)
    packs: { key: string; credits: number; priceMinor: number; bonusCredits: number; isPopular: boolean }[];
    signupBonus: number;
  };
  chat: { defaultMessageCredits: number; maxMessageCredits: number; freeMessagesPerDay: number; maxInputChars: number };
  features: {
    adultContent: boolean;
    voiceCalls: boolean;
    videoCalls: boolean;
    likenessGeneration: boolean;
    creatorSignup: boolean;
    payouts: boolean;
    aiMemory: boolean;
  };
  security: {
    adminMfaRequired: boolean;
    sessionMaxAgeDays: number;
    maxLoginAttempts: number;
    sensitiveAccessRequiresReason: boolean;
  };
  ai: { defaultModel?: string | null; monthlyBudgetMicroUsd: number; maxOutputTokens: number; temperature: number };
  maintenance: { enabled: boolean; message?: string | null };
  updatedBy?: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    key: { type: String, enum: ["global"], default: "global" },
    revenue: {
      creatorShareBps: { type: Number, min: 0, max: 10000, default: 7000 },
      basis: { type: String, enum: ["net_after_fees_and_tax"], default: "net_after_fees_and_tax" },
      processingFeeBps: { type: Number, min: 0, max: 2000, default: 349 },
      processingFeeFixedMinor: { type: Number, min: 0, default: 25 },
      vatBps: { type: Number, min: 0, max: 5000, default: 2000 },
      deductAiCostFromCreator: { type: Boolean, default: false },
      holdDays: { type: Number, min: 0, max: 90, default: 7 },
      minPayoutMinor: { type: Number, min: 0, default: 50000 },
    },
    credits: {
      valueMinor: { type: Number, min: 1, default: 40 },
      packs: {
        type: [
          new Schema(
            {
              key: String,
              credits: Number,
              priceMinor: Number,
              bonusCredits: { type: Number, default: 0 },
              isPopular: { type: Boolean, default: false },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
      signupBonus: { type: Number, default: 10 },
    },
    chat: {
      defaultMessageCredits: { type: Number, default: 2 },
      maxMessageCredits: { type: Number, default: 20 },
      freeMessagesPerDay: { type: Number, default: 3 },
      maxInputChars: { type: Number, default: 2000 },
    },
    features: {
      adultContent: { type: Boolean, default: false },
      voiceCalls: { type: Boolean, default: true },
      videoCalls: { type: Boolean, default: true },
      likenessGeneration: { type: Boolean, default: false },
      creatorSignup: { type: Boolean, default: true },
      payouts: { type: Boolean, default: false },
      aiMemory: { type: Boolean, default: true },
    },
    security: {
      adminMfaRequired: { type: Boolean, default: true },
      sessionMaxAgeDays: { type: Number, default: 30 },
      maxLoginAttempts: { type: Number, default: 10 },
      sensitiveAccessRequiresReason: { type: Boolean, default: true },
    },
    ai: {
      defaultModel: { type: String, default: null },
      monthlyBudgetMicroUsd: { type: Number, default: 0 },
      maxOutputTokens: { type: Number, default: 400 },
      temperature: { type: Number, default: 0.8 },
    },
    maintenance: { enabled: { type: Boolean, default: false }, message: { type: String, default: null } },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { ...baseOptions, minimize: false },
);
PlatformSettingsSchema.index({ key: 1 }, { unique: true });
export const PlatformSettings = defineModel<IPlatformSettings>("PlatformSettings", PlatformSettingsSchema, "platformSettings");

export interface ISupportTicket {
  _id: ObjectId;
  ticketNo: string;
  userId?: ObjectId | null;
  name: string;
  email: string;
  category: "account" | "payments" | "ai_twin" | "creator" | "safety" | "technical" | "legal" | "other";
  subject: string;
  message: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo?: ObjectId | null;
  replies: { authorId?: ObjectId | null; authorType: "user" | "agent"; body: string; at: Date }[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNo: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, maxlength: 200 },
    category: {
      type: String,
      enum: ["account", "payments", "ai_twin", "creator", "safety", "technical", "legal", "other"],
      default: "other",
    },
    subject: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: ["open", "pending", "resolved", "closed"], default: "open" },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    replies: {
      type: [
        new Schema(
          {
            authorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
            authorType: { type: String, enum: ["user", "agent"] },
            body: { type: String, maxlength: 5000 },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    isDemo: { type: Boolean, default: false },
  },
  baseOptions,
);
SupportTicketSchema.index({ ticketNo: 1 }, { unique: true });
SupportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
SupportTicketSchema.index({ userId: 1, createdAt: -1 });
export const SupportTicket = defineModel<ISupportTicket>("SupportTicket", SupportTicketSchema, "supportTickets");

export interface IHelpArticle {
  _id: ObjectId;
  slug: string;
  category: "account" | "ai_twins" | "subscriptions" | "payments" | "safety" | "technical" | "creators";
  title: string;
  summary: string;
  body: string;
  tags: string[];
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
const HelpArticleSchema = new Schema<IHelpArticle>(
  {
    slug: { type: String, required: true, match: /^[a-z0-9-]{2,80}$/ },
    category: {
      type: String,
      enum: ["account", "ai_twins", "subscriptions", "payments", "safety", "technical", "creators"],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    summary: { type: String, required: true, maxlength: 400 },
    body: { type: String, required: true, maxlength: 20000 },
    tags: { type: [String], default: [] },
    views: { type: Number, default: 0 },
    helpfulYes: { type: Number, default: 0 },
    helpfulNo: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  baseOptions,
);
HelpArticleSchema.index({ slug: 1 }, { unique: true });
HelpArticleSchema.index({ category: 1, order: 1 });
HelpArticleSchema.index({ title: "text", summary: "text", body: "text", tags: "text" }, { default_language: "none", weights: { title: 10, tags: 5, summary: 3, body: 1 } });
export const HelpArticle = defineModel<IHelpArticle>("HelpArticle", HelpArticleSchema, "helpArticles");

export interface ICookieConsent {
  _id: ObjectId;
  anonId: string;
  userId?: ObjectId | null;
  choices: { necessary: true; preferences: boolean; analytics: boolean; marketing: boolean };
  policyVersion: string;
  action: "accept_all" | "reject_optional" | "custom" | "withdraw";
  createdAt: Date;
  updatedAt: Date;
}
const CookieConsentSchema = new Schema<ICookieConsent>(
  {
    anonId: { type: String, required: true, maxlength: 64 },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    choices: {
      necessary: { type: Boolean, default: true },
      preferences: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
    },
    policyVersion: { type: String, required: true },
    action: { type: String, enum: ["accept_all", "reject_optional", "custom", "withdraw"], required: true },
  },
  baseOptions,
);
CookieConsentSchema.index({ anonId: 1, createdAt: -1 });
export const CookieConsent = defineModel<ICookieConsent>("CookieConsent", CookieConsentSchema, "cookieConsents");

export const ANALYTICS_EVENT_TYPES = [
  "profile_view",
  "content_view",
  "follow",
  "unfollow",
  "favorite",
  "chat_message",
  "chat_started",
  "subscription_started",
  "content_purchase",
  "credit_purchase",
  "search",
  "page_view",
  "signup",
] as const;
export interface IAnalyticsEvent {
  _id: ObjectId;
  type: (typeof ANALYTICS_EVENT_TYPES)[number];
  userId?: ObjectId | null;
  anonId?: string | null;
  creatorId?: ObjectId | null;
  contentId?: ObjectId | null;
  props: Record<string, unknown>;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, enum: ANALYTICS_EVENT_TYPES, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    anonId: { type: String, default: null },
    creatorId: { type: Schema.Types.ObjectId, ref: "CreatorProfile", default: null },
    contentId: { type: Schema.Types.ObjectId, ref: "ContentItem", default: null },
    props: { type: Schema.Types.Mixed, default: {} },
    isDemo: { type: Boolean, default: false },
  },
  { ...baseOptions, minimize: false },
);
AnalyticsEventSchema.index({ type: 1, createdAt: -1 });
AnalyticsEventSchema.index({ creatorId: 1, type: 1, createdAt: -1 });
AnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });
export const AnalyticsEvent = defineModel<IAnalyticsEvent>("AnalyticsEvent", AnalyticsEventSchema, "analyticsEvents");

/** Serverless uyumlu sabit pencereli hız sınırı sayaçları (TTL ile kendiliğinden silinir). */
export interface IRateLimit {
  _id: string; // `${bucket}:${key}:${windowStart}`
  count: number;
  expiresAt: Date;
}
const RateLimitSchema = new Schema<IRateLimit>(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit = defineModel<IRateLimit>("RateLimit", RateLimitSchema, "rateLimits");

/** Yalnız geliştirme/demo: gönderilen e-postaların kopyası (`EMAIL_PROVIDER=outbox`). */
export interface IDevOutbox {
  _id: ObjectId;
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: string;
  createdAt: Date;
  updatedAt: Date;
}
const DevOutboxSchema = new Schema<IDevOutbox>(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String, default: "" },
    text: { type: String, default: "" },
    kind: { type: String, default: "generic" },
  },
  baseOptions,
);
DevOutboxSchema.index({ to: 1, createdAt: -1 });
DevOutboxSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
export const DevOutbox = defineModel<IDevOutbox>("DevOutbox", DevOutboxSchema, "devOutbox");

export type { StatusEvent };

/** Bülten aboneliği (çift onaysız; e-posta doğrulaması ve abonelikten çıkma bağlantısı ile). */
export interface INewsletterSubscription {
  _id: ObjectId;
  email: string;
  status: "subscribed" | "unsubscribed";
  source: string;
  unsubscribeToken: string;
  createdAt: Date;
  updatedAt: Date;
}
const NewsletterSubscriptionSchema = new Schema<INewsletterSubscription>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 200 },
    status: { type: String, enum: ["subscribed", "unsubscribed"], default: "subscribed" },
    source: { type: String, default: "footer", maxlength: 40 },
    unsubscribeToken: { type: String, required: true },
  },
  baseOptions,
);
NewsletterSubscriptionSchema.index({ email: 1 }, { unique: true });
export const NewsletterSubscription = defineModel<INewsletterSubscription>("NewsletterSubscription", NewsletterSubscriptionSchema, "newsletterSubscriptions");
