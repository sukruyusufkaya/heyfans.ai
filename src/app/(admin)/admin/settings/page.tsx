import type { Metadata } from "next";
import { Check, CheckCircle2, Minus, XCircle } from "lucide-react";
import { ActionForm, type DialogField } from "@/components/admin/action-dialog";
import { AUDIT_SEVERITY_LABELS, AUDIT_SEVERITY_TONES, labelOf } from "@/components/admin/labels";
import { PERMISSION_GROUPS } from "@/components/admin/permission-labels";
import { AdminPage, DetailRow, Notice, ResultCount, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, Pagination, Td, Th } from "@/components/ui/display";
import { CreditPacksEditor } from "@/features/admin/credit-packs-editor";
import { updateSettingsAction } from "@/features/admin/settings-actions";
import { env, integrationStatus } from "@/config/env";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_PERMISSIONS, can } from "@/lib/permissions";
import { ADMIN_ROLES } from "@/models/identity";
import { ADULT_CONFIRM_PHRASE, getSettingsView, listAuditLogs, MFA_CONFIRM_PHRASE } from "@/services/admin/settings";
import { pick, pickEnum, pickPage, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Platform Ayarları") };
}

const TABS = ["general", "features", "security", "integrations", "roles", "audit"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { general: m("Gelir ve Fiyatlandırma"), features: m("Özellikler ve Bakım"), security: m("Güvenlik"), integrations: m("Entegrasyonlar"), roles: m("Roller ve Yetkiler"), audit: m("Denetim Kayıtları") };

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("settings.read");
  const t = await getT();
  const sp = await searchParams;
  const canAudit = can(user, "audit.read");
  const tab = pickEnum(sp, "tab", canAudit ? TABS : (TABS.filter((tb) => tb !== "audit") as readonly Tab[]), "general");
  const canManage = can(user, "settings.manage");
  const [s] = await Promise.all([getSettingsView()]);
  const tabs = TABS.filter((tb) => tb !== "audit" || canAudit);

  return (
    <AdminPage title={t("Platform Ayarları")} description={t("Finansal kurallar, özellik bayrakları, güvenlik, servis yapılandırması ve denetim kayıtları.")}>
      {!canManage && <Notice tone="neutral">{t("Ayarları görüntüleyebilirsiniz; değiştirmek için \"settings.manage\" izni (Süper Yönetici) gerekir.")}</Notice>}
      <Card>
        <TabLinks label={t("Ayar grupları")} active={tab} tabs={tabs.map((tb) => ({ key: tb, label: t(TAB_LABELS[tb]), href: href("/admin/settings", { tab: tb === "general" ? null : tb }) }))} className="mb-5" />
        {tab === "general" && <GeneralTab s={s} canManage={canManage} />}
        {tab === "features" && <FeaturesTab s={s} canManage={canManage} />}
        {tab === "security" && <SecurityTab s={s} canManage={canManage} />}
        {tab === "integrations" && <IntegrationsTab />}
        {tab === "roles" && <RolesTab />}
        {tab === "audit" && canAudit && <AuditTab sp={sp} />}
      </Card>
    </AdminPage>
  );
}

type View = Awaited<ReturnType<typeof getSettingsView>>;

