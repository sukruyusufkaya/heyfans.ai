import type { Metadata } from "next";
import { Film, Image as ImageIcon, Mic, Plus, ScrollText, ShieldCheck, Sparkles } from "lucide-react";
import { z } from "zod";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { NewRequestDialog, RequestRow } from "@/features/fan/experiences-client";
import { requireUser } from "@/lib/auth/session";
import { getFanRequestViews, listFollowedCreatorOptions } from "@/services/fan/experiences";
import { ensureWallet } from "@/services/wallet/wallet";

export const metadata: Metadata = { title: "Özel Deneyimlerim" };
export const dynamic = "force-dynamic";

const searchSchema = z.object({ tab: z.enum(["all", "active", "completed", "closed"]).catch("all") });

const ACTIVE = ["draft", "pending", "in_review", "approved", "processing"];

const TYPE_TILES = [
  { type: "photo" as const, icon: ImageIcon, title: "Özel Görsel", sub: "Kişiye özel tasarım" },
  { type: "video" as const, icon: Film, title: "Özel Video", sub: "Kısa video deneyimi" },
  { type: "audio" as const, icon: Mic, title: "Sesli Mesaj", sub: "Kişiselleştirilmiş ses" },
  { type: "message" as const, icon: ScrollText, title: "Özel Senaryo", sub: "AI destekli içerik" },
];

export default async function ExperiencesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/experiences");
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const [all, creators, wallet] = await Promise.all([getFanRequestViews(user.id, "all"), listFollowedCreatorOptions(user.id), ensureWallet(user.id)]);
  const rows = all.filter((r) => (sp.tab === "all" ? true : sp.tab === "active" ? ACTIVE.includes(r.status) : sp.tab === "completed" ? r.status === "completed" : ["rejected", "canceled"].includes(r.status)));
  const counts = { all: all.length, active: all.filter((r) => ACTIVE.includes(r.status)).length, completed: all.filter((r) => r.status === "completed").length, closed: all.filter((r) => ["rejected", "canceled"].includes(r.status)).length };
  const href = (tab: string) => buildHref("/app/experiences", { tab: tab === "all" ? null : tab });

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow="HEYFANS / DENEYİM MERKEZİ" title="Özel Deneyimlerim" description="Kişiselleştirilmiş içerikler talep et ve sürecini takip et." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Deneyim Taleplerim"
            hint="Özel isteklerini ve süreç durumlarını buradan takip et."
            action={
              <NewRequestDialog
                creators={creators}
                balance={wallet.balance}
                trigger={
                  <Button size="sm" shape="pill">
                    <Plus /> Yeni talep
                  </Button>
                }
              />
            }
          />
          <LinkTabs
            className="mb-4"
            label="Talep filtresi"
            items={[
              { href: href("all"), label: "Tüm Talepler", active: sp.tab === "all", count: counts.all },
              { href: href("active"), label: "Devam Edenler", active: sp.tab === "active", count: counts.active },
              { href: href("completed"), label: "Tamamlananlar", active: sp.tab === "completed", count: counts.completed },
              { href: href("closed"), label: "Reddedilen / İptal", active: sp.tab === "closed", count: counts.closed },
            ]}
          />
          {rows.length ? (
            <ul className="grid gap-3">
              {rows.map((r) => (
                <RequestRow key={r.id} r={r} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Sparkles />}
              title={all.length ? "Bu filtrede talep yok" : "Henüz özel talebin yok"}
              description={all.length ? "Başka bir sekmeyi dene." : "Takip ettiğin içerik üreticilerinden kişiye özel görsel, video veya sesli mesaj isteyebilirsin."}
              action={
                !all.length && (
                  <NewRequestDialog
                    creators={creators}
                    balance={wallet.balance}
                    trigger={
                      <Button shape="pill">
                        <Plus /> İlk talebini oluştur
                      </Button>
                    }
                  />
                )
              }
            />
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader title="Hangi deneyimi istersin?" hint="AI ile üretilen deneyimlerde içerik üreticisinin izni uygulanır." />
            <ul className="grid grid-cols-2 gap-2.5">
              {TYPE_TILES.map((t) => (
                <li key={t.type}>
                  <NewRequestDialog
                    creators={creators}
                    balance={wallet.balance}
                    defaultType={t.type}
                    trigger={
                      <button type="button" className="flex w-full flex-col items-start gap-2 rounded-2xl border border-line-soft bg-[#fcfafd] p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50">
                        <span className="grid size-9 place-items-center rounded-xl bg-brand-100 text-brand-500">
                          <t.icon className="size-[18px]" aria-hidden />
                        </span>
                        <span className="text-xs font-extrabold">{t.title}</span>
                        <span className="text-[10px] text-muted">{t.sub}</span>
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
          <Card className="hf-gradient-pink">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <ShieldCheck className="size-4 text-brand-500" aria-hidden /> Onaylı deneyimler
            </p>
            <ul className="mt-3 grid gap-2 text-xs leading-relaxed text-muted-strong">
              <li>• Talepler içerik üreticisinin izinleri ve moderasyon kontrollerinden geçer.</li>
              <li>• Kredin, talep sonuçlanana kadar bloke edilir; reddedilirse veya iptal edersen iade edilir.</li>
              <li>• Teslim edilen dosyalar yalnız sana özel olarak erişilebilir.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
