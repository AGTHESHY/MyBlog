"use client";

import { useEffect, useState, type ReactNode } from 'react';

type DeferredChromeProps = {
  children: ReactNode;
  idleTimeoutMs?: number;
};

export default function DeferredChrome({ children, idleTimeoutMs = 1500 }: DeferredChromeProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = () => setReady(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(mount, { timeout: idleTimeoutMs });
      return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(mount, 600);
    return () => window.clearTimeout(timer);
  }, [idleTimeoutMs]);

  if (!ready) return null;
  return <>{children}</>;
}
