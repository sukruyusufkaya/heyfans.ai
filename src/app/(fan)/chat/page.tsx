import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Verified } from "@/components/creator/creator-cards";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { AiTwinLabel } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { cn, formatRelative, formatTime } from "@/lib/utils";
import { getChatList } from "@/services/fan/chat";

export const metadata: Metadata = { title: "Sohbet Kutusu" };
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  filter: z.enum(["all", "unread"]).catch("all"),
  q: z.string().trim().max(60).catch(""),
  c: z.string().trim().max(40).optional().catch(undefined),
});

export default async function ChatInboxPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/chat");
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const { list, selected, preview } = await getChatList(user.id, { filter: sp.filter, q: sp.q || undefined, selected: sp.c });
  const base = { filter: sp.filter === "all" ? null : sp.filter, q: sp.q || null };
  const filtered = Boolean(sp.q) || sp.filter === "unread";

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow="HEYFANS / FAN EXPERIENCE" title="Sohbet Kutusu" description="Tüm AI ikizi konuşmalarına tek bir yerden eriş." />
      <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <Card padded={false} className="flex flex-col overflow-hidden lg:h-[calc(100dvh-230px)] lg:min-h-[520px]">
          <div className="border-b border-line p-4">
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em]">Tüm sohbetler ({list.length})</h2>
            <form action="/chat" method="get" role="search" className="mt-3 flex h-10 items-center gap-2 rounded-full border border-[#f0eef2] bg-[#f7f6f9] px-3.5 focus-within:border-brand-300">
              {sp.filter !== "all" && <input type="hidden" name="filter" value={sp.filter} />}
              <Search className="size-3.5 text-[#aaa5ae]" aria-hidden />
              <input name="q" defaultValue={sp.q} aria-label="Sohbetlerinde ara" placeholder="Sohbetlerinde ara..." className="w-full bg-transparent text-xs outline-none" maxLength={60} />
            </form>
            <LinkTabs
              className="mt-3"
              label="Sohbet filtresi"
              items={[
                { href: buildHref("/chat", { ...base, filter: null }), label: "Tümü", active: sp.filter === "all" },
                { href: buildHref("/chat", { ...base, filter: "unread" }), label: "Okunmamış", active: sp.filter === "unread" },
              ]}
            />
          </div>
          {list.length ? (
            <ul className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              {list.map((c) => {
                const active = selected?.conversationId === c.conversationId;
                return (
                  <li key={c.conversationId} className="relative border-b border-line-soft last:border-b-0">
                    {/* Mobilde doğrudan sohbet, masaüstünde sağ panelde önizleme */}
                    <Link href={`/chat/${c.creator.username}`} className="absolute inset-0 z-10 lg:hidden" aria-label={`${c.creator.displayName} ile sohbeti aç`} />
                    <Link
                      href={buildHref("/chat", { ...base, c: c.creator.username })}
                      scroll={false}
                      className="absolute inset-0 z-10 hidden lg:block"
                      aria-label={`${c.creator.displayName} sohbetini önizle`}
                      aria-current={active ? "true" : undefined}
                    />
                    <div className={cn("flex items-center gap-3 px-4 py-3.5", active && "bg-brand-50")}>
                      <Avatar src={c.creator.avatarUrl} name={c.creator.displayName} size={46} online={c.creator.isOnline} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[13px] font-extrabold">
                          <span className="truncate">{c.creator.displayName}</span> {c.creator.verified && <Verified className="size-3.5" />}
                          <AiTwinLabel className="shrink-0" />
                        </p>
                        <p className={cn("mt-0.5 truncate text-[11px]", c.unread ? "font-bold text-ink-soft" : "text-muted")}>{c.preview ?? "Henüz mesaj yok"}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-[10px] text-muted">{c.lastAt ? formatRelative(c.lastAt) : ""}</span>
                        {c.unread > 0 && (
                          <span className="grid size-[18px] place-items-center rounded-full bg-brand-500 text-[10px] font-black text-white" aria-label={`${c.unread} okunmamış mesaj`}>
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<MessageCircle />}
              title={filtered ? "Eşleşen sohbet bulunamadı" : "Henüz sohbetin yok"}
              description={filtered ? "Filtreyi ya da aramayı değiştirmeyi dene." : "Bir AI ikiziyle konuşmaya başladığında konuşmaların burada görünür."}
              action={
                <Link href="/explore" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                  İkizleri keşfet
                </Link>
              }
            />
          )}
        </Card>

        {/* Sağ panel: seçili sohbet önizlemesi (yalnız lg+) */}
        <Card padded={false} className="hidden flex-col overflow-hidden lg:flex lg:h-[calc(100dvh-230px)] lg:min-h-[520px]">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                <Avatar src={selected.creator.avatarUrl} name={selected.creator.displayName} size={44} online={selected.creator.isOnline} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold">
                    {selected.creator.displayName} {selected.creator.verified && <Verified />}
                    <AiTwinLabel />
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-success">● Yetkilendirilmiş AI ikizi</p>
                </div>
                <Link href={`/chat/${selected.creator.username}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                  Sohbeti aç <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_80%_10%,#fff3fa_0%,#fff_55%)] px-6 py-5 scrollbar-thin" aria-label="Son mesajlar">
                <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-[10px] font-bold text-brand-600">
                  <ShieldCheck className="size-3.5" aria-hidden /> Bu görüşme yetkilendirilmiş bir AI ikiziyle yapılmaktadır.
                </div>
                {preview.length ? (
                  preview.map((m) => (
                    <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : m.role === "system" ? "justify-center" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
                          m.role === "user" && "rounded-br-md bg-brand-500 text-white",
                          m.role === "ai" && "rounded-bl-md bg-[#f4f2f6] text-ink",
                          m.role === "system" && "border border-[#f3dca8] bg-warning-soft text-xs text-ink-soft",
                        )}
                      >
                        {m.body}
                        <span className={cn("mt-1 block text-[10px]", m.role === "user" ? "text-white/70" : "text-muted")}>{formatTime(m.createdAt)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="pt-8 text-center text-xs text-muted">Bu konuşmada henüz mesaj yok.</p>
                )}
              </div>
              <div className="border-t border-line p-4">
                <Link href={`/chat/${selected.creator.username}`} className="flex h-11 items-center rounded-full border border-line bg-[#faf8fb] px-5 text-xs text-[#b2a6b3] hover:border-brand-300">
                  Mesajını yaz...
                </Link>
              </div>
            </>
          ) : (
            <EmptyState className="my-auto" icon={<MessageCircle />} title="Bir sohbet seç" description="Soldaki listeden bir konuşma seçtiğinde son mesajlar burada görünür." />
          )}
        </Card>
      </div>
    </div>
  );
}
