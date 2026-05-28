import { NextResponse } from 'next/server';
import { searchKugouSongs } from '../../../../lib/kugou-music';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ success: false, message: '请输入搜索关键词' }, { status: 400 });
  }

  try {
    const songs = await searchKugouSongs(q, 20);
    return NextResponse.json({ success: true, data: songs });
  } catch (error) {
    const message = error instanceof Error ? error.message : '搜索失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
