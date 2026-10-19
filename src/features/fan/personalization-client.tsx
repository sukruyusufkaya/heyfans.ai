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
import { formatDate } from "@/lib/utils";
import type { MemoryGroup } from "@/services/fan/account";

/* ─── İzin anahtarları ─────────────────────────────────────── */
interface PrivacyState {
  personalizationConsent: boolean;
  aiMemoryEnabled: boolean;
  recommendationsEnabled: boolean;
}

const TOGGLES: { key: keyof PrivacyState; title: string; hint: string }[] = [
  { key: "personalizationConsent", title: "Kişiselleştirme izni", hint: "AI ikizlerinin sohbet deneyimini kişiselleştirmek için verilerini kullanmasına izin ver. AI hafızası bu izne bağlıdır." },
  { key: "aiMemoryEnabled", title: "AI hafızasını kullan", hint: "Sohbetlerde paylaştığın bazı bilgileri (ör. adın, sevdiğin şeyler) hatırla. Her içerik üreticisi için ayrı tutulur." },
  { key: "recommendationsEnabled", title: "İlgi alanı önerileri", hint: "Ana sayfadaki ve keşfet alanındaki önerileri ilgi alanlarına göre kişiselleştir." },
];

export function PrivacyToggles({ initial }: { initial: PrivacyState }) {
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
      {TOGGLES.map((t) => {
        const disabled = t.key === "aiMemoryEnabled" && !state.personalizationConsent;
        return (
          <li key={t.key} className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <label htmlFor={`${base}-${t.key}`} className="block cursor-pointer text-[13px] font-extrabold">
                {t.title}
              </label>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{t.hint}</p>
              {disabled && <p className="mt-1 text-[10px] font-bold text-warning">Önce kişiselleştirme iznini ver.</p>}
            </div>
            <Switch id={`${base}-${t.key}`} checked={state[t.key]} disabled={disabled || pending === t.key} onCheckedChange={(v) => toggle(t.key, v)} />
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Hafıza yöneticisi ────────────────────────────────────── */
const CATEGORY_LABELS: Record<string, string> = { preference: "Tercih", personal: "Kişisel", context: "Bağlam", other: "Diğer" };

function MemoryItem({ m }: { m: MemoryGroup["memories"][number] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(m.fact);
  const [busy, setBusy] = React.useState(false);

  async function save() {
    setBusy(true);
    const res = await updateMemoryAction({ id: m.id, fact: value });
    setBusy(false);
    if (!res.ok) return toast.error(res.fieldErrors ? (Object.values(res.fieldErrors).flat()[0] ?? res.error) : res.error);
    toast.success(res.message ?? "Güncellendi.");
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
            <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} aria-label="Hafıza bilgisi" className="h-10" autoFocus />
            <Button type="submit" size="icon-sm" loading={busy} aria-label="Kaydet">
              {!busy && <Check />}
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => (setEditing(false), setValue(m.fact))} aria-label="Vazgeç">
              <X />
            </Button>
          </form>
        ) : (
          <>
            <p className="text-[13px] font-bold leading-snug">{m.fact}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
              <Badge tone="gray" size="sm">{CATEGORY_LABELS[m.category] ?? m.category}</Badge>
              {m.source === "user" ? "Sen düzenledin" : "Sohbetten çıkarıldı"} · {formatDate(m.createdAt)}
            </p>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 gap-1.5">
          <Button variant="secondary" size="xs" shape="pill" onClick={() => setEditing(true)}>
            <Pencil /> Düzenle
          </Button>
          <ConfirmDialog
            title="Bu bilgiyi sil"
            description={`“${m.fact}” hafızandan silinir. AI ikizi artık bunu hatırlamaz.`}
            confirmLabel="Sil"
            tone="danger"
            onConfirm={async () => {
              const res = await deleteMemoryAction(m.id);
              if (!res.ok) {
                toast.error(res.error);
                return false;
              }
              toast.success(res.message ?? "Silindi.");
              router.refresh();
              return true;
            }}
            trigger={
              <Button variant="danger-soft" size="xs" shape="pill">
                <Trash2 /> Sil
              </Button>
            }
          />
        </div>
      )}
    </li>
  );
}

export function MemoryManager({ groups, total }: { groups: MemoryGroup[]; total: number }) {
  const router = useRouter();
  return (
    <div className="grid gap-5">
      {groups.map((g) => (
        <section key={g.creator.id} aria-label={`${g.creator.displayName} hafızası`}>
          <div className="mb-2.5 flex flex-wrap items-center gap-3">
            <Avatar src={g.creator.avatarUrl} name={g.creator.displayName} size={32} />
            <h3 className="min-w-0 flex-1 truncate text-sm font-extrabold">
              {g.creator.displayName} <span className="text-[11px] font-bold text-muted">· {g.memories.length} kayıt</span>
            </h3>
            <ConfirmDialog
              title={`${g.creator.displayName} hafızasını sil`}
              description={`Bu içerik üreticisinin AI ikizi için saklanan ${g.memories.length} hafıza kaydı kalıcı olarak silinir. Diğer içerik üreticilerinin hafızası etkilenmez.`}
              confirmLabel="Bu hafızayı sil"
              tone="danger"
              onConfirm={async () => {
                const res = await deleteCreatorMemoriesAction(g.creator.id);
                if (!res.ok) {
                  toast.error(res.error);
                  return false;
                }
                toast.success(res.message ?? "Silindi.");
                router.refresh();
                return true;
              }}
              trigger={
                <Button variant="ghost" size="xs" shape="pill" className="text-danger hover:bg-danger-soft hover:text-danger">
                  <Trash2 /> Bu içerik üreticisinin hafızasını sil
                </Button>
              }
            />
          </div>
          <ul className="grid gap-2.5">
            {g.memories.map((m) => (
              <MemoryItem key={m.id} m={m} />
            ))}
          </ul>
        </section>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
        <p className="text-xs text-muted">Kaydedilen bilgilere erişebilir, düzenleyebilir veya silebilirsin. Toplam {total} kayıt.</p>
        <ConfirmDialog
          title="Tüm AI hafızamı sil"
          description={`Tüm içerik üreticileri için saklanan ${total} hafıza kaydı kalıcı olarak silinir. Bu işlem geri alınamaz.`}
          confirmLabel="Hepsini sil"
          tone="danger"
          onConfirm={async () => {
            const res = await deleteAllMemoriesAction();
            if (!res.ok) {
              toast.error(res.error);
              return false;
            }
            toast.success(res.message ?? "Tüm hafıza silindi.");
            router.refresh();
            return true;
          }}
          trigger={
            <Button variant="danger-soft" size="sm" shape="pill">
              <Trash2 /> Tüm hafızamı sil
            </Button>
          }
        />
      </div>
    </div>
  );
}
