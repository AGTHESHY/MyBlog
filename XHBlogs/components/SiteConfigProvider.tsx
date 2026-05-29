"use client";

import { createContext, useContext, type ReactNode } from 'react';
import { siteConfig as fallbackConfig } from '../siteConfig';
import type { SiteConfig } from '../lib/runtime-site-config';

type SiteConfigContextValue = {
  config: SiteConfig;
  version: string;
};

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function SiteConfigProvider({
  config,
  version,
  children,
}: {
  config: SiteConfig;
  version: string;
  children: ReactNode;
}) {
  return (
    <SiteConfigContext.Provider value={{ config, version }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfig {
  const ctx = useContext(SiteConfigContext);
  return ctx?.config ?? fallbackConfig;
}

export function useSiteConfigVersion(): string {
  const ctx = useContext(SiteConfigContext);
  return ctx?.version ?? '0';
}
