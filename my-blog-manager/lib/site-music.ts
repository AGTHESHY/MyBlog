import { siteConfig } from '../siteConfig';
import { getSiteSetting } from './content-store';
import { filterValidNeteaseSongIds } from './netease-music';

/** 博客播放列表：优先 MySQL，回退 siteConfig.ts；仅保留合法网易云数字 ID */
export async function getCloudMusicIds(): Promise<string[]> {
  const raw = await getSiteSetting('cloudMusicIds');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return filterValidNeteaseSongIds(parsed.map((id) => String(id)));
      }
    } catch {
      // ignore
    }
  }
  return filterValidNeteaseSongIds((siteConfig.cloudMusicIds || []).map((id) => String(id)));
}
