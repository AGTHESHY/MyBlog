import { NextRequest, NextResponse } from 'next/server';
import { replaceAlbums } from '../../../../lib/content-store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  await replaceAlbums(Array.isArray(body.albums) ? body.albums : []);
  return NextResponse.json({ success: true, message: 'gallery synced' });
}
