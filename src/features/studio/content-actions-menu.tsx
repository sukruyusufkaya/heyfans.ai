"use client";
import Link from "next/link";
import { useState } from "react";
import { EyeOff, FileEdit, FilePen, MoreHorizontal, Pencil, Rocket, Trash2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { ConfirmDialog } from "@/components/studio/confirm-dialog";
import { useRun } from "@/components/studio/use-run";
import { setContentStatusAction } from "./content-actions";

type To = "published" | "hidden" | "draft" | "removed";
const COPY: Record<To, { title: string; body: string; confirm: string; danger?: boolean }> = {
  published: { title: m("İçeriği yayınla"), body: m("“{title}” hayranlarına, erişim ayarına göre görünür olacak."), confirm: m("Yayınla") },
  hidden: { title: m("İçeriği gizle"), body: m("“{title}” yayından kalkar; hayranlar göremez. İstediğin zaman yeniden yayınlayabilirsin."), confirm: m("Gizle") },
  draft: { title: m("Taslağa al"), body: m("“{title}” yayından kalkar ve taslak olarak saklanır."), confirm: m("Taslağa al") },
  removed: { title: m("İçeriği kaldır"), body: m("“{title}” kalıcı olarak kaldırılır; geri alınamaz ve düzenlenemez."), confirm: m("Kaldır"), danger: true },
};

const ALLOWED: Record<string, To[]> = {
  draft: ["published", "removed"],
  in_review: ["draft", "removed"],
  published: ["hidden", "draft", "removed"],
  hidden: ["published", "draft", "removed"],
  removed: [],
};

export function ContentActionsMenu({ id, title, status }: { id: string; title: string; status: string }) {
  const t = useT();
  const { run } = useRun();
  const [target, setTarget] = useState<To | null>(null);
  const options = ALLOWED[status] ?? [];
  const icon = { published: <Rocket />, hidden: <EyeOff />, draft: <FilePen />, removed: <Trash2 /> };
  const label = { published: m("Yayınla"), hidden: m("Gizle"), draft: m("Taslağa al"), removed: m("Kaldır") };
  const cur = target ? COPY[target] : null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="grid size-8 place-items-center rounded-full hover:bg-soft" aria-label={t("{title} işlemleri", { title })}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {status !== "removed" && (
            <DropdownMenuItem asChild>
              <Link href={`/studio/content/${id}/edit`}>
                <Pencil /> {t("Düzenle")}
              </Link>
            </DropdownMenuItem>
          )}
          {options.length > 0 && <DropdownMenuSeparator />}
          {options.map((o) => (
            <DropdownMenuItem key={o} onSelect={() => setTarget(o)} className={o === "removed" ? "text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger" : undefined}>
              {icon[o]} {t(label[o])}
            </DropdownMenuItem>
          ))}
          {status === "removed" && (
            <DropdownMenuItem disabled>
              <FileEdit /> {t("Kaldırılmış içerik")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={cur ? t(cur.title) : ""}
        description={cur ? t(cur.body, { title }) : undefined}
        confirmLabel={cur ? t(cur.confirm) : undefined}
        tone={cur?.danger ? "danger" : "primary"}
        onConfirm={() => (target ? run(() => setContentStatusAction({ id, to: target })) : false)}
      />
    </>
  );
}
