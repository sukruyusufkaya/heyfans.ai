# Geliştirme Kuralları (sayfa geliştiren herkes için)

## Çalışma ortamı
- Dev sunucu: `npm run dev` → http://localhost:3070 (zaten çalışıyor olabilir; `curl -s -o /dev/null -w "%{http_code}" http://localhost:3070/` ile kontrol et).
- Yerel MongoDB: `npm run db:start` (port 27047, replika seti). Demo veri: `npm run db:seed` (`-- --reset` tümünü siler).
- Demo hesaplar (parola `.env` → `SEED_DEMO_PASSWORD`): `fan@heyfans.local` (hayran), `sophie@heyfans.local` (onaylı creator, ikizi yayında), `selin@heyfans.local` (başvurusu incelemede), `admin@heyfans.local` (super_admin), `moderator@`, `finance@`, `creators@` (`@heyfans.local`).
- Oturumlu sayfa denemesi (curl):
  ```
  curl -s -c /tmp/hf.txt -H "Origin: http://localhost:3070" -H "Content-Type: application/json" \
    -d '{"email":"fan@heyfans.local","password":"<SEED_DEMO_PASSWORD>"}' http://localhost:3070/api/auth/sign-in/email
  curl -s -b /tmp/hf.txt http://localhost:3070/app -o /tmp/page.html -w "%{http_code}\n"
  ```
- Tip denetimi: `npx tsc --noEmit 2>&1 | grep "error TS" | grep "<kendi klasörün>"` · Lint: `npx eslint <kendi dosyaların> --quiet`.
- Windows + Git Bash: Türkçe karakter/ters tırnak içeren dosyaları **heredoc ile yazma**, Write/Edit aracını kullan.

## Mimari kurallar
- Sayfalar **Server Component**; veri `src/services/**` fonksiyonlarıyla okunur. Sayfada doğrudan Mongoose sorgusu yazma; gerekiyorsa kendi alanının servis dosyasına ekle (`src/services/<alan>/queries.ts`).
- Mutasyonlar **Server Action**: `src/features/<alan>/actions.ts` (`"use server"`). Kalıp:
  ```ts
  export async function xAction(input: unknown): Promise<ActionResult<T>> {
    try { const { user } = await assertUser(); /* zod parse */ const r = await service(...); revalidatePath(...); return { ok: true, data: r, message: "…" }; }
    catch (err) { return toActionError(err); }
  }
  ```
  `assertUser/assertCreator/assertAdmin(permission)` → `@/lib/auth/session`; `ActionResult, toActionError` → `@/lib/errors`.
- Layout'lar yetkiyi zaten denetler (`requireUser/requireCreator/requireAdmin`); admin sayfalarında **sayfa bazlı izin** için sayfa başında `await requireAdmin("<permission>")` çağır (izinler: `src/lib/permissions/index.ts`).
- Client bileşenleri yalnız etkileşim gerektiğinde (`"use client"`), `src/features/<alan>/` altında. Mongo belgelerini client'a geçirirken `serialize()` (`@/lib/utils`) kullan.
- Para: daima kuruş tamsayı (`amountMinor`) → gösterimde `formatMoney`. Kredi tamsayı. Sayı/tarih: `formatNumber/formatCompact/formatDate/formatRelative`.
- URL parametreleri (arama, filtre, sayfa, sekme) `searchParams` ile; sunucuda Zod ile doğrula.

## Hazır servisler (yeniden yazma, kullan)
| Alan | Dosya | Başlıca fonksiyonlar |
|---|---|---|
| Creator keşif | `services/creators/public.ts` | `exploreCreators, listCreators, trendingCreators, trendingSummary, listCategories, getCategory, viewerRelations, platformCounters` |
| Creator onboarding | `services/creators/onboarding.ts` | `startCreatorOnboarding, saveOnboardingStep, submitCreatorApplication, decideCreatorApplication, setCreatorSuspended, ONBOARDING_STEPS` |
| AI ikizi | `services/ai-twins/lifecycle.ts` | `getOrCreateTwin, updateTwinDraft, submitTwinForReview, reviewTwinVersion, publishTwin, pauseTwin, adminSetTwinStatus, grantConsent, revokeConsent, activeConsents, setLikenessFeature, CONSENT_TEXTS` |
| Bilgi tabanı | `services/ai-twins/knowledge.ts` | `addKnowledgeSource, listKnowledgeSources, setKnowledgeApproved, deleteKnowledgeSource, reindexKnowledgeSource` |
| Sohbet | `services/conversations/chat.ts` + `POST /api/chat/[conversationId]/messages` (NDJSON akış: `meta`→`delta`…→`done`/`error`) | `openConversation, listConversations, deleteConversation, openTestConversation, resolveBilling` |
| Görüşme | `services/calls/calls.ts`, `lib/rtc` | `getCallAvailability, startCall, tickCall, endCall, rtcStatus` |
| İçerik | `services/content/manage.ts`, `services/content/access.ts` | `createContent, updateContent, setContentStatus, moderateContent, listCreatorContent` · `decideContentAccess, decideManyContentAccess, ACCESS_LABELS, TIER_LABELS` |
| Medya | `services/media/media.ts` + `/api/media/upload-url`, `/api/media/upload/[id]`, `/api/media/[id]/complete`, `/api/media/[id]` | `createUpload, completeUpload, authorizeMediaRead, mediaUrl` |
| Takip/Favori/Bildir | `services/social/social.ts`, `features/social/actions.ts` | `setFollow, setFavorite, listFollowing, listFavoriteIds` · `toggleFollowAction, toggleFavoriteAction, reportAction` |
| Bildirim | `services/notifications/notifications.ts` | `notify, listNotifications, markNotificationsRead, deleteNotification` |
| Cüzdan | `services/wallet/wallet.ts` | `getWalletSummary, listLedger, creditWallet, debitWallet, reverseLedgerEntry` |
| Ödeme | `services/billing/checkout.ts`, `services/billing/mock.ts`, `lib/payments/provider.ts` | `priceItem, startCheckout, refundTransaction, cancelSubscription, resumeSubscription` · `getMockSession, completeMockPayment, getTransactionForUser` · `paymentsConfigured` |
| Hak ediş | `services/billing/earnings.ts`, `services/billing/revenue.ts` | `earningsBalance, recordPaymentEarning, recordCreditEarning` · `splitDirectPayment, splitCreditSpend` |
| Ödeme talepleri | `services/payouts/payouts.ts` | `savePayoutAccount, requestPayout, adminUpdatePayout, verifyPayoutAccount` |
| Özel talep / hediye | `services/experiences/custom-requests.ts`, `gifts.ts` | `createCustomRequest, fanUpdateRequest, creatorUpdateRequest, listFanRequests, listCreatorRequests` · `listGiftCatalog, sendGift, listSentGifts` |
| Moderasyon | `services/moderation/moderation.ts` | `createReport, decideCase, createAppeal, decideAppeal, readConversationForCase` |
| CMS | `services/cms/cms.ts` | `getSections, getCmsPage` |
| Ayarlar | `services/platform/settings.ts`, `config/env.ts` | `getPlatformSettings, isFeatureEnabled` · `integrationStatus, isDemo` |
| AI durum | `lib/ai/provider.ts` | `aiStatus()` (available/mock) |
| Durum makineleri | `lib/state-machines.ts` | `TWIN_STATUS_LABELS, CUSTOM_REQUEST_LABELS, CONTENT_STATUS_LABELS, canTransition` |

