/** 网易云音乐：Meting API + 官方歌曲详情查询 */

const METING_BASE = 'https://api.injahow.cn/meting/';

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

export async function fetchMetingSong(songId: string): Promise<MetingSong | null> {
  const id = songId.trim();
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

export async function fetchNeteaseSongMeta(songId: string) {
  const id = songId.trim();
  if (!id) return null;
  try {
    const apiUrl = `https://music.163.com/api/song/detail/?id=${id}&ids=[${id}]`;
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com/',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const song = data?.songs?.[0];
    if (!song) return null;
    return {
      id,
      name: song.name as string,
      artist: song.artists?.[0]?.name || '未知歌手',
      album: song.album?.name || '',
      cover: song.album?.picUrl || '',
    };
  } catch {
    return null;
  }
}

export function mapMetingToPlaylistItem(song: MetingSong, fallbackId: string) {
  return {
    id: song.id || fallbackId,
    title: song.name || song.title || '未知歌曲',
    artist: song.author || song.artist || '未知歌手',
    cover: song.pic || song.cover || 'https://bu.dusays.com/2026/03/24/69c24230a5ff8.jpg',
    src: song.url || '',
    lrcUrl: song.lrc || '',
    lrc: '',
    lyrics: [] as { time: number; text: string }[],
  };
}
