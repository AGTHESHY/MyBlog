import { NextResponse } from 'next/server';
import { getAlbums } from '../../../../lib/content-store';

export async function GET() {
  const data = await getAlbums();
  return NextResponse.json({ success: true, data });
}
