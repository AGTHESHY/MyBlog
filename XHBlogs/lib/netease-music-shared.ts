/** 客户端/服务端均可用的网易云工具（勿引入 DB 或开放平台） */

export type MetingSong = {
  id: string | number;
  name?: string;
  title?: string;
  author?: string;
  artist?: string;
  pic?: string;
  cover?: string;
  url?: string;
  lrc?: string;
};

export type NeteaseSongMeta = {
  id: string;
  name: string;
  artist: string;
  album: string;
  cover: string;
};

export type NeteaseSongPlayable = NeteaseSongMeta & {
  src: string;
  lrc: string;
  lrcUrl: string;
};

export function normalizeNeteaseSongId(raw: string): string | null {
  const id = String(raw ?? '').trim();
  if (!id) return null;
  if (/[|#]/.test(id) || /^kg:/i.test(id) || /[a-f]{20,}/i.test(id)) return null;
  if (!/^\d{4,12}$/.test(id)) return null;
  return id;
}

export function describeInvalidMusicId(raw: string): string {
  const id = String(raw ?? '').trim();
  if (!id) return 'ID 为空';
  if (/[|#]/.test(id) || /^kg:/i.test(id)) {
    return '这是酷狗格式 ID，请改为网易云歌曲页地址栏中的纯数字 ID';
  }
  if (!/^\d+$/.test(id)) return '请填写纯数字的网易云歌曲 ID';
  if (id.length < 4) return '歌曲 ID 过短';
  return '无效的歌曲 ID';
}

export function isLyricUrl(text: string): boolean {
  const t = text.trim();
  return /^https?:\/\//i.test(t);
}

export function isLrcContent(text: string): boolean {
  const t = text.trim();
  if (!t || isLyricUrl(t)) return false;
  return /\[\d{1,2}:\d{2}/.test(t);
}

export function filterValidNeteaseSongIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = normalizeNeteaseSongId(raw);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function mapMetingToPlaylistItem(song: MetingSong, fallbackId: string) {
  const rawLrc = song.lrc || '';
  const lrcIsUrl = isLyricUrl(rawLrc);
  return {
    id: song.id || fallbackId,
    title: song.name || song.title || '未知歌曲',
    artist: song.author || song.artist || '未知歌手',
    cover: song.pic || song.cover || 'https://bu.dusays.com/2026/03/24/69c24230a5ff8.jpg',
    src: song.url || '',
    lrcUrl: lrcIsUrl ? rawLrc : '',
    lrc: lrcIsUrl ? '' : rawLrc,
    lyrics: [] as { time: number; text: string }[],
  };
}

export function mapPlayableToPlaylistItem(song: NeteaseSongPlayable) {
  return {
    id: song.id,
    title: song.name,
    artist: song.artist,
    cover: song.cover || 'https://bu.dusays.com/2026/03/24/69c24230a5ff8.jpg',
    src: song.src,
    lrcUrl: song.lrcUrl,
    lrc: song.lrc,
    lyrics: [] as { time: number; text: string }[],
  };
}
