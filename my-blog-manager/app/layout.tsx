import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { MusicProvider } from "../components/MusicProvider";
import { siteConfig } from "../siteConfig";
import SplashScreen from "../components/SplashScreen";
import LayoutChrome from "../components/LayoutChrome";
import PauseAnimationsOnHidden from "../components/PauseAnimationsOnHidden";
import { OperationProvider } from "../context/OperationContext";
import { ToastProvider } from '../components/ToastProvider';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.bio,
  icons: { icon: siteConfig.faviconUrl, apple: siteConfig.faviconUrl },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <style
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              #app-mount-root { opacity: 0; visibility: hidden; pointer-events: none; }
              html.splash-seen #app-mount-root { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
            `
          }}
        />

        <Script id="handle-splash-logic" strategy="beforeInteractive">
          {`
            try {
              if (sessionStorage.getItem('hasSeenSplash') === 'true') {
                document.documentElement.classList.add('splash-seen');
              }
            } catch (e) {}
          `}
        </Script>
      </head>

      <body className="w-screen overflow-x-hidden min-h-full flex flex-col relative transition-colors duration-1000 bg-slate-50 dark:bg-slate-950 font-serif">
        <ThemeProvider>
          <PauseAnimationsOnHidden />
          <OperationProvider>
            <ToastProvider>
              <SplashScreen />
              <MusicProvider>
                <div id="app-mount-root" className="flex-1 flex flex-col transition-opacity duration-1000">
                  <LayoutChrome>{children}</LayoutChrome>
                </div>
              </MusicProvider>
            </ToastProvider>
          </OperationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
