"use client";
import Link from "next/link";
import { useState } from "react";
import { EyeOff, FileEdit, FilePen, MoreHorizontal, Pencil, Rocket, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { ConfirmDialog } from "@/components/studio/confirm-dialog";
import { useRun } from "@/components/studio/use-run";
import { setContentStatusAction } from "./content-actions";

type To = "published" | "hidden" | "draft" | "removed";
const COPY: Record<To, { title: string; body: (t: string) => string; confirm: string; danger?: boolean }> = {
  published: { title: "İçeriği yayınla", body: (t) => `“${t}” hayranlarına, erişim ayarına göre görünür olacak.`, confirm: "Yayınla" },
  hidden: { title: "İçeriği gizle", body: (t) => `“${t}” yayından kalkar; hayranlar göremez. İstediğin zaman yeniden yayınlayabilirsin.`, confirm: "Gizle" },
  draft: { title: "Taslağa al", body: (t) => `“${t}” yayından kalkar ve taslak olarak saklanır.`, confirm: "Taslağa al" },
  removed: { title: "İçeriği kaldır", body: (t) => `“${t}” kalıcı olarak kaldırılır; geri alınamaz ve düzenlenemez.`, confirm: "Kaldır", danger: true },
};

const ALLOWED: Record<string, To[]> = {
  draft: ["published", "removed"],
  in_review: ["draft", "removed"],
  published: ["hidden", "draft", "removed"],
  hidden: ["published", "draft", "removed"],
  removed: [],
};

export function ContentActionsMenu({ id, title, status }: { id: string; title: string; status: string }) {
  const { run } = useRun();
  const [target, setTarget] = useState<To | null>(null);
  const options = ALLOWED[status] ?? [];
  const icon = { published: <Rocket />, hidden: <EyeOff />, draft: <FilePen />, removed: <Trash2 /> };
  const label = { published: "Yayınla", hidden: "Gizle", draft: "Taslağa al", removed: "Kaldır" };
  const cur = target ? COPY[target] : null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="grid size-8 place-items-center rounded-full hover:bg-soft" aria-label={`${title} işlemleri`}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {status !== "removed" && (
            <DropdownMenuItem asChild>
              <Link href={`/studio/content/${id}/edit`}>
                <Pencil /> Düzenle
              </Link>
            </DropdownMenuItem>
          )}
          {options.length > 0 && <DropdownMenuSeparator />}
          {options.map((o) => (
            <DropdownMenuItem key={o} onSelect={() => setTarget(o)} className={o === "removed" ? "text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger" : undefined}>
              {icon[o]} {label[o]}
            </DropdownMenuItem>
          ))}
          {status === "removed" && (
            <DropdownMenuItem disabled>
              <FileEdit /> Kaldırılmış içerik
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={cur?.title ?? ""}
        description={cur ? cur.body(title) : undefined}
        confirmLabel={cur?.confirm}
        tone={cur?.danger ? "danger" : "primary"}
        onConfirm={() => (target ? run(() => setContentStatusAction({ id, to: target })) : false)}
      />
    </>
  );
}
