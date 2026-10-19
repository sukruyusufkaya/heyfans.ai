"use client";
import { useEffect, useId, useRef, useState } from "react";
import { FileText, Film, ImageIcon, Loader2, Music2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadPurpose = "avatar" | "cover" | "content" | "content_preview" | "knowledge" | "voice_sample" | "deliverable";

export interface UploadedFile {
  assetId: string;
  url: string;
  kind: string;
  name: string;
  sizeBytes: number;
}

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
};

function declaredMime(file: File) {
  const t = file.type;
  if (t === "audio/x-m4a" || t === "audio/m4a") return "audio/mp4";
  if (t) return t;
  return EXT_MIME[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

async function readError(res: Response) {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? "Yükleme başarısız oldu.";
  } catch {
    return "Yükleme başarısız oldu.";
  }
}

/** Yükleme akışı: upload-url → PUT (ilerlemeli) → complete. Hata durumunda Türkçe mesajla reddeder. */
export async function uploadAsset(file: File, purpose: UploadPurpose, onProgress?: (ratio: number) => void): Promise<UploadedFile> {
  const mime = declaredMime(file);
  const init = await fetch("/api/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, mime, sizeBytes: file.size, fileName: file.name }),
  });
  if (!init.ok) throw new Error(await readError(init));
  const { assetId, upload } = (await init.json()) as { assetId: string; upload: { method: string; url: string; headers: Record<string, string> } };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(upload.method, upload.url);
    for (const [k, v] of Object.entries(upload.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      try {
        reject(new Error((JSON.parse(xhr.responseText) as { error?: string }).error ?? "Dosya yüklenemedi."));
      } catch {
        reject(new Error("Dosya yüklenemedi."));
      }
    };
    xhr.onerror = () => reject(new Error("Dosya yüklenemedi. Bağlantını kontrol et."));
    xhr.send(file);
  });

  const done = await fetch(`/api/media/${assetId}/complete`, { method: "POST" });
  if (!done.ok) throw new Error(await readError(done));
  const j = (await done.json()) as { assetId: string; kind: string; url: string };
  return { assetId: j.assetId, url: j.url, kind: j.kind, name: file.name, sizeBytes: file.size };
}

const prettySize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Thumb({ f }: { f: UploadedFile }) {
  const Icon = f.kind === "video" ? Film : f.kind === "audio" ? Music2 : f.kind === "document" ? FileText : ImageIcon;
  return f.kind === "image" ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={f.url} alt="" className="size-11 rounded-lg object-cover" />
  ) : (
    <span className="grid size-11 place-items-center rounded-lg bg-brand-100 text-brand-500">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/**
 * Dosya yükleyici (sürükle-bırak + seçici). Parent `value` listesini tutar; yeni dosyalar sırayla yüklenir.
 * `max=1` tek dosya modudur (yeni dosya eskisinin yerini alır).
 */
export function MediaUploader({
  purpose,
  value,
  onChange,
  accept,
  max = 1,
  label,
  hint,
  disabled,
  className,
  compact,
}: {
  purpose: UploadPurpose;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  max?: number;
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const id = useId();
  const [busy, setBusy] = useState<{ key: string; name: string; progress: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const full = max > 1 && value.length >= max;

  async function handle(files: FileList | File[]) {
    const list = Array.from(files).slice(0, max > 1 ? max - latest.current.length : 1);
    if (!list.length) return;
    setError(null);
    let acc = max > 1 ? [...latest.current] : [];
    for (const file of list) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      setBusy((b) => [...b, { key, name: file.name, progress: 0 }]);
      try {
        const up = await uploadAsset(file, purpose, (r) => setBusy((b) => b.map((x) => (x.key === key ? { ...x, progress: r } : x))));
        acc = max > 1 ? [...acc, up] : [up];
        onChange(acc);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Yükleme başarısız oldu.");
      } finally {
        setBusy((b) => b.filter((x) => x.key !== key));
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  const isBusy = busy.length > 0;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !full) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled && !full) void handle(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 text-center transition-colors focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100 hover:bg-brand-50",
          compact ? "py-4" : "py-7",
          drag && "border-brand-400 bg-brand-100",
          (disabled || full) && "cursor-not-allowed opacity-55",
        )}
      >
        {isBusy ? <Loader2 className="size-5 animate-spin text-brand-500" aria-hidden /> : <UploadCloud className="size-5 text-brand-500" aria-hidden />}
        <span className="text-[12px] font-extrabold text-ink">{label}</span>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={max > 1}
          disabled={disabled || full || isBusy}
          onChange={(e) => e.target.files && void handle(e.target.files)}
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-danger">
          {error}
        </p>
      )}
      {(value.length > 0 || busy.length > 0) && (
        <ul className="mt-3 grid gap-2" aria-live="polite">
          {value.map((f) => (
            <li key={f.assetId} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2">
              <Thumb f={f} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold text-ink">{f.name}</p>
                <p className="text-[10px] text-muted">{prettySize(f.sizeBytes)}</p>
              </div>
              <button type="button" disabled={disabled} onClick={() => onChange(value.filter((x) => x.assetId !== f.assetId))} className="grid size-8 place-items-center rounded-full text-muted hover:bg-soft hover:text-danger" aria-label={`${f.name} dosyasını kaldır`}>
                <X className="size-4" />
              </button>
            </li>
          ))}
          {busy.map((b) => (
            <li key={b.key} className="rounded-xl border border-line bg-white p-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="truncate font-bold text-ink">{b.name}</span>
                <span className="text-muted">%{Math.round(b.progress * 100)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f3eaf2]" role="progressbar" aria-valuenow={Math.round(b.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.name} yükleniyor`}>
                <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${b.progress * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
