import { NextRequest, NextResponse } from 'next/server';
import { searchNeteaseSongs } from '../../../../lib/netease-music';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const limitRaw = Number(request.nextUrl.searchParams.get('limit') || '10');
  const limit = Number.isFinite(limitRaw) ? limitRaw : 10;

  if (!q) {
    return NextResponse.json({ success: false, message: '请输入搜索关键词' }, { status: 400 });
  }

  try {
    const songs = await searchNeteaseSongs(q, limit);
    if (songs.length === 0) {
      return NextResponse.json({ success: false, message: '未找到相关歌曲，请换关键词试试' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: songs });
  } catch (error) {
    const message = error instanceof Error ? error.message : '搜索失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
