import * as React from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const NOTICE_TONES = {
  info: "border-[#e3d4f7] bg-violet-soft text-[#4b21a8]",
  warn: "border-[#f9d9aa] bg-[#fff7e9] text-[#8a4a00]",
  danger: "border-[#f6c7cb] bg-danger-soft text-[#a1262c]",
  neutral: "border-line bg-soft text-muted-strong",
};
/** Metin içermeyen, hem sunucu hem istemci bileşenlerinden kullanılabilen bilgi kutusu. */
export function Notice({ tone = "info", icon, children, className, role }: { tone?: keyof typeof NOTICE_TONES; icon?: React.ReactNode; children: React.ReactNode; className?: string; role?: "alert" | "status" }) {
  const Default = tone === "danger" ? ShieldAlert : tone === "warn" ? AlertTriangle : Info;
  return (
    <div role={role} className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] font-semibold leading-relaxed", NOTICE_TONES[tone], className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon ?? <Default />}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
