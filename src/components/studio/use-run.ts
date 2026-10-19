"use client";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/errors";

/**
 * Server Action çağrısı + toast + bekleme durumu.
 * `run(() => action(input))` → başarıda mesajı toast'lar ve `true` döner; hatada hata toast'ı + alan hataları.
 */
export function useRun() {
  const [pending, start] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, opts: { onOk?: (data: T) => void; success?: string | false; onError?: (error: string) => void } = {}) =>
      new Promise<boolean>((resolve) => {
        start(async () => {
          try {
            const res = await fn();
            if (res.ok) {
              setFieldErrors({});
              if (opts.success !== false) toast.success(opts.success ?? res.message ?? "Kaydedildi.");
              opts.onOk?.(res.data);
              resolve(true);
            } else {
              setFieldErrors(res.fieldErrors ?? {});
              toast.error(res.error);
              opts.onError?.(res.error);
              resolve(false);
            }
          } catch {
            toast.error("İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.");
            resolve(false);
          }
        });
      }),
    [],
  );
  return { run, pending, fieldErrors, setFieldErrors };
}

/** `fieldErrors` içinden ilk mesajı alır (iç içe yollar için "a.b" anahtarı). */
export const firstError = (errs: Record<string, string[]>, key: string) => errs[key]?.[0];
