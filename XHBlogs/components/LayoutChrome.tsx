"use client";

import dynamic from 'next/dynamic';
import { siteConfig } from '../siteConfig';
import DeferredChrome from './DeferredChrome';
import BackgroundSlider from './BackgroundSlider';

const BackgroundEffects = dynamic(() => import('./BackgroundEffects'), { ssr: false });
const DanmakuBackground = dynamic(() => import('./DanmakuBackground'), { ssr: false });
const ClickEffect = dynamic(() => import('./ClickEffect'), { ssr: false });
const FloatingPlayer = dynamic(() => import('./FloatingPlayer'), { ssr: false });
const GlobalToolbox = dynamic(() => import('./GlobalToolbox'), { ssr: false });
const CyberCat = dynamic(() => import('./CyberCat'), { ssr: false });

type LayoutChromeProps = {
  children: React.ReactNode;
};

export default function LayoutChrome({ children }: LayoutChromeProps) {
  return (
    <>
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden site-bg-layer">
        {!siteConfig.useGradient && <BackgroundSlider />}
        <div className="absolute inset-0 z-[-9] bg-white/30 dark:bg-slate-900/40 backdrop-blur-md transition-colors duration-1000" />
        <div
          className="absolute inset-0 z-[-8] opacity-60 dark:opacity-20 mix-blend-color transition-opacity duration-1000 transform-gpu"
          style={{
            background: `linear-gradient(-45deg, ${siteConfig.themeColors.join(', ')})`,
            backgroundSize: '400% 400%',
            animation: 'gradientMove 15s ease infinite',
          }}
        />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/40 dark:bg-indigo-900/20 blur-[100px] rounded-full z-[-7] md:mix-blend-overlay" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/30 dark:bg-purple-900/30 blur-[100px] rounded-full z-[-7] md:mix-blend-overlay" />
        <div className="hidden md:block absolute inset-0 w-full h-full">
          <DeferredChrome>
            <BackgroundEffects />
          </DeferredChrome>
        </div>
      </div>

      <div className="hidden md:block site-bg-layer">
        <DeferredChrome>
          <DanmakuBackground />
        </DeferredChrome>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">{children}</div>

      <DeferredChrome>
        <div className="hidden md:block">
          <FloatingPlayer />
        </div>
        <div className="hidden md:block">
          <GlobalToolbox />
        </div>
        <div className="hidden md:block">
          <ClickEffect />
        </div>
        <div className="hidden md:block">
          <CyberCat />
        </div>
      </DeferredChrome>

      <style
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes gradientMove {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
          `,
        }}
      />
    </>
  );
}
