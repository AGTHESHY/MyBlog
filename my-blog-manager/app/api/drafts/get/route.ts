import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { RowDataPacket } from 'mysql2/promise';

function parseTagsJson(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type = body.type as string;
  const id = String(body.id || '');

  if (type === 'post') {
    const rows = await query<RowDataPacket[]>(
      'SELECT slug, title, description, cover, tags_json, body_markdown, published_at FROM posts WHERE slug = :slug LIMIT 1',
      { slug: id }
    );
    if (!rows[0]) return NextResponse.json({ success: false, message: 'not found' });
    const r = rows[0];
    return NextResponse.json({
      success: true,
      draft: {
        id: r.slug,
        type: 'post',
        title: r.title || '',
        description: r.description || '',
        cover: r.cover || '',
        tags: parseTagsJson(r.tags_json),
        content: r.body_markdown || '',
        date: r.published_at || '',
      },
    });
  }

  if (type === 'chatter') {
    const rows = await query<RowDataPacket[]>(
      'SELECT slug, title, mood, cover, tags_json, body_markdown, published_at FROM chatters WHERE slug = :slug LIMIT 1',
      { slug: id }
    );
    if (!rows[0]) return NextResponse.json({ success: false, message: 'not found' });
    const r = rows[0];
    return NextResponse.json({
      success: true,
      draft: {
        id: r.slug,
        type: 'chatter',
        title: r.title || '',
        description: '',
        mood: r.mood || '',
        cover: r.cover || '',
        tags: parseTagsJson(r.tags_json),
        content: r.body_markdown || '',
        date: r.published_at || '',
      },
    });
  }

  if (type === 'about') {
    const rows = await query<RowDataPacket[]>(
      'SELECT setting_key, value_text FROM site_settings WHERE setting_key IN ("about_markdown","about_cover")'
    );
    const map = new Map(rows.map((r) => [String(r.setting_key), r.value_text]));
    return NextResponse.json({
      success: true,
      draft: {
        id: 'about',
        type: 'about',
        title: '关于我',
        cover: map.get('about_cover') || '',
        content: map.get('about_markdown') || '',
      },
    });
  }

  return NextResponse.json({ success: false, message: 'unsupported type' }, { status: 400 });
}
