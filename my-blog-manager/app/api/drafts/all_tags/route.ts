import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { RowDataPacket } from 'mysql2/promise';

function collect(rows: RowDataPacket[]) {
  const set = new Set<string>();
  rows.forEach((r) => {
    if (!r.tags_json) return;
    try {
      const tags = JSON.parse(r.tags_json);
      if (Array.isArray(tags)) tags.forEach((t) => set.add(String(t)));
    } catch {}
  });
  return Array.from(set);
}

export async function GET() {
  const postRows = await query<RowDataPacket[]>('SELECT tags_json FROM posts');
  const chatterRows = await query<RowDataPacket[]>('SELECT tags_json FROM chatters');
  return NextResponse.json({
    success: true,
    postTags: collect(postRows),
    chatterTags: collect(chatterRows),
  });
}
