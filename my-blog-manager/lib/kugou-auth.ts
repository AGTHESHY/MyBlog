import crypto from 'crypto';
import { getSiteSetting, updateSiteSettings } from './content-store';
import {
  aesDecryptSecuParams,
  aesEncryptPayload,
  maskMobile,
  rsaEncryptLoginPk,
  signParamsKey,
} from './kugou-crypto';
import {
  assertKugouOpenApiConfigured,
  createOpenApiQrLogin,
  fetchOpenApiPlaylistSongs,
  fetchOpenApiPlaylists,
  fetchOpenApiUserInfo,
  isKugouOpenApiConfigured,
  KUGOU_OPENAPI_DOC_URL,
  pollOpenApiQrLogin,
  type KugouOpenSession,
} from './kugou-openapi';
import type { KugouSearchItem } from './kugou-music';

export type KugouSession = {
  token: string;
  userid: string;
  mid?: string;
  dfid?: string;
  device_id?: string;
  source?: 'openapi' | 'legacy';
  nickname?: string;
  pic?: string;
  loginAt: number;
};

export const KUGOU_PHONE_LOGIN_DISABLED_MSG = `酷狗牛方案官方 OpenAPI 未提供手机号验证码登录，仅支持扫码登录。详见：${KUGOU_OPENAPI_DOC_URL}`;

export const KUGOU_LEGACY_DISABLED_MSG = `酷狗账号功能已切换为官方牛方案 OpenAPI，请配置 KUGOU_IOT_PID / KUGOU_IOT_PKEY 后使用扫码登录。文档：${KUGOU_OPENAPI_DOC_URL}`;

export type KugouUserPlaylist = {
  id: string;
  name: string;
  count: number;
  cover: string;
  globalCollectionId: string;
  specialId: string;
  isFavorite: boolean;
};

/** 酷狗 PC/Web 通用 appid（轮询、qrcode_txt） */
const KUGOU_APPID = 1005;
/** 申请二维码专用 appid */
const QR_CREATE_APPID = 1014;
const ANDROID_APPID = 1005;
/** 登录接口 web 签名使用的 clientver（与 KuGouMusicApi 一致） */
const WEB_CLIENTVER = 20489;
const ANDROID_CLIENTVER = 12000;
const SRCAPPID = 2919;
const QR_PENDING_PREFIX = 'kugou_qr_pending:';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SESSION_KEY = 'kugou_login_session';

/** 酷狗扫码二维码有效期（官方约 2 分钟，略提前结束轮询） */
export const KUGOU_QR_TTL_MS = 120_000;

type PendingQr = {
  key: string;
  mid: string;
  dfid: string;
  createdAt: number;
  expiresAt: number;
};

const pendingQr = new Map<string, PendingQr>();

type PendingPhone = { mid: string; expiresAt: number };
const pendingPhone = new Map<string, PendingPhone>();
const PHONE_MID_TTL_MS = 10 * 60 * 1000;

function md5(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

function createMid() {
  return crypto.randomUUID().replace(/-/g, '');
}

function signatureWebParams(params: Record<string, string | number>) {
  const salt = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt';
  const paramsString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('');
  return md5(`${salt}${paramsString}${salt}`);
}

function signatureAndroidParams(params: Record<string, unknown>, data = '') {
  const salt = 'OIlwieks28dk2k092lksi2UIkp';
  const paramsString = Object.keys(params)
    .sort()
    .map((key) => {
      const v = params[key];
      return `${key}=${typeof v === 'object' ? JSON.stringify(v) : v}`;
    })
    .join('');
  return md5(`${salt}${paramsString}${data}${salt}`);
}

function buildWebParams(
  extra: Record<string, string | number>,
  mid: string,
  dfid: string,
  appid: number
) {
  const clienttime = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    dfid,
    mid,
    uuid: '-',
    appid,
    clientver: WEB_CLIENTVER,
    clienttime,
    srcappid: SRCAPPID,
    ...extra,
  };
  params.signature = signatureWebParams(params);
  return params;
}

