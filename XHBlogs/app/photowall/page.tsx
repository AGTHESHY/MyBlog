import PhotoWallClient from "./PhotoWallClient";
import { getAlbums } from "../../lib/content-store";
import { getRuntimeSiteConfig } from "../../lib/runtime-site-config";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata() {
  const siteConfig = await getRuntimeSiteConfig();
  return { title: `照片墙 | ${siteConfig.title}` };
}

export default async function PhotoWallPage() {
  const albums = await getAlbums();
  return <PhotoWallClient albums={albums} />;
}
