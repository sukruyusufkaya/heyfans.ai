import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Check, CreditCard, ShieldCheck, TicketCheck } from "lucide-react";
import { Verified } from "@/components/creator/creator-cards";
import { flattenSearchParams } from "@/components/fan/link-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/display";
import { CheckoutForm } from "@/features/fan/checkout-form";
import { checkoutParamsSchema } from "@/features/fan/checkout-schema";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { paymentsConfigured } from "@/lib/payments/provider";
import { getCheckoutSummary } from "@/services/fan/checkout";
import { getFormatters, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Ödeme") };
}
export const dynamic = "force-dynamic";

async function Problem({ title, description, href, cta }: { title: string; description: string; href?: string; cta?: string }) {
  const t = await getT();
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <EmptyState
          icon={<AlertTriangle />}
          title={title}
          description={description}
          action={
            href && (
              <Link href={href} className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                {cta ?? t("Devam et")}
              </Link>
            )
          }
        />
      </Card>
    </div>
  );
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const { formatMoney, formatNumber } = await getFormatters();
  const raw = flattenSearchParams(await searchParams);
  const { user } = await requireUser(`/checkout?${new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string")).toString()}`);
  const parsed = checkoutParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return <Problem title={t("Geçersiz ödeme bağlantısı")} description={t("Satın almak istediğin ürün belirlenemedi. Lütfen ürün sayfasından tekrar dene.")} href="/app/wallet" cta={t("Cüzdanıma git")} />;
  }
  const params = parsed.data;

  let summary: Awaited<ReturnType<typeof getCheckoutSummary>>;
  try {
    summary = await getCheckoutSummary(user.id, params);
  } catch (err) {
    if (err instanceof AppError) {
      const owned = err.code === "already_owned" && params.type === "content";
      return (
        <Problem
          title={owned ? t("Bu içeriğe zaten erişimin var") : t("Bu ürün satın alınamıyor")}
          description={t(err.template, err.params)}
          href={owned ? `/content/${params.id}` : "/explore"}
          cta={owned ? t("İçeriği aç") : t("Keşfet")}
        />
      );
    }
    throw err;
  }
  const { priced, creator, benefits } = summary;
  const pay = paymentsConfigured();
  const unavailable = pay.configured ? null : t("Şu anda ödeme kabul edemiyoruz. Lütfen daha sonra tekrar dene.");
  const isPlan = params.type === "plan";
  const kindTitle = params.type === "credit_pack" ? t("Kredi Paketi") : isPlan ? t("Üyelik Özeti") : t("İçerik Satın Alma");

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow={t("HEYFANS / GÜVENLİ ÖDEME")}
        title={t("Ödeme")}
        description={t("Seçtiğin ürünü güvenle tamamla.")}
        actions={
          <Badge tone="green" size="lg">
            <ShieldCheck /> {t("Güvenli ödeme")}
          </Badge>
        }
      />

      {!pay.configured && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3.5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="text-xs font-black text-danger">{t("Ödemeler şu anda alınamıyor")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{t("Şu anda ödeme kabul edemiyoruz; hiçbir ücret alınmaz. Lütfen daha sonra tekrar dene.")}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-4">
          <Card>
            <CardHeader title={kindTitle} hint={isPlan ? t("Seçtiğin içerik üreticisi ve plan") : t("Satın alacağın ürün")} icon={<TicketCheck />} />
            {creator && (
              <div className="flex items-center gap-3 rounded-2xl border border-line-soft bg-[#fbf9fc] p-3.5">
                <Avatar src={creator.avatarUrl} name={creator.displayName} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-[13px] font-extrabold">
                    {creator.displayName} {creator.verified && <Verified className="size-3.5" />}
                  </p>
                  <p className="text-[11px] text-muted">{isPlan ? t("Doğrulanmış AI ikizi") : t("İçerik üreticisi")}</p>
                </div>
                {isPlan && priced.details.planName && (
                  <Badge tone="green" size="lg">
                    {t("{plan} Üyelik", { plan: priced.details.planName })}
                  </Badge>
                )}
              </div>
            )}
            {params.type === "credit_pack" && (
              <div className="rounded-2xl border border-line-soft bg-[#fbf9fc] p-4">
                <p className="text-2xl font-black tracking-[-0.04em]">{t("{n} kredi", { n: formatNumber((priced.details.credits ?? 0) + (priced.details.bonusCredits ?? 0)) })}</p>
                <p className="mt-1 text-xs text-muted">
                  {priced.details.bonusCredits
                    ? t("{n} kredi + {bonus} bonus. Ödeme onaylanınca cüzdanına eklenir.", { n: formatNumber(priced.details.credits), bonus: formatNumber(priced.details.bonusCredits) })
                    : t("{n} kredi. Ödeme onaylanınca cüzdanına eklenir.", { n: formatNumber(priced.details.credits) })}
                </p>
              </div>
            )}
            {params.type === "content" && (
              <div className="rounded-2xl border border-line-soft bg-[#fbf9fc] p-4">
                <p className="text-sm font-extrabold">{priced.label}</p>
                <p className="mt-1 text-xs text-muted">{t("Tek seferlik satın alma. Ödeme onaylanınca içerik hesabına tanımlanır.")}</p>
              </div>
            )}
            {isPlan && (
              <ul className="mt-4 grid gap-2.5 text-xs text-ink-soft">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden /> {b}
                  </li>
                ))}
                <li className="mt-1 flex items-center justify-between border-t border-line-soft pt-3 text-xs">
                  <span className="font-bold text-muted">{t("Üyelik süresi")}</span>
                  <b>{params.interval === "year" ? t("1 yıl") : t("1 ay")}</b>
                </li>
                <li className="text-[11px] text-muted">{t("Üyeliğini “Üyeliklerim” sayfasından yönetebilir, dönem sonunda iptal edebilirsin.")}</li>
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={t("Ödeme Yöntemi")} hint={t("Kart bilgilerini bu sitede girmezsin")} icon={<CreditCard />} />
            <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
              <div className="text-xs leading-relaxed text-ink-soft">
                <p className="font-extrabold text-ink">{t("Kart bilgilerin HEYFANS'ta toplanmaz ve saklanmaz.")}</p>
                <p className="mt-1">
                  {t("“Ödemeyi Tamamla” dediğinde ödeme sağlayıcısının güvenli sayfasına yönlendirilirsin; kart numarası, son kullanma tarihi ve güvenlik kodu yalnızca orada girilir. Sağlayıcının güvenlik kontrolleri (ör. 3D Secure) uygulanır.")}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <aside className="grid content-start gap-4" aria-label={t("Sipariş özeti")}>
          <Card>
            <CardHeader title={t("Sipariş Özeti")} hint={t("Ödeme detayları")} />
            <dl className="grid gap-3 text-xs">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-strong">{priced.label}</dt>
                <dd className="shrink-0 font-extrabold">{formatMoney(priced.amountMinor, priced.currency)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line-soft pt-3">
                <dt className="text-muted">{t("Vergi")}</dt>
                <dd className="text-muted">{t("Fiyata KDV dahildir")}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line-soft pt-3">
                <dt className="text-sm font-extrabold">{t("Toplam")}</dt>
                <dd className="text-[26px] font-black tracking-[-0.04em]">{formatMoney(priced.amountMinor, priced.currency)}</dd>
              </div>
              {priced.recurring && (
                <p className="text-[10px] leading-relaxed text-muted">{priced.recurring.interval === "year" ? t("Üyelik, yıllık dönem için geçerlidir.") : t("Üyelik, aylık dönem için geçerlidir.")}</p>
              )}
            </dl>
            <div className="mt-5">
              <CheckoutForm params={params} disabledReason={unavailable} isTest={pay.isTest} />
            </div>
          </Card>
          <p className="px-2 text-center text-[11px] text-muted">
            {t("Ödemeyle ilgili sorun mu yaşıyorsun?")}{" "}
            <Link href="/help" className="font-extrabold text-brand-600 hover:underline">
              {t("Destek merkezi")}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
