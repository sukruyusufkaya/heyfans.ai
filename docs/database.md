# Veritabanı Şeması

> Bu dosya `scripts/docs/gen-db-docs.ts` ile Mongoose şemalarından üretilir. Elle düzenlemeyin.

Genel kurallar: tüm belgelerde `createdAt/updatedAt`; para alanları `{ amountMinor (kuruş, tamsayı), currency }`; `isDemo` seed verisini işaretler; `walletLedger`, `creatorEarnings` ve `auditLogs` **değişmezdir** (güncelleme/silme şema kancasıyla engellenir, düzeltme ters kayıtla); durum alanlarının geçişleri `src/lib/state-machines.ts` ve servislerde denetlenir; yetki gereksinimleri `docs/api.md` ve servis katmanında.

## Kimlik ve hesap

### `users` (User)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `name` | String | ✓ |  |
| `email` | String | ✓ |  |
| `emailVerified` | Boolean |  |  |
| `image` | String |  |  |
| `username` | String |  |  |
| `roles` | [Mixed] |  | `fan`, `creator`, `admin` |
| `adminRole` | String |  | `super_admin`, `operations_admin`, `creator_manager`, `moderation_specialist`, `finance_manager`, `ai_operations_manager`, `support_agent` |
| `status` | String |  | `active`, `suspended`, `banned`, `deleted` |
| `statusReason` | String |  |  |
| `signupIntent` | String |  | `fan`, `creator` |
| `twoFactorEnabled` | Boolean |  |  |
| `birthDate` | Date |  |  |
| `lastSeenAt` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"email":1}` (tekil)
- `{"username":1}` (tekil, kısmi)
- `{"roles":1,"status":1}`
- `{"createdAt":-1}`

### `userPreferences` (UserPreferences)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `interests` | [Mixed] |  |  |
| `vibes` | [Mixed] |  |  |
| `recommendationsEnabled` | Boolean |  |  |
| `personalizationConsent` | Boolean |  |  |
| `aiMemoryEnabled` | Boolean |  |  |
| `marketingConsent` | Boolean |  |  |
| `locale` | String |  | `tr`, `en` |
| `notifications.email` | Boolean |  |  |
| `notifications.push` | Boolean |  |  |
| `notifications.newContent` | Boolean |  |  |
| `notifications.messages` | Boolean |  |  |
| `notifications.promotions` | Boolean |  |  |
| `fanOnboarding.step` | Number |  |  |
| `fanOnboarding.completedAt` | Date |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1}` (tekil)

### `ageVerificationRecords` (AgeVerificationRecord)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `method` | String | ✓ | `self_declared`, `provider` |
| `provider` | String |  |  |
| `providerRef` | String |  |  |
| `status` | String |  | `pending`, `verified`, `failed`, `expired` |
| `assuranceLevel` | String |  | `none`, `low`, `high` |
| `over18` | Boolean |  |  |
| `verifiedAt` | Date |  |  |
| `expiresAt` | Date |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1,"createdAt":-1}`

## Creator

### `creatorProfiles` (CreatorProfile)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `username` | String | ✓ |  |
| `displayName` | String | ✓ |  |
| `headline` | String |  |  |
| `bio` | String |  |  |
| `avatarUrl` | String |  |  |
| `coverUrl` | String |  |  |
| `avatarAssetId` | ObjectId → MediaAsset |  |  |
| `coverAssetId` | ObjectId → MediaAsset |  |  |
| `categories` | [Mixed] |  |  |
| `tags` | [Mixed] |  |  |
| `location` | String |  |  |
| `languages` | [Mixed] |  |  |
| `socialLinks` | [Belge] |  |  |
| `socialLinks[].platform` | String | ✓ | `instagram`, `tiktok`, `youtube`, `x`, `website` |
| `socialLinks[].handle` | String | ✓ |  |
| `socialLinks[].url` | String |  |  |
| `socialLinks[].verified` | Boolean |  |  |
| `status` | String |  | `onboarding`, `pending_review`, `approved`, `suspended`, `rejected` |
| `statusHistory` | [Belge] |  |  |
| `statusHistory[].from` | String |  |  |
| `statusHistory[].to` | String | ✓ |  |
| `statusHistory[].by` | ObjectId → User |  |  |
| `statusHistory[].note` | String |  |  |
| `statusHistory[].at` | Date |  |  |
| `verification.identity` | String |  | `none`, `pending`, `verified`, `rejected` |
| `verification.social` | String |  | `none`, `pending`, `verified`, `rejected` |
| `verification.verifiedAt` | Date |  |  |
| `onboarding.step` | Number |  |  |
| `onboarding.completedSteps` | [Mixed] |  |  |
| `onboarding.data` | Mixed |  |  |
| `onboarding.submittedAt` | Date |  |  |
| `stats.followers` | Number |  |  |
| `stats.posts` | Number |  |  |
| `stats.likes` | Number |  |  |
| `stats.conversations` | Number |  |  |
| `stats.subscribers` | Number |  |  |
| `featured.isFeatured` | Boolean |  |  |
| `featured.rank` | Number |  |  |
| `isOnline` | Boolean |  |  |
| `lastActiveAt` | Date |  |  |
| `payoutsEnabled` | Boolean |  |  |
| `defaultCurrency` | String |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1}` (tekil)
- `{"username":1}` (tekil)
- `{"status":1,"categories":1,"stats.followers":-1}`
- `{"status":1,"featured.isFeatured":1,"featured.rank":1}`
- `{"status":1,"createdAt":-1}`
- `{"displayName":"text","username":"text","headline":"text","tags":"text"}`

