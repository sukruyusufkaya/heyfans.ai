import type { Metadata } from "next";
import Link from "next/link";
import { Gift, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { flattenSearchParams } from "@/components/fan/link-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, PageHeader, Td, Th } from "@/components/ui/display";
import { GiftComposer } from "@/features/fan/gift-composer";
import { requireUser } from "@/lib/auth/session";
import { getGiftsPage } from "@/services/fan/experiences";
import { getFormatters, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hediyeler ve Bahşişler") };
}
export const dynamic = "force-dynamic";

const searchSchema = z.object({ to: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,30}$/).optional().catch(undefined) });

export default async function GiftsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/gifts");
  const t = await getT();
  const { formatDate, formatNumber } = await getFormatters();
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const data = await getGiftsPage(user.id, sp.to);
  // Hediye adları veritabanı başvuru içeriğidir: sunucuda çevrilip istemciye geçer.
  const catalog = data.catalog.map((g) => ({ ...g, name: t(g.name) }));
  const nameOf = new Map(catalog.map((g) => [g.key, g.name]));

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow={t("HEYFANS / HEDİYE MERKEZİ")} title={t("Hediyeler ve Bahşişler")} description={t("Sevdiğin içerik üreticilerini destekle ve özel hediyeler gönder.")} />
      <GiftComposer
        key={sp.to ?? "default"}
        catalog={catalog}
        creators={data.creators.map((c) => ({ username: c.username, displayName: c.displayName, avatarUrl: c.avatarUrl }))}
        balance={data.balance}
        initialCreator={sp.to}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Son Hediyelerim")} hint={t("Gönderdiğin hediye ve bahşişlerin geçmişi.")} />
          {data.history.length ? (
            <DataTable>
              <thead>
                <tr>
                  <Th>{t("İçerik üreticisi")}</Th>
                  <Th>{t("Hediye")}</Th>
                  <Th className="text-end">{t("Kredi")}</Th>
                  <Th>{t("Tarih")}</Th>
                  <Th>{t("Durum")}</Th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.id}>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar src={h.creator?.avatarUrl ?? null} name={h.creator?.displayName ?? "?"} size={30} />
                        <span className="font-extrabold text-ink">{h.creator?.displayName ?? t("İçerik üreticisi")}</span>
                      </span>
                    </Td>
                    <Td>
                      {h.kind === "gift" ? (nameOf.get(h.giftKey ?? "") ?? t("Hediye")) : t("Bahşiş")}
                      {h.message && <span className="block max-w-[220px] truncate text-[10px] text-muted">“{h.message}”</span>}
                    </Td>
                    <Td className="text-end font-extrabold tabular-nums">{formatNumber(h.credits)}</Td>
                    <Td className="whitespace-nowrap">{formatDate(h.createdAt)}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <Badge tone="green" size="sm">
                          {t("Gönderildi")}
                        </Badge>
                        {h.anonymous && (
                          <Badge tone="gray" size="sm">
                            {t("Anonim")}
                          </Badge>
                        )}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState compact icon={<Gift />} title={t("Henüz hediye göndermedin")} description={t("İlk hediyeni göndererek içerik üreticilerini destekleyebilirsin.")} />
          )}
        </Card>
        <Card className="hf-gradient-pink h-fit">
          <p className="flex items-center gap-2 text-sm font-extrabold">
            <ShieldCheck className="size-4 text-brand-500" aria-hidden /> {t("Kontrollü hediye sistemi")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-strong">{t("Hediyeler yalnızca kredi bakiyenden düşülür; her hareket cüzdan geçmişinde izlenebilir. İçerik üreticisine ulaşan tutarın nasıl hesaplandığını Creator Sözleşmesi'nde bulabilirsin.")}</p>
          <Link href="/app/wallet" className="mt-4 inline-flex h-10 items-center rounded-full border border-brand-300 bg-white px-5 text-xs font-extrabold text-brand-600 hover:bg-brand-50">
            {t("Cüzdan hareketlerim")}
          </Link>
        </Card>
      </div>
    </div>
  );
}