Modeller: `src/models/*` (tek giriş `@/models`). **Modelleri, `src/lib/**` ve yukarıdaki ortak servisleri değiştirme**; eksik alan/fonksiyon gerekirse kendi alanında yeni servis fonksiyonu yaz, model değişikliği gerekiyorsa raporuna yaz.

## UI bileşenleri
- `@/components/ui/button` (`Button` variant: primary/outline/secondary/soft/ghost/dark/danger/link/white; size xs–xl/icon; shape pill), `card` (`Card, CardHeader, SectionTitle`), `badge` (`Badge` tone…, `AiTwinLabel`, `OnlineDot`), `form-controls` (`Input, Textarea, NativeSelect, Label, Field, Checkbox, Switch, RadioGroup/RadioItem, Slider`), `overlays` (`Dialog/DialogContent, DropdownMenu…, Popover, Tooltip, Select, Tabs/TabsList/TabsTrigger/TabsContent`), `display` (`Avatar, Progress, Skeleton, EmptyState, StatCard, PageHeader, Pagination, DataTable/Th/Td, DemoDataNotice`).
- Domain: `@/components/creator/creator-cards` (`CreatorTile, CreatorCardTall, CreatorCardCompact, CreatorMiniRow, Verified`), `creator-photo` (`CreatorPhoto, ContentCover`), `social-buttons` (`FollowButton, FavoriteButton`), `category-icon` (`CategoryIcon, categoryLabel`), `@/components/public/marketing` (`PublicHero, HeroStats, PrimaryCta, SecondaryCta, PhoneChatMockup, PolaroidStack, CtaBand, Section, SeeAll, stat`), `@/components/charts/charts` (`AreaTrend, Bars, Donut, Sparkline`).
- Toast: `import { toast } from "sonner"`. İkonlar: `lucide-react`.
- Token'lar `src/app/globals.css` (`brand-500` fuşya, `ink`, `muted`, `line`, `soft`, `night`, `success/warning/danger/violet/teal/orange` + `-soft`). Kart: `hf-card`, eyebrow: `eyebrow`.
- Referans tasarım: `design-references/pages/NN_*.html` (+ `.png`). HTML'i yalnız **referans** olarak oku (yerleşim, metinler, renk, boşluk); kopyalanmış statik HTML değil, gerçek bileşen + veri ile yeniden kur. HTML'deki `assets/*.jpg` görselleri kullanma; görsel yoksa `CreatorPhoto`/`ContentCover`.

## Ürün kuralları (zorunlu)
- Tüm kullanıcı metinleri **Türkçe**. Erişilebilirlik: etiketli form alanları, `aria-*`, klavye ile kullanım, görünür odak.
- **Responsive**: 375 px mobilde yatay taşma olmamalı; tablolar `DataTable` (yatay kaydırma) veya mobilde kart görünümü.
- **Sahte veri yok**: sayılar/grafikler veritabanından. Veri yoksa `EmptyState` ("Henüz veri bulunmuyor"). Demo modda istatistiklerin yanına `DemoDataNotice`.
- Dış servis yapılandırılmamışsa (AI, ödeme, RTC, e-posta, yaş doğrulama) özellik çalışıyormuş gibi gösterilmez; durum dürüstçe yazılır (`aiStatus()`, `paymentsConfigured()`, `rtcStatus()`).
- AI yanıtları ve AI ikizi profilleri her yerde `AiTwinLabel` ile işaretlenir. Mock (test) yanıtlar "Test yanıtı" olarak görünür.
- Her sayfa için `export const metadata` (title Türkçe). Özel paneller zaten `noindex`.
- `loading.tsx` (iskelet) ve gerekirse `error.tsx` ekle; liste sayfalarında sayfalama.
- Commit atma (birleştirmeyi ana oturum yapar).