### `creatorApplications` (CreatorApplication)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `status` | String |  | `draft`, `submitted`, `in_review`, `approved`, `rejected`, `changes_requested` |
| `snapshot` | Mixed |  |  |
| `checklist` | [Belge] |  |  |
| `checklist[].key` | String |  |  |
| `checklist[].label` | String |  |  |
| `checklist[].passed` | Boolean |  |  |
| `reviewerId` | ObjectId → User |  |  |
| `decisionNote` | String |  |  |
| `submittedAt` | Date |  |  |
| `decidedAt` | Date |  |  |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"status":1,"submittedAt":1}`
- `{"creatorId":1,"createdAt":-1}`

### `creatorVerificationRequests` (CreatorVerificationRequest)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `userId` | ObjectId → User | ✓ |  |
| `type` | String | ✓ | `identity`, `social`, `likeness` |
| `status` | String |  | `pending`, `in_review`, `verified`, `rejected`, `expired` |
| `provider` | String |  |  |
| `providerRef` | String |  |  |
| `evidence` | [Belge] |  |  |
| `evidence[].kind` | String |  |  |
| `evidence[].value` | String |  |  |
| `reviewerId` | ObjectId → User |  |  |
| `decisionNote` | String |  |  |
| `decidedAt` | Date |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"creatorId":1,"type":1,"createdAt":-1}`
- `{"status":1,"createdAt":1}`

### `creatorConsents` (CreatorConsent)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `userId` | ObjectId → User | ✓ |  |
| `kind` | String | ✓ | `ai_twin_persona`, `knowledge_use`, `voice_likeness`, `image_likeness`, `video_likeness` |
| `granted` | Boolean | ✓ |  |
| `textVersion` | String | ✓ |  |
| `textHash` | String | ✓ |  |
| `grantedAt` | Date |  |  |
| `revokedAt` | Date |  |  |
| `revokeReason` | String |  |  |
| `ipHash` | String |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"creatorId":1,"kind":1,"revokedAt":1}`

## AI ikizi

### `aiTwins` (AiTwin)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `userId` | ObjectId → User | ✓ |  |
| `status` | String |  | `draft`, `pending_review`, `approved`, `live`, `paused`, `rejected`, `revoked` |
| `statusHistory` | [Belge] |  |  |
| `statusHistory[].from` | String |  |  |
| `statusHistory[].to` | String | ✓ |  |
| `statusHistory[].by` | ObjectId → User |  |  |
| `statusHistory[].note` | String |  |  |
| `statusHistory[].at` | Date |  |  |
| `draft.persona` | Embedded |  |  |
| `draft.boundaries` | Embedded |  |  |
| `draft.voice` | Embedded |  |  |
| `currentVersion` | Number |  |  |
| `liveVersionId` | ObjectId → AiTwinVersion |  |  |
| `pricing.messageCredits` | Number |  |  |
| `pricing.voicePerMinuteCredits` | Number |  |  |
| `pricing.videoPerMinuteCredits` | Number |  |  |
| `pricing.freeMessagesPerDay` | Number |  |  |
| `features.chat` | Boolean |  |  |
| `features.voice` | Boolean |  |  |
| `features.video` | Boolean |  |  |
| `quality.personaScore` | Number |  |  |
| `quality.knowledgeScore` | Number |  |  |
| `quality.safetyScore` | Number |  |  |
| `quality.lastTestAt` | Date |  |  |
| `stats.conversations` | Number |  |  |
| `stats.messages` | Number |  |  |
| `stats.avgRating` | Number |  |  |
| `reviewNote` | String |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"creatorId":1}` (tekil)
- `{"status":1,"updatedAt":-1}`

### `aiTwinVersions` (AiTwinVersion)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `twinId` | ObjectId → AiTwin | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `version` | Number | ✓ |  |
| `snapshot.persona` | Embedded | ✓ |  |
| `snapshot.boundaries` | Embedded | ✓ |  |
| `snapshot.voice` | Embedded | ✓ |  |
| `snapshot.knowledgeSourceIds` | [Mixed] |  |  |
| `status` | String |  | `pending_review`, `approved`, `rejected`, `superseded`, `live` |
| `submittedBy` | ObjectId → User | ✓ |  |
| `reviewedBy` | ObjectId → User |  |  |
| `reviewNote` | String |  |  |
| `changeSummary` | String |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"twinId":1,"version":-1}` (tekil)
- `{"status":1,"createdAt":1}`

### `knowledgeSources` (KnowledgeSource)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `twinId` | ObjectId → AiTwin | ✓ |  |
| `type` | String | ✓ | `text`, `file`, `url`, `faq` |
| `title` | String | ✓ |  |
| `status` | String |  | `uploaded`, `validating`, `extracting`, `chunking`, `embedding`, `indexed`, `failed`, `disabled` |
| `approved` | Boolean |  |  |
| `assetId` | ObjectId → MediaAsset |  |  |
| `url` | String |  |  |
| `text` | String |  |  |
| `mime` | String |  |  |
| `sizeBytes` | Number |  |  |
| `chunkCount` | Number |  |  |
| `tokenCount` | Number |  |  |
| `error` | String |  |  |
| `indexedAt` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"creatorId":1,"createdAt":-1}`
- `{"twinId":1,"status":1}`

