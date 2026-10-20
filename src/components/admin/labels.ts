/** Admin ekranlarında ortak kullanılan Türkçe etiketler ve rozet tonları (saf modül, hem sunucu hem istemci). */
import { m } from "@/i18n/m";

export type Tone = "pink" | "green" | "warn" | "danger" | "violet" | "teal" | "gray" | "outline" | "dark";

export const CREATOR_STATUS_LABELS: Record<string, string> = {
  onboarding: m("Başvuru sürecinde"),
  pending_review: m("Doğrulama bekliyor"),
  approved: m("Aktif"),
  suspended: m("Askıda"),
  rejected: m("Reddedildi"),
};
export const CREATOR_STATUS_TONES: Record<string, Tone> = { onboarding: "gray", pending_review: "warn", approved: "green", suspended: "danger", rejected: "danger" };

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: m("Taslak"),
  submitted: m("Gönderildi"),
  in_review: m("İncelemede"),
  approved: m("Onaylandı"),
  rejected: m("Reddedildi"),
  changes_requested: m("Düzenleme istendi"),
};

export const VERIFICATION_LABELS: Record<string, string> = { none: m("Yok"), pending: m("Bekliyor"), verified: m("Doğrulandı"), rejected: m("Reddedildi"), in_review: m("İncelemede"), expired: m("Süresi doldu") };
export const VERIFICATION_TONES: Record<string, Tone> = { none: "gray", pending: "warn", in_review: "warn", verified: "green", rejected: "danger", expired: "gray" };
export const VERIFICATION_TYPE_LABELS: Record<string, string> = { identity: m("Kimlik"), social: m("Sosyal hesap"), likeness: m("Benzerlik") };

export const CONSENT_LABELS: Record<string, string> = {
  ai_twin_persona: m("AI ikizi kişiliği"),
  knowledge_use: m("Bilgi tabanı kullanımı"),
  voice_likeness: m("Ses benzerliği"),
  image_likeness: m("Görsel benzerlik"),
  video_likeness: m("Görüntülü benzerlik"),
};

export const USER_STATUS_LABELS: Record<string, string> = { active: m("Aktif"), suspended: m("Askıda"), banned: m("Yasaklı"), deleted: m("Silindi") };
export const USER_STATUS_TONES: Record<string, Tone> = { active: "green", suspended: "warn", banned: "danger", deleted: "gray" };
export const USER_ROLE_LABELS: Record<string, string> = { fan: m("Hayran"), creator: m("Creator"), admin: m("Yönetici") };

export const TIER_LABELS: Record<string, string> = { free: m("Ücretsiz"), basic: m("Temel"), premium: m("Premium"), vip: m("VIP") };

export const TWIN_STATUS_TONES: Record<string, Tone> = { draft: "gray", pending_review: "warn", approved: "teal", live: "green", paused: "warn", rejected: "danger", revoked: "danger" };
export const TWIN_VERSION_STATUS_LABELS: Record<string, string> = { pending_review: m("İncelemede"), approved: m("Onaylandı"), rejected: m("Reddedildi"), superseded: m("Eski sürüm"), live: m("Canlı sürüm") };

