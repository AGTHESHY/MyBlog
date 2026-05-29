import { unstable_noStore as noStore } from 'next/cache';
import { siteConfig as defaultSiteConfig } from '../siteConfig';
import { query } from './db';
import { RowDataPacket } from 'mysql2/promise';

export type SiteConfig = typeof defaultSiteConfig;

/** 允许写入 site_settings 的键（过滤设置页表单里的临时字段） */
export const SITE_SETTING_KEYS = new Set([
  'about_markdown',
  'about_cover',
  'title',
  'navTitle',
  'navSuffix',
  'navAfter',
  'faviconUrl',
  'authorName',
  'bio',
  'avatarUrl',
  'bgImages',
  'useGradient',
  'themeColors',
  'defaultPostCover',
  'photoWallImage',
  'cloudMusicIds',
  'social',
  'gitalkConfig',
  'geminiConfig',
  'icpConfig',
  'danmakuList',
  'footerBadges',
  'footerConfig',
  'buildDate',
  'chatterTitle',
  'chatterDescription',
  'picBedName',
  'picBedUrl',
  'picBedToken',
  'enableLevelSystem',
  'friendLinkApplyFormat',
  'deployed_at',
]);

function parseSettingValue(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue;
    const prev = out[key];
    if (isPlainObject(prev) && isPlainObject(value)) {
      out[key] = deepMerge(prev, value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export function filterSiteSettingUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates || {})) {
    if (SITE_SETTING_KEYS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

export async function loadSiteSettingsPatch(): Promise<Record<string, unknown>> {
  noStore();
  const rows = await query<RowDataPacket[]>(
    'SELECT setting_key, value_text FROM site_settings'
  );
  const patch: Record<string, unknown> = {};
  for (const row of rows) {
    const key = String(row.setting_key);
    if (!SITE_SETTING_KEYS.has(key)) continue;
    patch[key] = parseSettingValue(row.value_text);
  }
  return patch;
}

/** 运行时站点配置：数据库覆盖 siteConfig.ts 默认值 */
export async function getRuntimeSiteConfig(): Promise<SiteConfig> {
  const patch = await loadSiteSettingsPatch();
  return deepMerge(
    { ...defaultSiteConfig } as Record<string, unknown>,
    patch
  ) as SiteConfig;
}

/** 任意配置变更后的版本戳，用于客户端强制刷新 */
export async function getSiteConfigVersion(): Promise<string> {
  noStore();
  const rows = await query<RowDataPacket[]>(
    'SELECT MAX(updated_at) AS v FROM site_settings'
  );
  const v = rows[0]?.v;
  return v != null ? String(v) : '0';
}
