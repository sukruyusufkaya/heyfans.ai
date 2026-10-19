/** Admin ekranlarında ortak kullanılan Türkçe etiketler ve rozet tonları (saf modül, hem sunucu hem istemci). */
export type Tone = "pink" | "green" | "warn" | "danger" | "violet" | "teal" | "gray" | "outline" | "dark";

export const CREATOR_STATUS_LABELS: Record<string, string> = {
  onboarding: "Başvuru sürecinde",
  pending_review: "Doğrulama bekliyor",
  approved: "Aktif",
  suspended: "Askıda",
  rejected: "Reddedildi",
};
export const CREATOR_STATUS_TONES: Record<string, Tone> = { onboarding: "gray", pending_review: "warn", approved: "green", suspended: "danger", rejected: "danger" };

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  submitted: "Gönderildi",
  in_review: "İncelemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  changes_requested: "Düzenleme istendi",
};

export const VERIFICATION_LABELS: Record<string, string> = { none: "Yok", pending: "Bekliyor", verified: "Doğrulandı", rejected: "Reddedildi", in_review: "İncelemede", expired: "Süresi doldu" };
export const VERIFICATION_TONES: Record<string, Tone> = { none: "gray", pending: "warn", in_review: "warn", verified: "green", rejected: "danger", expired: "gray" };
export const VERIFICATION_TYPE_LABELS: Record<string, string> = { identity: "Kimlik", social: "Sosyal hesap", likeness: "Benzerlik" };

export const CONSENT_LABELS: Record<string, string> = {
  ai_twin_persona: "AI ikizi kişiliği",
  knowledge_use: "Bilgi tabanı kullanımı",
  voice_likeness: "Ses benzerliği",
  image_likeness: "Görsel benzerlik",
  video_likeness: "Görüntülü benzerlik",
};

export const USER_STATUS_LABELS: Record<string, string> = { active: "Aktif", suspended: "Askıda", banned: "Yasaklı", deleted: "Silindi" };
export const USER_STATUS_TONES: Record<string, Tone> = { active: "green", suspended: "warn", banned: "danger", deleted: "gray" };
export const USER_ROLE_LABELS: Record<string, string> = { fan: "Hayran", creator: "Creator", admin: "Yönetici" };

export const TIER_LABELS: Record<string, string> = { free: "Ücretsiz", basic: "Temel", premium: "Premium", vip: "VIP" };

export const TWIN_STATUS_TONES: Record<string, Tone> = { draft: "gray", pending_review: "warn", approved: "teal", live: "green", paused: "warn", rejected: "danger", revoked: "danger" };
export const TWIN_VERSION_STATUS_LABELS: Record<string, string> = { pending_review: "İncelemede", approved: "Onaylandı", rejected: "Reddedildi", superseded: "Eski sürüm", live: "Canlı sürüm" };

export const TARGET_LABELS: Record<string, string> = {
  content: "İçerik",
  message: "Sohbet mesajı",
  twin: "AI ikizi",
  profile: "Creator profili",
  user: "Kullanıcı",
  custom_request: "Özel talep",
};
export const CASE_STATUS_LABELS: Record<string, string> = { open: "Bekliyor", in_review: "İnceleniyor", actioned: "İşlem yapıldı", dismissed: "Reddedildi", escalated: "Eskale edildi" };
export const CASE_STATUS_TONES: Record<string, Tone> = { open: "warn", in_review: "violet", actioned: "green", dismissed: "gray", escalated: "danger" };
export const PRIORITY_LABELS: Record<string, string> = { low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik" };
export const PRIORITY_TONES: Record<string, Tone> = { low: "gray", medium: "warn", high: "danger", critical: "danger" };
export const CASE_SOURCE_LABELS: Record<string, string> = { auto: "Otomatik tespit", report: "Kullanıcı bildirimi", manual: "Manuel", pre_publish: "Yayın öncesi tarama" };
export const CASE_ACTION_LABELS: Record<string, string> = {
  assign_me: "Üzerime al",
  dismiss: "Reddet (ihlal yok)",
  warn: "Uyar",
  hide: "İçeriği gizle",
  remove: "İçeriği kaldır",
  suspend_user: "Kullanıcıyı askıya al",
  pause_twin: "AI ikizini duraklat",
  revoke_twin: "AI ikizini geri çek",
  escalate: "Eskale et",
  none: "İhlal yok",
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  impersonation: "Taklit / izinsiz benzerlik",
  harassment: "Taciz",
  sexual_content: "Cinsel içerik",
  minor_safety: "Reşit olmayan güvenliği",
  hate: "Nefret söylemi",
  self_harm: "Kendine zarar",
  spam: "Spam",
  copyright: "Telif hakkı",
  privacy: "Gizlilik ihlali",
  ai_misbehavior: "Uygunsuz AI yanıtı",
  other: "Diğer",
};
export const REPORT_STATUS_LABELS: Record<string, string> = { open: "Açık", triaged: "İncelemede", resolved: "Çözüldü", rejected: "Reddedildi" };
export const REPORT_STATUS_TONES: Record<string, Tone> = { open: "warn", triaged: "violet", resolved: "green", rejected: "gray" };
export const APPEAL_STATUS_LABELS: Record<string, string> = { open: "Açık", in_review: "İncelemede", upheld: "Karar korundu", overturned: "Karar kaldırıldı" };
export const APPEAL_STATUS_TONES: Record<string, Tone> = { open: "warn", in_review: "violet", upheld: "gray", overturned: "green" };

export const TICKET_STATUS_LABELS: Record<string, string> = { open: "Açık", pending: "Yanıt bekliyor", resolved: "Çözüldü", closed: "Kapalı" };
export const TICKET_STATUS_TONES: Record<string, Tone> = { open: "warn", pending: "violet", resolved: "green", closed: "gray" };
export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  account: "Hesap",
  payments: "Ödemeler",
  ai_twin: "AI ikizi",
  creator: "Creator",
  safety: "Güvenlik",
  technical: "Teknik",
  legal: "Hukuki",
  other: "Diğer",
};
export const TICKET_PRIORITY_LABELS: Record<string, string> = { low: "Düşük", normal: "Normal", high: "Yüksek", urgent: "Acil" };
export const TICKET_PRIORITY_TONES: Record<string, Tone> = { low: "gray", normal: "outline", high: "warn", urgent: "danger" };

