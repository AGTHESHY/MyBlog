import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ops = Array.isArray(body.operations) ? body.operations : [];
  for (const op of ops) {
    const payload = op.value || op.payload || {};
    const type = String(payload.type || op.type || 'post').toLowerCase();
    const status = payload.published ? 'published' : 'draft';
    const slug = payload.id || `draft-${Date.now()}`;
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
          title: payload.title || slug,
          mood: payload.mood || '',
          cover: payload.cover || '',
          tags_json: JSON.stringify(Array.isArray(payload.tags) ? payload.tags : []),
          body_markdown: payload.content || '',
          published_at: payload.date || new Date().toISOString(),
          status,
        }
      );
    } else {
      await query<RowDataPacket[]>(
        `INSERT INTO posts (slug, title, description, cover, tags_json, body_markdown, published_at, status)
         VALUES (:slug, :title, :description, :cover, :tags_json, :body_markdown, :published_at, :status)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title), description = VALUES(description), cover = VALUES(cover),
           tags_json = VALUES(tags_json), body_markdown = VALUES(body_markdown),
           published_at = VALUES(published_at), status = VALUES(status), updated_at = NOW()`,
        {
          slug,
          title: payload.title || slug,
          description: payload.description || '',
          cover: payload.cover || '',
          tags_json: JSON.stringify(Array.isArray(payload.tags) ? payload.tags : []),
          body_markdown: payload.content || '',
          published_at: payload.date || new Date().toISOString(),
          status,
        }
      );
    }
  }
  return NextResponse.json({ success: true });
}
