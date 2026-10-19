"use client";
import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { passwordStrength } from "@/features/auth/schemas";

/** Göster/gizle düğmeli şifre alanı (52px, RHF `register` ile uyumlu). */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <Input
      ref={ref}
      type={visible ? "text" : "password"}
      className={cn("h-[52px] text-[14px]", className)}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink"
        >
          {visible ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      }
      {...props}
    />
  );
});
PasswordInput.displayName = "PasswordInput";

const BAR_TONE = ["", "bg-danger", "bg-orange", "bg-success", "bg-success"];

/** 4 çubuklu şifre gücü göstergesi. */
export function PasswordStrength({ value, id }: { value: string; id?: string }) {
  const { score, label } = passwordStrength(value);
  return (
    <div className="mt-3 flex items-center gap-3" id={id} aria-live="polite">
      <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-colors", i <= score ? BAR_TONE[score] : "bg-[#f1e6f0]")} />
        ))}
      </div>
      <span className="w-[88px] shrink-0 text-right text-[11px] font-bold text-muted-strong">{label}</span>
      <span className="sr-only">{value ? `Şifre gücü: ${label}` : ""}</span>
    </div>
  );
}
