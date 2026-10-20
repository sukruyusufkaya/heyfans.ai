"use client";
import * as React from "react";
import { Dialog as D, DropdownMenu as DM, Popover as P, Select as S, Tabs as T, Tooltip as TT } from "radix-ui";
import { Check, ChevronDown, X } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/* ─── Dialog ─────────────────────────────────────────────── */
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  size = "md",
  ...props
}: React.ComponentProps<typeof D.Content> & { title: React.ReactNode; description?: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  const t = useT();
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-night-deep/45 backdrop-blur-[2px] data-[state=open]:animate-[fade-up_.2s_ease-out]" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-white p-6 shadow-2xl scrollbar-thin",
          widths[size],
          className,
        )}
        {...props}
      >
        <div className="mb-4 pe-8">
          <D.Title className="text-lg font-extrabold tracking-tight text-ink">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1 text-xs leading-relaxed text-muted">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{typeof title === "string" ? title : t("İletişim kutusu")}</D.Description>
          )}
        </div>
        {children}
        <D.Close className="absolute end-4 top-4 grid size-8 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink" aria-label={t("Kapat")}>
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

/* ─── Dropdown menu ──────────────────────────────────────── */
export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export function DropdownMenuContent({ className, align = "end", sideOffset = 8, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={sideOffset}
        className={cn("z-50 min-w-48 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-xl", className)}
        {...props}
      />
    </DM.Portal>
  );
}
export function DropdownMenuItem({ className, inset, ...props }: React.ComponentProps<typeof DM.Item> & { inset?: boolean }) {
  return (
    <DM.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-ink-soft outline-none data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-600 data-[disabled]:opacity-50 [&_svg]:size-4",
        inset && "ps-8",
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn("px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted", className)} {...props} />;
}
export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DM.Separator>) {
  return <DM.Separator className={cn("my-1 h-px bg-line", className)} {...props} />;
}

/* ─── Popover ────────────────────────────────────────────── */
export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export function PopoverContent({ className, align = "end", sideOffset = 8, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content align={align} sideOffset={sideOffset} className={cn("z-50 rounded-2xl border border-line bg-white p-4 shadow-xl", className)} {...props} />
    </P.Portal>
  );
}

/* ─── Tooltip ────────────────────────────────────────────── */
export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TT.Provider delayDuration={250}>
      <TT.Root>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content side={side} sideOffset={6} className="z-50 max-w-64 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg">
            {content}
            <TT.Arrow className="fill-ink" />
          </TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}

/* ─── Select ─────────────────────────────────────────────── */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  id,
  disabled,
  "aria-label": ariaLabel,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  options: { value: string; label: React.ReactNode }[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const t = useT();
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-line bg-white px-3.5 text-[13px] text-ink focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 data-[placeholder]:text-[#b2a6b3]",
          className,
        )}
      >
        <S.Value placeholder={placeholder ?? t("Seçin")} />
        <S.Icon>
          <ChevronDown className="size-4 text-muted" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={6} className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line bg-white p-1 shadow-xl">
          <S.Viewport>
            {options.map((o) => (
              <S.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2 ps-8 pe-3 text-xs font-bold text-ink-soft outline-none data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-600"
              >
                <S.ItemIndicator className="absolute start-2.5">
                  <Check className="size-3.5" />
                </S.ItemIndicator>
                <S.ItemText>{o.label}</S.ItemText>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}

/* ─── Tabs (hap biçimli, referanslardaki .tab/.tabsel) ─────── */
export const Tabs = T.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("no-scrollbar flex items-center gap-2 overflow-x-auto", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-soft px-3.5 py-2.5 text-[11px] font-extrabold text-muted-strong transition-colors hover:text-ink data-[state=active]:bg-brand-500 data-[state=active]:text-white [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = T.Content;
