import crypto from 'crypto';

export type KugouSongMeta = {
  id: string;
  name: string;
  artist: string;
  album: string;
  cover: string;
  url: string;
  lrc: string;
  hash?: string;
  albumId?: string;
};

export type KugouSearchItem = {
  id: string;
  name: string;
  artist: string;
  album: string;
  cover: string;
  hash: string;
  albumId: string;
};

export function toStorageId(hash: string, albumId: string) {
  return `${hash.toUpperCase()}|${albumId || '0'}`;
}

function mapListItem(item: Record<string, unknown>): KugouSearchItem | null {
  const hash = String(item.FileHash || item.hash || '').toUpperCase();
  if (!hash) return null;
  const albumId = String(item.AlbumID ?? item.album_id ?? '0');
  const coverRaw = String(item.Image || item.img || item.album_img || '');
  const cover = coverRaw.includes('{size}') ? coverRaw.replace('{size}', '400') : coverRaw;
  return {
    id: toStorageId(hash, albumId),
    hash,
    albumId,
    name: String(item.SongName || item.FileName || item.songname || '未知歌曲'),
    artist: String(item.SingerName || item.author_name || item.singername || '未知歌手'),
    album: String(item.AlbumName || item.album_name || ''),
    cover,
  };
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function createMid() {
  return crypto.randomUUID().replace(/-/g, '');
}

function parseKugouJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const match = trimmed.match(/^[^(]+\(([\s\S]*)\)\s*;?$/);
  if (match) return JSON.parse(match[1]);
  throw new Error('无法解析酷狗接口响应');
}

function parseSongId(rawId: string) {
  const id = rawId.trim();
  if (id.startsWith('kg:')) {
    return { hash: '', albumId: '', albumAudioId: id.slice(3) };
  }
  if (id.includes('|')) {
    const [hash, albumId] = id.split('|');
    return { hash: hash.trim(), albumId: albumId.trim(), albumAudioId: '' };
  }
  if (/^[a-fA-F0-9]{32}$/.test(id)) {
    return { hash: id.toUpperCase(), albumId: '', albumAudioId: '' };
  }
  return { hash: '', albumId: '', albumAudioId: id };
}

async function fetchByAlbumAudioId(albumAudioId: string) {
  const url = new URL('https://gateway.kugou.com/v3/album_audio/info');
  url.searchParams.set('album_audio_id', albumAudioId);
  url.searchParams.set('appid', '1014');
  url.searchParams.set('clientver', '12000');
  url.searchParams.set('clienttime', String(Date.now()));
  url.searchParams.set('mid', createMid());
  url.searchParams.set('dfid', '-');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA, Referer: 'https://www.kugou.com/' },
    cache: 'no-store',
  });
  const json = await res.json();
  const data = json?.data ?? json?.info ?? json;
  if (!data) return null;
  const hash = (data.hash || data.FileHash || '').toUpperCase();
  if (!hash) return null;
  return {
    hash,
    albumId: String(data.album_id ?? data.AlbumID ?? ''),
    name: data.song_name || data.audio_name || data.SongName || '',
    artist: data.author_name || data.singer_name || data.SingerName || '',
    cover: data.album_img || data.img || '',
  };
}

/** 按歌名/歌手搜索，返回可存入 cloudMusicIds 的列表 */
export async function searchKugouSongs(keyword: string, pageSize = 20): Promise<KugouSearchItem[]> {
  const url = new URL('http://mobilecdn.kugou.com/api/v3/search/song');
  url.searchParams.set('format', 'json');
  url.searchParams.set('keyword', keyword.trim());
  url.searchParams.set('page', '1');
  url.searchParams.set('pagesize', String(Math.min(pageSize, 30)));
  url.searchParams.set('showtype', '1');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA, Referer: 'https://m.kugou.com/' },
    cache: 'no-store',
  });
  const json = parseKugouJson(await res.text());
  const list = json?.data?.lists ?? json?.data?.info ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .map((item: Record<string, unknown>) => mapListItem(item))
    .filter((item): item is KugouSearchItem => !!item);
}

async function searchSong(keyword: string) {
  const list = await searchKugouSongs(keyword, 1);
  return list[0]
    ? {
        hash: list[0].hash,
        albumId: list[0].albumId,
        name: list[0].name,
        artist: list[0].artist,
        cover: list[0].cover,
      }
    : null;
}

/** 从分享链接/ID 解析歌单标识 */
export function parsePlaylistInput(input: string) {
  const text = input.trim();
  const collection = text.match(/collection_\d+_\d+_\d+_\d+/i);
  if (collection) return { type: 'collection' as const, id: collection[0] };

  const specialMatch =
    text.match(/specialid[=:](\d+)/i) ||
    text.match(/plist\/list\/(\d+)/i) ||
    text.match(/\/yy\/special\/single\/\d+-(\d+)\.html/i);
  if (specialMatch) return { type: 'special' as const, id: specialMatch[1] };

  if (/^\d{4,}$/.test(text)) return { type: 'special' as const, id: text };
  return null;
}

async function fetchPlaylistBySpecialId(specialId: string): Promise<KugouSearchItem[]> {
  const res = await fetch(`http://m.kugou.com/plist/list/${specialId}?json=true`, {
    headers: { 'User-Agent': UA, Referer: 'https://m.kugou.com/' },
    cache: 'no-store',
  });
  const json = await res.json();
  const songs =
    json?.list?.list?.info ??
    json?.list?.info ??
    json?.list?.songs ??
    json?.songs ??
    [];
  if (!Array.isArray(songs)) return [];
  return songs
    .map((item: Record<string, unknown>) => mapListItem(item))
    .filter((item): item is KugouSearchItem => !!item);
}

