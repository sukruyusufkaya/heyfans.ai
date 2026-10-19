"use client";
import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Field, Input, NativeSelect, Switch, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import type { ActionResult } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Notice } from "./ui";

/** Sunucu eylemi: tek `unknown` girdi alır, ActionResult döner. */
export type AdminAction = (input: unknown) => Promise<ActionResult<unknown>>;

export interface DialogField {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "checkbox" | "datetime-local" | "date";
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean | null;
  required?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  min?: number;
  max?: number;
  step?: number | string;
  maxLength?: number;
  rows?: number;
  /** Başka bir alanın değerine bağlı görünürlük. */
  showWhen?: { field: string; equals: string | boolean };
  className?: string;
}

export interface ReasonConfig {
  name?: string;
  label?: string;
  min?: number;
  placeholder?: string;
  defaultValue?: string;
  optional?: boolean;
  hint?: ReactNode;
}

type Values = Record<string, string | boolean>;

function initialValues(fields: DialogField[]): Values {
  const v: Values = {};
  for (const f of fields) {
    if (f.type === "checkbox") v[f.name] = Boolean(f.defaultValue);
    else v[f.name] = f.defaultValue === null || f.defaultValue === undefined ? "" : String(f.defaultValue);
  }
  return v;
}

function coerce(fields: DialogField[], values: Values) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.showWhen && values[f.showWhen.field] !== f.showWhen.equals) continue;
    const raw = values[f.name];
    if (f.type === "checkbox") out[f.name] = Boolean(raw);
    else if (f.type === "number") out[f.name] = raw === "" || raw === undefined ? undefined : Number(String(raw).replace(",", "."));
    else out[f.name] = typeof raw === "string" ? raw : undefined;
  }
  return out;
}

function FieldInputs({
  fields,
  values,
  setValues,
  errors,
  idPrefix,
  disabled,
}: {
  fields: DialogField[];
  values: Values;
  setValues: (fn: (v: Values) => Values) => void;
  errors?: Record<string, string[]>;
  idPrefix: string;
  disabled?: boolean;
}) {
  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));
  return (
    <>
      {fields.map((f) => {
        if (f.showWhen && values[f.showWhen.field] !== f.showWhen.equals) return null;
        const id = `${idPrefix}-${f.name}`;
        const err = errors?.[f.name];
        if (f.type === "checkbox") {
          return (
            <div key={f.name} className={cn("flex items-start justify-between gap-4 rounded-xl bg-soft px-3.5 py-3 sm:col-span-full", f.className)}>
              <label htmlFor={id} className="min-w-0 text-xs font-extrabold text-ink">
                {f.label}
                {f.hint && <span className="mt-0.5 block font-medium text-muted">{f.hint}</span>}
              </label>
              <Switch id={id} checked={Boolean(values[f.name])} onCheckedChange={(c) => set(f.name, c)} disabled={disabled} />
            </div>
          );
        }
        return (
          <Field key={f.name} label={f.label} htmlFor={id} error={err} hint={f.hint} required={f.required} className={f.className}>
            {f.type === "textarea" ? (
              <Textarea id={id} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} maxLength={f.maxLength} rows={f.rows ?? 3} disabled={disabled} aria-invalid={err ? true : undefined} />
            ) : f.type === "select" ? (
              <NativeSelect id={id} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} disabled={disabled} aria-invalid={err ? true : undefined}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id={id}
                type={f.type ?? "text"}
                inputMode={f.type === "number" ? "decimal" : undefined}
                value={String(values[f.name] ?? "")}
                onChange={(e) => set(f.name, e.target.value)}
                placeholder={f.placeholder}
                min={f.min}
                max={f.max}
                step={f.step}
                maxLength={f.maxLength}
                disabled={disabled}
                aria-invalid={err ? true : undefined}
              />
            )}
          </Field>
        );
      })}
    </>
  );
}

