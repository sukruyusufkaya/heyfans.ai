"use client";
import { useState } from "react";
import { Archive, Check, Crown, Heart, Pencil, Plus, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Field, Input, NativeSelect, Switch, Textarea } from "@/components/ui/form-controls";
import { ConfirmDialog } from "@/components/studio/confirm-dialog";
import { TagInput } from "@/components/studio/tag-input";
import { firstError, useRun } from "@/components/studio/use-run";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import { savePlanAction, setPlanStatusAction } from "./business-actions";

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
const TIER_NAME = { basic: "Temel", premium: "Premium", vip: "VIP" };
const ACCESS_NAME = { none: "Yok", basic: "Temel içerikler", premium: "Premium içerikler", vip: "VIP içerikler" };

const toMinor = (s: string) => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
const fromMinor = (m: number | null) => (m == null ? "" : String(m / 100).replace(".", ","));

export function PlanManager({ plans, takenTiers }: { plans: PlanView[]; takenTiers: string[] }) {
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
            Creator Üyelik Planları
          </h2>
          <p className="mt-1 text-[11px] text-muted">Hayranların için planları ve erişim haklarını belirle. Fiyat değişikliği yalnız yeni aboneliklere uygulanır.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div role="radiogroup" aria-label="Fiyat dönemi" className="flex gap-1.5">
            {[
              { v: false, l: "Aylık" },
              { v: true, l: "Yıllık" },
            ].map((o) => (
              <button key={o.l} role="radio" aria-checked={yearly === o.v} onClick={() => setYearly(o.v)} className={cn("rounded-full px-3.5 py-2 text-[11px] font-extrabold", yearly === o.v ? "bg-brand-500 text-white" : "bg-soft text-muted-strong")}>
                {o.l}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setEditing("new")} disabled={!canAdd} title={canAdd ? undefined : "Her kademede bir etkin plan olabilir; önce birini arşivle."}>
            <Plus /> Yeni plan
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
                  {p.isPopular && <span className="absolute right-0 top-0 rounded-bl-xl rounded-tr-[14px] bg-brand-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white">En popüler</span>}
                  <span className="grid size-11 place-items-center rounded-[13px] bg-brand-100 text-brand-500">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[20px] font-black tracking-[-0.03em]">{p.name}</h3>
                  <p className="mt-1 min-h-8 text-[11px] text-muted">{p.description || `${TIER_NAME[p.tier]} kademesi`}</p>
                  <p className="mt-4 text-[30px] font-black tracking-[-0.04em]">
                    {price != null ? formatMoney(price) : <span className="text-[14px] font-bold text-muted">Yıllık fiyat yok</span>}
                    {price != null && <span className="ml-1 text-[11px] font-semibold text-muted">/ {yearly ? "yıl" : "ay"}</span>}
                  </p>
                  <ul className="mt-4 grid flex-1 content-start gap-2.5 border-t border-line-soft pt-4 text-[12px]">
                    {[...p.benefits, `İçerik erişimi: ${ACCESS_NAME[p.contentAccess]}`, p.unlimitedChat ? "Sınırsız AI sohbeti" : p.dailyChatAllowance ? `Günde ${p.dailyChatAllowance} ücretsiz AI mesajı` : null, p.customRequests ? "Özel talep hakkı" : null]
                      .filter(Boolean)
                      .map((b) => (
                        <li key={b} className="flex gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden /> {b}
                        </li>
                      ))}
                  </ul>
                  <p className="mt-4 text-[11px] text-muted">
                    <b className="text-ink">{formatNumber(p.subscribers)}</b> abone · aylık <b className="text-ink">{formatMoney(p.mrrMinor)}</b>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                      <Pencil /> Planı düzenle
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(p)}>
                      <Archive /> Arşivle
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="text-center">
          <p className="text-[14px] font-extrabold">Henüz üyelik planın yok</p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-muted">Temel, Premium veya VIP kademelerinde plan oluşturarak hayranlarına abonelik sat.</p>
          <Button className="mt-4" size="sm" onClick={() => setEditing("new")}>
            <Plus /> İlk planı oluştur
          </Button>
        </Card>
      )}

      {archived.length > 0 && (
        <details className="mt-5 rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-[12px] font-extrabold">Arşivlenmiş planlar ({archived.length})</summary>
          <ul className="mt-3 grid gap-2.5">
            {archived.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-soft p-3 text-[12px]">
                <span>
                  <b>{p.name}</b> · {TIER_NAME[p.tier]} · {formatMoney(p.priceMonthlyMinor)}/ay · {p.subscribers} aktif abone (dönem sonuna kadar)
                </span>
                <Button size="xs" variant="outline" disabled={takenTiers.includes(p.tier)} title={takenTiers.includes(p.tier) ? "Bu kademede etkin bir plan var." : undefined} onClick={() => void run(() => setPlanStatusAction({ id: p.id, status: "active" }))}>
                  <RotateCcw /> Yeniden etkinleştir
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
        title="Planı arşivle"
        description={archiveTarget ? `“${archiveTarget.name}” için yeni abonelik alınmaz. Mevcut ${archiveTarget.subscribers} abone dönem sonuna kadar haklarını korur.` : undefined}
        confirmLabel="Arşivle"
        tone="danger"
        onConfirm={() => (archiveTarget ? run(() => setPlanStatusAction({ id: archiveTarget.id, status: "archived" })) : false)}
      />
    </section>
  );
}

function PlanDialog({ editing, takenTiers, onClose }: { editing: PlanView | "new" | null; takenTiers: string[]; onClose: () => void }) {
  const { run, pending, fieldErrors } = useRun();
  const plan = editing && editing !== "new" ? editing : null;
  const freeTiers = (["basic", "premium", "vip"] as const).filter((t) => !takenTiers.includes(t) || plan?.tier === t);
  const [tier, setTier] = useState<PlanView["tier"]>(plan?.tier ?? freeTiers[0] ?? "basic");
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [benefits, setBenefits] = useState<string[]>(plan?.benefits ?? []);
  const [monthly, setMonthly] = useState(fromMinor(plan?.priceMonthlyMinor ?? null));
  const [yearlyText, setYearlyText] = useState(fromMinor(plan?.priceYearlyMinor ?? null));
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
      priceMonthlyMinor: toMinor(monthly) ?? 0,
      priceYearlyMinor: toMinor(yearlyText),
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
      <DialogContent title={plan ? "Planı düzenle" : "Yeni üyelik planı"} description="Fiyat değişikliği yalnız yeni aboneliklere uygulanır; mevcut aboneler kendi fiyatıyla devam eder." size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kademe" htmlFor="pl-tier" error={firstError(fieldErrors, "tier")}>
            <NativeSelect id="pl-tier" value={tier} onChange={(e) => setTier(e.target.value as PlanView["tier"])} disabled={Boolean(plan)}>
              {freeTiers.map((t) => (
                <option key={t} value={t}>
                  {TIER_NAME[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Plan adı" htmlFor="pl-name" required error={firstError(fieldErrors, "name")}>
            <Input id="pl-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Örn. Premium" />
          </Field>
          <Field label="Aylık fiyat (₺)" htmlFor="pl-m" required hint="₺19,90 – ₺10.000 · KDV dahil" error={firstError(fieldErrors, "priceMonthlyMinor")}>
            <Input id="pl-m" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="199,90" />
          </Field>
          <Field label="Yıllık fiyat (₺)" htmlFor="pl-y" hint="İsteğe bağlı · aylıktan yüksek, 12 aylık toplamdan düşük" error={firstError(fieldErrors, "priceYearlyMinor")}>
            <Input id="pl-y" inputMode="decimal" value={yearlyText} onChange={(e) => setYearlyText(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="1999" />
          </Field>
          <Field label="Kısa açıklama" htmlFor="pl-desc" className="sm:col-span-2" error={firstError(fieldErrors, "description")}>
            <Textarea id="pl-desc" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} className="min-h-16" />
          </Field>
          <Field label="Avantajlar" htmlFor="pl-ben" className="sm:col-span-2" hint="Enter ile ekle · en fazla 10" error={firstError(fieldErrors, "benefits")}>
            <TagInput id="pl-ben" value={benefits} onChange={setBenefits} max={10} maxLength={120} placeholder="Örn. Özel fotoğraf ve video erişimi" />
          </Field>
          <Field label="İçerik erişimi" htmlFor="pl-ca">
            <NativeSelect id="pl-ca" value={contentAccess} onChange={(e) => setContentAccess(e.target.value as PlanView["contentAccess"])}>
              <option value="none">Abonelere özel içerik yok</option>
              <option value="basic">Temel seviye içerikler</option>
              <option value="premium">Premium seviyeye kadar</option>
              <option value="vip">Tüm içerikler (VIP)</option>
            </NativeSelect>
          </Field>
          <Field label="Günlük ücretsiz AI mesajı" htmlFor="pl-daily" hint="Sınırsız sohbet açıkken yok sayılır" error={firstError(fieldErrors, "dailyChatAllowance")}>
            <Input id="pl-daily" type="number" min={0} max={1000} value={daily} disabled={unlimited} onChange={(e) => setDaily(e.target.value)} />
          </Field>
          <div className="grid gap-1 sm:col-span-2">
            <label htmlFor="pl-unl" className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5 text-[12px] font-extrabold">
              Sınırsız AI sohbeti
              <Switch id="pl-unl" checked={unlimited} onCheckedChange={setUnlimited} />
            </label>
            <label htmlFor="pl-req" className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5 text-[12px] font-extrabold">
              Özel talep hakkı
              <Switch id="pl-req" checked={customReq} onCheckedChange={setCustomReq} />
            </label>
            <label htmlFor="pl-pop" className="flex items-center justify-between gap-4 py-2.5 text-[12px] font-extrabold">
              “En popüler” olarak işaretle
              <Switch id="pl-pop" checked={popular} onCheckedChange={setPopular} />
            </label>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Badge tone="gray" size="sm">
            {plan ? `${plan.subscribers} aktif abone etkilenmez` : "Yeni plan hemen satışa açılır"}
          </Badge>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Vazgeç
            </Button>
            <Button size="sm" onClick={save} loading={pending} disabled={name.trim().length < 2 || !monthly}>
              {plan ? "Kaydet" : "Planı oluştur"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
