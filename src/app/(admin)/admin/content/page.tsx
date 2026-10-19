import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileCheck2, Megaphone, Plus, Star, Timer } from "lucide-react";
import { ActionButton, ActionDialog, ActionForm, type DialogField } from "@/components/admin/action-dialog";
import { CAMPAIGN_AUDIENCE_LABELS, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_TONES, CAMPAIGN_TYPE_LABELS, HELP_CATEGORY_LABELS, HOMEPAGE_SECTION_LABELS, LEGAL_REVIEW_LABELS } from "@/components/admin/labels";
import { AdminPage, KpiGrid, Notice, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, DataTable, DemoDataNotice, EmptyState, StatCard, Td, Th } from "@/components/ui/display";
import { setCreatorFeaturedAction } from "@/features/admin/creators-actions";
import { deleteCampaignAction, deleteCategoryAction, deleteHelpArticleAction, saveCampaignAction, saveCategoryAction, saveHelpArticleAction, updateHomeSectionAction } from "@/features/admin/content-actions";
import { LegalPageEditor } from "@/features/admin/legal-page-editor";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { CATEGORY_ICONS, getCmsSummary, listCampaignsAdmin, listCategoriesAdmin, listCmsPagesAdmin, listHelpArticlesAdmin, listHomeSections } from "@/services/admin/cms";
import { listFeaturedCreators } from "@/services/admin/creators";
import { hasDemoData, pickEnum, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "CMS ve Kampanyalar" };

