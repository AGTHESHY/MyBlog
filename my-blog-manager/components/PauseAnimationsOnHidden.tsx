"use client";

import { useEffect } from 'react';

export default function PauseAnimationsOnHidden() {
  useEffect(() => {
    const sync = () => {
      document.documentElement.classList.toggle('animations-paused', document.hidden);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return null;
}
