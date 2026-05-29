/**
 * 网易云音乐开放平台（个人开发者 CLI）
 * CLI 文档：https://developer.music.163.com/st/developer/document?docId=2327e302009c437eb02af48f63d6e514
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  loadNeteaseUserSession,
  saveNeteaseUserSession,
  type NeteaseUserSession,
} from './netease-user-session';

export const NETEASE_OPENAPI_BASE =
  process.env.NETEASE_OPENAPI_BASE?.trim() || 'https://openncm.music.163.com';

type TokenCache = { token: string; expireAt: number };
let clientTokenCache: TokenCache | null = null;

export type NeteaseOpenConfig = {
  appId: string;
  appSecret: string;
  privateKey: string;
};

export function getNeteaseOpenConfig(): NeteaseOpenConfig | null {
  const appId = process.env.NETEASE_APP_ID?.trim();
  const appSecret = process.env.NETEASE_APP_SECRET?.trim();
  const privateKey = normalizePrivateKey(resolvePrivateKeyRaw().raw);
  if (!appId || !appSecret || !privateKey) return null;
  return { appId, appSecret, privateKey };
}

function resolvePrivateKeyRaw(): { raw: string; source: string } {
  const fromEnv = process.env.NETEASE_PRIVATE_KEY?.trim();
  if (fromEnv) return { raw: fromEnv, source: 'env:NETEASE_PRIVATE_KEY' };

  const candidates = [
    process.env.NETEASE_PRIVATE_KEY_PATH?.trim(),
    path.join(process.cwd(), 'config', 'netease_private_key.pem'),
    path.join(process.cwd(), '..', 'config', 'netease_private_key.pem'),
  ].filter((p): p is string => !!p);

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const text = fs.readFileSync(filePath, 'utf8').trim();
      if (text) return { raw: text, source: `file:${filePath}` };
    } catch {
      continue;
    }
  }
  return { raw: '', source: 'none' };
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
  const deviceId =
    process.env.NETEASE_DEVICE_ID?.trim() ||
    `blog-${crypto.createHash('md5').update(process.env.NETEASE_APP_ID || 'xhblogs').digest('hex').slice(0, 16)}`;
  return {
    deviceType: 'openapi',
    os: 'ncmcli',
    channel: 'ncmcli',
    brand: 'ncmcli',
    model: 'linux_docker_cli',
    appVer: '1.0.0',
    deviceId,
    clientIp: '127.0.0.1',
    osVer: '1.0.0',
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
  const url = `${NETEASE_OPENAPI_BASE}${path}?${qs}`;

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

async function openApiPostJson<T>(
  path: string,
  bizContent: Record<string, unknown>,
  accessToken?: string
): Promise<T | null> {
  const config = getNeteaseOpenConfig();
  if (!config) return null;

  const signed = buildSignedQuery(config, bizContent, accessToken);
  const url = `${NETEASE_OPENAPI_BASE}${path}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signed),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: number; data?: T; message?: string };
    if (json?.code === 200 && json.data !== undefined) return json.data;
    return null;
  } catch {
    return null;
  }
}

function parseTokenPayload(data: {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  expireTime?: number;
  expiresIn?: number;
}) {
  const token = data.accessToken || data.token;
  if (!token) return null;
  const now = Date.now();
  const expireAt =
    typeof data.expireTime === 'number' && data.expireTime > 1e12
      ? data.expireTime
      : now + (typeof data.expiresIn === 'number' ? data.expiresIn * 1000 : 3_500_000);
  return { accessToken: token, refreshToken: data.refreshToken, expireAt };
}

async function fetchClientAccessToken(config: NeteaseOpenConfig): Promise<string | null> {
  const now = Date.now();
  if (clientTokenCache && clientTokenCache.expireAt > now + 60_000) {
    return clientTokenCache.token;
  }

  const anonData = await openApiPostJson<{
    accessToken?: string;
    token?: string;
    expireTime?: number;
    expiresIn?: number;
  }>('/openapi/music/basic/oauth2/login/anonymous', { clientId: config.appId });
  if (anonData) {
    const parsed = parseTokenPayload(anonData);
    if (parsed) {
      clientTokenCache = { token: parsed.accessToken, expireAt: parsed.expireAt };
      return parsed.accessToken;
    }
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
    const parsed = data ? parseTokenPayload(data) : null;
    if (!parsed) continue;
    clientTokenCache = { token: parsed.accessToken, expireAt: parsed.expireAt };
    return parsed.accessToken;
  }

  return null;
}

async function refreshUserAccessToken(refreshToken: string): Promise<NeteaseUserSession | null> {
  const paths = [
    '/openapi/music/basic/oauth2/token/refresh/get/v2',
    '/openapi/oauth2/access/token/refresh/get/v2',
    '/openapi/oauth2/token/refresh/get/v2',
  ];
  for (const path of paths) {
    for (const biz of [{ refreshToken }, { grantType: 'refresh_token', refreshToken }]) {
      const data = await openApiGet<{
        accessToken?: string;
        token?: string;
        refreshToken?: string;
        expireTime?: number;
        expiresIn?: number;
      }>(path, biz);
      const parsed = data ? parseTokenPayload(data) : null;
      if (!parsed) continue;
      const prev = await loadNeteaseUserSession();
      const session: NeteaseUserSession = {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken || refreshToken,
        expireAt: parsed.expireAt,
        openId: prev?.openId,
        nickname: prev?.nickname,
        avatar: prev?.avatar,
        loginAt: prev?.loginAt || Date.now(),
      };
      await saveNeteaseUserSession(session);
      return session;
    }
  }
  return null;
}

export async function resolveOpenApiAccessToken(): Promise<{
  token: string;
  kind: 'user' | 'client';
} | null> {
  const user = await loadNeteaseUserSession();
  const now = Date.now();
  if (user?.accessToken) {
    if (user.expireAt > now + 60_000) return { token: user.accessToken, kind: 'user' };
    if (user.refreshToken) {
      const refreshed = await refreshUserAccessToken(user.refreshToken);
      if (refreshed) return { token: refreshed.accessToken, kind: 'user' };
    }
  }
  const config = getNeteaseOpenConfig();
  if (!config) return null;
  const client = await fetchClientAccessToken(config);
  if (client) return { token: client, kind: 'client' };
  return null;
}

export async function fetchOpenApiSongDetail(songId: string) {
  const resolved = await resolveOpenApiAccessToken();
  if (!resolved) return null;
  const accessToken = resolved.token;

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
  const resolved = await resolveOpenApiAccessToken();
  if (!resolved) return null;

  const paths = [
    '/openapi/music/basic/song/playurl/get/v2',
    '/openapi/music/basic/song/url/get/v2',
    '/openapi/music/basic/song/playurl/get',
  ];

  for (const path of paths) {
    const data = await openApiGet<{ url?: string; playUrl?: string; data?: { url?: string }[] }>(
      path,
      { songId, quality: resolved.kind === 'user' ? 'exhigh' : 'standard' },
      resolved.token
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
  const resolved = await resolveOpenApiAccessToken();
  if (!resolved) return null;

  const data = await openApiGet<{ lyric?: string; lrc?: string }>(
    '/openapi/music/basic/song/lyric/get/v2',
    { songId },
    resolved.token
  );
  return data?.lyric || data?.lrc || null;
}
