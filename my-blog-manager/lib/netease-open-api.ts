/**
 * 网易云音乐开放平台（openapi.music.163.com）
 * 文档：https://developer.music.163.com/st/developer/document?docId=1a5fb2c7b30b44609fa81129a8e1908d
 * 支持：应用级 token + 用户 OAuth 登录（更高播放权限）
 */

import crypto from 'crypto';
import {
  clearNeteaseUserSession,
  loadNeteaseUserSession,
  saveNeteaseUserSession,
  type NeteaseUserSession,
} from './netease-user-session';

const OPENAPI_BASE = 'https://openapi.music.163.com';

type TokenCache = { token: string; expireAt: number };
let clientTokenCache: TokenCache | null = null;

export type NeteaseOpenConfig = {
  appId: string;
  appSecret: string;
  privateKey: string;
};

export type NeteaseAuthStatus = {
  configured: boolean;
  loggedIn: boolean;
  tokenKind: 'none' | 'client' | 'user';
  user?: Pick<NeteaseUserSession, 'nickname' | 'avatar' | 'openId' | 'expireAt' | 'loginAt'>;
  message?: string;
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
  const deviceId =
    process.env.NETEASE_DEVICE_ID?.trim() ||
    `blog-${crypto.createHash('md5').update(process.env.NETEASE_APP_ID || 'xhblogs').digest('hex').slice(0, 16)}`;
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
  const signer = crypto.createSign('RSA_SHA256');
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

type OpenApiJson<T> = { code?: number; data?: T; message?: string; subCode?: string | null };

async function openApiRequest<T>(
  path: string,
  bizContent: Record<string, unknown>,
  accessToken?: string
): Promise<{ ok: boolean; data: T | null; message?: string }> {
  const config = getNeteaseOpenConfig();
  if (!config) return { ok: false, data: null, message: '未配置开放平台凭证' };

  const qs = toQueryString(buildSignedQuery(config, bizContent, accessToken));
  const url = `${OPENAPI_BASE}${path}?${qs}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const json = (await res.json()) as OpenApiJson<T>;
    if (json?.code === 200 && json.data !== undefined) {
      return { ok: true, data: json.data };
    }
    return { ok: false, data: null, message: json?.message || `接口返回 ${json?.code ?? res.status}` };
  } catch (e) {
    return { ok: false, data: null, message: e instanceof Error ? e.message : '网络错误' };
  }
}

async function openApiGet<T>(
  path: string,
  bizContent: Record<string, unknown>,
  accessToken?: string
): Promise<T | null> {
  const result = await openApiRequest<T>(path, bizContent, accessToken);
  return result.ok ? result.data : null;
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

/** 应用级 accessToken（匿名，权限较低） */
export async function fetchClientAccessToken(): Promise<string | null> {
  const config = getNeteaseOpenConfig();
  if (!config) return null;

  const now = Date.now();
  if (clientTokenCache && clientTokenCache.expireAt > now + 60_000) {
    return clientTokenCache.token;
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
    for (const biz of tokenBizVariants) {
      const data = await openApiGet<{
        accessToken?: string;
        token?: string;
        expireTime?: number;
        expiresIn?: number;
      }>(path, biz);
      const parsed = data ? parseTokenPayload(data) : null;
      if (!parsed) continue;
      clientTokenCache = { token: parsed.accessToken, expireAt: parsed.expireAt };
      return parsed.accessToken;
    }
  }
  return null;
}

/** 用户级 token：优先于应用级，用于 VIP/高码率等 */
export async function resolveOpenApiAccessToken(): Promise<{
  token: string;
  kind: 'user' | 'client';
} | null> {
  const user = await loadNeteaseUserSession();
  const now = Date.now();

  if (user?.accessToken) {
    if (user.expireAt > now + 60_000) {
      return { token: user.accessToken, kind: 'user' };
    }
    if (user.refreshToken) {
      const refreshed = await refreshUserAccessToken(user.refreshToken);
      if (refreshed) return { token: refreshed.accessToken, kind: 'user' };
    }
  }

  const client = await fetchClientAccessToken();
  if (client) return { token: client, kind: 'client' };
  return null;
}

export async function refreshUserAccessToken(refreshToken: string): Promise<NeteaseUserSession | null> {
  const config = getNeteaseOpenConfig();
  if (!config) return null;

  const paths = [
    '/openapi/oauth2/access/token/refresh/get/v2',
    '/openapi/oauth2/token/refresh/get/v2',
  ];
  const bizVariants = [{ refreshToken }, { grantType: 'refresh_token', refreshToken }];

  for (const path of paths) {
    for (const biz of bizVariants) {
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

/** 获取 H5 授权登录地址（需在控制台配置相同 redirectUri） */
export async function getNeteaseAuthorizeUrl(redirectUri: string, state: string): Promise<string | null> {
  const config = getNeteaseOpenConfig();
  if (!config) return null;

  const bizVariants: Record<string, unknown>[] = [
    { redirectUri, state, scope: 'basic' },
    { redirectUri, state },
    { redirectUrl: redirectUri, state },
  ];

  const paths = [
    '/openapi/oauth2/authorize/url/get/v2',
    '/openapi/oauth2/h5/login/url/get/v2',
    '/openapi/oauth2/login/url/get/v2',
  ];

  for (const path of paths) {
    for (const biz of bizVariants) {
      const data = await openApiGet<{ url?: string; loginUrl?: string; authorizeUrl?: string }>(path, biz);
      const url = data?.url || data?.loginUrl || data?.authorizeUrl;
      if (url) return url;
    }
  }

  return `${OPENAPI_BASE}/oauth2/authorize?appId=${encodeURIComponent(config.appId)}&redirectUri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&responseType=code`;
}

/** 授权码换取用户 accessToken */
export async function exchangeNeteaseAuthCode(
  code: string,
  redirectUri: string
): Promise<{ session: NeteaseUserSession | null; message?: string }> {
  const config = getNeteaseOpenConfig();
  if (!config) return { session: null, message: '未配置开放平台凭证' };

  const paths = [
    '/openapi/oauth2/access/token/get/v2',
    '/openapi/oauth2/user/access/token/get/v2',
    '/openapi/oauth2/token/get/v2',
  ];

  const bizVariants: Record<string, unknown>[] = [
    { grantType: 'authorization_code', code, redirectUri, appSecret: config.appSecret },
    { grantType: 'authorization_code', code, redirectUri },
    { code, redirectUri },
  ];

  for (const path of paths) {
    for (const biz of bizVariants) {
      const result = await openApiRequest<{
        accessToken?: string;
        token?: string;
        refreshToken?: string;
        expireTime?: number;
        expiresIn?: number;
        openId?: string;
        nickname?: string;
        avatarUrl?: string;
      }>(path, biz);

      if (!result.ok || !result.data) continue;
      const parsed = parseTokenPayload(result.data);
      if (!parsed) continue;

      let session: NeteaseUserSession = {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expireAt: parsed.expireAt,
        openId: result.data?.openId,
        nickname: result.data?.nickname,
        avatar: result.data?.avatarUrl,
        loginAt: Date.now(),
      };

      const profile = await fetchOpenApiUserProfile(parsed.accessToken);
      if (profile) {
        session = { ...session, ...profile };
      }

      await saveNeteaseUserSession(session);
      clientTokenCache = null;
      return { session };
    }
  }

  return { session: null, message: '授权码换 token 失败，请确认控制台 redirectUri 与 .env 一致' };
}

async function fetchOpenApiUserProfile(accessToken: string) {
  const paths = [
    '/openapi/oauth2/user/info/get/v2',
    '/openapi/music/basic/user/profile/get/v2',
  ];

  for (const path of paths) {
    const data = await openApiGet<{
      openId?: string;
      nickname?: string;
      nickName?: string;
      avatarUrl?: string;
      avatar?: string;
    }>(path, {}, accessToken);
    if (!data) continue;
    return {
      openId: data.openId,
      nickname: data.nickname || data.nickName,
      avatar: data.avatarUrl || data.avatar,
    };
  }
  return null;
}

export async function logoutNeteaseUser() {
  await clearNeteaseUserSession();
  clientTokenCache = null;
}

export async function getNeteaseAuthStatus(): Promise<NeteaseAuthStatus> {
  if (!isNeteaseOpenApiConfigured()) {
    return { configured: false, loggedIn: false, tokenKind: 'none', message: '请配置 NETEASE_APP_ID 等环境变量' };
  }

  const user = await loadNeteaseUserSession();
  const now = Date.now();
  if (user?.accessToken && user.expireAt > now) {
    return {
      configured: true,
      loggedIn: true,
      tokenKind: 'user',
      user: {
        nickname: user.nickname,
        avatar: user.avatar,
        openId: user.openId,
        expireAt: user.expireAt,
        loginAt: user.loginAt,
      },
    };
  }

  const client = await fetchClientAccessToken();
  return {
    configured: true,
    loggedIn: false,
    tokenKind: client ? 'client' : 'none',
    message: client
      ? '默认使用匿名 token；使用网易云 App 扫码登录后可获取更高播放权限'
      : '无法获取匿名 token，请检查开放平台凭证',
  };
}

/** 二维码有效期（官方约 2 分钟） */
export const NETEASE_QR_TTL_MS = 120_000;

export const NETEASE_QR_DOC =
  'https://developer.music.163.com/st/developer/document?docId=2bb12a93e71a4be0842243b930c2f33c';

function pickUnikey(data: Record<string, unknown> | null | undefined): string {
  if (!data) return '';
  const key = data.unikey ?? data.uniKey ?? data.key ?? data.qrKey;
  return key ? String(key) : '';
}

function pickStatusCode(data: Record<string, unknown> | null | undefined): number {
  if (!data) return 0;
  const raw = data.code ?? data.status ?? data.loginCode ?? data.scanCode;
  if (typeof raw === 'number') return raw;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : 0;
}

async function saveUserSessionFromTokenPayload(
  data: Record<string, unknown>,
  parsed: { accessToken: string; refreshToken?: string; expireAt: number }
): Promise<NeteaseUserSession> {
  let session: NeteaseUserSession = {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    expireAt: parsed.expireAt,
    openId: data.openId ? String(data.openId) : undefined,
    nickname: data.nickname ? String(data.nickname) : data.nickName ? String(data.nickName) : undefined,
    avatar: data.avatarUrl ? String(data.avatarUrl) : data.avatar ? String(data.avatar) : undefined,
    loginAt: Date.now(),
  };
  const profile = await fetchOpenApiUserProfile(parsed.accessToken);
  if (profile) session = { ...session, ...profile };
  await saveNeteaseUserSession(session);
  clientTokenCache = null;
  return session;
}

/** 生成扫码登录 unikey（开放平台二维码登录） */
export async function createOpenApiQrLogin(): Promise<{
  unikey: string;
  message?: string;
}> {
  if (!isNeteaseOpenApiConfigured()) {
    return { unikey: '', message: '未配置开放平台凭证' };
  }

  const paths = [
    '/openapi/oauth2/login/qrcode/unikey/get/v2',
    '/openapi/oauth2/qrcode/unikey/get/v2',
    '/openapi/oauth2/qrcode/key/get/v2',
  ];
  const bizVariants: Record<string, unknown>[] = [{ type: 1 }, { type: '1' }, {}];

  for (const path of paths) {
    for (const biz of bizVariants) {
      const data = await openApiGet<Record<string, unknown>>(path, biz);
      const unikey = pickUnikey(data);
      if (unikey) return { unikey };
    }
  }

  return { unikey: '', message: '无法生成登录二维码，请确认应用已开通二维码登录能力' };
}

export type NeteaseQrPollStatus = 'waiting' | 'scanned' | 'expired' | 'success' | 'error';

/** 轮询扫码状态；803 为登录成功 */
export async function pollOpenApiQrLogin(unikey: string): Promise<{
  status: NeteaseQrPollStatus;
  message?: string;
  session?: NeteaseUserSession;
}> {
  if (!unikey) return { status: 'error', message: '缺少二维码 key' };

  const paths = [
    '/openapi/oauth2/login/qrcode/client/login/get/v2',
    '/openapi/oauth2/qrcode/client/login/get/v2',
    '/openapi/oauth2/qrcode/check/get/v2',
  ];
  const bizVariants: Record<string, unknown>[] = [
    { key: unikey, type: 1 },
    { key: unikey, type: '1' },
    { unikey, type: 1 },
    { key: unikey },
  ];

  for (const path of paths) {
    for (const biz of bizVariants) {
      const result = await openApiRequest<Record<string, unknown>>(path, biz);
      if (!result.ok || !result.data) continue;

      const data = result.data;
      const code = pickStatusCode(data);

      if (code === 800) return { status: 'expired', message: '二维码已过期，请刷新后重试' };
      if (code === 801) return { status: 'waiting', message: '请使用网易云音乐 App 扫码' };
      if (code === 802) return { status: 'scanned', message: '已扫码，请在手机上确认登录' };

      const directToken = data.accessToken || data.token;
      if (code === 803 || (typeof directToken === 'string' && directToken)) {
        const parsed = parseTokenPayload({
          accessToken: typeof directToken === 'string' ? directToken : undefined,
          token: typeof data.token === 'string' ? data.token : undefined,
          refreshToken: typeof data.refreshToken === 'string' ? data.refreshToken : undefined,
          expireTime: typeof data.expireTime === 'number' ? data.expireTime : undefined,
          expiresIn: typeof data.expiresIn === 'number' ? data.expiresIn : undefined,
        });
        if (parsed) {
          const session = await saveUserSessionFromTokenPayload(data, parsed);
          return { status: 'success', session };
        }

        const exchanged = await exchangeQrKeyForUserToken(unikey);
        if (exchanged.session) return { status: 'success', session: exchanged.session };
        return { status: 'error', message: exchanged.message || '扫码成功但换取 token 失败' };
      }
    }
  }

  return { status: 'waiting', message: '等待扫码…' };
}

async function exchangeQrKeyForUserToken(unikey: string) {
  const paths = [
    '/openapi/oauth2/login/qrcode/access/token/get/v2',
    '/openapi/oauth2/qrcode/access/token/get/v2',
    '/openapi/oauth2/qrcode/token/get/v2',
  ];
  const bizVariants: Record<string, unknown>[] = [
    { key: unikey, type: 1 },
    { unikey, type: 1 },
    { key: unikey },
  ];

  for (const path of paths) {
    for (const biz of bizVariants) {
      const result = await openApiRequest<Record<string, unknown>>(path, biz);
      if (!result.ok || !result.data) continue;
      const parsed = parseTokenPayload({
        accessToken:
          typeof result.data.accessToken === 'string' ? result.data.accessToken : undefined,
        token: typeof result.data.token === 'string' ? result.data.token : undefined,
        refreshToken:
          typeof result.data.refreshToken === 'string' ? result.data.refreshToken : undefined,
        expireTime:
          typeof result.data.expireTime === 'number' ? result.data.expireTime : undefined,
        expiresIn: typeof result.data.expiresIn === 'number' ? result.data.expiresIn : undefined,
      });
      if (!parsed) continue;
      const session = await saveUserSessionFromTokenPayload(result.data, parsed);
      return { session };
    }
  }
  return { session: null, message: '二维码登录换 token 失败' };
}

export function buildNeteaseQrImageUrl(unikey: string) {
  const qrUrl = `https://music.163.com/login?codekey=${encodeURIComponent(unikey)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`;
  return { qrUrl, qrImageUrl };
}

export async function fetchOpenApiSongDetail(songId: string) {
  const resolved = await resolveOpenApiAccessToken();
  if (!resolved) return null;

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
    }>(path, { songId }, resolved.token);

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

  const quality = resolved.kind === 'user' ? 'exhigh' : 'standard';
  const paths = [
    '/openapi/music/basic/song/playurl/get/v2',
    '/openapi/music/basic/song/url/get/v2',
    '/openapi/music/basic/song/playurl/get',
  ];

  for (const path of paths) {
    const data = await openApiGet<{ url?: string; playUrl?: string; data?: { url?: string }[] }>(
      path,
      { songId, quality },
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

/** 用户收藏/创建的歌单（需用户登录） */
export async function fetchOpenApiUserPlaylists(limit = 30) {
  const resolved = await resolveOpenApiAccessToken();
  if (!resolved || resolved.kind !== 'user') return null;

  const paths = [
    '/openapi/music/basic/playlist/created/get/v2',
    '/openapi/music/basic/user/playlist/get/v2',
  ];

  for (const path of paths) {
    const data = await openApiGet<{
      records?: { id?: string | number; name?: string; coverImgUrl?: string; trackCount?: number }[];
      list?: { id?: string | number; name?: string; coverImgUrl?: string; trackCount?: number }[];
    }>(path, { limit }, resolved.token);

    const list = data?.records || data?.list;
    if (!Array.isArray(list)) continue;
    return list.map((p) => ({
      id: String(p.id ?? ''),
      name: p.name || '未命名歌单',
      cover: p.coverImgUrl || '',
      trackCount: p.trackCount ?? 0,
    }));
  }
  return null;
}
