import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Crown, Headphones, LifeBuoy, ReceiptText, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { categoryLabel } from "@/components/creator/category-icon";
import { Verified } from "@/components/creator/creator-cards";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { objectIdSchema, usernameSchema } from "@/lib/validation/common";
import { getMembershipPage } from "@/services/fan/subscriptions";

export const metadata: Metadata = { title: "Üyelik Seçimi" };
export const dynamic = "force-dynamic";

const searchSchema = z.object({ interval: z.enum(["month", "year"]).catch("month"), plan: objectIdSchema.optional().catch(undefined) });
const TIER_LABELS: Record<string, string> = { basic: "Temel", premium: "Premium", vip: "VIP" };

export default async function MembershipPage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { username: raw } = await params;
  const parsedName = usernameSchema.safeParse(raw);
  if (!parsedName.success) notFound();
  const { user } = await requireUser(`/creators/${raw}/membership`);
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const data = await getMembershipPage(user.id, parsedName.data);
  if (!data) notFound();
  const base = `/creators/${data.creator.username}/membership`;
  const anyYearly = data.plans.some((p) => p.yearlyMinor);
  const interval = anyYearly ? sp.interval : "month";
  // Profil sayfasındaki "Abone Ol" bağlantısı ?plan=<id> ile gelir: eşleşen plan öne çıkarılır.
  const preselected = data.plans.find((p) => p.id === sp.plan)?.id ?? null;

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-5">
        <p className="eyebrow mb-2">HEYFANS / FAN EXPERIENCE</p>
        <h1 className="text-[26px] font-black leading-[1.08] tracking-[-0.035em] text-ink sm:text-[30px]">Üyelik Seçimi</h1>
        <p className="mt-2 text-xs text-muted">{data.creator.displayName} adlı içerik üreticisinin AI ikizine ve özel içeriklerine erişim seçenekleri.</p>
      </div>

      <Card className="flex flex-col items-center gap-5 text-center">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:text-left">
          <Link href={`/creators/${data.creator.username}`} aria-label={`${data.creator.displayName} profili`}>
            <Avatar src={data.creator.avatarUrl} name={data.creator.displayName} size={60} />
          </Link>
          <div>
            <Link href={`/creators/${data.creator.username}`} className="flex items-center justify-center gap-1.5 text-lg font-black tracking-[-0.03em] hover:text-brand-600 sm:justify-start">
              {data.creator.displayName} {data.creator.verified && <Verified className="size-5" />}
            </Link>
            <p className="mt-1 text-xs text-muted">
              Resmî AI ikizi{data.creator.categories.length ? ` · ${data.creator.categories.slice(0, 3).map(categoryLabel).join(", ")}` : ""}
            </p>
          </div>
          <Badge tone="pink" size="lg" className="sm:ml-3">
            Üreticiye özel üyelik
          </Badge>
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-[-0.035em]">Sana en uygun üyeliği seç</h2>
          <p className="mt-1.5 text-xs text-muted">Daha kişisel sohbetler, daha özel içerikler ve kesintisiz AI deneyimi.</p>
        </div>
        {anyYearly && (
          <LinkTabs
            label="Faturalandırma dönemi"
            className="justify-center"
            items={[
              { href: buildHref(base, { plan: preselected }), label: "Aylık", active: interval === "month" },
              { href: buildHref(base, { interval: "year", plan: preselected }), label: "Yıllık", active: interval === "year" },
            ]}
          />
        )}
      </Card>

      {data.current && (
        <p role="status" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-xs font-semibold text-ink-soft">
          <Check className="size-4 text-success" aria-hidden />
          Şu anda {TIER_LABELS[data.current.tier] ?? data.current.tier} üyesisin{data.current.periodEnd ? ` · ${formatDate(data.current.periodEnd)} tarihine kadar` : ""}
          {data.current.cancelAtPeriodEnd && " (dönem sonunda sona erecek)"}.{" "}
          <Link href="/app/subscriptions" className="font-extrabold text-brand-600 hover:underline">
            Üyeliğimi yönet
          </Link>
        </p>
      )}

      {data.plans.length ? (
        <div className={cn("mt-5 grid gap-4", data.plans.length >= 3 ? "md:grid-cols-3" : data.plans.length === 2 ? "md:grid-cols-2" : "mx-auto max-w-md")}>
          {data.plans.map((p) => {
            const yearly = interval === "year" && p.yearlyMinor ? p.yearlyMinor : null;
            const price = yearly ?? p.monthlyMinor;
            const isCurrent = data.current?.planId === p.id;
            const effInterval = yearly ? "year" : "month";
            const saving = yearly ? Math.round((1 - yearly / (p.monthlyMinor * 12)) * 100) : 0;
            const href = `/checkout?type=plan&planId=${p.id}&interval=${effInterval}`;
            const chosen = preselected === p.id;
            const emphasize = chosen || (!preselected && p.isPopular);
            return (
              <article
                key={p.id}
                id={`plan-${p.id}`}
                aria-current={chosen ? "true" : undefined}
                className={cn("hf-card relative flex flex-col p-6", emphasize && "border-brand-300 shadow-[0_18px_40px_rgb(236_0_136/0.12)]", chosen && "ring-2 ring-brand-500")}
                aria-label={`${p.name} planı`}
              >
                {chosen ? (
                  <Badge tone="solid" size="md" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    SEÇTİĞİN PLAN
                  </Badge>
                ) : (
                  p.isPopular && (
                  <Badge tone="solid" size="md" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    EN POPÜLER
                  </Badge>
                  )
                )}
                <h3 className="text-xl font-black tracking-[-0.03em]">{p.name}</h3>
                <p className="mt-1.5 min-h-8 text-xs text-muted">{p.description ?? `${TIER_LABELS[p.tier] ?? p.tier} seviye erişim.`}</p>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-[32px] font-black tracking-[-0.04em]">{formatMoney(price, p.currency)}</span>
                  <span className="text-xs font-bold text-muted">/ {yearly ? "yıl" : "ay"}</span>
                </p>
                {yearly ? (
                  <p className="mt-1 text-[11px] font-bold text-success">
                    Aylık ~{formatMoney(Math.round(yearly / 12), p.currency)}
                    {saving > 0 ? ` · %${saving} tasarruf` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted">Üyelik, satın alınan dönemin sonuna kadar geçerlidir.</p>
                )}
                <ul className="my-5 grid flex-1 gap-2.5 text-xs text-ink-soft">
                  {p.benefits.length ? (
                    p.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden /> {b}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted">Plan avantajları yakında eklenecek.</li>
                  )}
                </ul>
                {data.creator.isOwner ? (
                  <span className="flex h-11 items-center justify-center rounded-full bg-soft text-xs font-extrabold text-muted">Kendi planın</span>
                ) : isCurrent ? (
                  <span className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-success-soft text-xs font-extrabold text-success">
                    <Check className="size-4" /> Mevcut planın
                  </span>
                ) : (
                  <Link
                    href={href}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-full text-xs font-extrabold",
                      emphasize ? "bg-brand-500 text-white shadow-[var(--shadow-pink)] hover:bg-brand-600" : "border border-brand-300 text-brand-600 hover:bg-brand-50",
                    )}
                  >
                    {data.current ? `${p.name} planına geç` : `${p.name} planını seç`}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <Card className="mt-5">
          <EmptyState icon={<Crown />} title="Bu içerik üreticisi henüz üyelik planı sunmuyor" description="Planlar yayınlandığında burada görünecek. Bu sırada onu takip edebilir ve AI ikiziyle sohbet edebilirsin." />
        </Card>
      )}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, title: "Güvenli ödeme", text: "Kart bilgilerin ödeme sağlayıcısında işlenir." },
          { icon: ReceiptText, title: "Şeffaf ücretlendirme", text: "İşlem öncesi tutar gösterilir." },
          { icon: Headphones, title: "İstediğin zaman yönet", text: "Üyeliğini dönem sonunda iptal edebilirsin." },
          { icon: LifeBuoy, title: "Destek ekibi", text: "Sorularında yanındayız." },
        ].map((i) => (
          <li key={i.title} className="hf-card flex items-start gap-3 p-4">
            <i.icon className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
            <div>
              <p className="text-xs font-extrabold">{i.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{i.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
