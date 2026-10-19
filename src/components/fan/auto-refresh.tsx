"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Sunucu verisini belirli aralıkla yeniler (ör. bekleyen ödeme). `maxTicks` sonra durur ve onDone çağrılır. */
export function AutoRefresh({ everyMs = 3000, maxTicks = 20, onDone }: { everyMs?: number; maxTicks?: number; onDone?: () => void }) {
  const router = useRouter();
  const ticks = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      ticks.current += 1;
      if (ticks.current > maxTicks) {
        clearInterval(id);
        onDone?.();
        return;
      }
      router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, maxTicks, onDone]);
  return null;
}
