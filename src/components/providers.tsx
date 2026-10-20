"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Direction } from "radix-ui";
import { useDirection } from "@/i18n/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
      }),
  );
  // Radix bileşenleri (menü, sekme, kaydırıcı…) klavye yönünü ve hizalamayı sayfa yönünden alsın (Arapça → rtl).
  const dir = useDirection();
  return (
    <Direction.Provider dir={dir}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </Direction.Provider>
  );
}
