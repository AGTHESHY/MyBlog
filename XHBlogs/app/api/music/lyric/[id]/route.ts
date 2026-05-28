import { NextResponse } from 'next/server';
import {
  describeInvalidMusicId,
  fetchNeteaseSongLyric,
  normalizeNeteaseSongId,
} from '../../../../../lib/netease-music';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: raw } = await context.params;
  const id = normalizeNeteaseSongId(raw || '');
  if (!id) {
    return NextResponse.json(
      { success: false, message: describeInvalidMusicId(raw || '') },
      { status: 400 }
    );
  }

  try {
    const lrc = await fetchNeteaseSongLyric(id);
    if (!lrc) {
      return NextResponse.json({ success: false, message: '暂无歌词' }, { status: 404 });
    }
    return new NextResponse(lrc, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '歌词服务异常';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
