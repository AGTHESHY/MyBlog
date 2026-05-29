import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { toMysqlDatetime } from '../../../../lib/mysql-datetime';

function makeSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || `draft-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type = String(body.type || 'post');
  const published = Boolean(body.published);
  const status = published ? 'published' : 'draft';

  if (type === 'about') {
    await query<RowDataPacket[]>(
      `INSERT INTO site_settings (setting_key, value_text) VALUES ('about_markdown', :value)
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), updated_at = NOW()`,
      { value: body.content || '' }
    );
    if (body.cover) {
      await query<RowDataPacket[]>(
        `INSERT INTO site_settings (setting_key, value_text) VALUES ('about_cover', :value)
         ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), updated_at = NOW()`,
        { value: body.cover || '' }
      );
    }
    revalidatePath('/about');
    return NextResponse.json({ success: true, id: 'about' });
  }

  const slug = body.id || makeSlug(body.title || '');
  if (type === 'chatter') {
    await query<RowDataPacket[]>(
      `INSERT INTO chatters (slug, title, mood, cover, tags_json, body_markdown, published_at, status)
       VALUES (:slug, :title, :mood, :cover, :tags_json, :body_markdown, :published_at, :status)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title), mood = VALUES(mood), cover = VALUES(cover),
         tags_json = VALUES(tags_json), body_markdown = VALUES(body_markdown),
         published_at = VALUES(published_at), status = VALUES(status), updated_at = NOW()`,
      {
        slug,
        title: body.title || slug,
        mood: body.mood || '',
        cover: body.cover || '',
        tags_json: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
        body_markdown: body.content || '',
        published_at: toMysqlDatetime(body.date),
        status,
      }
    );
    return NextResponse.json({ success: true, id: slug });
  }

  await query<RowDataPacket[]>(
    `INSERT INTO posts (slug, title, description, cover, tags_json, body_markdown, published_at, status)
     VALUES (:slug, :title, :description, :cover, :tags_json, :body_markdown, :published_at, :status)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), description = VALUES(description), cover = VALUES(cover),
       tags_json = VALUES(tags_json), body_markdown = VALUES(body_markdown),
       published_at = VALUES(published_at), status = VALUES(status), updated_at = NOW()`,
    {
      slug,
      title: body.title || slug,
      description: body.description || '',
      cover: body.cover || '',
      tags_json: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      body_markdown: body.content || '',
      published_at: toMysqlDatetime(body.date),
      status,
    }
  );
  return NextResponse.json({ success: true, id: slug });
}
