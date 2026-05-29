import MusicClient from "./MusicClient";
import { getRuntimeSiteConfig } from "../../lib/runtime-site-config";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata() {
  const siteConfig = await getRuntimeSiteConfig();
  return { title: `音乐馆 | ${siteConfig.title}` };
}

export default function MusicPage() {
  return <MusicClient />;
}
