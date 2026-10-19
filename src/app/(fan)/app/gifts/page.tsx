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
import { formatDate, formatNumber } from "@/lib/utils";
import { getGiftsPage } from "@/services/fan/experiences";

export const metadata: Metadata = { title: "Hediyeler ve Bahşişler" };
export const dynamic = "force-dynamic";

const searchSchema = z.object({ to: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,30}$/).optional().catch(undefined) });

export default async function GiftsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/gifts");
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const data = await getGiftsPage(user.id, sp.to);
  const nameOf = new Map(data.catalog.map((g) => [g.key, g.name]));

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow="HEYFANS / HEDİYE MERKEZİ" title="Hediyeler ve Bahşişler" description="Sevdiğin içerik üreticilerini destekle ve özel hediyeler gönder." />
      <GiftComposer
        key={sp.to ?? "default"}
        catalog={data.catalog}
        creators={data.creators.map((c) => ({ username: c.username, displayName: c.displayName, avatarUrl: c.avatarUrl }))}
        balance={data.balance}
        initialCreator={sp.to}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Son Hediyelerim" hint="Gönderdiğin hediye ve bahşişlerin geçmişi." />
          {data.history.length ? (
            <DataTable>
              <thead>
                <tr>
                  <Th>İçerik üreticisi</Th>
                  <Th>Hediye</Th>
                  <Th className="text-right">Kredi</Th>
                  <Th>Tarih</Th>
                  <Th>Durum</Th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.id}>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar src={h.creator?.avatarUrl ?? null} name={h.creator?.displayName ?? "?"} size={30} />
                        <span className="font-extrabold text-ink">{h.creator?.displayName ?? "İçerik üreticisi"}</span>
                      </span>
                    </Td>
                    <Td>
                      {h.kind === "gift" ? (nameOf.get(h.giftKey ?? "") ?? "Hediye") : "Bahşiş"}
                      {h.message && <span className="block max-w-[220px] truncate text-[10px] text-muted">“{h.message}”</span>}
                    </Td>
                    <Td className="text-right font-extrabold tabular-nums">{formatNumber(h.credits)}</Td>
                    <Td className="whitespace-nowrap">{formatDate(h.createdAt)}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <Badge tone="green" size="sm">Gönderildi</Badge>
                        {h.anonymous && <Badge tone="gray" size="sm">Anonim</Badge>}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState compact icon={<Gift />} title="Henüz hediye göndermedin" description="İlk hediyeni göndererek içerik üreticilerini destekleyebilirsin." />
          )}
        </Card>
        <Card className="hf-gradient-pink h-fit">
          <p className="flex items-center gap-2 text-sm font-extrabold">
            <ShieldCheck className="size-4 text-brand-500" aria-hidden /> Kontrollü hediye sistemi
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-strong">Hediyeler yalnızca kredi bakiyenden düşülür; her hareket cüzdan geçmişinde izlenebilir. İçerik üreticisine ulaşan tutarın nasıl hesaplandığını Creator Sözleşmesi&apos;nde bulabilirsin.</p>
          <Link href="/app/wallet" className="mt-4 inline-flex h-10 items-center rounded-full border border-brand-300 bg-white px-5 text-xs font-extrabold text-brand-600 hover:bg-brand-50">
            Cüzdan hareketlerim
          </Link>
        </Card>
      </div>
    </div>
  );
}