### `knowledgeChunks` (KnowledgeChunk)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `twinId` | ObjectId → AiTwin | ✓ |  |
| `sourceId` | ObjectId → KnowledgeSource | ✓ |  |
| `idx` | Number | ✓ |  |
| `text` | String | ✓ |  |
| `tokenCount` | Number |  |  |
| `embedding` | [Mixed] |  |  |
| `embeddingModel` | String |  |  |
| `active` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"creatorId":1,"active":1}`
- `{"sourceId":1,"idx":1}` (tekil)

### `ingestionJobs` (IngestionJob)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `type` | String | ✓ | `knowledge.ingest`, `media.process`, `notifications.fanout`, `earnings.release`, `subscriptions.expire` |
| `payload` | Mixed |  |  |
| `status` | String |  | `queued`, `running`, `succeeded`, `failed` |
| `attempts` | Number |  |  |
| `maxAttempts` | Number |  |  |
| `runAfter` | Date |  |  |
| `lockedUntil` | Date |  |  |
| `lastError` | String |  |  |
| `finishedAt` | Date |  |  |
| `dedupeKey` | String |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"status":1,"runAfter":1}`
- `{"dedupeKey":1}` (tekil, kısmi)

### `aiUsageRecords` (AiUsageRecord)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `kind` | String | ✓ | `chat`, `embedding`, `moderation`, `test_chat`, `evaluation` |
| `provider` | String | ✓ |  |
| `model` | String | ✓ |  |
| `userId` | ObjectId → User |  |  |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `twinId` | ObjectId → AiTwin |  |  |
| `conversationId` | ObjectId → Conversation |  |  |
| `messageId` | ObjectId → Message |  |  |
| `inputTokens` | Number |  |  |
| `outputTokens` | Number |  |  |
| `latencyMs` | Number |  |  |
| `costMicroUsd` | Number |  |  |
| `status` | String |  | `ok`, `error`, `blocked` |
| `errorCode` | String |  |  |
| `isMock` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"createdAt":-1}`
- `{"creatorId":1,"createdAt":-1}`
- `{"provider":1,"model":1,"createdAt":-1}`

## İçerik ve medya

### `categories` (Category)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `slug` | String | ✓ |  |
| `name` | String | ✓ |  |
| `description` | String |  |  |
| `icon` | String |  |  |
| `parentSlug` | String |  |  |
| `order` | Number |  |  |
| `isActive` | Boolean |  |  |
| `coverUrl` | String |  |  |
| `heroTitle` | String |  |  |
| `heroText` | String |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"slug":1}` (tekil)
- `{"parentSlug":1,"order":1}`

### `mediaAssets` (MediaAsset)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `ownerId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `kind` | String | ✓ | `image`, `video`, `audio`, `document` |
| `purpose` | String | ✓ | `avatar`, `cover`, `content`, `content_preview`, `knowledge`, `voice_sample`, `deliverable`, `cms` |
| `mime` | String | ✓ |  |
| `sizeBytes` | Number | ✓ |  |
| `storageKey` | String | ✓ |  |
| `visibility` | String |  | `public`, `private` |
| `status` | String |  | `pending_upload`, `uploaded`, `ready`, `quarantined`, `rejected`, `deleted` |
| `width` | Number |  |  |
| `height` | Number |  |  |
| `durationSec` | Number |  |  |
| `checksumSha256` | String |  |  |
| `scan.status` | String |  | `pending`, `clean`, `flagged`, `skipped` |
| `scan.provider` | String |  |  |
| `scan.checkedAt` | Date |  |  |
| `previewKey` | String |  |  |
| `originalName` | String |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"storageKey":1}` (tekil)
- `{"ownerId":1,"createdAt":-1}`
- `{"creatorId":1,"purpose":1}`

### `contentItems` (ContentItem)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `type` | String | ✓ | `photo`, `video`, `audio`, `text`, `collection` |
| `title` | String | ✓ |  |
| `caption` | String |  |  |
| `status` | String |  | `draft`, `in_review`, `published`, `hidden`, `removed` |
| `statusHistory` | [Belge] |  |  |
| `statusHistory[].from` | String |  |  |
| `statusHistory[].to` | String | ✓ |  |
| `statusHistory[].by` | ObjectId → User |  |  |
| `statusHistory[].note` | String |  |  |
| `statusHistory[].at` | Date |  |  |
| `access` | String |  | `public`, `followers`, `subscribers`, `purchase` |
| `minPlanTier` | String |  | `basic`, `premium`, `vip` |
| `price` | Embedded |  |  |
| `mediaAssetIds` | [Mixed] → MediaAsset |  |  |
| `previewAssetId` | ObjectId → MediaAsset |  |  |
| `coverUrl` | String |  |  |
| `categories` | [Mixed] |  |  |
| `tags` | [Mixed] |  |  |
| `isAiGenerated` | Boolean |  |  |
| `scheduledAt` | Date |  |  |
| `publishedAt` | Date |  |  |
| `stats.likes` | Number |  |  |
| `stats.comments` | Number |  |  |
| `stats.views` | Number |  |  |
| `stats.purchases` | Number |  |  |
| `stats.revenueMinor` | Number |  |  |
| `moderation.state` | String |  | `none`, `pending`, `approved`, `flagged`, `removed` |
| `moderation.caseId` | ObjectId → ModerationCase |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"creatorId":1,"status":1,"publishedAt":-1}`
- `{"status":1,"publishedAt":-1}`
- `{"status":1,"stats.likes":-1}`
- `{"moderation.state":1,"updatedAt":-1}`

