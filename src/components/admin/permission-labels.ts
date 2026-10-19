/** İzin kodlarının Türkçe açıklamaları (rol/izin matrisi). */
export const PERMISSION_GROUPS: { label: string; perms: { key: string; label: string }[] }[] = [
  { label: "Genel", perms: [{ key: "admin.dashboard", label: "Genel bakışı görüntüle" }] },
  {
    label: "Kullanıcılar ve creator'lar",
    perms: [
      { key: "users.read", label: "Kullanıcıları görüntüle" },
      { key: "users.manage", label: "Kullanıcı hesabını yönet (askıya al / yasakla)" },
      { key: "creators.read", label: "Creator'ları görüntüle" },
      { key: "creators.verify", label: "Creator başvurusunu onayla / reddet" },
      { key: "creators.manage", label: "Creator'ı askıya al / öne çıkar" },
    ],
  },
  {
    label: "AI ikizleri",
    perms: [
      { key: "twins.read", label: "AI ikizlerini görüntüle" },
      { key: "twins.review", label: "AI ikizi sürümünü incele" },
      { key: "twins.manage", label: "AI ikizini duraklat / geri çek" },
      { key: "consents.read", label: "Creator rızalarını görüntüle" },
    ],
  },
  {
    label: "Güvenlik ve uyum",
    perms: [
      { key: "content.read", label: "İçerikleri görüntüle" },
      { key: "moderation.read", label: "Moderasyon kuyruğunu görüntüle" },
      { key: "moderation.act", label: "Moderasyon kararı ver" },
      { key: "reports.read", label: "Raporları görüntüle" },
      { key: "reports.manage", label: "Raporları yönet" },
      { key: "appeals.manage", label: "İtirazlara karar ver" },
      { key: "conversations.read_sensitive", label: "Hassas sohbet erişimi (denetimli)" },
      { key: "support.read", label: "Destek taleplerini görüntüle" },
      { key: "support.manage", label: "Destek taleplerini yanıtla" },
    ],
  },
  {
    label: "Finans ve AI operasyonları",
    perms: [
      { key: "finance.read", label: "Finans verilerini görüntüle" },
      { key: "finance.refund", label: "İade başlat" },
      { key: "payouts.manage", label: "Ödeme talebi ve hesap onayı" },
      { key: "ai_ops.read", label: "AI operasyonlarını görüntüle" },
      { key: "ai_ops.manage", label: "AI ayarları ve iş yeniden deneme" },
      { key: "analytics.read", label: "Analitiği görüntüle" },
    ],
  },
  {
    label: "İçerik ve sistem",
    perms: [
      { key: "cms.manage", label: "CMS ve yardım içeriği" },
      { key: "campaigns.manage", label: "Kampanyalar" },
      { key: "categories.manage", label: "Kategoriler" },
      { key: "settings.read", label: "Ayarları görüntüle" },
      { key: "settings.manage", label: "Ayarları değiştir" },
      { key: "audit.read", label: "Denetim kayıtlarını görüntüle" },
    ],
  },
];
