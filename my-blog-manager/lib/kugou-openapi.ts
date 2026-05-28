import crypto from 'crypto';
import { getSiteSetting, updateSiteSettings } from './content-store';
import { parseKugouHttpJson } from './kugou-request';
import { type KugouSearchItem, toStorageId } from './kugou-music';

const BASE = 'https://thirdsso.kugou.com';
const DEVICE_KEY = 'kugou_iot_device_id';
const DEVICE_ACTIVATED_KEY = 'kugou_iot_device_activated';

export const KUGOU_OPENAPI_DOC_URL =
  'https://open.kugou.com/docs/iot-solution/#/OPENAPI/README?id=%e7%94%a8%e6%88%b7';

/** OpenAPI 歌曲 ID 前缀，与 hash|album_id 区分 */
export const KUGOU_OPENAPI_ID_PREFIX = 'kg:';

export function toOpenApiStorageId(songId: string) {
  const id = String(songId).trim();
  if (!id) return '';
  return id.startsWith(KUGOU_OPENAPI_ID_PREFIX) ? id : `${KUGOU_OPENAPI_ID_PREFIX}${id}`;
}

export function parseOpenApiStorageId(rawId: string) {
  const id = rawId.trim();
  if (!id.startsWith(KUGOU_OPENAPI_ID_PREFIX)) return null;
  const songId = id.slice(KUGOU_OPENAPI_ID_PREFIX.length);
  return songId || null;
}

export type KugouOpenSession = {
  token: string;
  userid: string;
  device_id: string;
  nickname?: string;
  pic?: string;
  loginAt: number;
  source: 'openapi';
};

type OpenApiResponse<T> = {
  error_code: number;
  error_msg?: string;
  data?: T;
};

