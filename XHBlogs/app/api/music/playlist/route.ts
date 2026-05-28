import { NextResponse } from 'next/server';
import { fetchKugouPlaylist } from '../../../../lib/kugou-music';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url')?.trim();
  if (!url) {
    return NextResponse.json({ success: false, message: '请粘贴歌单链接' }, { status: 400 });
  }

  try {
    const playlist = await fetchKugouPlaylist(url);
    return NextResponse.json({ success: true, data: playlist });
  } catch (error) {
    const message = error instanceof Error ? error.message : '导入歌单失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
