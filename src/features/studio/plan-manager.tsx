"use client";
import { Children, useState } from "react";
import { Archive, Check, Crown, Heart, Pencil, Plus, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Field, Input, NativeSelect, Switch, Textarea } from "@/components/ui/form-controls";
import { ConfirmDialog } from "@/components/studio/confirm-dialog";
import { TagInput } from "@/components/studio/tag-input";
import { firstError, useRun } from "@/components/studio/use-run";
import { useFormatters, useLocale, useT } from "@/i18n/client";
import { LOCALE_META } from "@/i18n/config";
import { m } from "@/i18n/m";
import { cn } from "@/lib/utils";
import { savePlanAction, setPlanStatusAction } from "./business-actions";
import { decimalOf } from "./format";

export interface PlanView {
  id: string;
  tier: "basic" | "premium" | "vip";
  name: string;
  description: string;
  benefits: string[];
  priceMonthlyMinor: number;
  priceYearlyMinor: number | null;
  isPopular: boolean;
  status: "active" | "archived";
  contentAccess: "none" | "basic" | "premium" | "vip";
  unlimitedChat: boolean;
  dailyChatAllowance: number;
  customRequests: boolean;
  subscribers: number;
  mrrMinor: number;
}

const TIER_ICON = { basic: Heart, premium: Crown, vip: Sparkles };
const TIER_NAME = { basic: m("Temel"), premium: m("Premium"), vip: m("VIP") };
const ACCESS_NAME = { none: m("Yok"), basic: m("Temel içerikler"), premium: m("Premium içerikler"), vip: m("VIP içerikler") };