### `contentAccessGrants` (ContentAccessGrant)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `contentId` | ObjectId → ContentItem | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `source` | String | ✓ | `purchase`, `gift`, `admin` |
| `transactionId` | ObjectId → PaymentTransaction |  |  |
| `grantedAt` | Date |  |  |
| `revokedAt` | Date |  |  |
| `revokeReason` | String |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1,"contentId":1}` (tekil)
- `{"creatorId":1,"createdAt":-1}`

## Sosyal etkileşim

### `follows` (Follow)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `followerId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `notify` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"followerId":1,"creatorId":1}` (tekil)
- `{"creatorId":1,"createdAt":-1}`

### `favorites` (Favorite)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `targetType` | String | ✓ | `creator`, `content`, `twin` |
| `targetId` | ObjectId | ✓ |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1,"targetType":1,"targetId":1}` (tekil)
- `{"targetType":1,"targetId":1}`

### `conversations` (Conversation)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `twinId` | ObjectId → AiTwin | ✓ |  |
| `kind` | String |  | `fan`, `test` |
| `status` | String |  | `active`, `archived`, `deleted`, `reported`, `blocked` |
| `title` | String |  |  |
| `lastMessageAt` | Date |  |  |
| `lastMessagePreview` | String |  |  |
| `unreadForUser` | Number |  |  |
| `messageCount` | Number |  |  |
| `creditsSpent` | Number |  |  |
| `memoryEnabled` | Boolean |  |  |
| `deletedAt` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1,"kind":1,"status":1,"lastMessageAt":-1}`
- `{"creatorId":1,"kind":1,"lastMessageAt":-1}`

### `messages` (Message)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `conversationId` | ObjectId → Conversation | ✓ |  |
| `userId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `senderType` | String | ✓ | `user`, `ai`, `system` |
| `body` | String |  |  |
| `media` | [Belge] |  |  |
| `media[].assetId` | ObjectId |  |  |
| `media[].kind` | String |  |  |
| `status` | String |  | `pending`, `sent`, `streaming`, `completed`, `failed`, `blocked` |
| `creditsCharged` | Number |  |  |
| `ledgerEntryId` | ObjectId → WalletLedgerEntry |  |  |
| `ai` | Embedded |  |  |
| `safety.inputFlagged` | Boolean |  |  |
| `safety.outputFlagged` | Boolean |  |  |
| `safety.categories` | [Mixed] |  |  |
| `safety.action` | String |  | `none`, `rewritten`, `blocked`, `escalated` |
| `idempotencyKey` | String |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"conversationId":1,"createdAt":1}`
- `{"conversationId":1,"idempotencyKey":1}` (tekil, kısmi)
- `{"creatorId":1,"createdAt":-1}`

### `conversationMemories` (ConversationMemory)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `fact` | String | ✓ |  |
| `category` | String |  | `preference`, `personal`, `context`, `other` |
| `source` | String |  | `auto`, `user` |
| `sourceMessageId` | ObjectId → Message |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1,"creatorId":1,"createdAt":-1}`

### `notifications` (Notification)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `type` | String | ✓ | `message`, `new_content`, `subscription`, `payment`, `gift`, `custom_request`, `moderation`, `system`, `follow`, `payout`, `twin_review`, `creator_review` |
| `title` | String | ✓ |  |
| `body` | String |  |  |
| `link` | String |  |  |
| `actorImage` | String |  |  |
| `readAt` | Date |  |  |
| `data` | Mixed |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1,"readAt":1,"createdAt":-1}`
- `{"createdAt":1}` (TTL 15552000s)

### `callSessions` (CallSession)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `twinId` | ObjectId → AiTwin | ✓ |  |
| `kind` | String | ✓ | `voice`, `video` |
| `status` | String |  | `active`, `ended`, `failed` |
| `provider` | String | ✓ |  |
| `roomName` | String | ✓ |  |
| `ratePerMinute` | Number | ✓ |  |
| `minutesBilled` | Number |  |  |
| `creditsSpent` | Number |  |  |
| `startedAt` | Date |  |  |
| `lastTickAt` | Date |  |  |
| `endedAt` | Date |  |  |
| `endReason` | String |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1,"status":1,"createdAt":-1}`
- `{"creatorId":1,"createdAt":-1}`

## Monetizasyon