function randomNonce(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function md5(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function isKugouOpenApiConfigured() {
  return Boolean(process.env.KUGOU_IOT_PID?.trim() && process.env.KUGOU_IOT_PKEY?.trim());
}

export function getKugouOpenApiConfigError() {
  if (isKugouOpenApiConfigured()) return null;
  return `未配置酷狗牛方案凭证：请在 .env 中设置 KUGOU_IOT_PID 与 KUGOU_IOT_PKEY（由酷狗商务提供）。文档：${KUGOU_OPENAPI_DOC_URL}`;
}

export function assertKugouOpenApiConfigured() {
  const err = getKugouOpenApiConfigError();
  if (err) throw new Error(err);
}

async function getOrCreateDeviceId() {
  const existing = await getSiteSetting(DEVICE_KEY);
  if (existing?.trim()) return existing.trim();
  const device_id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  await updateSiteSettings({ [DEVICE_KEY]: device_id });
  return device_id;
}

function signBody(body: Record<string, unknown>, pkey: string) {
  return md5(JSON.stringify(body) + pkey);
}

let deviceActivationPromise: Promise<void> | null = null;

async function postOpenApiCore<T>(
  path: string,
  extra: Record<string, unknown>,
  clientIp: string
): Promise<OpenApiResponse<T>> {
  const pid = process.env.KUGOU_IOT_PID?.trim();
  const pkey = process.env.KUGOU_IOT_PKEY?.trim();
  if (!pid || !pkey) {
    throw new Error(getKugouOpenApiConfigError() || '未配置酷狗凭证');
  }

  const device_id = await getOrCreateDeviceId();
  const body: Record<string, unknown> = {
    pid,
    sp: 'KG',
    device_id,
    client_ip: clientIp || '127.0.0.1',
    timestamp: Math.floor(Date.now() / 1000),
    nonce: randomNonce(16),
    ...extra,
  };

  const signature = signBody(body, pkey);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      signature,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = await parseKugouHttpJson<OpenApiResponse<T>>(res, `酷狗 OpenAPI ${path}`);
  return json;
}

/** 官方文档：设备激活（首次接入建议调用） */
async function ensureDeviceActivated(clientIp: string) {
  const flag = await getSiteSetting(DEVICE_ACTIVATED_KEY);
  if (flag === '1') return;
  if (!deviceActivationPromise) {
    deviceActivationPromise = (async () => {
      const json = await postOpenApiCore<Record<string, unknown>>(
        '/v2/device/activation',
        {
          device_info: {
            brand: 'XHBlogs',
            product: 'blog-manager',
            device_software_version: '1.0.0',
          },
        },
        clientIp
      );
      if (json.error_code === 0 || json.error_msg?.includes('已激活')) {
        await updateSiteSettings({ [DEVICE_ACTIVATED_KEY]: '1' });
      }
    })();
  }
  await deviceActivationPromise;
}

async function postOpenApi<T>(
  path: string,
  extra: Record<string, unknown>,
  clientIp: string
): Promise<OpenApiResponse<T>> {
  assertKugouOpenApiConfigured();
  if (path !== '/v2/device/activation') {
    await ensureDeviceActivated(clientIp);
  }
  return postOpenApiCore<T>(path, extra, clientIp);
}

type OpenApiSongInfo = {
  song_id: string;
  song_name?: string;
  singer_name?: string;
  album_id?: string;
  album_name?: string;
  album_img_medium?: string;
  album_img?: string;
  hash?: string;
  song_hash?: string;
  file_hash?: string;
};

async function resolveOpenApiSongStorageIds(
  session: KugouOpenSession,
  songIds: string[],
  clientIp: string
): Promise<Map<string, string>> {
  const storageBySongId = new Map<string, string>();
  const unique = [...new Set(songIds.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const json = await postOpenApi<{ songs: OpenApiSongInfo[] }>(
      '/v2/song/infos',
      { userid: session.userid, token: session.token, songs_id: batch },
      clientIp
    );
    if (json.error_code !== 0) continue;
    for (const s of json.data?.songs || []) {
      const hash = String(s.hash || s.song_hash || s.file_hash || '').toUpperCase();
      const albumId = String(s.album_id || '0');
      if (hash) storageBySongId.set(String(s.song_id), toStorageId(hash, albumId));
    }
  }
  return storageBySongId;
}

/** 官方文档：批量查询歌曲信息（用于展示元数据） */
export async function fetchOpenApiSongMeta(
  session: KugouOpenSession,
  songId: string,
  clientIp: string
) {
  const json = await postOpenApi<{ songs: OpenApiSongInfo[] }>(
    '/v2/song/infos',
    { userid: session.userid, token: session.token, songs_id: [songId] },
    clientIp
  );
  if (json.error_code !== 0 || !json.data?.songs?.[0]) return null;
  const s = json.data.songs[0];
  return {
    id: toOpenApiStorageId(String(s.song_id || songId)),
    name: s.song_name || '未知',
    artist: s.singer_name || '',
    album: s.album_name || '',
    cover: s.album_img_medium || s.album_img || '',
  };
}

/** 官方文档：获取歌曲播放地址 /v2/song/url */
export async function fetchOpenApiSongPlayUrl(
  session: KugouOpenSession,
  songId: string,
  clientIp: string
): Promise<{ url: string; backupUrl?: string } | null> {
  const json = await postOpenApi<{
    url?: string;
    backup_url?: string;
    play_url?: string;
    urls?: Array<{ url?: string }>;
  }>(
    '/v2/song/url',
    {
      userid: session.userid,
      token: session.token,
      song_id: songId,
      quality: '128',
    },
    clientIp
  );
  if (json.error_code !== 0 || !json.data) return null;
  const d = json.data;
  const url = d.url || d.play_url || d.urls?.[0]?.url;
  if (!url) return null;
  return { url, backupUrl: d.backup_url };
}

function mapQrPollError(errorCode: number, errorMsg: string) {
  switch (errorCode) {
    case 200300:
      return { status: 'waiting' as const, message: '请使用酷狗音乐 App 扫描二维码' };
    case 200301:
      return { status: 'scanned' as const, message: '已扫码，请在手机上确认登录' };
    case 200302:
      return {
        status: 'expired' as const,
        message: '二维码已超时失效，请重新获取',
        canRefresh: true,
      };
    case 200304:
      return { status: 'waiting' as const, message: 'H5 登录未完成，请继续在 App 内确认' };
    default:
      return {
        status: 'error' as const,
        message: errorMsg || `酷狗返回错误码 ${errorCode}`,
      };
  }
}

export async function createOpenApiQrLogin(clientIp: string) {
  const json = await postOpenApi<{ qrcode: string; ticket: string }>(
    '/v2/user/qrcode/get',
    { refresh: 0 },
    clientIp
  );

  if (json.error_code !== 0 || !json.data?.ticket || !json.data?.qrcode) {
    throw new Error(json.error_msg || '获取登录二维码失败');
  }

  const { qrcode, ticket } = json.data;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrcode)}`;

  return {
    sessionId: ticket,
    qrKey: ticket,
    scanUrl: qrcode,
    qrImageUrl,
    expiresAt: Date.now() + 120_000,
    ttlSeconds: 120,
    ticket,
  };
}

export async function pollOpenApiQrLogin(ticket: string, clientIp: string) {
  const json = await postOpenApi<{
    userid: string;
    token: string;
    expire?: number;
  }>('/v2/user/qrcode/auth', { ticket, refresh: 0 }, clientIp);

  if (json.error_code === 0 && json.data?.token && json.data?.userid) {
    const device_id = await getOrCreateDeviceId();
    return {
      status: 'success' as const,
      message: '登录成功',
      session: {
        token: json.data.token,
        userid: String(json.data.userid),
        device_id,
        loginAt: Date.now(),
        source: 'openapi' as const,
      },
      user: {
        nickname: `酷狗用户 ${json.data.userid}`,
        pic: '',
        userid: String(json.data.userid),
      },
    };
  }

  return mapQrPollError(json.error_code, json.error_msg || '');
}

export async function fetchOpenApiUserInfo(session: KugouOpenSession, clientIp: string) {
  const json = await postOpenApi<{ nick_name?: string; img?: string }>(
    '/v2/vip/client/ssov2/userinfo',
    {
      userid: session.userid,
      token: session.token,
      extend: 0,
    },
    clientIp
  );
  if (json.error_code !== 0 || !json.data) return session;
  return {
    ...session,
    nickname: json.data.nick_name || session.nickname,
    pic: json.data.img || session.pic,
  };
}

export async function fetchOpenApiPlaylists(session: KugouOpenSession, clientIp: string) {
  const playlists: Array<{
    id: string;
    name: string;
    count: number;
    cover: string;
    globalCollectionId: string;
    specialId: string;
    isFavorite: boolean;
    listType: 'self' | 'other';
  }> = [];

  for (const [listType, path] of [
    ['self', '/v2/favorite/selfv2/list'],
    ['other', '/v2/favorite/otherv2/list'],
  ] as const) {
    const json = await postOpenApi<{
      total: number;
      playlists: Array<{
        playlist_id: string;
        playlist_name: string;
        pic?: string;
        total?: number;
        playlist_extra_id?: string;
      }>;
    }>(path, { userid: session.userid, token: session.token, page: 1, size: 30 }, clientIp);

    if (json.error_code !== 0) {
      if (json.error_code === 200003) throw new Error('登录已过期，请重新扫码');
      continue;
    }

    for (const pl of json.data?.playlists || []) {
      playlists.push({
        id: `${listType}:${pl.playlist_id}`,
        name: pl.playlist_name || '未命名歌单',
        count: pl.total ?? 0,
        cover: pl.pic || '',
        globalCollectionId: '',
        specialId: pl.playlist_id,
        isFavorite: listType === 'other' && /喜欢|红心|收藏/i.test(pl.playlist_name || ''),
        listType,
      });
    }
  }

  return playlists;
}

export async function fetchOpenApiPlaylistSongs(
  session: KugouOpenSession,
  playlistKey: string,
  clientIp: string
): Promise<{ title: string; songs: KugouSearchItem[] }> {
  const colon = playlistKey.indexOf(':');
  const listType: 'self' | 'other' =
    colon > 0 && (playlistKey.slice(0, colon) === 'self' || playlistKey.slice(0, colon) === 'other')
      ? (playlistKey.slice(0, colon) as 'self' | 'other')
      : 'self';
  const playlist_id = colon > 0 ? playlistKey.slice(colon + 1) : playlistKey;

  const songs: KugouSearchItem[] = [];
  let page = 1;
  let title = '歌单';

  while (page <= 5) {
    const json = await postOpenApi<{
      total: number;
      songs: Array<{
        song_id: string;
        song_name: string;
        singer_name: string;
        album_id?: string;
        album_name?: string;
        album_img?: string;
        album_img_medium?: string;
      }>;
    }>(
      '/v2/favorite/song',
      {
        userid: session.userid,
        token: session.token,
        playlist_id,
        type: listType,
        page,
        size: 50,
      },
      clientIp
    );

    if (json.error_code !== 0) {
      throw new Error(json.error_msg || '获取歌单歌曲失败');
    }

    const batch = json.data?.songs || [];
    if (page === 1 && batch[0]) title = batch[0].album_name || '歌单';

    for (const s of batch) {
      const songId = String(s.song_id);
      songs.push({
        id: toOpenApiStorageId(songId),
        hash: '',
        albumId: String(s.album_id || '0'),
        name: s.song_name || '未知',
        artist: s.singer_name || '',
        album: s.album_name || '',
        cover: s.album_img_medium || s.album_img || '',
      });
    }

    if (batch.length < 50) break;
    page += 1;
  }

  if (songs.length > 0) {
    const storageMap = await resolveOpenApiSongStorageIds(
      session,
      songs.map((s) => parseOpenApiStorageId(s.id) || s.id),
      clientIp
    );
    for (const song of songs) {
      const songId = parseOpenApiStorageId(song.id) || song.id;
      const storageId = storageMap.get(songId);
      if (storageId) {
        const [hash, albumId] = storageId.split('|');
        song.id = storageId;
        song.hash = hash;
        song.albumId = albumId || '0';
      }
    }
  }

  return { title, songs };
}
