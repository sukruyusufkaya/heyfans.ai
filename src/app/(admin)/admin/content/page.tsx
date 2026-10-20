import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileCheck2, Megaphone, Plus, Star, Timer } from "lucide-react";
import { ActionButton, ActionDialog, ActionForm, type DialogField } from "@/components/admin/action-dialog";
import { CAMPAIGN_AUDIENCE_LABELS, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_TONES, CAMPAIGN_TYPE_LABELS, HELP_CATEGORY_LABELS, HOMEPAGE_SECTION_LABELS, LEGAL_REVIEW_LABELS } from "@/components/admin/labels";
import { AdminPage, KpiGrid, Notice, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, StatCard, Td, Th } from "@/components/ui/display";
import { setCreatorFeaturedAction } from "@/features/admin/creators-actions";
import { deleteCampaignAction, deleteCategoryAction, deleteHelpArticleAction, saveCampaignAction, saveCategoryAction, saveHelpArticleAction, updateHomeSectionAction } from "@/features/admin/content-actions";
import { LegalPageEditor } from "@/features/admin/legal-page-editor";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { CATEGORY_ICONS, getCmsSummary, listCampaignsAdmin, listCategoriesAdmin, listCmsPagesAdmin, listHelpArticlesAdmin, listHomeSections } from "@/services/admin/cms";
import { listFeaturedCreators } from "@/services/admin/creators";
import { pickEnum, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("CMS ve Kampanyalar") };
}

const TABS = ["home", "featured", "categories", "campaigns", "legal", "help"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { home: m("Ana Sayfa Vitrini"), featured: m("Öne Çıkan Creator'lar"), categories: m("Kategoriler"), campaigns: m("Kampanyalar"), legal: m("Hukuki ve Sabit Sayfalar"), help: m("Yardım Makaleleri") };

const istDate = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" /* i18n-ignore */ }).format(new Date(d)) : "");
const opts = (t: Translator, labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label: t(label) }));

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("cms.manage");
  const t = await getT();
  const { formatNumber } = await getFormatters();
  const sp = await searchParams;
  const tab = pickEnum(sp, "tab", TABS, "home");
  const [summary] = await Promise.all([getCmsSummary()]);

  return (
    <AdminPage
      title={t("CMS ve Kampanyalar")}
      description={t("Ana sayfa vitrini, kategoriler, içerik yayınları ve pazarlama kampanyalarını yönetin.")}
      actions={
        <>
          <Button asChild variant="outline" size="md">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink /> {t("Yayın Önizlemesi")}
            </Link>
          </Button>
        </>
      }
    >
      <KpiGrid>
        <StatCard label={t("Yayınlanan İçerik")} value={formatNumber(summary.published)} icon={<FileCheck2 />} tone="pink" foot={t("sayfa + yardım makalesi")} />
        <StatCard label={t("Aktif Kampanya")} value={formatNumber(summary.campaignsActive)} icon={<Megaphone />} tone="violet" />
        <StatCard label={t("Öne Çıkan Creator")} value={formatNumber(summary.featured)} icon={<Star />} tone="teal" />
        <StatCard label={t("Bekleyen Yayın")} value={formatNumber(summary.pending)} icon={<Timer />} tone="orange" foot={t("taslak sayfa, makale, kampanya, kapalı bölüm")} />
      </KpiGrid>

      <Card>
        <TabLinks label={t("CMS bölümleri")} active={tab} tabs={TABS.map((tb) => ({ key: tb, label: t(TAB_LABELS[tb]), href: href("/admin/content", { tab: tb === "home" ? null : tb }) }))} className="mb-5" />
        <Notice tone="neutral" className="mb-5">
          {t("İçerik Türkçe kaynak metindir; diğer dillerde çevirisi varsa o gösterilir, değiştirilen metin çevrilene kadar Türkçe görünür.")}
        </Notice>
        {tab === "home" && <HomeTab />}
        {tab === "featured" && <FeaturedTab canManage={can(user, "creators.manage") || can(user, "cms.manage")} />}
        {tab === "categories" && <CategoriesTab canManage={can(user, "categories.manage")} />}
        {tab === "campaigns" && <CampaignsTab canManage={can(user, "campaigns.manage")} />}
        {tab === "legal" && <LegalTab isSuper={user.adminRole === "super_admin"} />}
        {tab === "help" && <HelpTab />}
      </Card>
    </AdminPage>
  );
}

