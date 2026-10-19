"use client";
import * as React from "react";

/**
 * Yeniden gönderme geri sayımı. Bitiş zamanı oturum deposunda tutulur; sayfa yenilense de geri sayım sürer
 * (depolama kapalıysa yalnız bellekte çalışır).
 */
export function useCooldown(storageKey: string, seconds = 60) {
  const [remaining, setRemaining] = React.useState(0);
  const endRef = React.useRef(0);

  const tick = React.useCallback(() => {
    const left = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
    setRemaining(left);
    return left;
  }, []);

  React.useEffect(() => {
    try {
      const saved = Number(sessionStorage.getItem(storageKey) ?? 0);
      if (saved > Date.now()) endRef.current = saved;
    } catch {
      /* depolama kapalı olabilir */
    }
    const id = window.setInterval(() => {
      if (endRef.current && tick() === 0) endRef.current = 0;
    }, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [storageKey, tick]);

  const start = React.useCallback(() => {
    endRef.current = Date.now() + seconds * 1000;
    try {
      sessionStorage.setItem(storageKey, String(endRef.current));
    } catch {
      /* yok say */
    }
    tick();
  }, [seconds, storageKey, tick]);

  return { remaining, start, active: remaining > 0 };
}