const toMinor = (s: string, decimal: string) => {
  const v = s.trim();
  if (!v) return null;
  const group = decimal === "," ? "." : ",";
  const n = Number(v.split(group).join("").replace(decimal, "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
const fromMinor = (v: number | null, decimal: string) => (v == null ? "" : String(v / 100).replace(".", decimal));

export function PlanManager({ plans, takenTiers }: { plans: PlanView[]; takenTiers: string[] }) {
  const t = useT();
  const { formatMoney, formatNumber } = useFormatters();
  const [editing, setEditing] = useState<PlanView | "new" | null>(null);
  const [yearly, setYearly] = useState(false);
  const { run } = useRun();
  const [archiveTarget, setArchiveTarget] = useState<PlanView | null>(null);
  const active = plans.filter((p) => p.status === "active");
  const archived = plans.filter((p) => p.status === "archived");
  const canAdd = takenTiers.length < 3;

  return (
    <section aria-labelledby="plans-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="plans-h" className="text-[18px] font-extrabold tracking-[-0.02em]">
            {t("Creator Üyelik Planları")}
          </h2>
          <p className="mt-1 text-[11px] text-muted">{t("Hayranların için planları ve erişim haklarını belirle. Fiyat değişikliği yalnız yeni aboneliklere uygulanır.")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div role="radiogroup" aria-label={t("Fiyat dönemi")} className="flex gap-1.5">
            {[
              { v: false, l: t("Aylık") },
              { v: true, l: t("Yıllık") },
            ].map((o) => (
              <button key={o.l} role="radio" aria-checked={yearly === o.v} onClick={() => setYearly(o.v)} className={cn("rounded-full px-3.5 py-2 text-[11px] font-extrabold", yearly === o.v ? "bg-brand-500 text-white" : "bg-soft text-muted-strong")}>
                {o.l}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setEditing("new")} disabled={!canAdd} title={canAdd ? undefined : t("Her kademede bir etkin plan olabilir; önce birini arşivle.")}>
            <Plus /> {t("Yeni plan")}
          </Button>
        </div>
      </div>

      {active.length ? (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {active.map((p) => {
            const Icon = TIER_ICON[p.tier];
            const price = yearly ? p.priceYearlyMinor : p.priceMonthlyMinor;
            return (
              <li key={p.id}>
                <Card className={cn("relative flex h-full flex-col", p.isPopular && "border-2 border-brand-500 bg-brand-50/60")}>
                  {p.isPopular && <span className="absolute end-0 top-0 rounded-es-xl rounded-se-[14px] bg-brand-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white">{t("En popüler")}</span>}
                  <span className="grid size-11 place-items-center rounded-[13px] bg-brand-100 text-brand-500">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[20px] font-black tracking-[-0.03em]">{p.name}</h3>
                  <p className="mt-1 min-h-8 text-[11px] text-muted">{p.description || t("{tier} kademesi", { tier: t(TIER_NAME[p.tier]) })}</p>
                  <p className="mt-4 text-[30px] font-black tracking-[-0.04em]">
                    {price != null ? formatMoney(price) : <span className="text-[14px] font-bold text-muted">{t("Yıllık fiyat yok")}</span>}
                    {price != null && <span className="ms-1 text-[11px] font-semibold text-muted">/ {yearly ? t("yıl") : t("ay")}</span>}
                  </p>
                  <ul className="mt-4 grid flex-1 content-start gap-2.5 border-t border-line-soft pt-4 text-[12px]">
                    {[...p.benefits, t("İçerik erişimi: {access}", { access: t(ACCESS_NAME[p.contentAccess]) }), p.unlimitedChat ? t("Sınırsız AI sohbeti") : p.dailyChatAllowance ? t("Günde {count} ücretsiz AI mesajı", { count: p.dailyChatAllowance }) : null, p.customRequests ? t("Özel talep hakkı") : null]
                      .filter(Boolean)
                      .map((b) => (
                        <li key={b} className="flex gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden /> {b}
                        </li>
                      ))}
                  </ul>
                  <p className="mt-4 text-[11px] text-muted">
                    {Children.toArray(t.rich("<b>{subscribers}</b> abone · aylık <b>{mrr}</b>", { subscribers: formatNumber(p.subscribers), mrr: formatMoney(p.mrrMinor), b: (c) => <b className="text-ink">{c}</b> }))}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                      <Pencil /> {t("Planı düzenle")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(p)}>
                      <Archive /> {t("Arşivle")}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="text-center">
          <p className="text-[14px] font-extrabold">{t("Henüz üyelik planın yok")}</p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-muted">{t("Temel, Premium veya VIP kademelerinde plan oluşturarak hayranlarına abonelik sat.")}</p>
          <Button className="mt-4" size="sm" onClick={() => setEditing("new")}>
            <Plus /> {t("İlk planı oluştur")}
          </Button>
        </Card>
      )}

      {archived.length > 0 && (
        <details className="mt-5 rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-[12px] font-extrabold">{t("Arşivlenmiş planlar ({count})", { count: archived.length })}</summary>
          <ul className="mt-3 grid gap-2.5">
            {archived.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-soft p-3 text-[12px]">
                <span>
                  {Children.toArray(t.rich("<b>{name}</b> · {tier} · {price}/ay · {count} aktif abone (dönem sonuna kadar)", { name: p.name, tier: t(TIER_NAME[p.tier]), price: formatMoney(p.priceMonthlyMinor), count: p.subscribers, b: (c) => <b>{c}</b> }))}
                </span>
                <Button size="xs" variant="outline" disabled={takenTiers.includes(p.tier)} title={takenTiers.includes(p.tier) ? t("Bu kademede etkin bir plan var.") : undefined} onClick={() => void run(() => setPlanStatusAction({ id: p.id, status: "active" }))}>
                  <RotateCcw /> {t("Yeniden etkinleştir")}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <PlanDialog key={editing === "new" ? "new" : editing?.id ?? "none"} editing={editing} takenTiers={takenTiers} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title={t("Planı arşivle")}
        description={archiveTarget ? t("“{name}” için yeni abonelik alınmaz. Mevcut {count} abone dönem sonuna kadar haklarını korur.", { name: archiveTarget.name, count: archiveTarget.subscribers }) : undefined}
        confirmLabel={t("Arşivle")}
        tone="danger"
        onConfirm={() => (archiveTarget ? run(() => setPlanStatusAction({ id: archiveTarget.id, status: "archived" })) : false)}
      />
    </section>
  );
}

function PlanDialog({ editing, takenTiers, onClose }: { editing: PlanView | "new" | null; takenTiers: string[]; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const decimal = decimalOf(LOCALE_META[locale].intl);
  const monthlyPlaceholder = `199${decimal}90`;
  const { run, pending, fieldErrors } = useRun();
  const plan = editing && editing !== "new" ? editing : null;
  const freeTiers = (["basic", "premium", "vip"] as const).filter((ti) => !takenTiers.includes(ti) || plan?.tier === ti);
  const [tier, setTier] = useState<PlanView["tier"]>(plan?.tier ?? freeTiers[0] ?? "basic");
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [benefits, setBenefits] = useState<string[]>(plan?.benefits ?? []);
  const [monthly, setMonthly] = useState(fromMinor(plan?.priceMonthlyMinor ?? null, decimal));
  const [yearlyText, setYearlyText] = useState(fromMinor(plan?.priceYearlyMinor ?? null, decimal));
  const [popular, setPopular] = useState(plan?.isPopular ?? false);
  const [contentAccess, setContentAccess] = useState<PlanView["contentAccess"]>(plan?.contentAccess ?? "basic");
  const [unlimited, setUnlimited] = useState(plan?.unlimitedChat ?? false);
  const [daily, setDaily] = useState(String(plan?.dailyChatAllowance ?? 5));
  const [customReq, setCustomReq] = useState(plan?.customRequests ?? false);

  async function save() {
    const body = {
      tier,
      name,
      description,
      benefits,
      priceMonthlyMinor: toMinor(monthly, decimal) ?? 0,
      priceYearlyMinor: toMinor(yearlyText, decimal),
      isPopular: popular,
      contentAccess,
      unlimitedChat: unlimited,
      dailyChatAllowance: unlimited ? 0 : Math.max(0, Math.min(1000, Math.floor(Number(daily) || 0))),
      customRequests: customReq,
    };
    await run(() => savePlanAction({ id: plan?.id ?? null, plan: body }), { onOk: onClose });
  }

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={plan ? t("Planı düzenle") : t("Yeni üyelik planı")} description={t("Fiyat değişikliği yalnız yeni aboneliklere uygulanır; mevcut aboneler kendi fiyatıyla devam eder.")} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Kademe")} htmlFor="ps-tier" error={firstError(fieldErrors, "tier")}>
            <NativeSelect id="ps-tier" value={tier} onChange={(e) => setTier(e.target.value as PlanView["tier"])} disabled={Boolean(plan)}>
              {freeTiers.map((ti) => (
                <option key={ti} value={ti}>
                  {t(TIER_NAME[ti])}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("Plan adı")} htmlFor="ps-name" required error={firstError(fieldErrors, "name")}>
            <Input id="ps-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t("Örn. Premium")} />
          </Field>
          <Field label={t("Aylık fiyat (₺)")} htmlFor="ps-m" required hint={t("₺19,90 – ₺10.000 · KDV dahil")} error={firstError(fieldErrors, "priceMonthlyMinor")}>
            <Input id="ps-m" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d.,]/g, ""))} placeholder={monthlyPlaceholder} />
          </Field>
          <Field label={t("Yıllık fiyat (₺)")} htmlFor="ps-y" hint={t("İsteğe bağlı · aylıktan yüksek, 12 aylık toplamdan düşük")} error={firstError(fieldErrors, "priceYearlyMinor")}>
            <Input id="ps-y" inputMode="decimal" value={yearlyText} onChange={(e) => setYearlyText(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="1999" />
          </Field>
          <Field label={t("Kısa açıklama")} htmlFor="ps-desc" className="sm:col-span-2" error={firstError(fieldErrors, "description")}>
            <Textarea id="ps-desc" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} className="min-h-16" />
          </Field>
          <Field label={t("Avantajlar")} htmlFor="ps-ben" className="sm:col-span-2" hint={t("Enter ile ekle · en fazla 10")} error={firstError(fieldErrors, "benefits")}>
            <TagInput id="ps-ben" value={benefits} onChange={setBenefits} max={10} maxLength={120} placeholder={t("Örn. Özel fotoğraf ve video erişimi")} />
          </Field>
          <Field label={t("İçerik erişimi")} htmlFor="ps-ca">
            <NativeSelect id="ps-ca" value={contentAccess} onChange={(e) => setContentAccess(e.target.value as PlanView["contentAccess"])}>
              <option value="none">{t("Abonelere özel içerik yok")}</option>
              <option value="basic">{t("Temel seviye içerikler")}</option>
              <option value="premium">{t("Premium seviyeye kadar")}</option>
              <option value="vip">{t("Tüm içerikler (VIP)")}</option>
            </NativeSelect>
          </Field>
          <Field label={t("Günlük ücretsiz AI mesajı")} htmlFor="ps-daily" hint={t("Sınırsız sohbet açıkken yok sayılır")} error={firstError(fieldErrors, "dailyChatAllowance")}>
            <Input id="ps-daily" type="number" min={0} max={1000} value={daily} disabled={unlimited} onChange={(e) => setDaily(e.target.value)} />
          </Field>
          <div className="grid gap-1 sm:col-span-2">
            <label htmlFor="ps-unl" className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5 text-[12px] font-extrabold">
              {t("Sınırsız AI sohbeti")}
              <Switch id="ps-unl" checked={unlimited} onCheckedChange={setUnlimited} />
            </label>
            <label htmlFor="ps-req" className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5 text-[12px] font-extrabold">
              {t("Özel talep hakkı")}
              <Switch id="ps-req" checked={customReq} onCheckedChange={setCustomReq} />
            </label>
            <label htmlFor="ps-pop" className="flex items-center justify-between gap-4 py-2.5 text-[12px] font-extrabold">
              {t("“En popüler” olarak işaretle")}
              <Switch id="ps-pop" checked={popular} onCheckedChange={setPopular} />
            </label>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Badge tone="gray" size="sm">
            {plan ? t("{count} aktif abone etkilenmez", { count: plan.subscribers }) : t("Yeni plan hemen satışa açılır")}
          </Badge>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t("Vazgeç")}
            </Button>
            <Button size="sm" onClick={save} loading={pending} disabled={name.trim().length < 2 || !monthly}>
              {plan ? t("Kaydet") : t("Planı oluştur")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