/* ─── Ana sayfa vitrini ─── */
async function HomeTab() {
  const t = await getT();
  const { formatDate } = await getFormatters();
  const sections = await listHomeSections();
  if (sections.length === 0) return <EmptyState compact title={t("Vitrin bölümü yok")} description={t("Veritabanında ana sayfa bölümü tanımlı değil (seed çalıştırılmamış olabilir).")} />;
  const hero = sections.find((s) => s.type === "hero");
  return (
    <div className="grid gap-5">
      {hero && (
        <div className="hf-gradient-hero rounded-2xl border border-line p-6">
          <p className="eyebrow mb-2">{hero.badge || t("ÖNE ÇIKAN BÖLÜM")}</p>
          <h3 className="max-w-2xl text-2xl font-black leading-tight tracking-[-0.03em] text-ink">{hero.title || t("(başlık yok)")}</h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-strong">{hero.subtitle}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {hero.primaryCtaLabel && <span className="rounded-full bg-brand-500 px-4 py-2 text-[11px] font-extrabold text-white">{hero.primaryCtaLabel}</span>}
            {hero.secondaryCtaLabel && <span className="rounded-full border border-brand-300 bg-white px-4 py-2 text-[11px] font-extrabold text-brand-600">{hero.secondaryCtaLabel}</span>}
            <StatusPill tone={hero.isActive ? "green" : "gray"}>{hero.isActive ? t("Yayında") : t("Kapalı")}</StatusPill>
            <span className="text-[10px] text-muted">{t("Son güncelleme: {date}", { date: formatDate(hero.updatedAt) })}</span>
          </div>
        </div>
      )}
      <div className="grid gap-4">
        {sections.map((s) => {
          const fields: DialogField[] = [{ name: "title", label: t("Başlık"), defaultValue: s.title, maxLength: 200 }];
          if (s.type !== "featured_creators") fields.push({ name: "subtitle", label: t("Alt başlık / açıklama"), type: "textarea", rows: 2, defaultValue: s.subtitle, maxLength: 600 });
          if (s.type === "hero")
            fields.push(
              { name: "badge", label: t("Rozet metni"), defaultValue: s.badge, maxLength: 120 },
              { name: "primaryCtaLabel", label: t("Birincil buton metni"), defaultValue: s.primaryCtaLabel, maxLength: 60 },
              { name: "primaryCtaHref", label: t("Birincil buton bağlantısı"), defaultValue: s.primaryCtaHref, maxLength: 300, hint: t("'/' ile başlayan yol veya https:// adresi.") },
              { name: "secondaryCtaLabel", label: t("İkincil buton metni"), defaultValue: s.secondaryCtaLabel, maxLength: 60 },
              { name: "secondaryCtaHref", label: t("İkincil buton bağlantısı"), defaultValue: s.secondaryCtaHref, maxLength: 300 },
            );
          if (s.type === "announcement" || s.type === "banner" || s.type === "cta")
            fields.push({ name: "ctaLabel", label: t("Buton metni"), defaultValue: s.ctaLabel, maxLength: 60 }, { name: "ctaHref", label: t("Buton bağlantısı"), defaultValue: s.ctaHref, maxLength: 300 });
          if (s.type === "featured_creators") fields.push({ name: "limit", label: t("Gösterilecek creator sayısı"), type: "number", defaultValue: s.limit ?? 6, min: 1, max: 24, step: 1 });
          fields.push({ name: "isActive", label: t("Bölüm yayında"), type: "checkbox", defaultValue: s.isActive });
          return (
            <details key={s.id} className="group min-w-0 rounded-2xl border border-line bg-white open:shadow-[var(--shadow-card)]" open={s.type === "hero" || s.type === "announcement"}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-[11px] font-black text-brand-600">{s.order}</span>
                  <span className="min-w-0">
                    <b className="block text-sm text-ink">{HOMEPAGE_SECTION_LABELS[s.type] ? t(HOMEPAGE_SECTION_LABELS[s.type]!) : s.type}</b>
                    <span className="block max-w-md truncate text-[11px] text-muted">{s.title || "—"}</span>
                  </span>
                </span>
                <StatusPill tone={s.isActive ? "green" : "gray"}>{s.isActive ? t("Yayında") : t("Kapalı")}</StatusPill>
              </summary>
              <div className="border-t border-line-soft px-5 pb-5 pt-4">
                <ActionForm action={updateHomeSectionAction} payload={{ sectionId: s.id }} fields={fields} reason={{ label: t("Değişiklik notu"), defaultValue: t("Vitrin metni güncellendi.") }} submitLabel={t("Bölümü Kaydet")} className="max-w-2xl" />
              </div>
            </details>
          );
        })}
      </div>
      <Notice tone="neutral">{t("Vitrin değişiklikleri kaydedildiği anda ana sayfaya yansır; her kayıt gerekçesiyle denetim kaydına yazılır. Bölümlerin sırası ve yerleşimi kod tarafından belirlenir.")}</Notice>
    </div>
  );
}