const TABS = ["home", "featured", "categories", "campaigns", "legal", "help"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { home: "Ana Sayfa Vitrini", featured: "Öne Çıkan Creator'lar", categories: "Kategoriler", campaigns: "Kampanyalar", legal: "Hukuki ve Sabit Sayfalar", help: "Yardım Makaleleri" };

const istDate = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(d)) : "");
const opts = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("cms.manage");
  const sp = await searchParams;
  const tab = pickEnum(sp, "tab", TABS, "home");
  const [summary, demo] = await Promise.all([getCmsSummary(), hasDemoData()]);

  return (
    <AdminPage
      title="CMS ve Kampanyalar"
      description="Ana sayfa vitrini, kategoriler, içerik yayınları ve pazarlama kampanyalarını yönetin."
      actions={
        <>
          {demo && <DemoDataNotice />}
          <Button asChild variant="outline" size="md">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Yayın Önizlemesi
            </Link>
          </Button>
        </>
      }
    >
      <KpiGrid>
        <StatCard label="Yayınlanan İçerik" value={formatNumber(summary.published)} icon={<FileCheck2 />} tone="pink" foot="sayfa + yardım makalesi" />
        <StatCard label="Aktif Kampanya" value={formatNumber(summary.campaignsActive)} icon={<Megaphone />} tone="violet" />
        <StatCard label="Öne Çıkan Creator" value={formatNumber(summary.featured)} icon={<Star />} tone="teal" />
        <StatCard label="Bekleyen Yayın" value={formatNumber(summary.pending)} icon={<Timer />} tone="orange" foot="taslak sayfa, makale, kampanya, kapalı bölüm" />
      </KpiGrid>

      <Card>
        <TabLinks label="CMS bölümleri" active={tab} tabs={TABS.map((t) => ({ key: t, label: TAB_LABELS[t], href: href("/admin/content", { tab: t === "home" ? null : t }) }))} className="mb-5" />
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
  const sections = await listHomeSections();
  if (sections.length === 0) return <EmptyState compact title="Vitrin bölümü yok" description="Veritabanında ana sayfa bölümü tanımlı değil (seed çalıştırılmamış olabilir)." />;
  const hero = sections.find((s) => s.type === "hero");
  return (
    <div className="grid gap-5">
      {hero && (
        <div className="hf-gradient-hero rounded-2xl border border-line p-6">
          <p className="eyebrow mb-2">{hero.badge || "ÖNE ÇIKAN BÖLÜM"}</p>
          <h3 className="max-w-2xl text-2xl font-black leading-tight tracking-[-0.03em] text-ink">{hero.title || "(başlık yok)"}</h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-strong">{hero.subtitle}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {hero.primaryCtaLabel && <span className="rounded-full bg-brand-500 px-4 py-2 text-[11px] font-extrabold text-white">{hero.primaryCtaLabel}</span>}
            {hero.secondaryCtaLabel && <span className="rounded-full border border-brand-300 bg-white px-4 py-2 text-[11px] font-extrabold text-brand-600">{hero.secondaryCtaLabel}</span>}
            <StatusPill tone={hero.isActive ? "green" : "gray"}>{hero.isActive ? "Yayında" : "Kapalı"}</StatusPill>
            <span className="text-[10px] text-muted">Son güncelleme: {formatDate(hero.updatedAt)}</span>
          </div>
        </div>
      )}
      <div className="grid gap-4">
        {sections.map((s) => {
          const fields: DialogField[] = [{ name: "title", label: "Başlık", defaultValue: s.title, maxLength: 200 }];
          if (s.type !== "featured_creators") fields.push({ name: "subtitle", label: "Alt başlık / açıklama", type: "textarea", rows: 2, defaultValue: s.subtitle, maxLength: 600 });
          if (s.type === "hero")
            fields.push(
              { name: "badge", label: "Rozet metni", defaultValue: s.badge, maxLength: 120 },
              { name: "primaryCtaLabel", label: "Birincil buton metni", defaultValue: s.primaryCtaLabel, maxLength: 60 },
              { name: "primaryCtaHref", label: "Birincil buton bağlantısı", defaultValue: s.primaryCtaHref, maxLength: 300, hint: "'/' ile başlayan yol veya https:// adresi." },
              { name: "secondaryCtaLabel", label: "İkincil buton metni", defaultValue: s.secondaryCtaLabel, maxLength: 60 },
              { name: "secondaryCtaHref", label: "İkincil buton bağlantısı", defaultValue: s.secondaryCtaHref, maxLength: 300 },
            );
          if (s.type === "announcement" || s.type === "banner" || s.type === "cta")
            fields.push({ name: "ctaLabel", label: "Buton metni", defaultValue: s.ctaLabel, maxLength: 60 }, { name: "ctaHref", label: "Buton bağlantısı", defaultValue: s.ctaHref, maxLength: 300 });
          if (s.type === "featured_creators") fields.push({ name: "limit", label: "Gösterilecek creator sayısı", type: "number", defaultValue: s.limit ?? 6, min: 1, max: 24, step: 1 });
          fields.push({ name: "isActive", label: "Bölüm yayında", type: "checkbox", defaultValue: s.isActive });
          return (
            <details key={s.id} className="group min-w-0 rounded-2xl border border-line bg-white open:shadow-[var(--shadow-card)]" open={s.type === "hero" || s.type === "announcement"}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-[11px] font-black text-brand-600">{s.order}</span>
                  <span className="min-w-0">
                    <b className="block text-sm text-ink">{HOMEPAGE_SECTION_LABELS[s.type] ?? s.type}</b>
                    <span className="block max-w-md truncate text-[11px] text-muted">{s.title || "—"}</span>
                  </span>
                </span>
                <StatusPill tone={s.isActive ? "green" : "gray"}>{s.isActive ? "Yayında" : "Kapalı"}</StatusPill>
              </summary>
              <div className="border-t border-line-soft px-5 pb-5 pt-4">
                <ActionForm action={updateHomeSectionAction} payload={{ sectionId: s.id }} fields={fields} reason={{ label: "Değişiklik notu", defaultValue: "Vitrin metni güncellendi." }} submitLabel="Bölümü Kaydet" className="max-w-2xl" />
              </div>
            </details>
          );
        })}
      </div>
      <Notice tone="neutral">Vitrin değişiklikleri kaydedildiği anda ana sayfaya yansır; her kayıt gerekçesiyle denetim kaydına yazılır. Bölümlerin sırası ve yerleşimi kod tarafından belirlenir.</Notice>
    </div>
  );
}

