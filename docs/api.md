# API ve Servis Katmanı

Uygulama iki tür sunucu ucu kullanır (bkz. D-18):
- **Route Handlers (`/api/*`)** — akış, webhook, medya, cron ve kimlik doğrulama.
- **Server Actions (`src/features/**/actions.ts`)** — form/mutasyon işlemleri. Next.js'in origin denetimi CSRF'e karşı korur; hepsi `ActionResult` döndürür (`{ ok: true, data, message } | { ok: false, error, code, fieldErrors }`).

Tüm iş kuralları ve yetki kontrolleri `src/services/**` içindedir; uçlar yalnız oturumu doğrular, girdiyi Zod ile ayrıştırır ve servisi çağırır.

## Route Handlers

| Yöntem | Yol | Yetki | Açıklama |
|---|---|---|---|
| GET/POST | `/api/auth/*` | — | Better Auth: `sign-up/email`, `sign-in/email`, `sign-in/social`, `sign-out`, `get-session`, `send-verification-email`, `verify-email`, `request-password-reset`, `reset-password`, `change-password`, `list-sessions`, `revoke-session`, `two-factor/*` (enable, verify-totp, verify-backup-code, disable, generate-backup-codes) |
| POST | `/api/chat/[conversationId]/messages` | oturum + sohbet sahibi; same-origin | Gövde `{ text, idempotencyKey }`. Yanıt **NDJSON akışı**: `{type:"meta", conversationId, userMessageId, charged, balance, billing}` → `{type:"delta", text}`… → `{type:"done", aiMessageId, isMock, safetyAction}` veya `{type:"error", message, code}`. Hatalar: 402 yetersiz kredi, 409 tekrar anahtar, 429 hız/günlük sınır, 503 AI yapılandırılmamış/bakım/bütçe |
| POST | `/api/calls/start` | oturum; same-origin | `{ username, kind: "voice"\|"video" }` → `{ sessionId, url, token }` (LiveKit). RTC yoksa 503 + eksik değişkenler |
| POST | `/api/calls/tick` | oturum; same-origin | `{ sessionId }` → dakika faturalaması (idempotent, dakika indeksi) |
| POST | `/api/calls/end` | oturum; same-origin | `{ sessionId }` |
| POST | `/api/media/upload-url` | oturum; same-origin; 30/10 dk | `{ purpose, mime, sizeBytes, fileName? }` → `{ assetId, upload: { method, url, headers } }` (S3 imzalı PUT veya yerel uç) |
| PUT | `/api/media/upload/[assetId]` | sahibi; yalnız `STORAGE_PROVIDER=local` | Yerel geliştirme yüklemesi |
| POST | `/api/media/[assetId]/complete` | sahibi | Boyut + magic-bytes doğrulaması → `{ assetId, status, kind, url }` |
| GET | `/api/media/[assetId]` | herkese açık varlık / sahibi / içerik erişimi (`decideContentAccess`) / teslimat alıcısı / admin | S3: 5 dk imzalı URL'ye 302; yerel: akış |
| POST | `/api/webhooks/payments/[provider]` | imza (`x-mock-signature` / `stripe-signature`) | Olay tekilleştirme, tutar/para birimi denetimi, hak tanımı; 400 geçersiz imza |
| GET | `/api/cron/jobs` | `Authorization: Bearer <CRON_SECRET>` | Zamanlanmış içerik yayını, abonelik süre sonu, iş kuyruğu (bilgi tabanı indeksleme) |

## Server Actions (alan bazında)

