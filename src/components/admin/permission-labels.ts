import { m } from "@/i18n/m";

/** İzin kodlarının Türkçe açıklamaları (rol/izin matrisi). */
export const PERMISSION_GROUPS: { label: string; perms: { key: string; label: string }[] }[] = [
  { label: m("Genel"), perms: [{ key: "admin.dashboard", label: m("Genel bakışı görüntüle") }] },
  {
    label: m("Kullanıcılar ve creator'lar"),
    perms: [
      { key: "users.read", label: m("Kullanıcıları görüntüle") },
      { key: "users.manage", label: m("Kullanıcı hesabını yönet (askıya al / yasakla)") },
      { key: "creators.read", label: m("Creator'ları görüntüle") },
      { key: "creators.verify", label: m("Creator başvurusunu onayla / reddet") },
      { key: "creators.manage", label: m("Creator'ı askıya al / öne çıkar") },
    ],
  },
  {
    label: m("AI ikizleri"),
    perms: [
      { key: "twins.read", label: m("AI ikizlerini görüntüle") },
      { key: "twins.review", label: m("AI ikizi sürümünü incele") },
      { key: "twins.manage", label: m("AI ikizini duraklat / geri çek") },
      { key: "consents.read", label: m("Creator rızalarını görüntüle") },
    ],
  },
  {
    label: m("Güvenlik ve uyum"),
    perms: [
      { key: "content.read", label: m("İçerikleri görüntüle") },
      { key: "moderation.read", label: m("Moderasyon kuyruğunu görüntüle") },
      { key: "moderation.act", label: m("Moderasyon kararı ver") },
      { key: "reports.read", label: m("Raporları görüntüle") },
      { key: "reports.manage", label: m("Raporları yönet") },
      { key: "appeals.manage", label: m("İtirazlara karar ver") },
      { key: "conversations.read_sensitive", label: m("Hassas sohbet erişimi (denetimli)") },
      { key: "support.read", label: m("Destek taleplerini görüntüle") },
      { key: "support.manage", label: m("Destek taleplerini yanıtla") },
    ],
  },
  {
    label: m("Finans ve AI operasyonları"),
    perms: [
      { key: "finance.read", label: m("Finans verilerini görüntüle") },
      { key: "finance.refund", label: m("İade başlat") },
      { key: "payouts.manage", label: m("Ödeme talebi ve hesap onayı") },
      { key: "ai_ops.read", label: m("AI operasyonlarını görüntüle") },
      { key: "ai_ops.manage", label: m("AI ayarları ve iş yeniden deneme") },
      { key: "analytics.read", label: m("Analitiği görüntüle") },
    ],
  },
  {
    label: m("İçerik ve sistem"),
    perms: [
      { key: "cms.manage", label: m("CMS ve yardım içeriği") },
      { key: "campaigns.manage", label: m("Kampanyalar") },
      { key: "categories.manage", label: m("Kategoriler") },
      { key: "settings.read", label: m("Ayarları görüntüle") },
      { key: "settings.manage", label: m("Ayarları değiştir") },
      { key: "audit.read", label: m("Denetim kayıtlarını görüntüle") },
    ],
  },
];