/* ─── Gelir, kredi, sohbet ─── */
async function GeneralTab({ s, canManage }: { s: View; canManage: boolean }) {
  const t = await getT();
  const { formatDateTime } = await getFormatters();
  const reason = { label: t("Değişiklik gerekçesi"), placeholder: t("Bu ayar neden değişiyor?") } as const;
  const revenueFields: DialogField[] = [
    { name: "creatorSharePct", label: t("Creator payı (%)"), type: "number", defaultValue: s.revenue.creatorSharePct, min: 0, max: 100, step: 0.01, required: true, hint: t("Net tutar (komisyon ve KDV sonrası) üzerinden creator'a ayrılan pay.") },
    { name: "processingFeePct", label: t("Ödeme kuruluşu komisyonu (%)"), type: "number", defaultValue: s.revenue.processingFeePct, min: 0, max: 20, step: 0.01, required: true },
    { name: "processingFeeFixedTl", label: t("Sabit işlem komisyonu (₺)"), type: "number", defaultValue: s.revenue.processingFeeFixedTl, min: 0, max: 10, step: 0.01, required: true },
    { name: "vatPct", label: t("KDV (%)"), type: "number", defaultValue: s.revenue.vatPct, min: 0, max: 50, step: 0.01, required: true, hint: t("Fiyatlar KDV dahil kabul edilir.") },
    { name: "holdDays", label: t("Hak ediş bekleme süresi (gün)"), type: "number", defaultValue: s.revenue.holdDays, min: 0, max: 90, step: 1, required: true },
    { name: "minPayoutTl", label: t("Asgari ödeme tutarı (₺)"), type: "number", defaultValue: s.revenue.minPayoutTl, min: 0, step: 1, required: true },
    { name: "deductAiCostFromCreator", label: t("AI maliyetini creator payından düş"), type: "checkbox", defaultValue: s.revenue.deductAiCostFromCreator, hint: t("Açıkken AI kullanım maliyeti hak edişten kesilir.") },
  ];
  const chatFields: DialogField[] = [
    { name: "defaultMessageCredits", label: t("Varsayılan mesaj ücreti (kredi)"), type: "number", defaultValue: s.chat.defaultMessageCredits, min: 0, max: 100, step: 1, required: true },
    { name: "maxMessageCredits", label: t("Creator'ın koyabileceği en yüksek ücret (kredi)"), type: "number", defaultValue: s.chat.maxMessageCredits, min: 0, max: 100, step: 1, required: true },
    { name: "freeMessagesPerDay", label: t("Günlük ücretsiz mesaj"), type: "number", defaultValue: s.chat.freeMessagesPerDay, min: 0, max: 50, step: 1, required: true },
    { name: "maxInputChars", label: t("Mesaj başına en fazla karakter"), type: "number", defaultValue: s.chat.maxInputChars, min: 100, max: 10000, step: 50, required: true },
  ];
  return (
    <div className="grid gap-5">
      <section aria-labelledby="set-rev" className="rounded-2xl border border-line p-5">
        <CardHeader title={t("Gelir Paylaşımı ve Ücretler")} hint={t("Finansal kurallar — değişiklikler yeni işlemlere uygulanır, geçmiş kayıtlar değişmez")} as="h3" />
        <h4 id="set-rev" className="sr-only">
          {t("Gelir paylaşımı")}
        </h4>
        <ActionForm key={`revenue-${s.updatedAt.getTime()}`} action={updateSettingsAction} payload={{ group: "revenue" }} columns={2} fields={revenueFields} reason={canManage ? reason : false} disabled={!canManage} submitLabel={t("Gelir Kurallarını Kaydet")} className="max-w-3xl" />
        <Notice tone="warn" className="mt-4">
          {t("Komisyon, KDV ve paylaşım oranları finans/hukuk onayına tabidir. Bu değerler taslaktır; canlıya almadan önce sözleşme ve mevzuata göre doğrulayın.")}
        </Notice>
      </section>
      <section className="rounded-2xl border border-line p-5">
        <CardHeader title={t("Kredi Paketleri")} hint={t("Hayranların satın aldığı kredi paketleri ve kredi değeri")} as="h3" />
        <CreditPacksEditor key={`credits-${s.updatedAt.getTime()}`} initial={s.credits} disabled={!canManage} />
      </section>
      <section className="rounded-2xl border border-line p-5">
        <CardHeader title={t("Sohbet Fiyatlandırması")} hint={t("AI ikizi mesaj ücreti sınırları")} as="h3" />
        <ActionForm key={`chat-${s.updatedAt.getTime()}`} action={updateSettingsAction} payload={{ group: "chat" }} columns={2} fields={chatFields} reason={canManage ? reason : false} disabled={!canManage} submitLabel={t("Sohbet Ayarlarını Kaydet")} className="max-w-3xl" />
      </section>
      <p className="text-[11px] text-muted">{t("Son güncelleme: {date}", { date: formatDateTime(s.updatedAt) })}</p>
    </div>
  );
}

