import { NextRequest, NextResponse } from 'next/server';
import { saveMoments } from '../../../../lib/content-store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  await saveMoments({
    id: String(body.id),
    date: body.date || new Date().toISOString(),
    content: body.content || '',
    location: body.location || '',
    images: Array.isArray(body.images) ? body.images : [],
  });
  return NextResponse.json({ success: true });
}
