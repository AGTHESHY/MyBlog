import { NextRequest, NextResponse } from 'next/server';
import { fetchKugouUserPlaylists, loadKugouSession } from '../../../../../lib/kugou-auth';
import { getClientIpFromHeaders } from '../../../../../lib/kugou-request';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await loadKugouSession();
    if (!session) {
      return NextResponse.json({ success: false, message: '请先扫码登录酷狗账号' }, { status: 401 });
    }
    const playlists = await fetchKugouUserPlaylists(session, getClientIpFromHeaders(req.headers));
    return NextResponse.json({ success: true, data: playlists });
  } catch (e) {
    const message = e instanceof Error ? e.message : '获取歌单列表失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
