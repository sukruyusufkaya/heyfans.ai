"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Brain, Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/fan/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/display";
import { Input, Switch } from "@/components/ui/form-controls";
import { deleteAllMemoriesAction, deleteCreatorMemoriesAction, deleteMemoryAction, updateMemoryAction, updatePreferencesAction } from "@/features/fan/actions";
import { useFormatters, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import type { MemoryGroup } from "@/services/fan/account";

/* ─── İzin anahtarları ─────────────────────────────────────── */
interface PrivacyState {
  personalizationConsent: boolean;
  aiMemoryEnabled: boolean;
  recommendationsEnabled: boolean;
}

const TOGGLES: { key: keyof PrivacyState; title: string; hint: string }[] = [
  { key: "personalizationConsent", title: m("Kişiselleştirme izni"), hint: m("AI ikizlerinin sohbet deneyimini kişiselleştirmek için verilerini kullanmasına izin ver. AI hafızası bu izne bağlıdır.") },
  { key: "aiMemoryEnabled", title: m("AI hafızasını kullan"), hint: m("Sohbetlerde paylaştığın bazı bilgileri (ör. adın, sevdiğin şeyler) hatırla. Her içerik üreticisi için ayrı tutulur.") },
  { key: "recommendationsEnabled", title: m("İlgi alanı önerileri"), hint: m("Ana sayfadaki ve keşfet alanındaki önerileri ilgi alanlarına göre kişiselleştir.") },
];

export function PrivacyToggles({ initial }: { initial: PrivacyState }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = React.useState(initial);
  const [pending, setPending] = React.useState<string | null>(null);
  const base = React.useId();

  async function toggle(key: keyof PrivacyState, value: boolean) {
    const prev = state;
    const next = { ...state, [key]: value };
    if (key === "personalizationConsent" && !value) next.aiMemoryEnabled = false; // izin kapanınca hafıza da kapanır
    setState(next);
    setPending(key);
    const res = await updatePreferencesAction({ [key]: value });
    setPending(null);
    if (!res.ok) {
      setState(prev);
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <ul className="divide-y divide-line-soft">
      {TOGGLES.map((row) => {
        const disabled = row.key === "aiMemoryEnabled" && !state.personalizationConsent;
        return (
          <li key={row.key} className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <label htmlFor={`${base}-${row.key}`} className="block cursor-pointer text-[13px] font-extrabold">
                {t(row.title)}
              </label>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{t(row.hint)}</p>
              {disabled && <p className="mt-1 text-[10px] font-bold text-warning">{t("Önce kişiselleştirme iznini ver.")}</p>}
            </div>
            <Switch id={`${base}-${row.key}`} checked={state[row.key]} disabled={disabled || pending === row.key} onCheckedChange={(v) => toggle(row.key, v)} />
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Hafıza yöneticisi ────────────────────────────────────── */
const CATEGORY_LABELS: Record<string, string> = { preference: m("Tercih"), personal: m("Kişisel"), context: m("Bağlam"), other: m("Diğer") };

function MemoryItem({ mem }: { mem: MemoryGroup["memories"][number] }) {
  const t = useT();
  const { formatDate } = useFormatters();
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(mem.fact);
  const [busy, setBusy] = React.useState(false);

  async function save() {
    setBusy(true);
    const res = await updateMemoryAction({ id: mem.id, fact: value });
    setBusy(false);
    if (!res.ok) return toast.error(res.fieldErrors ? (Object.values(res.fieldErrors).flat()[0] ?? res.error) : res.error);
    toast.success(res.message ?? t("Güncellendi."));
    setEditing(false);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line-soft bg-[#fcfafd] p-3.5 sm:flex-row sm:items-center">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500">
        <Brain className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="flex gap-2"
          >
            <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} aria-label={t("Hafıza bilgisi")} className="h-10" autoFocus />
            <Button type="submit" size="icon-sm" loading={busy} aria-label={t("Kaydet")}>
              {!busy && <Check />}
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => (setEditing(false), setValue(mem.fact))} aria-label={t("Vazgeç")}>
              <X />
            </Button>
          </form>
        ) : (
          <>
            <p className="text-[13px] font-bold leading-snug">{mem.fact}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
              <Badge tone="gray" size="sm">
                {t(CATEGORY_LABELS[mem.category] ?? mem.category)}
              </Badge>
              {mem.source === "user" ? t("Sen düzenledin") : t("Sohbetten çıkarıldı")} · {formatDate(mem.createdAt)}
            </p>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 gap-1.5">
          <Button variant="secondary" size="xs" shape="pill" onClick={() => setEditing(true)}>
            <Pencil /> {t("Düzenle")}
          </Button>
          <ConfirmDialog
            title={t("Bu bilgiyi sil")}
            description={t("“{fact}” hafızandan silinir. AI ikizi artık bunu hatırlamaz.", { fact: mem.fact })}
            confirmLabel={t("Sil")}
            tone="danger"
            onConfirm={async () => {
              const res = await deleteMemoryAction(mem.id);
              if (!res.ok) {
                toast.error(res.error);
                return false;
              }
              toast.success(res.message ?? t("Silindi."));
              router.refresh();
              return true;
            }}
            trigger={
              <Button variant="danger-soft" size="xs" shape="pill">
                <Trash2 /> {t("Sil")}
              </Button>
            }
          />
        </div>
      )}
    </li>
  );
}

export function MemoryManager({ groups, total }: { groups: MemoryGroup[]; total: number }) {
  const t = useT();
  const router = useRouter();
  return (
    <div className="grid gap-5">
      {groups.map((g) => (
        <section key={g.creator.id} aria-label={t("{name} hafızası", { name: g.creator.displayName })}>
          <div className="mb-2.5 flex flex-wrap items-center gap-3">
            <Avatar src={g.creator.avatarUrl} name={g.creator.displayName} size={32} />
            <h3 className="min-w-0 flex-1 truncate text-sm font-extrabold">
              {g.creator.displayName} <span className="text-[11px] font-bold text-muted">· {t("{count} kayıt", { count: g.memories.length })}</span>
            </h3>
            <ConfirmDialog
              title={t("{name} hafızasını sil", { name: g.creator.displayName })}
              description={t("Bu içerik üreticisinin AI ikizi için saklanan {count} hafıza kaydı kalıcı olarak silinir. Diğer içerik üreticilerinin hafızası etkilenmez.", { count: g.memories.length })}
              confirmLabel={t("Bu hafızayı sil")}
              tone="danger"
              onConfirm={async () => {
                const res = await deleteCreatorMemoriesAction(g.creator.id);
                if (!res.ok) {
                  toast.error(res.error);
                  return false;
                }
                toast.success(res.message ?? t("Silindi."));
                router.refresh();
                return true;
              }}
              trigger={
                <Button variant="ghost" size="xs" shape="pill" className="text-danger hover:bg-danger-soft hover:text-danger">
                  <Trash2 /> {t("Bu içerik üreticisinin hafızasını sil")}
                </Button>
              }
            />
          </div>
          <ul className="grid gap-2.5">
            {g.memories.map((mem) => (
              <MemoryItem key={mem.id} mem={mem} />
            ))}
          </ul>
        </section>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
        <p className="text-xs text-muted">{t("Kaydedilen bilgilere erişebilir, düzenleyebilir veya silebilirsin. Toplam {count} kayıt.", { count: total })}</p>
        <ConfirmDialog
          title={t("Tüm AI hafızamı sil")}
          description={t("Tüm içerik üreticileri için saklanan {count} hafıza kaydı kalıcı olarak silinir. Bu işlem geri alınamaz.", { count: total })}
          confirmLabel={t("Hepsini sil")}
          tone="danger"
          onConfirm={async () => {
            const res = await deleteAllMemoriesAction();
            if (!res.ok) {
              toast.error(res.error);
              return false;
            }
            toast.success(res.message ?? t("Tüm hafıza silindi."));
            router.refresh();
            return true;
          }}
          trigger={
            <Button variant="danger-soft" size="sm" shape="pill">
              <Trash2 /> {t("Tüm hafızamı sil")}
            </Button>
          }
        />
      </div>
    </div>
  );
}