/* ─── Özellik bayrakları + bakım ─── */
async function FeaturesTab({ s, canManage }: { s: View; canManage: boolean }) {
  const t = await getT();
  const reason = { label: t("Değişiklik gerekçesi"), placeholder: t("Bu ayar neden değişiyor?") } as const;
  const f = s.features;
  const featureFields: DialogField[] = [
    { name: "creatorSignup", label: t("Yeni creator başvuruları"), type: "checkbox", defaultValue: f.creatorSignup, hint: t("Kapalıyken yeni creator başvurusu alınmaz.") },
    { name: "voiceCalls", label: t("Sesli görüşmeler"), type: "checkbox", defaultValue: f.voiceCalls, hint: t("Gerçek görüşme için RTC sağlayıcısı yapılandırılmalıdır.") },
    { name: "videoCalls", label: t("Görüntülü görüşmeler"), type: "checkbox", defaultValue: f.videoCalls },
    { name: "aiMemory", label: t("AI hafızası"), type: "checkbox", defaultValue: f.aiMemory, hint: t("İkizin kullanıcıyla ilgili bilgileri hatırlaması (kullanıcı izniyle).") },
    { name: "likenessGeneration", label: t("Görsel benzerlik üretimi"), type: "checkbox", defaultValue: f.likenessGeneration, hint: t("Creator kimlik doğrulaması ve ayrı rıza gerektirir. Varsayılan: kapalı.") },
    { name: "payouts", label: t("Creator ödeme talepleri"), type: "checkbox", defaultValue: f.payouts, hint: t("Ödeme sağlayıcısı ve finansal uygunluk tamamlanmadan açmayın.") },
    { name: "adultContent", label: t("Yetişkin içerik"), type: "checkbox", defaultValue: f.adultContent, hint: t("Yasal gereklilikler (yaş doğrulama sağlayıcısı, hukuki inceleme) tamamlanmadan AÇILMAMALIDIR. Varsayılan: kapalı.") },
    ...(!f.adultContent
      ? ([{ name: "confirmation", label: t("Onay için \"{phrase}\" yazın", { phrase: ADULT_CONFIRM_PHRASE }), showWhen: { field: "adultContent", equals: true }, placeholder: ADULT_CONFIRM_PHRASE, hint: t("Yetişkin içerik açılırken yazılı onay gerekir; işlem kritik olarak denetim kaydına yazılır.") }] as DialogField[])
      : []),
  ];
  const ageProvider = integrationStatus().find((i) => i.key === "age");
  const maintenanceFields: DialogField[] = [
    { name: "enabled", label: t("Bakım modu"), type: "checkbox", defaultValue: s.maintenance.enabled, hint: t("Açıkken ziyaretçilere bakım mesajı gösterilmesi amaçlanır.") },
    { name: "message", label: t("Bakım mesajı"), type: "textarea", rows: 2, maxLength: 300, defaultValue: s.maintenance.message, placeholder: t("Kısa bir bakım çalışması yapıyoruz. Birazdan döneceğiz.") },
  ];
  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-line p-5">
        <CardHeader title={t("Özellik Bayrakları")} hint={t("Platform genelinde özellikleri aç/kapat")} as="h3" />
        {ageProvider && !ageProvider.configured && (
          <Notice tone="warn" className="mb-4">
            {t("Yaş doğrulama sağlayıcısı yapılandırılmadı. Yetişkin içerik bayrağı sağlayıcı olmadan açılmamalıdır; açılsa dahi yetişkin içerik varsayılan olarak kapalı kalır ve creator sınırlarında flört tonu platform politikasıyla sınırlanır.")}
          </Notice>
        )}
        <ActionForm key={`features-${s.updatedAt.getTime()}`} action={updateSettingsAction} payload={{ group: "features" }} fields={featureFields} reason={canManage ? reason : false} disabled={!canManage} submitLabel={t("Bayrakları Kaydet")} className="max-w-2xl" />
      </section>
      <section className="rounded-2xl border border-line p-5">
        <CardHeader title={t("Bakım Modu")} hint={t("Planlı bakım duyurusu")} as="h3" />
        <Notice tone="warn" className="mb-4">
          {t("Bakım modu ve mesajı kayıt altına alınır; ziyaretçi sayfalarında zorunlu kılınması uygulama katmanında (proxy/layout) henüz bağlanmamıştır.")}
        </Notice>
        <ActionForm key={`maintenance-${s.updatedAt.getTime()}`} action={updateSettingsAction} payload={{ group: "maintenance" }} fields={maintenanceFields} reason={canManage ? reason : false} disabled={!canManage} submitLabel={t("Bakım Ayarını Kaydet")} className="max-w-2xl" />
      </section>
    </div>
  );
}

