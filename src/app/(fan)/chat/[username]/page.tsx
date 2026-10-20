import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircleOff } from "lucide-react";
import { ChatInfoPanel } from "@/components/fan/chat-info-panel";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { ChatClient } from "@/features/fan/chat-client";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { usernameSchema } from "@/lib/validation/common";
import { getChatPage } from "@/services/fan/chat";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("AI İkiziyle Sohbet") };
}
export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = await params;
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) notFound();
  const { user } = await requireUser(`/chat/${raw}`);
  const t = await getT();

  let data: Awaited<ReturnType<typeof getChatPage>>;
  try {
    data = await getChatPage(user.id, parsed.data);
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") notFound();
    if (err instanceof AppError && err.code === "feature_unavailable") {
      return (
        <div className="mx-auto max-w-2xl">
          <Card>
            <EmptyState
              icon={<MessageCircleOff />}
              title={t("Bu AI ikizi şu anda sohbete açık değil")}
              description={t(err.template, err.params)}
              action={
                <Link href={`/creators/${parsed.data}`} className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                  {t("Profile git")}
                </Link>
              }
            />
          </Card>
        </div>
      );
    }
    throw err;
  }

  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="max-lg:hidden">
        <PageHeader
          eyebrow={t("HEYFANS / FAN EXPERIENCE")}
          title={t("AI İkiziyle Sohbet")}
          description={
            data.creator.isSample
              ? t("{name} kurgusal bir örnek profildir; AI ikiziyle günlük ücretsiz mesaj hakkınla sohbet edebilirsin.", { name: data.creator.displayName })
              : t("{name} adlı içerik üreticisinin yetkilendirilmiş AI ikiziyle kişiselleştirilmiş sohbet.", { name: data.creator.displayName })
          }
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ChatClient
          key={data.conversationId}
          conversationId={data.conversationId}
          creator={data.creator}
          twin={{ voice: data.twin.voice, video: data.twin.video }}
          initialMessages={data.messages}
          initialBilling={data.billing}
          initialBalance={data.balance}
          messagePrice={data.messagePrice}
          maxInputChars={data.maxInputChars}
          ai={data.ai}
          memoryEnabled={data.memoryEnabled}
        />
        <aside className="hidden lg:block" aria-label={t("İçerik üreticisi")}>
          <ChatInfoPanel creator={data.creator} twin={data.twin} />
        </aside>
      </div>
    </div>
  );
}
