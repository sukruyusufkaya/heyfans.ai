"use client";
import * as React from "react";
import { Checkbox as CheckboxPrimitive, Label as LabelPrimitive, RadioGroup as RadioPrimitive, Slider as SliderPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputBase =
  "w-full rounded-[10px] border border-line bg-white px-3.5 text-[13px] text-ink transition-colors placeholder:text-[#b2a6b3] focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-soft aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger-soft";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { leftIcon?: React.ReactNode; rightSlot?: React.ReactNode }>(
  ({ className, leftIcon, rightSlot, ...props }, ref) => {
    if (!leftIcon && !rightSlot) return <input ref={ref} className={cn(inputBase, "h-11", className)} {...props} />;
    return (
      <div className="relative">
        {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted [&_svg]:size-4">{leftIcon}</span>}
        <input ref={ref} className={cn(inputBase, "h-11", leftIcon && "pl-10", rightSlot && "pr-11", className)} {...props} />
        {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputBase, "min-h-24 py-3 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      inputBase,
      "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238e8593%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("mb-2 block text-[11px] font-extrabold text-ink-soft", className)} {...props} />;
}

/** Etiket + alan + hata/ipucu. Hata mesajı aria-describedby ile alana bağlanır. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string | string[] | null;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-brand-500" aria-hidden>*</span>}
        </Label>
      )}
      {children}
      {msg ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="mt-1.5 text-[11px] font-semibold text-danger">
          {msg}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="mt-1.5 text-[11px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Checkbox = React.forwardRef<React.ComponentRef<typeof CheckboxPrimitive.Root>, React.ComponentProps<typeof CheckboxPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-[#d9cfdc] bg-white transition-colors data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-500 data-[state=checked]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3" strokeWidth={3.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = "Checkbox";

export const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitive.Root>, React.ComponentProps<typeof SwitchPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full bg-[#e3dbe5] transition-colors data-[state=checked]:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[18px] translate-x-[2px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = "Switch";

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Root>) {
  return <RadioPrimitive.Root className={cn("grid gap-2.5", className)} {...props} />;
}

export function RadioItem({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-full border border-[#d9cfdc] bg-white data-[state=checked]:border-brand-500",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-brand-500" />
    </RadioPrimitive.Item>
  );
}

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn("relative flex h-5 w-full touch-none select-none items-center", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-[#f1e6f0]">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500" />
      </SliderPrimitive.Track>
      {(props.value ?? props.defaultValue ?? [0]).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block size-4 rounded-full border-2 border-brand-500 bg-white shadow focus-visible:outline-2 focus-visible:outline-brand-500"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
