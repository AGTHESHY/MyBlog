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
const GlobalSnow = dynamic(() => import('./GlobalSnow'), { ssr: false });

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
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/40 dark:bg-indigo-900/20 blur-[100px] rounded-full mix-blend-overlay z-[-7]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/30 dark:bg-purple-900/30 blur-[100px] rounded-full mix-blend-overlay z-[-7]" />
        <div className="bg-effects-wrapper transition-opacity duration-1000">
          <DeferredChrome>
            <BackgroundEffects />
          </DeferredChrome>
        </div>
      </div>

      <DeferredChrome>
        <DanmakuBackground />
        <GlobalSnow />
        <FloatingPlayer />
        <GlobalToolbox />
        <ClickEffect />
        <CyberCat />
      </DeferredChrome>

      <div className="relative z-10 flex-1 flex flex-col">{children}</div>

      <style
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes gradientMove {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            body.winter-mode .bg-effects-wrapper { opacity: 0 !important; visibility: hidden; }
            .winter-mode .snow-cap { position: relative !important; overflow: visible !important; }
            .dark.winter-mode .snow-cap {
              background-color: rgba(23, 37, 84, 0.4) !important;
              border-color: rgba(59, 130, 246, 0.3) !important;
              backdrop-filter: blur(12px) brightness(80%) !important;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
            }
            body.winter-mode .snow-cap {
              background-color: rgba(239, 246, 255, 0.45) !important;
              border-color: rgba(191, 219, 254, 0.6) !important;
              backdrop-filter: blur(12px) saturate(120%) !important;
              box-shadow: 0 8px 32px rgba(191, 219, 254, 0.25) !important;
              transition: all 0.7s ease !important;
            }
          `,
        }}
      />
    </>
  );
}