| Modül | Eylemler | Yetki |
|---|---|---|
| `features/public/actions.ts` | `subscribeNewsletter` | herkese açık, hız sınırlı |
| `features/support/actions.ts` | `submitContactAction`, `submitSafetyReportAction`, `submitCopyrightAction`, `saveCookieConsentAction`, `voteHelpfulAction` | herkese açık (honeypot + hız sınırı) |
| `features/social/actions.ts` | `toggleFollowAction`, `toggleFavoriteAction`, `reportAction` | oturum |
| `features/auth/actions.ts` | `postLoginRedirect`, `saveFanStepAction`, `completeFanOnboardingAction`, `skipFanOnboardingAction`, `submitBirthDateAction` | oturum |
| `features/auth/creator-actions.ts` | `startCreatorOnboardingAction`, `saveCreatorConnectAction`, `saveCreatorVerifyAction`, `saveCreatorTwinAction`, `saveCreatorCustomizeAction`, `submitCreatorApplicationAction` | oturum |
| `features/fan/actions.ts` | `startCheckoutAction`, `completeMockPaymentAction` (yalnız test sağlayıcı), `cancelSubscriptionAction`, `resumeSubscriptionAction`, `createRequestAction`, `fanRequestAction`, `sendGiftAction`, `markNotificationsReadAction`, `deleteNotificationAction`, `deleteConversationAction`, `newConversationAction`, `chatStatusAction`, `updatePreferencesAction`, `updateMemoryAction`, `deleteMemoryAction`, `deleteCreatorMemoriesAction`, `deleteAllMemoriesAction`, `updateProfileNameAction`, `setAvatarAction`, `removeAvatarAction`, `accountRequestAction` | oturum + kaynak sahipliği |
| `features/studio/*-actions.ts` | İkiz: `submitTwinReviewAction`, `publishTwinAction`, `reopenTwinAction`, `pauseTwinAction`, `grantConsentAction`, `revokeConsentAction`, `savePersonaAction`, `saveBoundariesAction`, `saveVoiceSettingsAction`, `setLikenessAction`, `addVoiceSampleAction`, `removeVoiceSampleAction`, `savePricingAction`, `setAllowCustomRequestsAction`, `resetTestChatAction`, `fetchTestMessagesAction` · Bilgi: `addKnowledgeAction`, `setKnowledgeApprovedAction`, `reindexKnowledgeAction`, `deleteKnowledgeAction` · İçerik: `saveContentAction`, `setContentStatusAction` · İş: `savePlanAction`, `setPlanStatusAction`, `requestActionAction`, `savePayoutAccountAction`, `requestPayoutAction`, `updateProfileAction`, `saveNotificationPrefsAction` | `creator` rolü + kendi profili |
| `features/admin/*-actions.ts` | Creator: `decideApplicationAction` (creators.verify), `setCreatorSuspendedAction`/`setCreatorFeaturedAction` (creators.manage) · Kullanıcı: `setUserStatusAction` (users.manage), `setAdminRoleAction` (yalnız super_admin) · İkiz: `reviewTwinVersionAction` (twins.review), `setTwinStatusAction` (twins.manage) · Moderasyon: `decideCaseAction` (moderation.act), `readSensitiveConversationAction` (conversations.read_sensitive) · Rapor: `updateReportStatusAction`, `decideAppealAction`, `replyTicketAction`, `setTicketStatusAction` · Finans: `refundTransactionAction` (finance.refund), `updatePayoutAction`, `verifyPayoutAccountAction` (payouts.manage) · AI: `retryJobAction`, `updateAiSettingsAction` (ai_ops.manage) · CMS: `updateHomeSectionAction`, `saveCategoryAction`, `deleteCategoryAction`, `saveCampaignAction`, `deleteCampaignAction`, `saveCmsPageAction`, `saveHelpArticleAction`, `deleteHelpArticleAction` · Ayarlar: `updateSettingsAction` (settings.manage) | `assertAdmin(izin)` + gerekçe + denetim kaydı |

## Servis katmanı
Ortak servislerin listesi ve imzaları: [`docs/dev-conventions.md`](dev-conventions.md#hazır-servisler-yeniden-yazma-kullan). Grup bazlı sorgu servisleri: `src/services/{public,support,auth,fan,studio,admin}/`.
