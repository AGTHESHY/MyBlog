import { siteConfig } from '../siteConfig';
import { getSiteSetting } from './content-store';

/** 博客播放列表：优先 MySQL（管理后台写入），回退 siteConfig.ts */
export async function getCloudMusicIds(): Promise<string[]> {
  const raw = await getSiteSetting('cloudMusicIds');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((id) => String(id).trim()).filter(Boolean);
      }
    } catch {
      // 非 JSON 时忽略
    }
  }
  return [...(siteConfig.cloudMusicIds || [])].map((id) => String(id).trim()).filter(Boolean);
}
