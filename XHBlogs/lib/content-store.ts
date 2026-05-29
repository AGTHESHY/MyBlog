import { RowDataPacket } from 'mysql2/promise';
import { query } from './db';

type PostRow = RowDataPacket & {
  slug: string;
  title: string;
  description: string;
  cover: string;
  tags_json: string | null;
  body_markdown: string;
  published_at: string | null;
};

type ChatterRow = RowDataPacket & {
  slug: string;
  title: string;
  mood: string | null;
  cover: string;
  tags_json: string | null;
  body_markdown: string;
  published_at: string | null;
};

type MomentRow = RowDataPacket & {
  id: string;
  content: string;
  location: string | null;
  images_json: string | null;
  published_at: string | null;
};

type FriendRow = RowDataPacket & {
  id: string;
  name: string;
  url: string;
  description: string;
  avatar: string;
  theme_color: string | null;
};

type ProjectRow = RowDataPacket & {
  id: string;
  name: string;
  description: string;
  icon: string;
  github_url: string;
  tags_json: string | null;
};

type AlbumRow = RowDataPacket & {
  id: string;
  title: string;
  description: string;
  cover: string;
  date_label: string | null;
};

type AlbumPhotoRow = RowDataPacket & {
  album_id: string;
  photo_url: string;
  caption: string | null;
  sort_order: number;
};

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fmtDate(input: string | null): string {
  if (!input) return '1970-01-01';
  return input.replace('T', ' ').slice(0, 19);
}

export async function listPostSlugs(): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT slug FROM posts WHERE status = "published" ORDER BY published_at DESC, slug DESC'
  );
  return rows.map((r) => String(r.slug));
}

export async function getPosts() {
  const rows = await query<PostRow[]>(
    'SELECT slug, title, description, cover, tags_json, body_markdown, published_at FROM posts WHERE status = "published" ORDER BY published_at DESC, slug DESC'
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title || '',
    description: r.description || '',
    cover: r.cover || '',
    tags: parseJsonArray(r.tags_json),
    content: r.body_markdown || '',
    date: fmtDate(r.published_at),
  }));
}

export async function getPostBySlug(slug: string) {
  const rows = await query<PostRow[]>(
    'SELECT slug, title, description, cover, tags_json, body_markdown, published_at FROM posts WHERE slug = :slug LIMIT 1',
    { slug }
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    slug: r.slug,
    title: r.title || '',
    description: r.description || '',
    cover: r.cover || '',
    tags: parseJsonArray(r.tags_json),
    content: r.body_markdown || '',
    date: fmtDate(r.published_at),
  };
}

export async function getRecentPosts(currentSlug: string, limit = 3) {
  const rows = await query<PostRow[]>(
    'SELECT slug, title, published_at FROM posts WHERE status = "published" AND slug <> :slug ORDER BY published_at DESC, slug DESC LIMIT :limit',
    { slug: currentSlug, limit }
  );
  return rows.map((r) => ({ slug: r.slug, title: r.title || '无标题', date: fmtDate(r.published_at) }));
}

export async function listChatterSlugs(): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(
    'SELECT slug FROM chatters WHERE status = "published" ORDER BY published_at DESC, slug DESC'
  );
  return rows.map((r) => String(r.slug));
}

export async function getChatters() {
  const rows = await query<ChatterRow[]>(
    'SELECT slug, title, mood, cover, tags_json, body_markdown, published_at FROM chatters WHERE status = "published" ORDER BY published_at DESC, slug DESC'
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title || '',
    mood: r.mood || '',
    cover: r.cover || '',
    tags: parseJsonArray(r.tags_json),
    content: r.body_markdown || '',
    date: fmtDate(r.published_at),
  }));
}

export async function getChatterBySlug(slug: string) {
  const rows = await query<ChatterRow[]>(
    'SELECT slug, title, mood, cover, tags_json, body_markdown, published_at FROM chatters WHERE slug = :slug LIMIT 1',
    { slug }
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    slug: r.slug,
    title: r.title || '',
    mood: r.mood || '',
    cover: r.cover || '',
    tags: parseJsonArray(r.tags_json),
    content: r.body_markdown || '',
    date: fmtDate(r.published_at),
  };
}

export async function getRecentChatters(currentSlug: string, limit = 3) {
  const rows = await query<ChatterRow[]>(
    'SELECT slug, title, published_at FROM chatters WHERE status = "published" AND slug <> :slug ORDER BY published_at DESC, slug DESC LIMIT :limit',
    { slug: currentSlug, limit }
  );
  return rows.map((r) => ({ slug: r.slug, title: r.title || '碎片记录', date: fmtDate(r.published_at) }));
}

export async function getMoments() {
  const rows = await query<MomentRow[]>(
    'SELECT id, content, location, images_json, published_at FROM moments WHERE status = "published" ORDER BY published_at DESC, id DESC'
  );
  return rows.map((r) => ({
    id: r.id,
    content: r.content || '',
    location: r.location || '',
    images: parseJsonArray(r.images_json),
    date: r.published_at || new Date(0).toISOString(),
  }));
}

export async function getFriends() {
  const rows = await query<FriendRow[]>(
    'SELECT id, name, url, description, avatar, theme_color FROM friends ORDER BY sort_order ASC, id ASC'
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    description: r.description || '',
    avatar: r.avatar || '',
    themeColor: r.theme_color || '#6366f1',
  }));
}

export async function getProjects() {
  const rows = await query<ProjectRow[]>(
    'SELECT id, name, description, icon, github_url, tags_json FROM projects ORDER BY sort_order ASC, id ASC'
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    icon: r.icon || '🚀',
    githubUrl: r.github_url || '',
    tags: parseJsonArray(r.tags_json),
  }));
}

export async function getAlbums() {
  const albums = await query<AlbumRow[]>(
    'SELECT id, title, description, cover, date_label FROM albums ORDER BY sort_order ASC, id ASC'
  );
  const photos = await query<AlbumPhotoRow[]>(
    'SELECT album_id, photo_url, caption, sort_order FROM album_photos ORDER BY album_id ASC, sort_order ASC, id ASC'
  );
  const byAlbum = new Map<string, { url: string; caption?: string }[]>();
  photos.forEach((p) => {
    const list = byAlbum.get(p.album_id) || [];
    list.push({ url: p.photo_url, caption: p.caption || undefined });
    byAlbum.set(p.album_id, list);
  });
  return albums.map((a) => ({
    id: a.id,
    title: a.title || '',
    description: a.description || '',
    cover: a.cover || '',
    date: a.date_label || '',
    photos: byAlbum.get(a.id) || [],
  }));
}

export async function getSiteSetting(key: string): Promise<string | null> {
  const rows = await query<RowDataPacket[]>(
    'SELECT value_text FROM site_settings WHERE setting_key = :key LIMIT 1',
    { key }
  );
  return rows[0]?.value_text ?? null;
}

export async function updateSiteSettings(updates: Record<string, unknown>) {
  for (const [key, value] of Object.entries(updates || {})) {
    await query<RowDataPacket[]>(
      `INSERT INTO site_settings (setting_key, value_text)
       VALUES (:setting_key, :value_text)
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), updated_at = NOW()`,
      {
        setting_key: key,
        value_text: typeof value === 'string' ? value : JSON.stringify(value),
      }
    );
  }
}