### `membershipPlans` (MembershipPlan)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `scope` | String | ✓ | `creator`, `platform` |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `tier` | String | ✓ | `free`, `basic`, `premium`, `vip` |
| `name` | String | ✓ |  |
| `description` | String |  |  |
| `benefits` | [Mixed] |  |  |
| `entitlements.contentAccess` | String |  | `none`, `basic`, `premium`, `vip` |
| `entitlements.unlimitedChat` | Boolean |  |  |
| `entitlements.dailyChatAllowance` | Number |  |  |
| `entitlements.monthlyCredits` | Number |  |  |
| `entitlements.customRequests` | Boolean |  |  |
| `entitlements.prioritySupport` | Boolean |  |  |
| `priceMonthly` | Embedded | ✓ |  |
| `priceYearly` | Embedded |  |  |
| `isPopular` | Boolean |  |  |
| `status` | String |  | `active`, `archived` |
| `order` | Number |  |  |
| `providerRefs` | Mixed |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"scope":1,"creatorId":1,"status":1,"order":1}`

### `subscriptions` (Subscription)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `planId` | ObjectId → MembershipPlan | ✓ |  |
| `scope` | String | ✓ | `creator`, `platform` |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `tier` | String | ✓ | `free`, `basic`, `premium`, `vip` |
| `status` | String |  | `pending`, `active`, `past_due`, `canceled`, `expired` |
| `interval` | String |  | `month`, `year` |
| `price` | Embedded | ✓ |  |
| `currentPeriodStart` | Date |  |  |
| `currentPeriodEnd` | Date |  |  |
| `cancelAtPeriodEnd` | Boolean |  |  |
| `canceledAt` | Date |  |  |
| `provider` | String | ✓ |  |
| `providerSubscriptionId` | String |  |  |
| `lastTransactionId` | ObjectId → PaymentTransaction |  |  |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1,"status":1}`
- `{"creatorId":1,"status":1}`
- `{"userId":1,"scope":1,"creatorId":1}` (tekil, kısmi)
- `{"status":1,"currentPeriodEnd":1}`

### `wallets` (Wallet)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `balance` | Number |  |  |
| `lifetimePurchased` | Number |  |  |
| `lifetimeSpent` | Number |  |  |
| `status` | String |  | `active`, `frozen` |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"userId":1}` (tekil)

### `walletLedger` (WalletLedgerEntry)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `walletId` | ObjectId → Wallet | ✓ |  |
| `userId` | ObjectId → User | ✓ |  |
| `type` | String | ✓ | `purchase`, `subscription_grant`, `bonus`, `spend_message`, `spend_voice`, `spend_video`, `spend_content`, `spend_custom_request`, `gift_sent`, `tip_sent`, `refund`, `reversal`, `adjustment`, `refund_debit` |
| `amount` | Number | ✓ |  |
| `balanceAfter` | Number | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `refType` | String |  |  |
| `refId` | ObjectId |  |  |
| `reversesEntryId` | ObjectId → WalletLedgerEntry |  |  |
| `description` | String | ✓ |  |
| `idempotencyKey` | String | ✓ |  |
| `actorId` | ObjectId → User |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"idempotencyKey":1}` (tekil)
- `{"userId":1,"createdAt":-1}`
- `{"creatorId":1,"type":1,"createdAt":-1}`
- `{"reversesEntryId":1}` (tekil, kısmi)

### `paymentTransactions` (PaymentTransaction)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ |  |
| `kind` | String | ✓ | `credit_purchase`, `subscription`, `content_purchase`, `custom_request`, `tip` |
| `status` | String |  | `created`, `pending`, `succeeded`, `failed`, `canceled`, `refunded`, `partially_refunded`, `chargeback` |
| `amount` | Embedded | ✓ |  |
| `refundedMinor` | Number |  |  |
| `provider` | String | ✓ |  |
| `providerSessionId` | String |  |  |
| `providerPaymentId` | String |  |  |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `item.type` | String | ✓ | `credit_pack`, `plan`, `content`, `custom_request`, `tip` |
| `item.refId` | ObjectId |  |  |
| `item.packKey` | String |  |  |
| `item.credits` | Number |  |  |
| `item.interval` | String |  | `month`, `year` |
| `item.label` | String | ✓ |  |
| `idempotencyKey` | String | ✓ |  |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `failureReason` | String |  |  |
| `succeededAt` | Date |  |  |
| `isTest` | Boolean |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"idempotencyKey":1}` (tekil)
- `{"provider":1,"providerSessionId":1}` (tekil, kısmi)
- `{"userId":1,"createdAt":-1}`
- `{"creatorId":1,"status":1,"createdAt":-1}`
- `{"status":1,"createdAt":-1}`

### `paymentWebhookEvents` (PaymentWebhookEvent)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `provider` | String | ✓ |  |
| `eventId` | String | ✓ |  |
| `type` | String | ✓ |  |
| `transactionId` | ObjectId → PaymentTransaction |  |  |
| `payloadHash` | String | ✓ |  |
| `status` | String |  | `received`, `processed`, `ignored`, `failed` |
| `error` | String |  |  |
| `processedAt` | Date |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"provider":1,"eventId":1}` (tekil)

