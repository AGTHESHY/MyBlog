import { siteConfig } from "../../siteConfig";
import PhotoWallClient from "./PhotoWallClient";
import { getAlbums } from "../../lib/content-store";

export const metadata = {
  title: "照片墙 | " + siteConfig.title,
};

export default async function PhotoWallPage() {
  const albums = await getAlbums();
  return <PhotoWallClient albums={albums} />;
}