import { NextRequest, NextResponse } from 'next/server';
import { fetchKugouUserPlaylistSongs, loadKugouSession } from '../../../../../lib/kugou-auth';
import { getClientIpFromHeaders } from '../../../../../lib/kugou-request';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ success: false, message: '缺少歌单 id' }, { status: 400 });
  }
  try {
    const session = await loadKugouSession();
    if (!session) {
      return NextResponse.json({ success: false, message: '请先扫码登录酷狗账号' }, { status: 401 });
    }
    const result = await fetchKugouUserPlaylistSongs(session, id, getClientIpFromHeaders(req.headers));
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : '获取歌单歌曲失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
