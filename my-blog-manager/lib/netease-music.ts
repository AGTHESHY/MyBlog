/** 网易云音乐：开放平台 API（优先）+ Meting + 外链回退 */

import {
  fetchOpenApiLyric,
  fetchOpenApiPlayUrl,
  fetchOpenApiSongDetail,
  isNeteaseOpenApiConfigured,
} from './netease-open-api';
import {
  isLrcContent,
  isLyricUrl,
  normalizeNeteaseSongId,
  type MetingSong,
  type NeteaseSongMeta,
  type NeteaseSongPlayable,
} from './netease-music-shared';

export * from './netease-music-shared';

const METING_BASE = 'https://api.injahow.cn/meting/';

const NETEASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
};

async function fetchTextFromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return '';
    return (await res.text()).trim();
  } catch {
    return '';
  }
}

export async function fetchMetingLyric(songId: string): Promise<string> {
  const id = normalizeNeteaseSongId(songId);
  if (!id) return '';
  const text = await fetchTextFromUrl(
    `${METING_BASE}?server=netease&type=lrc&id=${encodeURIComponent(id)}`
  );
  if (isLrcContent(text)) return text;
  try {
    const json = JSON.parse(text);
    if (typeof json === 'string' && isLrcContent(json)) return json;
    if (typeof json?.lyric === 'string') return json.lyric;
    if (typeof json?.lrc === 'string') return json.lrc;
  } catch {
    // 非 JSON
  }
  return isLyricUrl(text) ? '' : text;
}

async function resolveLyricText(songId: string, hint?: string): Promise<string> {
  if (hint && isLrcContent(hint)) return hint;
  if (hint && isLyricUrl(hint)) {
    const fromUrl = await fetchTextFromUrl(hint);
    if (isLrcContent(fromUrl)) return fromUrl;
  }
  return '';
}

export async function fetchMetingSong(songId: string): Promise<MetingSong | null> {
  const id = normalizeNeteaseSongId(songId);
  if (!id) return null;
  try {
    const url = `${METING_BASE}?server=netease&type=song&id=${encodeURIComponent(id)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;
    return json[0] as MetingSong;
  } catch {
    return null;
  }
}

async function fetchPublicSongMeta(songId: string): Promise<NeteaseSongMeta | null> {
  try {
    const apiUrl = `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`;
    const res = await fetch(apiUrl, { headers: NETEASE_HEADERS, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const song = data?.songs?.[0];
    if (!song) return null;
    return {
      id: songId,
      name: song.name as string,
      artist: song.artists?.[0]?.name || '未知歌手',
      album: song.album?.name || '',
      cover: song.album?.picUrl || '',
    };
  } catch {
    return null;
  }
}

function mapSearchHit(song: {
  id?: number | string;
  name?: string;
  artists?: { name?: string }[];
  album?: { name?: string; picUrl?: string };
}): NeteaseSongMeta | null {
  const id = normalizeNeteaseSongId(String(song.id ?? ''));
  if (!id || !song.name) return null;
  return {
    id,
    name: song.name,
    artist: song.artists?.map((a) => a.name).filter(Boolean).join(' / ') || '未知歌手',
    album: song.album?.name || '',
    cover: song.album?.picUrl || '',
  };
}

/** 按歌名 / 歌手关键词搜索（无需手动查 ID） */
export async function searchNeteaseSongs(keyword: string, limit = 10): Promise<NeteaseSongMeta[]> {
  const q = keyword.trim();
  if (!q) return [];

  const cap = Math.min(Math.max(limit, 1), 30);
  const endpoints = [
    `https://music.163.com/api/search/get/web?s=${encodeURIComponent(q)}&type=1&limit=${cap}`,
    `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(q)}&type=1&limit=${cap}`,
  ];

  for (const apiUrl of endpoints) {
    try {
      const res = await fetch(apiUrl, { headers: NETEASE_HEADERS, cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const songs = data?.result?.songs;
      if (!Array.isArray(songs) || songs.length === 0) continue;
      return songs
        .map((song: Parameters<typeof mapSearchHit>[0]) => mapSearchHit(song))
        .filter((s): s is NeteaseSongMeta => !!s)
        .slice(0, cap);
    } catch {
      continue;
    }
  }
  return [];
}

export async function fetchNeteaseSongMeta(songId: string): Promise<NeteaseSongMeta | null> {
  const id = normalizeNeteaseSongId(songId);
  if (!id) return null;

  if (isNeteaseOpenApiConfigured()) {
    const open = await fetchOpenApiSongDetail(id);
    if (open) return open;
  }

  return fetchPublicSongMeta(id);
}

async function fetchOuterPlayUrl(songId: string): Promise<string | null> {
  try {
    const url = `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(songId)}.mp3`;
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com/',
      },
      cache: 'no-store',
    });
    const finalUrl = res.url || url;
    if (finalUrl.includes('.mp3') || finalUrl.includes('music.126.net')) return finalUrl;
    return null;
  } catch {
    return null;
  }
}

async function fetchPublicLyric(songId: string): Promise<string> {
  try {
    const apiUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=-1&kv=-1&tv=-1`;
    const res = await fetch(apiUrl, {
      headers: {
        Referer: 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; XHBlogs/1.0)',
      },
      cache: 'no-store',
    });
    if (!res.ok) return '';
    const data = await res.json();
    return (data?.lrc?.lyric as string) || '';
  } catch {
    return '';
  }
}

/** 聚合：元数据 + 播放地址 + 歌词（服务端调用） */
export async function fetchNeteaseSongPlayable(songId: string): Promise<NeteaseSongPlayable | null> {
  const id = normalizeNeteaseSongId(songId);
  if (!id) return null;

  let meta =
    (isNeteaseOpenApiConfigured() ? await fetchOpenApiSongDetail(id) : null) ||
    (await fetchPublicSongMeta(id));

  let src = '';
  if (isNeteaseOpenApiConfigured()) {
    src = (await fetchOpenApiPlayUrl(id)) || '';
  }
  if (!src) {
    const meting = await fetchMetingSong(id);
    src = meting?.url || '';
    if (!meta && meting) {
      meta = {
        id,
        name: meting.name || meting.title || '未知歌曲',
        artist: meting.author || meting.artist || '未知歌手',
        album: '',
        cover: meting.pic || meting.cover || '',
      };
    }
  }
  if (!src) {
    src = (await fetchOuterPlayUrl(id)) || '';
  }

  if (!src) return null;

  if (!meta) {
    meta = {
      id,
      name: '未知歌曲',
      artist: '未知歌手',
      album: '',
      cover: 'https://bu.dusays.com/2026/03/24/69c24230a5ff8.jpg',
    };
  }

  const lrc = await fetchNeteaseSongLyric(id);

  return {
    ...meta,
    src,
    lrc,
    lrcUrl: '',
  };
}

export async function fetchNeteaseSongLyric(songId: string): Promise<string> {
  const id = normalizeNeteaseSongId(songId);
  if (!id) return '';

  let lrc = '';
  if (isNeteaseOpenApiConfigured()) {
    lrc = (await fetchOpenApiLyric(id)) || '';
  }
  if (!lrc) {
    lrc = await fetchPublicLyric(id);
  }
  if (!lrc) {
    const meting = await fetchMetingSong(id);
    lrc = (await resolveLyricText(id, meting?.lrc)) || (await fetchMetingLyric(id));
  }
  if (lrc && isLyricUrl(lrc)) {
    lrc = (await resolveLyricText(id, lrc)) || (await fetchMetingLyric(id));
  }
  return lrc && !isLyricUrl(lrc) ? lrc : '';
}
