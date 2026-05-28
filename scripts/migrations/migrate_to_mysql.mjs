import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import mysql from 'mysql2/promise';

const root = path.resolve(process.cwd(), '..');
const dryRun = process.argv.includes('--dry-run');

const pool = mysql.createPool(
  process.env.DATABASE_URL || {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'xhblogs',
    namedPlaceholders: true,
    charset: 'utf8mb4',
  }
);

function readMdItems(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const fullPath = path.join(dir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(raw);
      return { file, data, content };
    });
}

function extractJsonArray(tsText, exportName) {
  const marker = `export const ${exportName}`;
  const idx = tsText.indexOf(marker);
  if (idx < 0) return [];
  const start = tsText.indexOf('[', idx);
  const end = tsText.lastIndexOf('];');
  if (start < 0 || end < 0) return [];
  const raw = tsText.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function upsert(sql, params) {
  if (dryRun) return;
  await pool.query(sql, params);
}

async function main() {
  const targetDir = path.join(root, 'XHBlogs');
  const posts = readMdItems(path.join(targetDir, 'posts'));
  const chatters = readMdItems(path.join(targetDir, 'chatters'));
  const moments = readMdItems(path.join(targetDir, 'moments'));

  const albumsTs = fs.readFileSync(path.join(targetDir, 'data', 'albums.ts'), 'utf8');
  const friendsTs = fs.readFileSync(path.join(targetDir, 'data', 'friends.ts'), 'utf8');
  const projectsTs = fs.readFileSync(path.join(targetDir, 'data', 'projects.ts'), 'utf8');

  const albums = extractJsonArray(albumsTs, 'albums');
  const friends = extractJsonArray(friendsTs, 'friendsData');
  const projects = extractJsonArray(projectsTs, 'projectsData');

  let ok = 0;
  let fail = 0;

  for (const p of posts) {
    const slug = p.file.replace(/\.md$/, '');
    try {
      await upsert(
        `INSERT INTO posts (slug, title, description, cover, tags_json, body_markdown, published_at, status)
         VALUES (:slug, :title, :description, :cover, :tags_json, :body_markdown, :published_at, 'published')
         ON DUPLICATE KEY UPDATE
           title = VALUES(title), description = VALUES(description), cover = VALUES(cover),
           tags_json = VALUES(tags_json), body_markdown = VALUES(body_markdown), published_at = VALUES(published_at),
           updated_at = NOW()`,
        {
          slug,
          title: p.data.title || slug,
          description: p.data.description || '',
          cover: p.data.cover || '',
          tags_json: JSON.stringify(Array.isArray(p.data.tags) ? p.data.tags : []),
          body_markdown: p.content || '',
          published_at: p.data.date || null,
        }
      );
      ok++;
    } catch {
      fail++;
    }
  }

  for (const c of chatters) {
    const slug = c.file.replace(/\.md$/, '');
    try {
      await upsert(
        `INSERT INTO chatters (slug, title, mood, cover, tags_json, body_markdown, published_at, status)
         VALUES (:slug, :title, :mood, :cover, :tags_json, :body_markdown, :published_at, 'published')
         ON DUPLICATE KEY UPDATE
           title = VALUES(title), mood = VALUES(mood), cover = VALUES(cover),
           tags_json = VALUES(tags_json), body_markdown = VALUES(body_markdown), published_at = VALUES(published_at),
           updated_at = NOW()`,
        {
          slug,
          title: c.data.title || slug,
          mood: c.data.mood || '',
          cover: c.data.cover || '',
          tags_json: JSON.stringify(Array.isArray(c.data.tags) ? c.data.tags : []),
          body_markdown: c.content || '',
          published_at: c.data.date || null,
        }
      );
      ok++;
    } catch {
      fail++;
    }
  }

  for (const m of moments) {
    const id = String(m.data.id || m.file.replace(/\.md$/, ''));
    try {
      await upsert(
        `INSERT INTO moments (id, content, location, images_json, published_at, status)
         VALUES (:id, :content, :location, :images_json, :published_at, 'published')
         ON DUPLICATE KEY UPDATE
           content = VALUES(content), location = VALUES(location), images_json = VALUES(images_json),
           published_at = VALUES(published_at), updated_at = NOW()`,
        {
          id,
          content: m.content || '',
          location: m.data.location || '',
          images_json: JSON.stringify(Array.isArray(m.data.images) ? m.data.images : []),
          published_at: m.data.date || null,
        }
      );
      ok++;
    } catch {
      fail++;
    }
  }

  for (let i = 0; i < friends.length; i++) {
    const f = friends[i];
    await upsert(
      `INSERT INTO friends (id, name, url, description, avatar, theme_color, sort_order)
       VALUES (:id, :name, :url, :description, :avatar, :theme_color, :sort_order)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), url = VALUES(url), description = VALUES(description),
         avatar = VALUES(avatar), theme_color = VALUES(theme_color), sort_order = VALUES(sort_order),
         updated_at = NOW()`,
      {
        id: f.id,
        name: f.name || '',
        url: f.url || '',
        description: f.description || '',
        avatar: f.avatar || '',
        theme_color: f.themeColor || '#6366f1',
        sort_order: i,
      }
    );
  }

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    await upsert(
      `INSERT INTO projects (id, name, description, icon, github_url, tags_json, sort_order)
       VALUES (:id, :name, :description, :icon, :github_url, :tags_json, :sort_order)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), description = VALUES(description), icon = VALUES(icon),
         github_url = VALUES(github_url), tags_json = VALUES(tags_json), sort_order = VALUES(sort_order),
         updated_at = NOW()`,
      {
        id: p.id,
        name: p.name || '',
        description: p.description || '',
        icon: p.icon || '🚀',
        github_url: p.githubUrl || '',
        tags_json: JSON.stringify(Array.isArray(p.tags) ? p.tags : []),
        sort_order: i,
      }
    );
  }

  for (let i = 0; i < albums.length; i++) {
    const a = albums[i];
    await upsert(
      `INSERT INTO albums (id, title, description, cover, date_label, sort_order)
       VALUES (:id, :title, :description, :cover, :date_label, :sort_order)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title), description = VALUES(description), cover = VALUES(cover),
         date_label = VALUES(date_label), sort_order = VALUES(sort_order), updated_at = NOW()`,
      {
        id: a.id,
        title: a.title || '',
        description: a.description || '',
        cover: a.cover || '',
        date_label: a.date || '',
        sort_order: i,
      }
    );
    if (!dryRun) await pool.query('DELETE FROM album_photos WHERE album_id = :album_id', { album_id: a.id });
    const photos = Array.isArray(a.photos) ? a.photos : [];
    for (let j = 0; j < photos.length; j++) {
      const ph = photos[j];
      await upsert(
        `INSERT INTO album_photos (album_id, photo_url, caption, sort_order)
         VALUES (:album_id, :photo_url, :caption, :sort_order)`,
        {
          album_id: a.id,
          photo_url: ph.url || '',
          caption: ph.caption || '',
          sort_order: j,
        }
      );
    }
  }

  console.log(JSON.stringify({ dryRun, migrated_ok: ok, migrated_fail: fail }, null, 2));
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
