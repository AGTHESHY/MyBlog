import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function POST() {
  const posts = await query<RowDataPacket[]>(
    'SELECT slug, title, body_markdown, updated_at FROM posts WHERE status = "draft" ORDER BY updated_at DESC'
  );
  const chatters = await query<RowDataPacket[]>(
    'SELECT slug, title, body_markdown, updated_at FROM chatters WHERE status = "draft" ORDER BY updated_at DESC'
  );
  const drafts = [
    ...posts.map((p) => ({
      id: p.slug,
      type: 'post',
      title: p.title || p.slug,
      contentPreview: (p.body_markdown || '').slice(0, 100),
      lastModified: new Date(p.updated_at || Date.now()).getTime(),
    })),
    ...chatters.map((c) => ({
      id: c.slug,
      type: 'chatter',
      title: c.title || c.slug,
      contentPreview: (c.body_markdown || '').slice(0, 100),
      lastModified: new Date(c.updated_at || Date.now()).getTime(),
    })),
  ].sort((a, b) => b.lastModified - a.lastModified);

  return NextResponse.json({ success: true, drafts });
}
