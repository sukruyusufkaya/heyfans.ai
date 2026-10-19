import type { Metadata } from "next";
import { Crown, Users, Wallet } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, Progress, StatCard } from "@/components/ui/display";
import { STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { PlanManager, type PlanView } from "@/features/studio/plan-manager";
import { requireCreator } from "@/lib/auth/session";
import { formatMoney, formatNumber } from "@/lib/utils";
import { getMembershipOverview } from "@/services/studio/plans";

export const metadata: Metadata = { title: "Üyelik Yönetimi" };

const TIER_LABEL = { basic: "Temel", premium: "Premium", vip: "VIP" } as const;

export default async function MembershipsPage() {
  const { user } = await requireCreator();
  const o = await getMembershipOverview(user.id);
  const plans: PlanView[] = o.rows
    .filter((r) => r.plan.tier !== "free")
    .map(({ plan: p, subscribers, mrrMinor }) => ({
      id: p._id.toString(),
      tier: p.tier as PlanView["tier"],
      name: p.name,
      description: p.description ?? "",
      benefits: p.benefits,
      priceMonthlyMinor: p.priceMonthly.amountMinor,
      priceYearlyMinor: p.priceYearly?.amountMinor ?? null,
      isPopular: p.isPopular,
      status: p.status,
      contentAccess: p.entitlements.contentAccess,
      unlimitedChat: p.entitlements.unlimitedChat,
      dailyChatAllowance: p.entitlements.dailyChatAllowance,
      customRequests: p.entitlements.customRequests,
      subscribers,
      mrrMinor,
    }));
  const takenTiers = plans.filter((p) => p.status === "active").map((p) => p.tier);
  const byTier = (["basic", "premium", "vip"] as const).map((t) => ({ t, n: plans.filter((p) => p.tier === t).reduce((a, p) => a + p.subscribers, 0) }));
  const totalSubs = byTier.reduce((a, r) => a + r.n, 0);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title="Üyelik Yönetimi"
        description="Planları, fiyatları, hakları ve hayran aboneliklerini yönet."
      />
      <section aria-label="Üyelik göstergeleri" className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Aktif abonelik" icon={<Users />} value={formatNumber(o.totals.subscribers)} />
        <StatCard label="Aylık yinelenen gelir (brüt)" icon={<Wallet />} tone="violet" value={formatMoney(o.totals.mrrMinor)} foot="Yıllık planlar 12'ye bölünür" />
        <StatCard label="Yeni üye (30 gün)" icon={<Crown />} tone="teal" value={`+${formatNumber(o.totals.newSubs30)}`} />
      </section>

      <PlanManager plans={plans} takenTiers={takenTiers} />

      <Card className="mt-6">
        <CardHeader title="Üyeliklere genel bakış" hint="Kademe başına etkin abone sayısı" />
        {totalSubs === 0 ? (
          <p className="text-[12px] text-muted">Henüz aktif aboneliğin yok.</p>
        ) : (
          <div className="grid gap-4">
            {byTier.map(({ t, n }) => (
              <div key={t}>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink-soft">
                    {TIER_LABEL[t]} · {formatNumber(n)} abone
                  </span>
                  <b>%{Math.round((n / totalSubs) * 100)}</b>
                </div>
                <Progress value={(n / totalSubs) * 100} tone={t === "vip" ? "violet" : t === "premium" ? "pink" : "teal"} label={`${TIER_LABEL[t]} abone oranı`} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