### `refunds` (Refund)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `transactionId` | ObjectId → PaymentTransaction | ✓ |  |
| `userId` | ObjectId → User | ✓ |  |
| `amount` | Embedded | ✓ |  |
| `reason` | String | ✓ |  |
| `kind` | String |  | `refund`, `chargeback` |
| `status` | String |  | `requested`, `approved`, `processing`, `succeeded`, `rejected`, `failed` |
| `requestedBy` | ObjectId → User | ✓ |  |
| `approvedBy` | ObjectId → User |  |  |
| `providerRefundId` | String |  |  |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"transactionId":1,"createdAt":-1}`
- `{"status":1,"createdAt":-1}`

### `creatorEarnings` (CreatorEarning)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `sourceType` | String | ✓ | `subscription`, `content`, `tip`, `gift`, `chat`, `voice`, `video`, `custom_request` |
| `transactionId` | ObjectId → PaymentTransaction |  |  |
| `ledgerEntryId` | ObjectId → WalletLedgerEntry |  |  |
| `grossMinor` | Number | ✓ |  |
| `processingFeeMinor` | Number | ✓ |  |
| `taxMinor` | Number | ✓ |  |
| `netMinor` | Number | ✓ |  |
| `platformFeeMinor` | Number | ✓ |  |
| `creatorShareMinor` | Number | ✓ |  |
| `shareBps` | Number | ✓ |  |
| `currency` | String |  |  |
| `availableAt` | Date | ✓ |  |
| `reversesEarningId` | ObjectId → CreatorEarning |  |  |
| `payoutRequestId` | ObjectId → PayoutRequest |  |  |
| `description` | String | ✓ |  |
| `idempotencyKey` | String | ✓ |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"idempotencyKey":1}` (tekil)
- `{"creatorId":1,"createdAt":-1}`
- `{"creatorId":1,"sourceType":1,"createdAt":-1}`

### `payoutAccounts` (PayoutAccount)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `type` | String |  | `iban` |
| `holderName` | String | ✓ |  |
| `ibanMasked` | String | ✓ |  |
| `ibanEncrypted` | String | ✓ |  |
| `bankName` | String |  |  |
| `status` | String |  | `unverified`, `verified`, `rejected` |
| `isDefault` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"creatorId":1}`

### `payoutRequests` (PayoutRequest)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `amount` | Embedded | ✓ |  |
| `payoutAccountId` | ObjectId → PayoutAccount | ✓ |  |
| `status` | String |  | `requested`, `approved`, `processing`, `paid`, `rejected`, `failed`, `canceled` |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `reviewedBy` | ObjectId → User |  |  |
| `providerRef` | String |  |  |
| `note` | String |  |  |
| `idempotencyKey` | String | ✓ |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"idempotencyKey":1}` (tekil)
- `{"creatorId":1,"createdAt":-1}`
- `{"status":1,"createdAt":1}`

### `giftCatalog` (GiftCatalogItem)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `key` | String | ✓ |  |
| `name` | String | ✓ |  |
| `icon` | String |  |  |
| `credits` | Number | ✓ |  |
| `order` | Number |  |  |
| `isActive` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"key":1}` (tekil)

### `gifts` (Gift)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `kind` | String | ✓ | `gift`, `tip` |
| `senderId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `giftKey` | String |  |  |
| `credits` | Number | ✓ |  |
| `message` | String |  |  |
| `isAnonymous` | Boolean |  |  |
| `ledgerEntryId` | ObjectId → WalletLedgerEntry | ✓ |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"senderId":1,"createdAt":-1}`
- `{"creatorId":1,"createdAt":-1}`

### `customRequests` (CustomRequest)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `fanId` | ObjectId → User | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile | ✓ |  |
| `type` | String | ✓ | `photo`, `video`, `audio`, `message`, `other` |
| `title` | String | ✓ |  |
| `details` | String | ✓ |  |
| `priceCredits` | Number | ✓ |  |
| `dueAt` | Date |  |  |
| `status` | String |  | `draft`, `pending`, `in_review`, `approved`, `processing`, `completed`, `rejected`, `canceled` |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `holdEntryId` | ObjectId → WalletLedgerEntry |  |  |
| `refundEntryId` | ObjectId → WalletLedgerEntry |  |  |
| `deliverableAssetIds` | [Mixed] → MediaAsset |  |  |
| `creatorNote` | String |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"fanId":1,"createdAt":-1}`
- `{"creatorId":1,"status":1,"createdAt":-1}`

## Güvenlik

### `moderationCases` (ModerationCase)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `caseNo` | String | ✓ |  |
| `targetType` | String | ✓ | `content`, `message`, `twin`, `profile`, `user`, `custom_request` |
| `targetId` | ObjectId | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `subjectUserId` | ObjectId → User |  |  |
| `source` | String | ✓ | `auto`, `report`, `manual`, `pre_publish` |
| `reason` | String | ✓ |  |
| `categories` | [Mixed] |  |  |
| `riskScore` | Number |  |  |
| `priority` | String |  | `low`, `medium`, `high`, `critical` |
| `status` | String |  | `open`, `in_review`, `actioned`, `dismissed`, `escalated` |
| `assignedTo` | ObjectId → User |  |  |
| `decision` | Embedded |  |  |
| `reportIds` | [Mixed] → Report |  |  |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"caseNo":1}` (tekil)
- `{"status":1,"priority":1,"createdAt":1}`
- `{"targetType":1,"targetId":1}`

### `reports` (Report)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `reportNo` | String | ✓ |  |
| `reporterId` | ObjectId → User |  |  |
| `reporterEmail` | String |  |  |
| `targetType` | String | ✓ | `content`, `message`, `twin`, `profile`, `user`, `custom_request` |
| `targetId` | ObjectId | ✓ |  |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `reason` | String | ✓ | `impersonation`, `harassment`, `sexual_content`, `minor_safety`, `hate`, `self_harm`, `spam`, `copyright`, `privacy`, `ai_misbehavior`, `other` |
| `details` | String |  |  |
| `status` | String |  | `open`, `triaged`, `resolved`, `rejected` |
| `caseId` | ObjectId → ModerationCase |  |  |
| `resolutionNote` | String |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"reportNo":1}` (tekil)
- `{"status":1,"createdAt":-1}`
- `{"reporterId":1,"targetType":1,"targetId":1}`

