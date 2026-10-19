import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail, RefreshCw } from "lucide-react";
import { AuthSingle } from "@/components/auth/auth-shell";
import { FormAlert } from "@/components/auth/auth-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { env } from "@/config/env";
import { firstParam } from "@/features/auth/next-url";
import { formatDateTime } from "@/lib/utils";
import { listOutbox } from "@/services/auth/outbox";

export const metadata: Metadata = { title: "Geliştirme Posta Kutusu" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { verify_email: "E-posta doğrulama", reset_password: "Şifre sıfırlama", notification: "Bildirim" };

/** Yalnız yerel geliştirme: gönderilen e-postaların kopyaları. development dışında (demo/production) 404 döner. */
export default async function DevOutboxPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (env().APP_MODE !== "development") notFound();
  const sp = await searchParams;
  const to = (firstParam(sp.to) ?? "").trim().slice(0, 200);
  const items = await listOutbox({ to: to || undefined, limit: 30 });

  return (
    <AuthSingle width="max-w-[860px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-500">Geliştirme</p>
          <h1 className="mt-2 font-display text-[30px] font-extrabold leading-tight tracking-[-0.035em] [word-spacing:0.07em] text-ink sm:text-[34px]">
            Posta <span className="text-brand-500">kutusu.</span>
          </h1>
        </div>
        <Button asChild variant="secondary" size="md">
          <Link href={to ? `/dev/outbox?to=${encodeURIComponent(to)}` : "/dev/outbox"}>
            <RefreshCw aria-hidden /> Yenile
          </Link>
        </Button>
      </div>
      <FormAlert tone="warn" className="mt-5">
        <p>
          E-posta sağlayıcısı <strong>outbox</strong> modunda: e-postalar gerçekten gönderilmez, burada görünür. Bu sayfa yalnız yerel geliştirmede (<code>APP_MODE=development</code>) açıktır.
        </p>
      </FormAlert>
      {to && (
        <p className="mt-4 text-xs text-muted-strong">
          Filtre: <strong className="text-ink">{to}</strong> ·{" "}
          <Link href="/dev/outbox" className="font-bold text-brand-500 hover:underline">
            Tümünü göster
          </Link>
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<Mail />} title="Henüz e-posta yok" description="Kayıt olduğunda veya şifre sıfırlama istediğinde e-postalar burada görünür." compact />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-ink">{m.subject}</p>
                  <p className="truncate text-xs text-muted-strong">{m.to}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="pink">{KIND_LABEL[m.kind] ?? m.kind}</Badge>
                  <span className="text-[11px] text-muted">{formatDateTime(m.createdAt)}</span>
                </div>
              </div>
              {m.links.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {m.links.map((l) => (
                    <li key={l}>
                      <a href={l} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-100">
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{l}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] font-bold text-muted hover:text-ink-soft">Metni göster</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-soft p-3 text-[11px] leading-relaxed text-ink-soft">{m.text}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </AuthSingle>
  );
}