export const TARGET_LABELS: Record<string, string> = {
  content: m("İçerik"),
  message: m("Sohbet mesajı"),
  twin: m("AI ikizi"),
  profile: m("Creator profili"),
  user: m("Kullanıcı"),
  custom_request: m("Özel talep"),
};
export const CASE_STATUS_LABELS: Record<string, string> = { open: m("Bekliyor"), in_review: m("İnceleniyor"), actioned: m("İşlem yapıldı"), dismissed: m("Reddedildi"), escalated: m("Eskale edildi") };
export const CASE_STATUS_TONES: Record<string, Tone> = { open: "warn", in_review: "violet", actioned: "green", dismissed: "gray", escalated: "danger" };
export const PRIORITY_LABELS: Record<string, string> = { low: m("Düşük"), medium: m("Orta"), high: m("Yüksek"), critical: m("Kritik") };
export const PRIORITY_TONES: Record<string, Tone> = { low: "gray", medium: "warn", high: "danger", critical: "danger" };
export const CASE_SOURCE_LABELS: Record<string, string> = { auto: m("Otomatik tespit"), report: m("Kullanıcı bildirimi"), manual: m("Manuel"), pre_publish: m("Yayın öncesi tarama") };
export const CASE_ACTION_LABELS: Record<string, string> = {
  assign_me: m("Üzerime al"),
  dismiss: m("Reddet (ihlal yok)"),
  warn: m("Uyar"),
  hide: m("İçeriği gizle"),
  remove: m("İçeriği kaldır"),
  suspend_user: m("Kullanıcıyı askıya al"),
  pause_twin: m("AI ikizini duraklat"),
  revoke_twin: m("AI ikizini geri çek"),
  escalate: m("Eskale et"),
  none: m("İhlal yok"),
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  impersonation: m("Taklit / izinsiz benzerlik"),
  harassment: m("Taciz"),
  sexual_content: m("Cinsel içerik"),
  minor_safety: m("Reşit olmayan güvenliği"),
  hate: m("Nefret söylemi"),
  self_harm: m("Kendine zarar"),
  spam: m("Spam"),
  copyright: m("Telif hakkı"),
  privacy: m("Gizlilik ihlali"),
  ai_misbehavior: m("Uygunsuz AI yanıtı"),
  other: m("Diğer"),
};
export const REPORT_STATUS_LABELS: Record<string, string> = { open: m("Açık"), triaged: m("İncelemede"), resolved: m("Çözüldü"), rejected: m("Reddedildi") };
export const REPORT_STATUS_TONES: Record<string, Tone> = { open: "warn", triaged: "violet", resolved: "green", rejected: "gray" };
export const APPEAL_STATUS_LABELS: Record<string, string> = { open: m("Açık"), in_review: m("İncelemede"), upheld: m("Karar korundu"), overturned: m("Karar kaldırıldı") };
export const APPEAL_STATUS_TONES: Record<string, Tone> = { open: "warn", in_review: "violet", upheld: "gray", overturned: "green" };

export const TICKET_STATUS_LABELS: Record<string, string> = { open: m("Açık"), pending: m("Yanıt bekliyor"), resolved: m("Çözüldü"), closed: m("Kapalı") };
export const TICKET_STATUS_TONES: Record<string, Tone> = { open: "warn", pending: "violet", resolved: "green", closed: "gray" };
export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  account: m("Hesap"),
  payments: m("Ödemeler"),
  ai_twin: m("AI ikizi"),
  creator: m("Creator"),
  safety: m("Güvenlik"),
  technical: m("Teknik"),
  legal: m("Hukuki"),
  other: m("Diğer"),
};
export const TICKET_PRIORITY_LABELS: Record<string, string> = { low: m("Düşük"), normal: m("Normal"), high: m("Yüksek"), urgent: m("Acil") };
export const TICKET_PRIORITY_TONES: Record<string, Tone> = { low: "gray", normal: "outline", high: "warn", urgent: "danger" };

export const TX_KIND_LABELS: Record<string, string> = {
  credit_purchase: m("Mesaj kredisi"),
  subscription: m("Abonelik"),
  content_purchase: m("Premium içerik"),
  custom_request: m("Özel talep"),
  tip: m("Hediye / bahşiş"),
};
export const TX_STATUS_LABELS: Record<string, string> = {
  created: m("Oluşturuldu"),
  pending: m("Beklemede"),
  succeeded: m("Başarılı"),
  failed: m("Başarısız"),
  canceled: m("İptal"),
  refunded: m("İade edildi"),
  partially_refunded: m("Kısmi iade"),
  chargeback: m("İtiraz (chargeback)"),
};
export const TX_STATUS_TONES: Record<string, Tone> = { created: "gray", pending: "warn", succeeded: "green", failed: "danger", canceled: "gray", refunded: "violet", partially_refunded: "violet", chargeback: "danger" };