### `appeals` (Appeal)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `appealNo` | String | ✓ |  |
| `userId` | ObjectId → User | ✓ |  |
| `caseId` | ObjectId → ModerationCase | ✓ |  |
| `reason` | String | ✓ |  |
| `status` | String |  | `open`, `in_review`, `upheld`, `overturned` |
| `decidedBy` | ObjectId → User |  |  |
| `decisionNote` | String |  |  |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"appealNo":1}` (tekil)
- `{"status":1,"createdAt":1}`
- `{"caseId":1,"userId":1}` (tekil)

### `auditLogs` (AuditLog)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `actorId` | ObjectId → User |  |  |
| `actorRole` | String |  |  |
| `action` | String | ✓ |  |
| `targetType` | String |  |  |
| `targetId` | String |  |  |
| `reason` | String |  |  |
| `severity` | String |  | `info`, `notice`, `critical` |
| `ipHash` | String |  |  |
| `userAgent` | String |  |  |
| `metadata` | Mixed |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"createdAt":-1}`
- `{"actorId":1,"createdAt":-1}`
- `{"targetType":1,"targetId":1,"createdAt":-1}`
- `{"action":1,"createdAt":-1}`

## Platform yönetimi

### `cmsPages` (CmsPage)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `slug` | String | ✓ |  |
| `locale` | String |  | `tr`, `en` |
| `kind` | String | ✓ | `legal`, `marketing`, `help` |
| `title` | String | ✓ |  |
| `summary` | String |  |  |
| `sections` | [Belge] |  |  |
| `sections[].id` | String |  |  |
| `sections[].heading` | String |  |  |
| `sections[].body` | String |  |  |
| `status` | String |  | `draft`, `published` |
| `legalReview` | String |  | `not_required`, `draft_requires_legal_review`, `approved` |
| `version` | Number |  |  |
| `effectiveDate` | Date |  |  |
| `updatedBy` | ObjectId → User |  |  |
| `publishedAt` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"slug":1,"locale":1}` (tekil)

### `homepageSections` (HomepageSection)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `key` | String | ✓ |  |
| `page` | String |  | `home`, `explore`, `trending`, `categories`, `pricing`, `about`, `how-it-works`, `for-creators` |
| `type` | String | ✓ | `hero`, `featured_creators`, `trending_categories`, `announcement`, `banner`, `stats`, `cta` |
| `title` | String |  |  |
| `subtitle` | String |  |  |
| `config` | Mixed |  |  |
| `order` | Number |  |  |
| `isActive` | Boolean |  |  |
| `startsAt` | Date |  |  |
| `endsAt` | Date |  |  |
| `updatedBy` | ObjectId → User |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"page":1,"key":1}` (tekil)
- `{"page":1,"isActive":1,"order":1}`

### `campaigns` (Campaign)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `name` | String | ✓ |  |
| `type` | String | ✓ | `banner`, `credit_bonus`, `discount`, `announcement` |
| `status` | String |  | `draft`, `scheduled`, `active`, `ended`, `archived` |
| `startsAt` | Date |  |  |
| `endsAt` | Date |  |  |
| `audience` | String |  | `all`, `fans`, `creators`, `new_users` |
| `config.headline` | String |  |  |
| `config.body` | String |  |  |
| `config.ctaLabel` | String |  |  |
| `config.ctaUrl` | String |  |  |
| `config.bonusPercent` | Number |  |  |
| `config.discountPercent` | Number |  |  |
| `config.imageUrl` | String |  |  |
| `metrics.impressions` | Number |  |  |
| `metrics.clicks` | Number |  |  |
| `metrics.conversions` | Number |  |  |
| `createdBy` | ObjectId → User |  |  |
| `history` | [Belge] |  |  |
| `history[].from` | String |  |  |
| `history[].to` | String | ✓ |  |
| `history[].by` | ObjectId → User |  |  |
| `history[].note` | String |  |  |
| `history[].at` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"status":1,"startsAt":1}`

### `platformSettings` (PlatformSettings)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `key` | String |  | `global` |
| `revenue.creatorShareBps` | Number |  |  |
| `revenue.basis` | String |  | `net_after_fees_and_tax` |
| `revenue.processingFeeBps` | Number |  |  |
| `revenue.processingFeeFixedMinor` | Number |  |  |
| `revenue.vatBps` | Number |  |  |
| `revenue.deductAiCostFromCreator` | Boolean |  |  |
| `revenue.holdDays` | Number |  |  |
| `revenue.minPayoutMinor` | Number |  |  |
| `credits.valueMinor` | Number |  |  |
| `credits.packs` | [Belge] |  |  |
| `credits.packs[].key` | String |  |  |
| `credits.packs[].credits` | Number |  |  |
| `credits.packs[].priceMinor` | Number |  |  |
| `credits.packs[].bonusCredits` | Number |  |  |
| `credits.packs[].isPopular` | Boolean |  |  |
| `credits.signupBonus` | Number |  |  |
| `chat.defaultMessageCredits` | Number |  |  |
| `chat.maxMessageCredits` | Number |  |  |
| `chat.freeMessagesPerDay` | Number |  |  |
| `chat.maxInputChars` | Number |  |  |
| `features.adultContent` | Boolean |  |  |
| `features.voiceCalls` | Boolean |  |  |
| `features.videoCalls` | Boolean |  |  |
| `features.likenessGeneration` | Boolean |  |  |
| `features.creatorSignup` | Boolean |  |  |
| `features.payouts` | Boolean |  |  |
| `features.aiMemory` | Boolean |  |  |
| `security.adminMfaRequired` | Boolean |  |  |
| `security.sessionMaxAgeDays` | Number |  |  |
| `security.maxLoginAttempts` | Number |  |  |
| `security.sensitiveAccessRequiresReason` | Boolean |  |  |
| `ai.defaultModel` | String |  |  |
| `ai.monthlyBudgetMicroUsd` | Number |  |  |
| `ai.maxOutputTokens` | Number |  |  |
| `ai.temperature` | Number |  |  |
| `maintenance.enabled` | Boolean |  |  |
| `maintenance.message` | String |  |  |
| `updatedBy` | ObjectId → User |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"key":1}` (tekil)