function buildAndroidQuery(
  extra: Record<string, string | number>,
  session: Pick<KugouSession, 'mid' | 'dfid' | 'token' | 'userid'>
) {
  const clienttime = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    dfid: session.dfid,
    mid: session.mid,
    uuid: '-',
    appid: ANDROID_APPID,
    clientver: ANDROID_CLIENTVER,
    clienttime,
    token: session.token,
    userid: Number(session.userid) || session.userid,
    plat: 1,
    ...extra,
  };
  return params;
}

async function savePendingQr(sessionId: string, pending: PendingQr) {
  pendingQr.set(sessionId, pending);
  try {
    await updateSiteSettings({
      [`${QR_PENDING_PREFIX}${sessionId}`]: pending,
    });
  } catch {
    /* 内存会话仍可用于单实例轮询；DB 失败不阻断出码 */
  }
}

async function loadPendingQr(sessionId: string): Promise<PendingQr | null> {
  const cached = pendingQr.get(sessionId);
  if (cached) return cached;

  const raw = await getSiteSetting(`${QR_PENDING_PREFIX}${sessionId}`);
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw) as PendingQr;
    if (!pending?.key) return null;
    pendingQr.set(sessionId, pending);
    return pending;
  } catch {
    return null;
  }
}

async function deletePendingQr(sessionId: string) {
  pendingQr.delete(sessionId);
  try {
    await updateSiteSettings({ [`${QR_PENDING_PREFIX}${sessionId}`]: '' });
  } catch {
    /* ignore */
  }
}

async function kugouWebGet(
  path: string,
  extra: Record<string, string | number>,
  mid: string,
  dfid: string,
  appid: number
) {
  const params = buildWebParams(extra, mid, dfid, appid);
  const url = new URL(`https://login-user.kugou.com${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA, Referer: 'https://www.kugou.com/' },
    cache: 'no-store',
  });
  return res.json();
}

async function kugouAndroidPostToHost<T>(
  baseURL: string,
  path: string,
  data: Record<string, unknown>,
  mid: string,
  dfid = '-'
) {
  const clienttime = Math.floor(Date.now() / 1000);
  const query: Record<string, string | number> = {
    dfid,
    mid,
    uuid: '-',
    appid: ANDROID_APPID,
    clientver: ANDROID_CLIENTVER,
    clienttime,
    plat: 1,
  };
  const body = JSON.stringify(data);
  query.signature = signatureAndroidParams(query, body);

  const url = new URL(`https://${baseURL.replace(/^https?:\/\//, '')}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'User-Agent': 'Android16-1070-11440-130-0-LOGIN-wifi',
      'Content-Type': 'application/json',
      mid,
      dfid,
      clienttime: String(clienttime),
    },
    body,
    cache: 'no-store',
  });
  return res.json() as Promise<T>;
}

function sessionFromLoginBody(
  data: Record<string, unknown>,
  mid: string,
  dfid: string
): KugouSession {
  const token = String(data?.token || '');
  const userid = String(data?.userid || data?.user_id || '');
  if (!token || !userid) throw new Error('登录响应缺少 token 或 userid');
  return {
    token,
    userid,
    mid,
    dfid,
    nickname: String(data?.nickname || data?.nick_name || data?.user_name || ''),
    pic: String(data?.pic || data?.user_pic || ''),
    loginAt: Date.now(),
  };
}

function userFromSession(session: KugouSession) {
  return {
    nickname: session.nickname || `酷狗用户 ${session.userid}`,
    pic: session.pic || '',
    userid: session.userid,
  };
}