function useRunner(action: AdminAction, successMessage?: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  function run(input: Record<string, unknown>, onOk?: () => void) {
    setError(null);
    setFieldErrors({});
    start(async () => {
      let res: ActionResult<unknown>;
      try {
        res = await action(input);
      } catch {
        res = { ok: false, error: "İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin." };
      }
      if (res.ok) {
        toast.success(res.message ?? successMessage ?? "İşlem tamamlandı.");
        onOk?.();
        router.refresh();
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  }
  return { run, pending, error, fieldErrors, reset: () => { setError(null); setFieldErrors({}); } };
}

/**
 * Gerekçe (ve isteğe bağlı ek alanlar) isteyen onay penceresi.
 * Kritik yönetici işlemlerinin tamamı bu bileşenle yapılır; sunucu yine de izin ve girdiyi doğrular.
 */
export function ActionDialog({
  trigger,
  title,
  description,
  action,
  payload = {},
  reason = {},
  fields = [],
  confirmLabel = "Onayla",
  tone = "primary",
  successMessage,
  warning,
  size = "md",
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  action: AdminAction;
  payload?: Record<string, unknown>;
  reason?: ReasonConfig | false;
  fields?: DialogField[];
  confirmLabel?: string;
  tone?: "primary" | "danger";
  successMessage?: string;
  warning?: ReactNode;
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>(() => initialValues(fields));
  const rc = reason === false ? null : reason;
  const reasonName = rc?.name ?? "reason";
  const minReason = rc ? (rc.optional ? 0 : rc.min ?? 5) : 0;
  const [reasonText, setReasonText] = useState(rc?.defaultValue ?? "");
  const { run, pending, error, fieldErrors, reset } = useRunner(action, successMessage);

  const reasonOk = !rc || reasonText.trim().length >= minReason;
  const requiredOk = fields.every((f) => !f.required || (f.showWhen && values[f.showWhen.field] !== f.showWhen.equals) || f.type === "checkbox" || String(values[f.name] ?? "").trim() !== "");

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setValues(initialValues(fields));
      setReasonText(rc?.defaultValue ?? "");
      reset();
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reasonOk || !requiredOk) return;
    const input: Record<string, unknown> = { ...payload, ...coerce(fields, values) };
    if (rc) input[reasonName] = reasonText.trim();
    run(input, () => setOpen(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description} size={size}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {warning && <Notice tone="warn">{warning}</Notice>}
          {children}
          <FieldInputs fields={fields} values={values} setValues={setValues} errors={fieldErrors} idPrefix={uid} disabled={pending} />
          {rc && (
            <Field label={rc.label ?? "Gerekçe"} htmlFor={`${uid}-reason`} required={!rc.optional} error={fieldErrors[reasonName]} hint={rc.hint ?? (rc.optional ? undefined : `En az ${minReason} karakter. Gerekçe denetim kaydına yazılır.`)}>
              <Textarea id={`${uid}-reason`} value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder={rc.placeholder ?? "Kararınızın gerekçesini yazın"} rows={3} maxLength={1000} disabled={pending} aria-invalid={fieldErrors[reasonName] ? true : undefined} />
            </Field>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-bold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2.5 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} loading={pending} disabled={!reasonOk || !requiredOk}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tek tıkla çalışan eylem (gerekçe gerektirmeyen, geri alınabilir işlemler). */
export function ActionButton({
  action,
  payload = {},
  children,
  variant = "secondary",
  size = "sm",
  successMessage,
  className,
}: {
  action: AdminAction;
  payload?: Record<string, unknown>;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  successMessage?: string;
  className?: string;
}) {
  const { run, pending, error } = useRunner(action, successMessage);
  return (
    <>
      <Button type="button" variant={variant} size={size} loading={pending} className={className} onClick={() => run(payload)}>
        {children}
      </Button>
      {error && (
        <span role="alert" className="text-[11px] font-bold text-danger">
          {error}
        </span>
      )}
    </>
  );
}

/** Satır içi form: alanlar + gönder düğmesi; başarıda sayfayı yeniler. */
export function ActionForm({
  action,
  payload = {},
  fields,
  submitLabel = "Kaydet",
  reason = false,
  resetOnSuccess = false,
  successMessage,
  className,
  variant = "primary",
  disabled,
  footer,
  columns = 1,
}: {
  action: AdminAction;
  payload?: Record<string, unknown>;
  fields: DialogField[];
  columns?: 1 | 2;
  submitLabel?: string;
  reason?: ReasonConfig | false;
  resetOnSuccess?: boolean;
  successMessage?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  disabled?: boolean;
  footer?: ReactNode;
}) {
  const uid = useId();
  const [values, setValues] = useState<Values>(() => initialValues(fields));
  const rc = reason === false ? null : reason;
  const reasonName = rc?.name ?? "reason";
  const [reasonText, setReasonText] = useState(rc?.defaultValue ?? "");
  const { run, pending, error, fieldErrors } = useRunner(action, successMessage);
  const minReason = rc ? (rc.optional ? 0 : rc.min ?? 5) : 0;
  const reasonOk = !rc || reasonText.trim().length >= minReason;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reasonOk) return;
    const input: Record<string, unknown> = { ...payload, ...coerce(fields, values) };
    if (rc) input[reasonName] = reasonText.trim();
    run(input, () => {
      if (resetOnSuccess) {
        setValues(initialValues(fields));
        setReasonText(rc?.defaultValue ?? "");
      }
    });
  }

  return (
    <form onSubmit={submit} className={cn("grid gap-3.5", className)} noValidate>
      <div className={cn("grid gap-3.5", columns === 2 && "sm:grid-cols-2")}>
        <FieldInputs fields={fields} values={values} setValues={setValues} errors={fieldErrors} idPrefix={uid} disabled={pending || disabled} />
      </div>
      {rc && (
        <Field label={rc.label ?? "Gerekçe"} htmlFor={`${uid}-reason`} required={!rc.optional} error={fieldErrors[reasonName]} hint={rc.hint ?? (rc.optional ? undefined : `En az ${minReason} karakter. Denetim kaydına yazılır.`)}>
          <Textarea id={`${uid}-reason`} value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder={rc.placeholder} rows={2} maxLength={1000} disabled={pending || disabled} />
        </Field>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-bold text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} loading={pending} disabled={disabled || !reasonOk}>
          {submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}