/* ─── Güvenlik ─── */
async function SecurityTab({ s, canManage }: { s: View; canManage: boolean }) {
  const t = await getT();
  const reason = { label: t("Değişiklik gerekçesi"), placeholder: t("Bu ayar neden değişiyor?") } as const;
  const e = env();
  const fields: DialogField[] = [
    { name: "adminMfaRequired", label: t("Yönetici 2FA zorunlu"), type: "checkbox", defaultValue: s.security.adminMfaRequired, hint: e.APP_MODE === "production" ? t("Üretimde kapatılamaz.") : t("Tüm yönetici oturumlarında iki adımlı doğrulama.") },
    ...(s.security.adminMfaRequired
      ? ([{ name: "confirmation", label: t("Kapatmak için \"{phrase}\" yazın", { phrase: MFA_CONFIRM_PHRASE }), showWhen: { field: "adminMfaRequired", equals: false }, placeholder: MFA_CONFIRM_PHRASE }] as DialogField[])
      : []),
    { name: "sessionMaxAgeDays", label: t("Oturum süresi (gün)"), type: "number", defaultValue: s.security.sessionMaxAgeDays, min: 1, max: 90, step: 1, required: true },
    { name: "maxLoginAttempts", label: t("Dakika başına giriş denemesi sınırı"), type: "number", defaultValue: s.security.maxLoginAttempts, min: 3, max: 20, step: 1, required: true },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-line p-5">
        <CardHeader title={t("Güvenlik Politikaları")} hint={t("Zorunlu kontroller")} as="h3" />
        <ActionForm key={`security-${s.updatedAt.getTime()}`} action={updateSettingsAction} payload={{ group: "security" }} fields={fields} reason={canManage ? reason : false} disabled={!canManage} submitLabel={t("Güvenlik Ayarlarını Kaydet")} />
        <Notice tone="warn" className="mt-4">
          {t("Oturum süresi ve deneme sınırı değerleri kayıt altındadır; kimlik doğrulama altyapısında (Better Auth) şu an kod yapılandırmasındaki değerler geçerlidir. Hassas sohbet erişiminde gerekçe ve vaka numarası zorunluluğu kod düzeyinde her zaman uygulanır.")}
        </Notice>
      </section>
      <section className="rounded-2xl border border-line p-5">
        <CardHeader title={t("Geçerli Durum")} hint={t("Ortam yapılandırmasından")} as="h3" />
        <DetailRow label={t("Uygulama modu")}>{e.APP_MODE}</DetailRow>
        <DetailRow label={t("ADMIN_MFA_ENFORCED (ortam)")}>
          <StatusPill size="sm" tone={e.ADMIN_MFA_ENFORCED ? "green" : "warn"}>
            {e.ADMIN_MFA_ENFORCED ? t("Zorunlu") : t("Kapalı (yerel geliştirme)")}
          </StatusPill>
        </DetailRow>
        <DetailRow label={t("Ayar: yönetici 2FA")}>
          <StatusPill size="sm" tone={s.security.adminMfaRequired ? "green" : "warn"}>
            {s.security.adminMfaRequired ? t("Zorunlu") : t("Kapalı")}
          </StatusPill>
        </DetailRow>
        <DetailRow label={t("Hassas erişimde gerekçe")}>
          <StatusPill size="sm" tone="green">
            {t("Her zaman zorunlu")}
          </StatusPill>
        </DetailRow>
        <DetailRow label={t("Denetim günlüğü")}>
          <StatusPill size="sm" tone="green">
            {t("Açık · değiştirilemez")}
          </StatusPill>
        </DetailRow>
        <DetailRow label={t("Veri şifreleme anahtarı")}>
          <StatusPill size="sm" tone={e.DATA_ENCRYPTION_KEY ? "green" : "warn"}>
            {e.DATA_ENCRYPTION_KEY ? t("Tanımlı") : t("Tanımlı değil")}
          </StatusPill>
        </DetailRow>
      </section>
    </div>
  );
}

