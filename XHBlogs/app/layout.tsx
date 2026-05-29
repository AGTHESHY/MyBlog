import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { MusicProvider } from "../components/MusicProvider";
import SplashScreen from "../components/SplashScreen";
import LayoutChrome from "../components/LayoutChrome";
import PauseAnimationsOnHidden from "../components/PauseAnimationsOnHidden";
import MobileBackButton from '../components/MobileBackButton';
import { SiteConfigProvider } from "../components/SiteConfigProvider";
import { getRuntimeSiteConfig, getSiteConfigVersion } from "../lib/runtime-site-config";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getRuntimeSiteConfig();
  return {
    title: siteConfig.title,
    description: siteConfig.bio,
    icons: {
      icon: siteConfig.faviconUrl,
      apple: siteConfig.faviconUrl,
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const siteConfig = await getRuntimeSiteConfig();
  const configVersion = await getSiteConfigVersion();

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
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('hasSeenSplash') === 'true') {
                  document.documentElement.classList.add('splash-seen');
                }
              } catch (e) {}
            `
          }}
        />
      </head>

      <body className="w-screen overflow-x-hidden min-h-full flex flex-col relative transition-colors duration-1000 bg-slate-50 dark:bg-slate-950 font-serif">
        <SiteConfigProvider config={siteConfig} version={configVersion}>
          <ThemeProvider>
            <PauseAnimationsOnHidden />
            <SplashScreen />

            <MusicProvider>
              <div id="app-mount-root" className="flex-1 flex flex-col transition-opacity duration-1000">
                <LayoutChrome>{children}</LayoutChrome>

                <div className="md:hidden block">
                  <MobileBackButton />
                </div>
              </div>
            </MusicProvider>
          </ThemeProvider>
        </SiteConfigProvider>
      </body>
    </html>
  );
}
