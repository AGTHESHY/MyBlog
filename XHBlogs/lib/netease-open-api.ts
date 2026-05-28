/**
 * 网易云音乐开放平台（openapi.music.163.com）
 * 参考：https://developer.music.163.com 与 OpenAPI 文档（RSA_SHA256 + bizContent）
 */

import crypto from 'crypto';

const OPENAPI_BASE = 'https://openapi.music.163.com';

type TokenCache = { token: string; expireAt: number };
let tokenCache: TokenCache | null = null;

export type NeteaseOpenConfig = {
  appId: string;
  appSecret: string;
  privateKey: string;
};

export function getNeteaseOpenConfig(): NeteaseOpenConfig | null {
  const appId = process.env.NETEASE_APP_ID?.trim();
  const appSecret = process.env.NETEASE_APP_SECRET?.trim();
  const privateKey = normalizePrivateKey(process.env.NETEASE_PRIVATE_KEY);
  if (!appId || !appSecret || !privateKey) return null;
  return { appId, appSecret, privateKey };
}

export function isNeteaseOpenApiConfigured() {
  return !!getNeteaseOpenConfig();
}

function normalizePrivateKey(raw?: string): string {
  if (!raw?.trim()) return '';
  let key = raw.trim().replace(/\\n/g, '\n');
  if (!key.includes('BEGIN')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key.match(/.{1,64}/g)?.join('\n') || key}\n-----END PRIVATE KEY-----`;
  }
  return key;
}

function defaultDevice() {
  const deviceId = process.env.NETEASE_DEVICE_ID?.trim() || `blog-${crypto.createHash('md5').update(process.env.NETEASE_APP_ID || 'xhblogs').digest('hex').slice(0, 16)}`;
  return {
    deviceType: 'web',
    os: 'web',
    appVer: '1.0.0',
    channel: 'web',
    model: 'server',
    deviceId,
    brand: 'xhblogs',
    osVer: '1.0',
  };
}

function rsaSign(content: string, privateKeyPem: string): string {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(content, 'utf8');
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

function buildSignedQuery(
  config: NeteaseOpenConfig,
  bizContent: Record<string, unknown>,
  accessToken?: string
): Record<string, string> {
  const timestamp = String(Date.now());
  const device = JSON.stringify(defaultDevice());
  const biz = JSON.stringify(bizContent);

  const params: Record<string, string> = {
    appId: config.appId,
    bizContent: biz,
    device,
    signType: 'RSA_SHA256',
    timestamp,
  };
  if (accessToken) params.accessToken = accessToken;

  const keys = Object.keys(params).sort();
  const signPayload = keys.map((k) => `${k}=${params[k]}`).join('&');
  params.sign = rsaSign(signPayload, config.privateKey);
  return params;
}

function toQueryString(params: Record<string, string>) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function openApiGet<T>(
  path: string,
  bizContent: Record<string, unknown>,
  accessToken?: string
): Promise<T | null> {
  const config = getNeteaseOpenConfig();
  if (!config) return null;

  const qs = toQueryString(buildSignedQuery(config, bizContent, accessToken));
  const url = `${OPENAPI_BASE}${path}?${qs}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: number; data?: T; message?: string };
    if (json?.code === 200 && json.data !== undefined) return json.data;
    return null;
  } catch {
    return null;
  }
}

async function fetchAccessToken(config: NeteaseOpenConfig): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && tokenCache.expireAt > now + 60_000) {
    return tokenCache.token;
  }

  const tokenPaths = [
    '/openapi/oauth2/access/token/get/v2',
    '/openapi/oauth2/token/get/v2',
    '/openapi/music/basic/token/get/v2',
  ];

  const tokenBizVariants: Record<string, unknown>[] = [
    { appSecret: config.appSecret },
    { grantType: 'client_credentials', appSecret: config.appSecret },
    {},
  ];

  for (const path of tokenPaths) {
    let data: { accessToken?: string; token?: string; expireTime?: number; expiresIn?: number } | null = null;
    for (const biz of tokenBizVariants) {
      data = await openApiGet<{ accessToken?: string; token?: string; expireTime?: number; expiresIn?: number }>(
        path,
        biz
      );
      if (data) break;
    }
    const token = data?.accessToken || data?.token;
    if (!token) continue;

    const expireMs =
      typeof data?.expireTime === 'number'
        ? data.expireTime
        : now + (typeof data?.expiresIn === 'number' ? data.expiresIn * 1000 : 3_500_000);

    tokenCache = { token, expireAt: expireMs };
    return token;
  }

  return null;
}

export async function fetchOpenApiSongDetail(songId: string) {
  const config = getNeteaseOpenConfig();
  if (!config) return null;
  const accessToken = await fetchAccessToken(config);
  if (!accessToken) return null;

  const paths = [
    '/openapi/music/basic/song/detail/get/v2',
    '/openapi/music/basic/song/detail/get',
  ];

  for (const path of paths) {
    const data = await openApiGet<{
      songId?: string;
      songName?: string;
      name?: string;
      artistName?: string;
      singers?: { name?: string }[];
      albumName?: string;
      album?: { name?: string; picUrl?: string };
      coverUrl?: string;
      picUrl?: string;
    }>(path, { songId }, accessToken);

    if (!data) continue;
    const name = data.songName || data.name;
    if (!name) continue;
    const artist =
      data.artistName ||
      data.singers?.map((s) => s.name).filter(Boolean).join(' / ') ||
      '未知歌手';
    return {
      id: songId,
      name,
      artist,
      album: data.albumName || data.album?.name || '',
      cover: data.coverUrl || data.picUrl || data.album?.picUrl || '',
    };
  }
  return null;
}

export async function fetchOpenApiPlayUrl(songId: string): Promise<string | null> {
  const config = getNeteaseOpenConfig();
  if (!config) return null;
  const accessToken = await fetchAccessToken(config);
  if (!accessToken) return null;

  const paths = [
    '/openapi/music/basic/song/playurl/get/v2',
    '/openapi/music/basic/song/url/get/v2',
    '/openapi/music/basic/song/playurl/get',
  ];

  for (const path of paths) {
    const data = await openApiGet<{ url?: string; playUrl?: string; data?: { url?: string }[] }>(
      path,
      { songId, quality: 'standard' },
      accessToken
    );
    if (!data) continue;
    if (typeof data.url === 'string' && data.url) return data.url;
    if (typeof data.playUrl === 'string' && data.playUrl) return data.playUrl;
    const nested = Array.isArray(data.data) ? data.data[0]?.url : undefined;
    if (nested) return nested;
  }
  return null;
}

export async function fetchOpenApiLyric(songId: string): Promise<string | null> {
  const config = getNeteaseOpenConfig();
  if (!config) return null;
  const accessToken = await fetchAccessToken(config);
  if (!accessToken) return null;

  const data = await openApiGet<{ lyric?: string; lrc?: string }>(
    '/openapi/music/basic/song/lyric/get/v2',
    { songId },
    accessToken
  );
  return data?.lyric || data?.lrc || null;
}
