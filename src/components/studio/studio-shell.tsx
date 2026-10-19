"use client";
import { ConsoleShell, type ConsoleShellProps } from "@/components/layouts/console-shell";
import { STUDIO_NAV } from "@/config/navigation";

/**
 * Sunucu bileşeni olan layout, ikon bileşenlerini (fonksiyon/forwardRef) istemci bileşenine geçiremez
 * ("Functions cannot be passed directly to Client Components"). Menü verisi bu sarmalayıcıda istemci tarafında bağlanır.
 */
export function StudioShell(props: Omit<ConsoleShellProps, "nav">) {
  return <ConsoleShell {...props} nav={STUDIO_NAV} />;
}