/* ─── Öne çıkan creator'lar ─── */
async function FeaturedTab({ canManage }: { canManage: boolean }) {
  const { featured, candidates } = await listFeaturedCreators();
  return (
    <div className="grid gap-5">
      {canManage && (
        <div className="rounded-2xl border border-line p-5">
          <p className="mb-3 text-sm font-extrabold text-ink">Creator öne çıkar</p>
          {candidates.length === 0 ? (
            <p className="text-xs text-muted">Öne çıkarılabilecek onaylı creator kalmadı.</p>
          ) : (
            <ActionForm
              action={setCreatorFeaturedAction}
              payload={{ featured: true }}
              fields={[
                { name: "creatorId", label: "Creator", type: "select", options: candidates.map((c) => ({ value: c.id, label: c.label })), defaultValue: candidates[0]?.id },
                { name: "rank", label: "Sıra (küçük = önde)", type: "number", defaultValue: featured.length + 1, min: 0, max: 9999, step: 1 },
              ]}
              submitLabel="Öne Çıkar"
              className="max-w-xl"
            />
          )}
        </div>
      )}
      {featured.length === 0 ? (
        <EmptyState compact title="Öne çıkan creator yok" description="Ana sayfadaki 'Öne çıkan' alanı otomatik olarak popüler creator'larla dolar." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Creator</Th>
              <Th className="text-right">Takipçi</Th>
              <Th>Durum</Th>
              <Th>Sıra</Th>
              <Th className="text-right">İşlem</Th>
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
                <Td className="text-right tabular-nums">{formatNumber(c.followers)}</Td>
                <Td>
                  <StatusPill tone={c.status === "approved" ? "green" : "warn"}>{c.status === "approved" ? "Aktif" : "Aktif değil — vitrinde görünmez"}</StatusPill>
                </Td>
                <Td>
                  {canManage ? (
                    <ActionForm action={setCreatorFeaturedAction} payload={{ creatorId: c.id, featured: true }} fields={[{ name: "rank", label: "Sıra", type: "number", defaultValue: c.rank, min: 0, max: 9999, step: 1, className: "w-24" }]} submitLabel="Kaydet" variant="secondary" className="grid-flow-col items-end" />
                  ) : (
                    c.rank
                  )}
                </Td>
                <Td className="text-right">
                  {canManage && (
                    <ActionButton action={setCreatorFeaturedAction} payload={{ creatorId: c.id, featured: false, rank: 0 }} variant="ghost" size="xs">
                      Kaldır
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
  const cats = await listCategoriesAdmin();
  const baseFields = (c?: (typeof cats)[number]): DialogField[] => [
    ...(c ? [] : [{ name: "slug", label: "Kısa ad (slug)", required: true, maxLength: 60, placeholder: "ör. yasam-tarzi", hint: "Yalnız küçük harf, rakam ve '-'. Oluşturulduktan sonra değiştirilemez." } satisfies DialogField]),
    { name: "name", label: "Kategori adı", required: true, maxLength: 80, defaultValue: c?.name },
    { name: "description", label: "Açıklama", type: "textarea", rows: 2, maxLength: 500, defaultValue: c?.description },
    { name: "icon", label: "Simge", type: "select", options: CATEGORY_ICONS.map((i) => ({ value: i, label: i })), defaultValue: c?.icon ?? "sparkles" },
    { name: "order", label: "Sıra", type: "number", min: 0, max: 9999, step: 1, required: true, defaultValue: c?.order ?? cats.length + 1 },
    { name: "heroTitle", label: "Sayfa başlığı (isteğe bağlı)", maxLength: 120, defaultValue: c?.heroTitle },
    { name: "heroText", label: "Sayfa açıklaması (isteğe bağlı)", type: "textarea", rows: 2, maxLength: 600, defaultValue: c?.heroText },
    { name: "isActive", label: "Aktif (keşif ve filtrelerde görünür)", type: "checkbox", defaultValue: c?.isActive ?? true },
  ];
  return (
    <div className="grid gap-4">
      {canManage && (
        <div className="flex justify-end">
          <ActionDialog trigger={<Button size="md"><Plus /> Yeni Kategori</Button>} title="Yeni kategori" action={saveCategoryAction} fields={baseFields()} reason={false} confirmLabel="Oluştur" />
        </div>
      )}
      {cats.length === 0 ? (
        <EmptyState compact title="Kategori yok" />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Sıra</Th>
              <Th>Kategori</Th>
              <Th>Simge</Th>
              <Th className="text-right">Creator</Th>
              <Th>Durum</Th>
              <Th className="text-right">İşlem</Th>
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
                <Td className="text-right tabular-nums">{c.creators}</Td>
                <Td>
                  <StatusPill tone={c.isActive ? "green" : "gray"}>{c.isActive ? "Aktif" : "Pasif"}</StatusPill>
                </Td>
                <Td className="text-right">
                  {canManage ? (
                    <div className="flex justify-end gap-1.5">
                      <ActionDialog trigger={<Button size="xs" variant="secondary">Düzenle</Button>} title={`${c.name} — düzenle`} action={saveCategoryAction} payload={{ id: c.id, slug: c.slug }} fields={baseFields(c)} reason={false} confirmLabel="Kaydet" />
                      <ActionDialog
                        trigger={
                          <Button size="xs" variant="danger-soft" disabled={c.creators > 0} title={c.creators > 0 ? "Kullanımda: silmek yerine pasife alın" : undefined}>
                            Sil
                          </Button>
                        }
                        title={`${c.name} kategorisini sil`}
                        description="Kategori kalıcı olarak silinir. Kullanımda olan kategoriler silinemez; onları pasife alın."
                        action={deleteCategoryAction}
                        payload={{ id: c.id }}
                        reason={{ label: "Silme gerekçesi" }}
                        confirmLabel="Sil"
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
  const campaigns = await listCampaignsAdmin();
  const fieldsFor = (c?: (typeof campaigns)[number]): DialogField[] => [
    { name: "name", label: "Kampanya adı", required: true, maxLength: 120, defaultValue: c?.name },
    { name: "type", label: "Tür", type: "select", options: opts(CAMPAIGN_TYPE_LABELS), defaultValue: c?.type ?? "banner" },
    { name: "status", label: "Durum", type: "select", options: opts(CAMPAIGN_STATUS_LABELS), defaultValue: c?.status ?? "draft", hint: "Geçişler: taslak → planlandı/aktif → sona erdi → arşiv." },
    { name: "audience", label: "Hedef kitle", type: "select", options: opts(CAMPAIGN_AUDIENCE_LABELS), defaultValue: c?.audience ?? "all" },
    { name: "startsOn", label: "Başlangıç tarihi", type: "date", defaultValue: istDate(c?.startsAt ?? null) },
    { name: "endsOn", label: "Bitiş tarihi", type: "date", defaultValue: istDate(c?.endsAt ?? null) },
    { name: "headline", label: "Başlık metni", maxLength: 160, defaultValue: c?.headline },
    { name: "body", label: "Açıklama", type: "textarea", rows: 2, maxLength: 600, defaultValue: c?.body },
    { name: "ctaLabel", label: "Buton metni", maxLength: 60, defaultValue: c?.ctaLabel },
    { name: "ctaUrl", label: "Buton bağlantısı", maxLength: 300, defaultValue: c?.ctaUrl, hint: "'/' ile başlayan yol veya https:// adresi." },
    { name: "bonusPercent", label: "Kredi bonusu (%)", type: "number", min: 1, max: 100, step: 1, defaultValue: c?.bonusPercent, showWhen: { field: "type", equals: "credit_bonus" } },
    { name: "discountPercent", label: "İndirim (%)", type: "number", min: 1, max: 90, step: 1, defaultValue: c?.discountPercent, showWhen: { field: "type", equals: "discount" } },
  ];
  return (
    <div className="grid gap-4">
      {canManage && (
        <div className="flex justify-end">
          <ActionDialog trigger={<Button size="md"><Plus /> Yeni Kampanya</Button>} title="Yeni kampanya" action={saveCampaignAction} fields={fieldsFor()} reason={{ label: "Oluşturma notu", defaultValue: "Yeni kampanya oluşturuldu." }} confirmLabel="Oluştur" size="lg" />
        </div>
      )}
      {campaigns.length === 0 ? (
        <EmptyState compact title="Kampanya yok" description="Yeni bir kampanya oluşturarak başlayın." />
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <article key={c.id} className="flex flex-col rounded-2xl border border-line bg-white p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-ink">{c.name}</h3>
                  <p className="text-[10px] text-muted">
                    {CAMPAIGN_TYPE_LABELS[c.type]} · {CAMPAIGN_AUDIENCE_LABELS[c.audience]}
                  </p>
                </div>
                <StatusPill tone={CAMPAIGN_STATUS_TONES[c.status] ?? "gray"}>{CAMPAIGN_STATUS_LABELS[c.status]}</StatusPill>
              </div>
              <p className="flex-1 text-[11px] leading-relaxed text-muted-strong">{c.headline || c.body || "Metin girilmedi."}</p>
              <p className="mt-2 text-[11px] font-bold text-ink">{c.startsAt || c.endsAt ? `${c.startsAt ? formatDate(c.startsAt) : "…"} – ${c.endsAt ? formatDate(c.endsAt) : "süresiz"}` : "Tarih belirtilmedi"}</p>
              {c.metrics.impressions > 0 && (
                <p className="mt-1 text-[10px] text-muted">
                  {formatNumber(c.metrics.impressions)} gösterim · {formatNumber(c.metrics.clicks)} tıklama · {formatNumber(c.metrics.conversions)} dönüşüm
                </p>
              )}
              {canManage && (
                <div className="mt-3 flex gap-1.5 border-t border-line-soft pt-3">
                  {c.status !== "archived" && (
                    <ActionDialog trigger={<Button size="xs" variant="secondary">Düzenle</Button>} title={`${c.name} — düzenle`} action={saveCampaignAction} payload={{ id: c.id }} fields={fieldsFor(c)} reason={{ label: "Değişiklik notu", defaultValue: "Kampanya güncellendi." }} confirmLabel="Kaydet" size="lg" />
                  )}
                  {c.status === "draft" && (
                    <ActionDialog trigger={<Button size="xs" variant="danger-soft">Sil</Button>} title="Taslak kampanyayı sil" action={deleteCampaignAction} payload={{ id: c.id }} reason={{ label: "Silme gerekçesi" }} confirmLabel="Sil" tone="danger" />
                  )}
                  {c.isDemo && <StatusPill size="sm" tone="warn" className="ml-auto self-center">Demo</StatusPill>}
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
  const pages = await listCmsPagesAdmin();
  return (
    <div className="grid gap-4">
      <Notice tone="warn">
        Hukuki metinler taslaktır ve yayından önce avukat incelemesi gerektirir. &quot;Hukuken onaylı&quot; durumunu yalnız Süper Yönetici verebilir; onaylı bir metin başka biri tarafından değiştirilirse onay düşer.
      </Notice>
      {pages.length === 0 ? (
        <EmptyState compact title="Sayfa yok" />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Sayfa</Th>
              <Th>Tür</Th>
              <Th>Sürüm</Th>
              <Th>Yayın</Th>
              <Th>Hukuki inceleme</Th>
              <Th>Güncelleme</Th>
              <Th className="text-right">İşlem</Th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <Td>
                  <b className="block text-ink">{p.title}</b>
                  <small className="text-[10px] text-muted">/{p.slug}</small>
                </Td>
                <Td>{p.kind === "legal" ? "Hukuki" : p.kind === "help" ? "Yardım" : "Pazarlama"}</Td>
                <Td className="tabular-nums">v{p.version}</Td>
                <Td>
                  <StatusPill tone={p.status === "published" ? "green" : "gray"}>{p.status === "published" ? "Yayında" : "Taslak"}</StatusPill>
                </Td>
                <Td>
                  <StatusPill tone={p.legalReview === "approved" ? "green" : p.legalReview === "not_required" ? "gray" : "warn"} size="sm">
                    {LEGAL_REVIEW_LABELS[p.legalReview]}
                  </StatusPill>
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(p.updatedAt)}</Td>
                <Td className="text-right">
                  <LegalPageEditor
                    isSuper={isSuper}
                    page={{ id: p.id, slug: p.slug, kind: p.kind, title: p.title, summary: p.summary, sections: p.sections, status: p.status, legalReview: p.legalReview, version: p.version, effectiveOn: istDate(p.effectiveDate) }}
                    trigger={
                      <Button size="xs" variant="secondary">
                        Düzenle
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
  const articles = await listHelpArticlesAdmin();
  const fieldsFor = (a?: (typeof articles)[number]): DialogField[] => [
    ...(a ? [] : [{ name: "slug", label: "Kısa ad (slug)", required: true, maxLength: 80, placeholder: "ör. hesap-nasil-silinir", hint: "Yalnız küçük harf, rakam ve '-'. Sonradan değiştirilemez." } satisfies DialogField]),
    { name: "category", label: "Kategori", type: "select", options: opts(HELP_CATEGORY_LABELS), defaultValue: a?.category ?? "account" },
    { name: "title", label: "Başlık", required: true, maxLength: 200, defaultValue: a?.title },
    { name: "summary", label: "Özet", type: "textarea", rows: 2, required: true, maxLength: 400, defaultValue: a?.summary },
    { name: "body", label: "İçerik", type: "textarea", rows: 8, required: true, maxLength: 20000, defaultValue: a?.body },
    { name: "tags", label: "Etiketler (virgülle ayırın)", maxLength: 300, defaultValue: a?.tags.join(", ") },
    { name: "order", label: "Sıra", type: "number", min: 0, max: 9999, step: 1, required: true, defaultValue: a?.order ?? 0 },
    { name: "isPublished", label: "Yayında", type: "checkbox", defaultValue: a?.isPublished ?? true },
  ];
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <ActionDialog trigger={<Button size="md"><Plus /> Yeni Makale</Button>} title="Yeni yardım makalesi" action={saveHelpArticleAction} fields={fieldsFor()} reason={false} confirmLabel="Oluştur" size="lg" />
      </div>
      {articles.length === 0 ? (
        <EmptyState compact title="Makale yok" />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Makale</Th>
              <Th>Kategori</Th>
              <Th className="text-right">Görüntüleme</Th>
              <Th className="text-right">Faydalı</Th>
              <Th>Durum</Th>
              <Th className="text-right">İşlem</Th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id}>
                <Td>
                  <b className="block max-w-[320px] truncate text-ink">{a.title}</b>
                  <small className="text-[10px] text-muted">/{a.slug}</small>
                </Td>
                <Td>{HELP_CATEGORY_LABELS[a.category] ?? a.category}</Td>
                <Td className="text-right tabular-nums">{formatNumber(a.views)}</Td>
                <Td className="text-right tabular-nums">
                  {a.helpful}/{a.helpful + a.notHelpful}
                </Td>
                <Td>
                  <StatusPill tone={a.isPublished ? "green" : "gray"}>{a.isPublished ? "Yayında" : "Taslak"}</StatusPill>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <ActionDialog trigger={<Button size="xs" variant="secondary">Düzenle</Button>} title={`${a.title} — düzenle`} action={saveHelpArticleAction} payload={{ id: a.id, slug: a.slug }} fields={fieldsFor(a)} reason={false} confirmLabel="Kaydet" size="lg" />
                    <ActionDialog trigger={<Button size="xs" variant="danger-soft">Sil</Button>} title="Makaleyi sil" description={a.title} action={deleteHelpArticleAction} payload={{ id: a.id }} reason={{ label: "Silme gerekçesi" }} confirmLabel="Sil" tone="danger" />
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