/* ─── Öne çıkan creator'lar ─── */
async function FeaturedTab({ canManage }: { canManage: boolean }) {
  const t = await getT();
  const { formatNumber } = await getFormatters();
  const { featured, candidates } = await listFeaturedCreators();
  return (
    <div className="grid gap-5">
      {canManage && (
        <div className="rounded-2xl border border-line p-5">
          <p className="mb-3 text-sm font-extrabold text-ink">{t("Creator öne çıkar")}</p>
          {candidates.length === 0 ? (
            <p className="text-xs text-muted">{t("Öne çıkarılabilecek onaylı creator kalmadı.")}</p>
          ) : (
            <ActionForm
              action={setCreatorFeaturedAction}
              payload={{ featured: true }}
              fields={[
                { name: "creatorId", label: t("Creator"), type: "select", options: candidates.map((c) => ({ value: c.id, label: c.label })), defaultValue: candidates[0]?.id },
                { name: "rank", label: t("Sıra (küçük = önde)"), type: "number", defaultValue: featured.length + 1, min: 0, max: 9999, step: 1 },
              ]}
              submitLabel={t("Öne Çıkar")}
              className="max-w-xl"
            />
          )}
        </div>
      )}
      {featured.length === 0 ? (
        <EmptyState compact title={t("Öne çıkan creator yok")} description={t("Ana sayfadaki 'Öne çıkan' alanı otomatik olarak popüler creator'larla dolar.")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("Creator")}</Th>
              <Th className="text-end">{t("Takipçi")}</Th>
              <Th>{t("Durum")}</Th>
              <Th>{t("Sıra")}</Th>
              <Th className="text-end">{t("İşlem")}</Th>
            </tr>
          </thead>
          <tbody>
            {featured.map((c) => (
              <tr key={c.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar src={c.avatarUrl} name={c.displayName} size={34} />
                    <span>
                      <b className="block text-ink">{c.displayName}</b>
                      <small className="text-[10px] text-muted">@{c.username}</small>
                    </span>
                  </div>
                </Td>
                <Td className="text-end tabular-nums">{formatNumber(c.followers)}</Td>
                <Td>
                  <StatusPill tone={c.status === "approved" ? "green" : "warn"}>{c.status === "approved" ? t("Aktif") : t("Aktif değil — vitrinde görünmez")}</StatusPill>
                </Td>
                <Td>
                  {canManage ? (
                    <ActionForm action={setCreatorFeaturedAction} payload={{ creatorId: c.id, featured: true }} fields={[{ name: "rank", label: t("Sıra"), type: "number", defaultValue: c.rank, min: 0, max: 9999, step: 1, className: "w-24" }]} submitLabel={t("Kaydet")} variant="secondary" className="grid-flow-col items-end" />
                  ) : (
                    c.rank
                  )}
                </Td>
                <Td className="text-end">
                  {canManage && (
                    <ActionButton action={setCreatorFeaturedAction} payload={{ creatorId: c.id, featured: false, rank: 0 }} variant="ghost" size="xs">
                      {t("Kaldır")}
                    </ActionButton>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}

/* ─── Kategoriler ─── */
async function CategoriesTab({ canManage }: { canManage: boolean }) {
  const t = await getT();
  const cats = await listCategoriesAdmin();
  const baseFields = (c?: (typeof cats)[number]): DialogField[] => [
    ...(c ? [] : [{ name: "slug", label: t("Kısa ad (slug)"), required: true, maxLength: 60, placeholder: t("ör. yasam-tarzi"), hint: t("Yalnız küçük harf, rakam ve '-'. Oluşturulduktan sonra değiştirilemez.") } satisfies DialogField]),
    { name: "name", label: t("Kategori adı"), required: true, maxLength: 80, defaultValue: c?.name },
    { name: "description", label: t("Açıklama"), type: "textarea", rows: 2, maxLength: 500, defaultValue: c?.description },
    { name: "icon", label: t("Simge"), type: "select", options: CATEGORY_ICONS.map((i) => ({ value: i, label: i })), defaultValue: c?.icon ?? "sparkles" },
    { name: "order", label: t("Sıra"), type: "number", min: 0, max: 9999, step: 1, required: true, defaultValue: c?.order ?? cats.length + 1 },
    { name: "heroTitle", label: t("Sayfa başlığı (isteğe bağlı)"), maxLength: 120, defaultValue: c?.heroTitle },
    { name: "heroText", label: t("Sayfa açıklaması (isteğe bağlı)"), type: "textarea", rows: 2, maxLength: 600, defaultValue: c?.heroText },
    { name: "isActive", label: t("Aktif (keşif ve filtrelerde görünür)"), type: "checkbox", defaultValue: c?.isActive ?? true },
  ];
  return (
    <div className="grid gap-4">
      {canManage && (
        <div className="flex justify-end">
          <ActionDialog trigger={<Button size="md"><Plus /> {t("Yeni Kategori")}</Button>} title={t("Yeni kategori")} action={saveCategoryAction} fields={baseFields()} reason={false} confirmLabel={t("Oluştur")} />
        </div>
      )}
      {cats.length === 0 ? (
        <EmptyState compact title={t("Kategori yok")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("Sıra")}</Th>
              <Th>{t("Kategori")}</Th>
              <Th>{t("Simge")}</Th>
              <Th className="text-end">{t("Creator")}</Th>
              <Th>{t("Durum")}</Th>
              <Th className="text-end">{t("İşlem")}</Th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id}>
                <Td className="tabular-nums">{c.order}</Td>
                <Td>
                  <b className="block text-ink">{c.name}</b>
                  <small className="text-[10px] text-muted">/{c.slug}</small>
                </Td>
                <Td>{c.icon}</Td>
                <Td className="text-end tabular-nums">{c.creators}</Td>
                <Td>
                  <StatusPill tone={c.isActive ? "green" : "gray"}>{c.isActive ? t("Aktif") : t("Pasif")}</StatusPill>
                </Td>
                <Td className="text-end">
                  {canManage ? (
                    <div className="flex justify-end gap-1.5">
                      <ActionDialog trigger={<Button size="xs" variant="secondary">{t("Düzenle")}</Button>} title={t("{name} — düzenle", { name: c.name })} action={saveCategoryAction} payload={{ id: c.id, slug: c.slug }} fields={baseFields(c)} reason={false} confirmLabel={t("Kaydet")} />
                      <ActionDialog
                        trigger={
                          <Button size="xs" variant="danger-soft" disabled={c.creators > 0} title={c.creators > 0 ? t("Kullanımda: silmek yerine pasife alın") : undefined}>
                            {t("Sil")}
                          </Button>
                        }
                        title={t("{name} kategorisini sil", { name: c.name })}
                        description={t("Kategori kalıcı olarak silinir. Kullanımda olan kategoriler silinemez; onları pasife alın.")}
                        action={deleteCategoryAction}
                        payload={{ id: c.id }}
                        reason={{ label: t("Silme gerekçesi") }}
                        confirmLabel={t("Sil")}
                        tone="danger"
                      />
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}

/* ─── Kampanyalar ─── */
async function CampaignsTab({ canManage }: { canManage: boolean }) {
  const t = await getT();
  const { formatDate, formatNumber } = await getFormatters();
  const campaigns = await listCampaignsAdmin();
  const fieldsFor = (c?: (typeof campaigns)[number]): DialogField[] => [
    { name: "name", label: t("Kampanya adı"), required: true, maxLength: 120, defaultValue: c?.name },
    { name: "type", label: t("Tür"), type: "select", options: opts(t, CAMPAIGN_TYPE_LABELS), defaultValue: c?.type ?? "banner" },
    { name: "status", label: t("Durum"), type: "select", options: opts(t, CAMPAIGN_STATUS_LABELS), defaultValue: c?.status ?? "draft", hint: t("Geçişler: taslak → planlandı/aktif → sona erdi → arşiv.") },
    { name: "audience", label: t("Hedef kitle"), type: "select", options: opts(t, CAMPAIGN_AUDIENCE_LABELS), defaultValue: c?.audience ?? "all" },
    { name: "startsOn", label: t("Başlangıç tarihi"), type: "date", defaultValue: istDate(c?.startsAt ?? null) },
    { name: "endsOn", label: t("Bitiş tarihi"), type: "date", defaultValue: istDate(c?.endsAt ?? null) },
    { name: "headline", label: t("Başlık metni"), maxLength: 160, defaultValue: c?.headline },
    { name: "body", label: t("Açıklama"), type: "textarea", rows: 2, maxLength: 600, defaultValue: c?.body },
    { name: "ctaLabel", label: t("Buton metni"), maxLength: 60, defaultValue: c?.ctaLabel },
    { name: "ctaUrl", label: t("Buton bağlantısı"), maxLength: 300, defaultValue: c?.ctaUrl, hint: t("'/' ile başlayan yol veya https:// adresi.") },
    { name: "bonusPercent", label: t("Kredi bonusu (%)"), type: "number", min: 1, max: 100, step: 1, defaultValue: c?.bonusPercent, showWhen: { field: "type", equals: "credit_bonus" } },
    { name: "discountPercent", label: t("İndirim (%)"), type: "number", min: 1, max: 90, step: 1, defaultValue: c?.discountPercent, showWhen: { field: "type", equals: "discount" } },
  ];
  return (
    <div className="grid gap-4">
      {canManage && (
        <div className="flex justify-end">
          <ActionDialog trigger={<Button size="md"><Plus /> {t("Yeni Kampanya")}</Button>} title={t("Yeni kampanya")} action={saveCampaignAction} fields={fieldsFor()} reason={{ label: t("Oluşturma notu"), defaultValue: t("Yeni kampanya oluşturuldu.") }} confirmLabel={t("Oluştur")} size="lg" />
        </div>
      )}
      {campaigns.length === 0 ? (
        <EmptyState compact title={t("Kampanya yok")} description={t("Yeni bir kampanya oluşturarak başlayın.")} />
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <article key={c.id} className="flex flex-col rounded-2xl border border-line bg-white p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-ink">{c.name}</h3>
                  <p className="text-[10px] text-muted">
                    {t(CAMPAIGN_TYPE_LABELS[c.type]!)} · {t(CAMPAIGN_AUDIENCE_LABELS[c.audience]!)}
                  </p>
                </div>
                <StatusPill tone={CAMPAIGN_STATUS_TONES[c.status] ?? "gray"}>{t(CAMPAIGN_STATUS_LABELS[c.status]!)}</StatusPill>
              </div>
              <p className="flex-1 text-[11px] leading-relaxed text-muted-strong">{c.headline || c.body || t("Metin girilmedi.")}</p>
              <p className="mt-2 text-[11px] font-bold text-ink">{c.startsAt || c.endsAt ? [c.startsAt ? formatDate(c.startsAt) : "…", c.endsAt ? formatDate(c.endsAt) : t("süresiz")].join(" – ") : t("Tarih belirtilmedi")}</p>
              {c.metrics.impressions > 0 && (
                <p className="mt-1 text-[10px] text-muted">
                  {t("{impressions} gösterim · {clicks} tıklama · {conversions} dönüşüm", { impressions: formatNumber(c.metrics.impressions), clicks: formatNumber(c.metrics.clicks), conversions: formatNumber(c.metrics.conversions) })}
                </p>
              )}
              {canManage && (
                <div className="mt-3 flex gap-1.5 border-t border-line-soft pt-3">
                  {c.status !== "archived" && (
                    <ActionDialog trigger={<Button size="xs" variant="secondary">{t("Düzenle")}</Button>} title={t("{name} — düzenle", { name: c.name })} action={saveCampaignAction} payload={{ id: c.id }} fields={fieldsFor(c)} reason={{ label: t("Değişiklik notu"), defaultValue: t("Kampanya güncellendi.") }} confirmLabel={t("Kaydet")} size="lg" />
                  )}
                  {c.status === "draft" && (
                    <ActionDialog trigger={<Button size="xs" variant="danger-soft">{t("Sil")}</Button>} title={t("Taslak kampanyayı sil")} action={deleteCampaignAction} payload={{ id: c.id }} reason={{ label: t("Silme gerekçesi") }} confirmLabel={t("Sil")} tone="danger" />
                  )}
                  {c.isDemo && <StatusPill size="sm" tone="warn" className="ms-auto self-center">{t("Demo")}</StatusPill>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Hukuki / sabit sayfalar ─── */
async function LegalTab({ isSuper }: { isSuper: boolean }) {
  const t = await getT();
  const { formatDateTime } = await getFormatters();
  const pages = await listCmsPagesAdmin();
  return (
    <div className="grid gap-4">
      <Notice tone="warn">
        {t("Hukuki metinler taslaktır ve yayından önce avukat incelemesi gerektirir. \"Hukuken onaylı\" durumunu yalnız Süper Yönetici verebilir; onaylı bir metin başka biri tarafından değiştirilirse onay düşer.")}
      </Notice>
      {pages.length === 0 ? (
        <EmptyState compact title={t("Sayfa yok")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("Sayfa")}</Th>
              <Th>{t("Tür")}</Th>
              <Th>{t("Sürüm")}</Th>
              <Th>{t("Yayın")}</Th>
              <Th>{t("Hukuki inceleme")}</Th>
              <Th>{t("Güncelleme")}</Th>
              <Th className="text-end">{t("İşlem")}</Th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <Td>
                  <b className="block text-ink">{p.title}</b>
                  <small className="text-[10px] text-muted">/{p.slug}</small>
                </Td>
                <Td>{p.kind === "legal" ? t("Hukuki") : p.kind === "help" ? t("Yardım") : t("Pazarlama")}</Td>
                <Td className="tabular-nums">{`v${p.version}`}</Td>
                <Td>
                  <StatusPill tone={p.status === "published" ? "green" : "gray"}>{p.status === "published" ? t("Yayında") : t("Taslak")}</StatusPill>
                </Td>
                <Td>
                  <StatusPill tone={p.legalReview === "approved" ? "green" : p.legalReview === "not_required" ? "gray" : "warn"} size="sm">
                    {t(LEGAL_REVIEW_LABELS[p.legalReview]!)}
                  </StatusPill>
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(p.updatedAt)}</Td>
                <Td className="text-end">
                  <LegalPageEditor
                    isSuper={isSuper}
                    page={{ id: p.id, slug: p.slug, kind: p.kind, title: p.title, summary: p.summary, sections: p.sections, status: p.status, legalReview: p.legalReview, version: p.version, effectiveOn: istDate(p.effectiveDate) }}
                    trigger={
                      <Button size="xs" variant="secondary">
                        {t("Düzenle")}
                      </Button>
                    }
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}

/* ─── Yardım makaleleri ─── */
async function HelpTab() {
  const t = await getT();
  const { formatNumber } = await getFormatters();
  const articles = await listHelpArticlesAdmin();
  const fieldsFor = (a?: (typeof articles)[number]): DialogField[] => [
    ...(a ? [] : [{ name: "slug", label: t("Kısa ad (slug)"), required: true, maxLength: 80, placeholder: t("ör. hesap-nasil-silinir"), hint: t("Yalnız küçük harf, rakam ve '-'. Sonradan değiştirilemez.") } satisfies DialogField]),
    { name: "category", label: t("Kategori"), type: "select", options: opts(t, HELP_CATEGORY_LABELS), defaultValue: a?.category ?? "account" },
    { name: "title", label: t("Başlık"), required: true, maxLength: 200, defaultValue: a?.title },
    { name: "summary", label: t("Özet"), type: "textarea", rows: 2, required: true, maxLength: 400, defaultValue: a?.summary },
    { name: "body", label: t("İçerik"), type: "textarea", rows: 8, required: true, maxLength: 20000, defaultValue: a?.body },
    { name: "tags", label: t("Etiketler (virgülle ayırın)"), maxLength: 300, defaultValue: a?.tags.join(", ") },
    { name: "order", label: t("Sıra"), type: "number", min: 0, max: 9999, step: 1, required: true, defaultValue: a?.order ?? 0 },
    { name: "isPublished", label: t("Yayında"), type: "checkbox", defaultValue: a?.isPublished ?? true },
  ];
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <ActionDialog trigger={<Button size="md"><Plus /> {t("Yeni Makale")}</Button>} title={t("Yeni yardım makalesi")} action={saveHelpArticleAction} fields={fieldsFor()} reason={false} confirmLabel={t("Oluştur")} size="lg" />
      </div>
      {articles.length === 0 ? (
        <EmptyState compact title={t("Makale yok")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("Makale")}</Th>
              <Th>{t("Kategori")}</Th>
              <Th className="text-end">{t("Görüntüleme")}</Th>
              <Th className="text-end">{t("Faydalı")}</Th>
              <Th>{t("Durum")}</Th>
              <Th className="text-end">{t("İşlem")}</Th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id}>
                <Td>
                  <b className="block max-w-[320px] truncate text-ink">{a.title}</b>
                  <small className="text-[10px] text-muted">/{a.slug}</small>
                </Td>
                <Td>{HELP_CATEGORY_LABELS[a.category] ? t(HELP_CATEGORY_LABELS[a.category]!) : a.category}</Td>
                <Td className="text-end tabular-nums">{formatNumber(a.views)}</Td>
                <Td className="text-end tabular-nums">
                  {a.helpful}/{a.helpful + a.notHelpful}
                </Td>
                <Td>
                  <StatusPill tone={a.isPublished ? "green" : "gray"}>{a.isPublished ? t("Yayında") : t("Taslak")}</StatusPill>
                </Td>
                <Td className="text-end">
                  <div className="flex justify-end gap-1.5">
                    <ActionDialog trigger={<Button size="xs" variant="secondary">{t("Düzenle")}</Button>} title={t("{title} — düzenle", { title: a.title })} action={saveHelpArticleAction} payload={{ id: a.id, slug: a.slug }} fields={fieldsFor(a)} reason={false} confirmLabel={t("Kaydet")} size="lg" />
                    <ActionDialog trigger={<Button size="xs" variant="danger-soft">{t("Sil")}</Button>} title={t("Makaleyi sil")} description={a.title} action={deleteHelpArticleAction} payload={{ id: a.id }} reason={{ label: t("Silme gerekçesi") }} confirmLabel={t("Sil")} tone="danger" />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