export const PAYOUT_STATUS_LABELS: Record<string, string> = { requested: m("Talep edildi"), approved: m("Onaylandı"), processing: m("İşleniyor"), paid: m("Ödendi"), rejected: m("Reddedildi"), failed: m("Başarısız"), canceled: m("İptal") };
export const PAYOUT_STATUS_TONES: Record<string, Tone> = { requested: "warn", approved: "teal", processing: "violet", paid: "green", rejected: "danger", failed: "danger", canceled: "gray" };
export const PAYOUT_ACCOUNT_LABELS: Record<string, string> = { unverified: m("Doğrulanmadı"), verified: m("Doğrulandı"), rejected: m("Reddedildi") };
export const PAYOUT_ACCOUNT_TONES: Record<string, Tone> = { unverified: "warn", verified: "green", rejected: "danger" };

export const JOB_TYPE_LABELS: Record<string, string> = {
  "knowledge.ingest": m("Bilgi kaynağı indeksleme"),
  "media.process": m("Medya işleme"),
  "notifications.fanout": m("Bildirim dağıtımı"),
  "earnings.release": m("Hak ediş serbest bırakma"),
  "subscriptions.expire": m("Abonelik süre sonu"),
};
export const JOB_STATUS_LABELS: Record<string, string> = { queued: m("Kuyrukta"), running: m("Çalışıyor"), succeeded: m("Başarılı"), failed: m("Başarısız") };
export const KNOWLEDGE_STATUS_LABELS: Record<string, string> = { uploaded: m("Yüklendi"), validating: m("Doğrulanıyor"), extracting: m("Metin çıkarılıyor"), chunking: m("Parçalanıyor"), embedding: m("Gömülüyor"), indexed: m("İndekslendi"), failed: m("Başarısız"), disabled: m("Devre dışı") };
export const AI_KIND_LABELS: Record<string, string> = { chat: m("Sohbet"), embedding: m("Gömme"), moderation: m("Moderasyon"), test_chat: m("Test sohbeti"), evaluation: m("Değerlendirme") };

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = { banner: m("Banner"), credit_bonus: m("Kredi bonusu"), discount: m("İndirim"), announcement: m("Duyuru") };
export const CAMPAIGN_STATUS_LABELS: Record<string, string> = { draft: m("Taslak"), scheduled: m("Planlandı"), active: m("Aktif"), ended: m("Sona erdi"), archived: m("Arşivlendi") };
export const CAMPAIGN_STATUS_TONES: Record<string, Tone> = { draft: "gray", scheduled: "violet", active: "green", ended: "outline", archived: "gray" };
export const CAMPAIGN_AUDIENCE_LABELS: Record<string, string> = { all: m("Herkes"), fans: m("Hayranlar"), creators: m("Creator'lar"), new_users: m("Yeni kullanıcılar") };

export const HELP_CATEGORY_LABELS: Record<string, string> = {
  account: m("Hesap"),
  ai_twins: m("AI ikizleri"),
  subscriptions: m("Abonelikler"),
  payments: m("Ödemeler"),
  safety: m("Güvenlik"),
  technical: m("Teknik"),
  creators: m("Creator'lar"),
};
export const LEGAL_REVIEW_LABELS: Record<string, string> = { not_required: m("Hukuki inceleme gerekmiyor"), draft_requires_legal_review: m("Taslak — hukuki inceleme gerekli"), approved: m("Hukuken onaylı") };

export const HOMEPAGE_SECTION_LABELS: Record<string, string> = {
  hero: m("Hero bölümü"),
  featured_creators: m("Öne çıkan creator'lar"),
  trending_categories: m("Trend kategoriler"),
  announcement: m("Duyuru bandı"),
  banner: m("Banner"),
  stats: m("İstatistikler"),
  cta: m("Çağrı bölümü"),
};

export const AUDIT_SEVERITY_TONES: Record<string, Tone> = { info: "gray", notice: "violet", critical: "danger" };
export const AUDIT_SEVERITY_LABELS: Record<string, string> = { info: m("Bilgi"), notice: m("Önemli"), critical: m("Kritik") };

/** Etiket haritasından çevrilmiş etiket (render zamanı `t` ile); anahtar haritada yoksa ham değer döner. */
export function labelOf(t: (source: string) => string, map: Record<string, string>, key: string | null | undefined): string {
  if (key === null || key === undefined) return "";
  const v = map[key];
  return v ? t(v) : key;
}
