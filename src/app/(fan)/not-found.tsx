import Link from "next/link";
import { SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";

export default function FanNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <EmptyState
          icon={<SearchX />}
          title="Aradığın sayfa bulunamadı"
          description="Bağlantı hatalı olabilir ya da içerik artık yayında değil."
          action={
            <Link href="/app" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              Ana sayfaya dön
            </Link>
          }
        />
      </Card>
    </div>
  );
}
