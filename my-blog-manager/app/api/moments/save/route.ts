import { NextRequest, NextResponse } from 'next/server';
import { saveMoments } from '../../../../lib/content-store';
import { toMysqlDatetime } from '../../../../lib/mysql-datetime';

export async function POST(req: NextRequest) {
  const body = await req.json();
  await saveMoments({
    id: String(body.id),
    date: toMysqlDatetime(body.date),
    content: body.content || '',
    location: body.location || '',
    images: Array.isArray(body.images) ? body.images : [],
  });
  return NextResponse.json({ success: true });
}