export const TX_KIND_LABELS: Record<string, string> = {
  credit_purchase: "Mesaj kredisi",
  subscription: "Abonelik",
  content_purchase: "Premium içerik",
  custom_request: "Özel talep",
  tip: "Hediye / bahşiş",
};
export const TX_STATUS_LABELS: Record<string, string> = {
  created: "Oluşturuldu",
  pending: "Beklemede",
  succeeded: "Başarılı",
  failed: "Başarısız",
  canceled: "İptal",
  refunded: "İade edildi",
  partially_refunded: "Kısmi iade",
  chargeback: "İtiraz (chargeback)",
};
export const TX_STATUS_TONES: Record<string, Tone> = { created: "gray", pending: "warn", succeeded: "green", failed: "danger", canceled: "gray", refunded: "violet", partially_refunded: "violet", chargeback: "danger" };

export const PAYOUT_STATUS_LABELS: Record<string, string> = { requested: "Talep edildi", approved: "Onaylandı", processing: "İşleniyor", paid: "Ödendi", rejected: "Reddedildi", failed: "Başarısız", canceled: "İptal" };
export const PAYOUT_STATUS_TONES: Record<string, Tone> = { requested: "warn", approved: "teal", processing: "violet", paid: "green", rejected: "danger", failed: "danger", canceled: "gray" };
export const PAYOUT_ACCOUNT_LABELS: Record<string, string> = { unverified: "Doğrulanmadı", verified: "Doğrulandı", rejected: "Reddedildi" };
export const PAYOUT_ACCOUNT_TONES: Record<string, Tone> = { unverified: "warn", verified: "green", rejected: "danger" };

export const JOB_TYPE_LABELS: Record<string, string> = {
  "knowledge.ingest": "Bilgi kaynağı indeksleme",
  "media.process": "Medya işleme",
  "notifications.fanout": "Bildirim dağıtımı",
  "earnings.release": "Hak ediş serbest bırakma",
  "subscriptions.expire": "Abonelik süre sonu",
};
export const JOB_STATUS_LABELS: Record<string, string> = { queued: "Kuyrukta", running: "Çalışıyor", succeeded: "Başarılı", failed: "Başarısız" };
export const KNOWLEDGE_STATUS_LABELS: Record<string, string> = { uploaded: "Yüklendi", validating: "Doğrulanıyor", extracting: "Metin çıkarılıyor", chunking: "Parçalanıyor", embedding: "Gömülüyor", indexed: "İndekslendi", failed: "Başarısız", disabled: "Devre dışı" };
export const AI_KIND_LABELS: Record<string, string> = { chat: "Sohbet", embedding: "Gömme", moderation: "Moderasyon", test_chat: "Test sohbeti", evaluation: "Değerlendirme" };

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = { banner: "Banner", credit_bonus: "Kredi bonusu", discount: "İndirim", announcement: "Duyuru" };
export const CAMPAIGN_STATUS_LABELS: Record<string, string> = { draft: "Taslak", scheduled: "Planlandı", active: "Aktif", ended: "Sona erdi", archived: "Arşivlendi" };
export const CAMPAIGN_STATUS_TONES: Record<string, Tone> = { draft: "gray", scheduled: "violet", active: "green", ended: "outline", archived: "gray" };
export const CAMPAIGN_AUDIENCE_LABELS: Record<string, string> = { all: "Herkes", fans: "Hayranlar", creators: "Creator'lar", new_users: "Yeni kullanıcılar" };

export const HELP_CATEGORY_LABELS: Record<string, string> = {
  account: "Hesap",
  ai_twins: "AI ikizleri",
  subscriptions: "Abonelikler",
  payments: "Ödemeler",
  safety: "Güvenlik",
  technical: "Teknik",
  creators: "Creator'lar",
};
export const LEGAL_REVIEW_LABELS: Record<string, string> = { not_required: "Hukuki inceleme gerekmiyor", draft_requires_legal_review: "Taslak — hukuki inceleme gerekli", approved: "Hukuken onaylı" };

export const HOMEPAGE_SECTION_LABELS: Record<string, string> = {
  hero: "Hero bölümü",
  featured_creators: "Öne çıkan creator'lar",
  trending_categories: "Trend kategoriler",
  announcement: "Duyuru bandı",
  banner: "Banner",
  stats: "İstatistikler",
  cta: "Çağrı bölümü",
};

export const AUDIT_SEVERITY_TONES: Record<string, Tone> = { info: "gray", notice: "violet", critical: "danger" };
export const AUDIT_SEVERITY_LABELS: Record<string, string> = { info: "Bilgi", notice: "Önemli", critical: "Kritik" };