### `supportTickets` (SupportTicket)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `ticketNo` | String | ✓ |  |
| `userId` | ObjectId → User |  |  |
| `name` | String | ✓ |  |
| `email` | String | ✓ |  |
| `category` | String |  | `account`, `payments`, `ai_twin`, `creator`, `safety`, `technical`, `legal`, `other` |
| `subject` | String | ✓ |  |
| `message` | String | ✓ |  |
| `status` | String |  | `open`, `pending`, `resolved`, `closed` |
| `priority` | String |  | `low`, `normal`, `high`, `urgent` |
| `assignedTo` | ObjectId → User |  |  |
| `replies` | [Belge] |  |  |
| `replies[].authorId` | ObjectId → User |  |  |
| `replies[].authorType` | String |  | `user`, `agent` |
| `replies[].body` | String |  |  |
| `replies[].at` | Date |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"ticketNo":1}` (tekil)
- `{"status":1,"priority":1,"createdAt":-1}`
- `{"userId":1,"createdAt":-1}`

### `helpArticles` (HelpArticle)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `slug` | String | ✓ |  |
| `category` | String | ✓ | `account`, `ai_twins`, `subscriptions`, `payments`, `safety`, `technical`, `creators` |
| `title` | String | ✓ |  |
| `summary` | String | ✓ |  |
| `body` | String | ✓ |  |
| `tags` | [Mixed] |  |  |
| `views` | Number |  |  |
| `helpfulYes` | Number |  |  |
| `helpfulNo` | Number |  |  |
| `isPublished` | Boolean |  |  |
| `order` | Number |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"slug":1}` (tekil)
- `{"category":1,"order":1}`
- `{"title":"text","summary":"text","body":"text","tags":"text"}`

### `cookieConsents` (CookieConsent)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `anonId` | String | ✓ |  |
| `userId` | ObjectId → User |  |  |
| `choices.necessary` | Boolean |  |  |
| `choices.preferences` | Boolean |  |  |
| `choices.analytics` | Boolean |  |  |
| `choices.marketing` | Boolean |  |  |
| `policyVersion` | String | ✓ |  |
| `action` | String | ✓ | `accept_all`, `reject_optional`, `custom`, `withdraw` |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"anonId":1,"createdAt":-1}`

### `newsletterSubscriptions` (NewsletterSubscription)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `email` | String | ✓ |  |
| `status` | String |  | `subscribed`, `unsubscribed` |
| `source` | String |  |  |
| `unsubscribeToken` | String | ✓ |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"email":1}` (tekil)

### `analyticsEvents` (AnalyticsEvent)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `type` | String | ✓ | `profile_view`, `content_view`, `follow`, `unfollow`, `favorite`, `chat_message`, `chat_started`, `subscription_started`, `content_purchase`, `credit_purchase`, `search`, `page_view`, `signup` |
| `userId` | ObjectId → User |  |  |
| `anonId` | String |  |  |
| `creatorId` | ObjectId → CreatorProfile |  |  |
| `contentId` | ObjectId → ContentItem |  |  |
| `props` | Mixed |  |  |
| `isDemo` | Boolean |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"type":1,"createdAt":-1}`
- `{"creatorId":1,"type":1,"createdAt":-1}`
- `{"createdAt":1}` (TTL 34560000s)

### `rateLimits` (RateLimit)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `_id` | String | ✓ |  |
| `count` | Number |  |  |
| `expiresAt` | Date | ✓ |  |

İndeksler:

- `{"expiresAt":1}` (TTL 0s)

### `devOutbox` (DevOutbox)

| Alan | Tip | Zorunlu | Değerler |
|---|---|---|---|
| `to` | String | ✓ |  |
| `subject` | String | ✓ |  |
| `html` | String |  |  |
| `text` | String |  |  |
| `kind` | String |  |  |
| `_id` | ObjectId |  |  |
| `createdAt` | Date |  |  |
| `updatedAt` | Date |  |  |

İndeksler:

- `{"to":1,"createdAt":-1}`
- `{"createdAt":1}` (TTL 604800s)