/* ─── Entegrasyonlar ─── */
async function IntegrationsTab() {
  const t = await getT();
  const list = integrationStatus();
  const e = env();
  return (
    <div className="grid gap-4">
      <Notice tone="info">{t("Yalnız yapılandırma durumu ve eksik ortam değişkeni adları gösterilir; gizli anahtar değerleri hiçbir zaman gösterilmez. Değişkenleri dağıtım ortamınızda (ör. Vercel) tanımlayın.")}</Notice>
      <div className="grid gap-3.5 md:grid-cols-2">
        {list.map((i) => (
          <article key={i.key} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-ink">{t(i.label)}</h3>
                <p className="mt-0.5 text-[11px] text-muted">
                  {t("Mod:")} <b className="text-ink-soft">{i.mode}</b>
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-extrabold">
                {i.configured ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <XCircle className="size-4 text-danger" aria-hidden />}
                <span className={i.configured ? "text-success" : "text-danger"}>{i.configured ? t("Yapılandırıldı") : t("Yapılandırılmadı")}</span>
              </span>
            </div>
            {i.missing.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted">{t("Eksik / gerekli değişkenler")}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {i.missing.map((name) => (
                    <li key={name}>
                      <code className="rounded-md bg-soft px-2 py-1 text-[10px] font-bold text-ink-soft">{name}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(i.mode === "mock" || i.mode === "outbox" || i.mode === "local") && <p className="mt-3 text-[11px] text-warning">{t("Geliştirme/test modu: üretimde gerçek sağlayıcı gerekir.")}</p>}
          </article>
        ))}
      </div>
      <DetailRow label={t("Uygulama modu (APP_MODE)")}>{e.APP_MODE}</DetailRow>
      <DetailRow label={t("Vektör arama modu")}>{e.VECTOR_SEARCH_MODE}</DetailRow>
    </div>
  );
}