async function fetchPlaylistByCollectionId(collectionId: string): Promise<KugouSearchItem[]> {
  const url = new URL('https://gateway.kugou.com/pubsongs/v2/get_other_list_file_nofilt');
  url.searchParams.set('global_collection_id', collectionId);
  url.searchParams.set('appid', '1014');
  url.searchParams.set('clientver', '12000');
  url.searchParams.set('clienttime', String(Date.now()));
  url.searchParams.set('mid', createMid());
  url.searchParams.set('dfid', '-');
  url.searchParams.set('page', '1');
  url.searchParams.set('pagesize', '300');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA, Referer: 'https://www.kugou.com/' },
    cache: 'no-store',
  });
  const json = await res.json();
  const songs = json?.data?.songs ?? json?.data?.info ?? json?.data?.lists ?? [];
  if (!Array.isArray(songs)) return [];
  return songs
    .map((item: Record<string, unknown>) => mapListItem(item))
    .filter((item): item is KugouSearchItem => !!item);
}

/** 导入公开歌单（分享链接、specialid、global_collection_id） */
export async function fetchKugouPlaylist(input: string): Promise<{
  title: string;
  songs: KugouSearchItem[];
}> {
  const parsed = parsePlaylistInput(input);
  if (!parsed) {
    throw new Error('无法识别歌单链接，请粘贴酷狗歌单分享链接或 specialid');
  }

  if (parsed.type === 'special') {
    const songs = await fetchPlaylistBySpecialId(parsed.id);
    return { title: `歌单 ${parsed.id}`, songs };
  }

  const songs = await fetchPlaylistByCollectionId(parsed.id);
  return { title: `收藏/歌单 ${parsed.id}`, songs };
}

async function playGetData(hash: string, albumId: string) {
  const url = new URL('https://wwwapi.kugou.com/yy/index.php');
  url.searchParams.set('r', 'play/getdata');
  url.searchParams.set('hash', hash);
  url.searchParams.set('appid', '1014');
  url.searchParams.set('mid', createMid());
  url.searchParams.set('platid', '4');
  url.searchParams.set('album_id', albumId || '0');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA, Referer: 'https://www.kugou.com/' },
    cache: 'no-store',
  });
  return parseKugouJson(await res.text());
}

async function fetchLyric(hash: string) {
  try {
    const searchUrl = new URL('http://krcs.kugou.com/search');
    searchUrl.searchParams.set('ver', '1');
    searchUrl.searchParams.set('man', 'yes');
    searchUrl.searchParams.set('client', 'pc');
    searchUrl.searchParams.set('keyword', '');
    searchUrl.searchParams.set('duration', '');
    searchUrl.searchParams.set('hash', hash);
    searchUrl.searchParams.set('album_audio_id', '');

    const searchRes = await fetch(searchUrl.toString(), { cache: 'no-store' });
    const searchJson = await searchRes.json();
    const candidate = searchJson?.candidates?.[0];
    if (!candidate?.id || !candidate?.accesskey) return '';

    const lrcUrl = new URL('http://lyrics.kugou.com/download');
    lrcUrl.searchParams.set('ver', '1');
    lrcUrl.searchParams.set('client', 'pc');
    lrcUrl.searchParams.set('id', String(candidate.id));
    lrcUrl.searchParams.set('accesskey', candidate.accesskey);
    lrcUrl.searchParams.set('fmt', 'lrc');
    lrcUrl.searchParams.set('charset', 'utf8');

    const lrcRes = await fetch(lrcUrl.toString(), { cache: 'no-store' });
    const lrcJson = await lrcRes.json();
    if (!lrcJson?.content) return '';
    return Buffer.from(lrcJson.content, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/** 通过酷狗歌曲 ID 获取可播放资源（支持 album_audio_id 或 hash|album_id） */
export async function fetchKugouSong(rawId: string): Promise<KugouSongMeta | null> {
  const parsed = parseSongId(rawId);
  let hash = parsed.hash;
  let albumId = parsed.albumId;
  let name = '';
  let artist = '';
  let cover = '';

  if (!hash && parsed.albumAudioId) {
    const found =
      (await fetchByAlbumAudioId(parsed.albumAudioId)) ||
      (await searchSong(parsed.albumAudioId));
    if (!found?.hash) return null;
    hash = found.hash;
    albumId = found.albumId;
    name = found.name;
    artist = found.artist;
    cover = found.cover;
  }

  if (!hash) return null;

  const playJson = await playGetData(hash, albumId);
  const data = playJson?.data;
  if (!data?.play_url) return null;

  const lrc =
    typeof data.lyrics === 'string' && data.lyrics.length > 0
      ? data.lyrics
      : await fetchLyric(hash);

  const storageId = albumId ? toStorageId(hash, albumId) : rawId.trim();

  return {
    id: storageId,
    name: name || data.song_name || data.audio_name || '未知歌曲',
    artist: artist || data.author_name || data.singer_name || '未知歌手',
    album: data.album_name || '',
    cover:
      cover ||
      (data.img ? String(data.img).replace('{size}', '400') : '') ||
      'https://bu.dusays.com/2026/03/24/69c24230a5ff8.jpg',
    url: data.play_url,
    lrc,
    hash,
    albumId,
  };
}

/** 管理后台查询用：仅元数据 */
export async function fetchKugouSongMeta(rawId: string) {
  const song = await fetchKugouSong(rawId);
  if (!song) return null;
  return {
    id: song.id,
    name: song.name,
    artist: song.artist,
    album: song.album,
    cover: song.cover,
  };
}