async function kugouAndroidPost<T>(
  path: string,
  data: Record<string, unknown>,
  session: KugouSession,
  router = 'cloudlist.service.kugou.com'
) {
  const query = buildAndroidQuery({}, session);
  const body = JSON.stringify(data);
  query.signature = signatureAndroidParams(query, body);

  const url = new URL(`https://gateway.kugou.com${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'User-Agent': 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi',
      'Content-Type': 'application/json',
      'x-router': router,
      dfid: session.dfid,
      mid: session.mid,
      clienttime: String(query.clienttime),
    },
    body,
    cache: 'no-store',
  });
  return res.json() as Promise<T>;
}

export async function loadKugouSession(): Promise<KugouSession | null> {
  if (!isKugouOpenApiConfigured()) return null;
  const raw = await getSiteSetting(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as KugouSession;
    if (!session?.token || !session?.userid) return null;
    if (session.source !== 'openapi' || !session.device_id) return null;
    return {
      ...session,
      mid: session.mid || '',
      dfid: session.dfid || '',
      source: 'openapi',
    };
  } catch {
    return null;
  }
}

function toOpenApiSession(session: KugouSession): KugouOpenSession {
  if (!session.device_id) throw new Error('登录会话无效，请重新扫码登录');
  return {
    token: session.token,
    userid: session.userid,
    device_id: session.device_id,
    loginAt: session.loginAt,
    source: 'openapi',
    nickname: session.nickname,
    pic: session.pic,
  };
}

export async function saveKugouSession(session: KugouSession) {
  await updateSiteSettings({ [SESSION_KEY]: session });
}

export async function clearKugouSession() {
  await updateSiteSettings({ [SESSION_KEY]: '' });
}

function prunePendingQr() {
  const now = Date.now();
  for (const [id, item] of pendingQr.entries()) {
    if (now - item.createdAt > 5 * 60 * 1000) pendingQr.delete(id);
  }
}

export async function createKugouQrLogin(clientIp = '127.0.0.1') {
  assertKugouOpenApiConfigured();
  return createOpenApiQrLogin(clientIp);
}

function qrExpiredResult() {
  return {
    status: 'expired' as const,
    message: '二维码已过期（约 2 分钟有效），请点击「刷新二维码」',
    canRefresh: true,
  };
}

export async function pollKugouQrLogin(sessionId: string, clientIp = '127.0.0.1') {
  assertKugouOpenApiConfigured();
  const result = await pollOpenApiQrLogin(sessionId, clientIp);
  if (result.status === 'success' && 'session' in result && result.session) {
    let session: KugouOpenSession = result.session;
    try {
      session = await fetchOpenApiUserInfo(session, clientIp);
    } catch {
      /* 用户信息可选 */
    }
    const saved: KugouSession = {
      token: session.token,
      userid: session.userid,
      device_id: session.device_id,
      source: 'openapi',
      nickname: session.nickname,
      pic: session.pic,
      loginAt: session.loginAt,
      mid: '',
      dfid: '',
    };
    await saveKugouSession(saved);
    return {
      status: 'success' as const,
      message: '登录成功',
      user: {
        nickname: saved.nickname || `酷狗用户 ${saved.userid}`,
        pic: saved.pic || '',
        userid: saved.userid,
      },
    };
  }
  return result;
}

export async function sendKugouSmsCode(_mobile: string) {
  assertKugouOpenApiConfigured();
  throw new Error(KUGOU_PHONE_LOGIN_DISABLED_MSG);
}

export async function loginKugouByPhone(_mobile: string, _code: string, _deviceMid?: string) {
  assertKugouOpenApiConfigured();
  throw new Error(KUGOU_PHONE_LOGIN_DISABLED_MSG);
}

export async function fetchKugouUserPlaylists(
  session: KugouSession,
  clientIp = '127.0.0.1'
): Promise<KugouUserPlaylist[]> {
  assertKugouOpenApiConfigured();
  if (session.source !== 'openapi' || !session.device_id) {
    throw new Error('登录会话已失效，请退出后使用官方扫码重新登录');
  }
  const list = await fetchOpenApiPlaylists(toOpenApiSession(session), clientIp);
  return list.map((pl) => ({
    id: pl.id,
    name: pl.name,
    count: pl.count,
    cover: pl.cover,
    globalCollectionId: pl.globalCollectionId,
    specialId: pl.specialId,
    isFavorite: pl.isFavorite,
  }));
}

export async function fetchKugouUserPlaylistSongs(
  session: KugouSession,
  playlistId: string,
  clientIp = '127.0.0.1'
): Promise<{ title: string; songs: KugouSearchItem[] }> {
  assertKugouOpenApiConfigured();
  if (session.source !== 'openapi' || !session.device_id) {
    throw new Error('登录会话已失效，请退出后使用官方扫码重新登录');
  }
  if (!playlistId.includes(':')) {
    throw new Error('歌单数据来自旧版登录，请退出酷狗账号后重新扫码登录，再导入歌单');
  }
  return fetchOpenApiPlaylistSongs(toOpenApiSession(session), playlistId, clientIp);
}