/* ─── Roller ve yetkiler ─── */
async function RolesTab() {
  const t = await getT();
  return (
    <div className="grid gap-4">
      <Notice tone="info">{t("Roller kod düzeyinde tanımlıdır; bu matris yalnız görüntüleme içindir. Kullanıcıya yönetici rolü atamayı yalnız Süper Yönetici Kullanıcılar sayfasından yapabilir.")}</Notice>
      <div className="-mx-1 overflow-x-auto px-1 scrollbar-thin">
        <table className="w-full min-w-[860px] border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className="sticky start-0 z-10 border-b border-line bg-white px-3 py-2.5 text-start text-[10px] font-black uppercase tracking-wider text-muted">
                {t("Yetki / Rol")}
              </th>
              {ADMIN_ROLES.map((r) => (
                <th key={r} scope="col" className="border-b border-line px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-muted">
                  {t(ADMIN_ROLE_LABELS[r])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((g) => (
              <RoleGroup key={g.label} group={g} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function RoleGroup({ group }: { group: (typeof PERMISSION_GROUPS)[number] }) {
  const t = await getT();
  return (
    <>
      <tr>
        <th scope="colgroup" colSpan={ADMIN_ROLES.length + 1} className="bg-soft px-3 py-2 text-start text-[10px] font-black uppercase tracking-wider text-brand-600">
          {t(group.label)}
        </th>
      </tr>
      {group.perms.map((p) => (
        <tr key={p.key}>
          <th scope="row" className="sticky start-0 border-b border-line-soft bg-white px-3 py-2.5 text-start font-bold text-ink-soft">
            {t(p.label)}
            <code className="ms-2 text-[9px] font-medium text-muted">{p.key}</code>
          </th>
          {ADMIN_ROLES.map((r) => {
            const has = (ADMIN_ROLE_PERMISSIONS[r] as string[]).includes(p.key);
            return (
              <td key={r} className="border-b border-line-soft px-2 py-2.5 text-center">
                {has ? <Check className="mx-auto size-4 text-success" aria-label={t("Yetkili")} /> : <Minus className="mx-auto size-4 text-[#d9cfdc]" aria-label={t("Yetkisiz")} />}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/* ─── Denetim kayıtları ─── */
async function AuditTab({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const t = await getT();
  const { formatDateTime } = await getFormatters();
  const action = pick(sp, "action");
  const actor = pick(sp, "actor");
  const target = pick(sp, "target");
  const severity = pickEnum(sp, "severity", ["all", "info", "notice", "critical"] as const, "all");
  const page = pickPage(sp);
  const list = await listAuditLogs({ action, actor, target, severity: severity === "all" ? "" : severity, page });
  const hrefFor = (p: number) => href("/admin/settings", { tab: "audit", action: action || null, actor: actor || null, target: target || null, severity: severity === "all" ? null : severity, page: p });
  return (
    <div>
      <form action="/admin/settings" method="get" role="search" className="mb-4 flex flex-wrap items-end gap-2.5">
        <input type="hidden" name="tab" value="audit" />
        <div className="min-w-[180px] flex-1">
          <label htmlFor="al-action" className="mb-1 block text-[10px] font-extrabold text-muted">
            {t("İşlem")}
          </label>
          <input id="al-action" name="action" list="audit-actions" defaultValue={action} placeholder={t("ör. finance.refund")} maxLength={100} className="h-10 w-full rounded-[10px] border border-line bg-white px-3 text-[12px] focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          <datalist id="audit-actions">
            {list.actions.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="min-w-[180px] flex-1">
          <label htmlFor="al-actor" className="mb-1 block text-[10px] font-extrabold text-muted">
            {t("Yapan (ad veya e-posta)")}
          </label>
          <input id="al-actor" name="actor" defaultValue={actor} maxLength={100} className="h-10 w-full rounded-[10px] border border-line bg-white px-3 text-[12px] focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        </div>
        <div className="min-w-[140px]">
          <label htmlFor="al-target" className="mb-1 block text-[10px] font-extrabold text-muted">
            {t("Hedef türü")}
          </label>
          <input id="al-target" name="target" defaultValue={target} placeholder={t("ör. PaymentTransaction")} maxLength={60} className="h-10 w-full rounded-[10px] border border-line bg-white px-3 text-[12px] focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        </div>
        <div>
          <label htmlFor="al-sev" className="mb-1 block text-[10px] font-extrabold text-muted">
            {t("Önem")}
          </label>
          <select id="al-sev" name="severity" defaultValue={severity} className="h-10 rounded-[10px] border border-line bg-white px-3 text-[12px] focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100">
            <option value="all">{t("Tümü")}</option>
            <option value="info">{t("Bilgi")}</option>
            <option value="notice">{t("Önemli")}</option>
            <option value="critical">{t("Kritik")}</option>
          </select>
        </div>
        <button type="submit" className="h-10 rounded-[10px] border border-line bg-white px-4 text-[11px] font-extrabold text-ink-soft hover:border-brand-200">
          {t("Filtrele")}
        </button>
      </form>
      {list.items.length === 0 ? (
        <EmptyState compact title={t("Kayıt bulunamadı")} description={t("Bu filtreyle eşleşen denetim kaydı yok.")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("Zaman")}</Th>
              <Th>{t("İşlem")}</Th>
              <Th>{t("Yapan")}</Th>
              <Th>{t("Hedef")}</Th>
              <Th>{t("Önem")}</Th>
              <Th>{t("Gerekçe / ayrıntı")}</Th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</Td>
                <Td>
                  <b className="text-ink">{r.action}</b>
                </Td>
                <Td>
                  {r.actor}
                  {r.actorRole && <span className="block text-[10px] text-muted">{labelOf(t, ADMIN_ROLE_LABELS, r.actorRole)}</span>}
                </Td>
                <Td>
                  {r.targetType ?? "—"}
                  {r.targetId && <span className="block max-w-[120px] truncate text-[10px] text-muted">{r.targetId}</span>}
                </Td>
                <Td>
                  <StatusPill size="sm" tone={AUDIT_SEVERITY_TONES[r.severity] ?? "gray"}>
                    {labelOf(t, AUDIT_SEVERITY_LABELS, r.severity)}
                  </StatusPill>
                </Td>
                <Td className="max-w-[320px]">
                  {r.reason && <p className="text-[11px] text-ink-soft">{r.reason}</p>}
                  {r.metadata && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[10px] font-bold text-brand-500">{t("Ayrıntı")}</summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-soft p-2 text-[10px] leading-relaxed text-muted-strong">{r.metadata}</pre>
                    </details>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun={t("kayıt")} />
      <Pagination page={list.page} pageCount={list.pageCount} hrefFor={hrefFor} className="mt-4" />
      <p className="mt-3 text-center text-[10px] text-muted">{t("Denetim kayıtları değiştirilemez ve silinemez.")}</p>
    </div>
  );
}
