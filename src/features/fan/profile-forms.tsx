"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { removeAvatarAction, setAvatarAction, updatePreferencesAction, updateProfileNameAction } from "@/features/fan/actions";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];

/** Oturum çerez önbelleği (5 dk) yüzünden eski görünmesin diye profil değişince oturum yeniden okunur. */
async function refreshSession() {
  try {
    await authClient.getSession({ query: { disableCookieCache: true } });
  } catch {
    /* sessizce geç: sayfa yenilenince güncellenir */
  }
}

/* ─── Avatar yükleme ───────────────────────────────────────── */
export function AvatarUploader({ name, image }: { name: string; image: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    if (!AVATAR_MIMES.includes(file.type)) return toast.error("Yalnız JPEG, PNG veya WebP görseller yüklenebilir.");
    if (file.size > MAX_AVATAR_BYTES) return toast.error("Görsel en fazla 5 MB olabilir.");
    setBusy(true);
    try {
      const prep = await fetch("/api/media/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose: "avatar", mime: file.type, sizeBytes: file.size, fileName: file.name }) });
      const prepJson = (await prep.json()) as { assetId?: string; upload?: { method: string; url: string; headers?: Record<string, string> }; error?: string };
      if (!prep.ok || !prepJson.assetId || !prepJson.upload) throw new Error(prepJson.error ?? "Yükleme başlatılamadı.");
      const put = await fetch(prepJson.upload.url, { method: prepJson.upload.method, headers: prepJson.upload.headers, body: file });
      if (!put.ok) throw new Error("Dosya yüklenemedi.");
      const done = await fetch(`/api/media/${prepJson.assetId}/complete`, { method: "POST" });
      const doneJson = (await done.json()) as { error?: string };
      if (!done.ok) throw new Error(doneJson.error ?? "Yükleme doğrulanamadı.");
      const res = await setAvatarAction(prepJson.assetId);
      if (!res.ok) throw new Error(res.error);
      toast.success(res.message ?? "Profil fotoğrafın güncellendi.");
      await refreshSession();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fotoğraf yüklenemedi.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Avatar src={image} name={name} size={80} />
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70" role="status" aria-label="Yükleniyor">
            <Loader2 className="size-5 animate-spin text-brand-500" />
          </span>
        )}
      </div>
      <input ref={input} type="file" accept={AVATAR_MIMES.join(",")} className="sr-only" id="avatar-file" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" size="sm" shape="pill" disabled={busy} onClick={() => input.current?.click()}>
          <Camera /> Profil fotoğrafını değiştir
        </Button>
        {image && (
          <Button
            variant="ghost"
            size="sm"
            shape="pill"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await removeAvatarAction();
              setBusy(false);
              if (res.ok) {
                toast.success(res.message ?? "Fotoğraf kaldırıldı.");
                await refreshSession();
                router.refresh();
              } else toast.error(res.error);
            }}
          >
            <Trash2 /> Kaldır
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Genel bilgiler ───────────────────────────────────────── */
export function NameForm({ initialName, email, username, memberSince }: { initialName: string; email: string; username: string | null; memberSince: string }) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const id = React.useId();
  const dirty = name.trim() !== initialName;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateProfileNameAction(name);
    setBusy(false);
    if (!res.ok) {
      setError(res.fieldErrors ? (Object.values(res.fieldErrors).flat()[0] ?? res.error) : res.error);
      return;
    }
    toast.success(res.message ?? "Profilin güncellendi.");
    await refreshSession();
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Field label="Ad Soyad" htmlFor={`${id}-n`} error={error} required className="sm:col-span-2">
        <Input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" aria-invalid={Boolean(error) || undefined} />
      </Field>
      <Field label="E-posta" htmlFor={`${id}-e`} hint="E-posta değişikliği için destek ekibiyle iletişime geç.">
        <Input id={`${id}-e`} value={email} readOnly disabled />
      </Field>
      <Field label="Kullanıcı adı" htmlFor={`${id}-u`}>
        <Input id={`${id}-u`} value={username ? `@${username}` : "Belirlenmemiş"} readOnly disabled />
      </Field>
      <p className="text-[11px] text-muted sm:col-span-2">Üyelik başlangıcı: {memberSince}</p>
      <div className="sm:col-span-2">
        <Button type="submit" loading={busy} disabled={!dirty || name.trim().length < 2}>
          Değişiklikleri kaydet
        </Button>
      </div>
    </form>
  );
}

/* ─── İlgi alanı seçici (Profil + Kişiselleştirme) ─────────── */
export function InterestPicker({ categories, initial, label = "İlgi alanlarını kaydet" }: { categories: { slug: string; name: string }[]; initial: string[]; label?: string }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>(initial);
  const [busy, setBusy] = React.useState(false);
  const dirty = selected.slice().sort().join() !== initial.slice().sort().join();

  return (
    <div>
      <div role="group" aria-label="İlgi alanları" className="flex flex-wrap gap-2.5">
        {categories.map((c) => {
          const on = selected.includes(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected((s) => (on ? s.filter((x) => x !== c.slug) : s.length >= 12 ? (toast.info("En fazla 12 ilgi alanı seçebilirsin."), s) : [...s, c.slug]))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-extrabold transition-colors",
                on ? "border-brand-400 bg-brand-50 text-brand-600" : "border-line bg-white text-muted-strong hover:border-brand-200",
              )}
            >
              {on && <Check className="size-3.5" aria-hidden />} {c.name}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant={dirty ? "primary" : "secondary"}
          size="sm"
          shape="pill"
          disabled={!dirty}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const res = await updatePreferencesAction({ interests: selected });
            setBusy(false);
            if (res.ok) {
              toast.success("İlgi alanların kaydedildi.");
              router.refresh();
            } else toast.error(res.error);
          }}
        >
          {label}
        </Button>
        <span className="text-[11px] text-muted">{selected.length} seçili</span>
      </div>
    </div>
  );
}
