"use client";
import { ConsoleShell, type ConsoleShellProps } from "@/components/layouts/console-shell";
import { ADMIN_NAV } from "@/config/navigation";

/**
 * Sunucu bileşeni olan layout, ikon bileşenlerini (fonksiyon) istemci bileşenine geçiremez.
 * Bu sarmalayıcı yalnız izin listesini (string[]) alır ve menüyü istemci tarafında süzer.
 */
export function AdminShell({ allowed, ...props }: Omit<ConsoleShellProps, "nav"> & { allowed: string[] }) {
  const nav = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || allowed.includes(i.permission)) })).filter((g) => g.items.length);
  return <ConsoleShell {...props} nav={nav} />;
}
