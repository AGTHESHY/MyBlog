import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ success: false, message: 'missing id' }, { status: 400 });

  await query<RowDataPacket[]>('DELETE FROM posts WHERE slug = :id', { id });
  await query<RowDataPacket[]>('DELETE FROM chatters WHERE slug = :id', { id });
  await query<RowDataPacket[]>('DELETE FROM moments WHERE id = :id', { id });
  return NextResponse.json({ success: true });
}
