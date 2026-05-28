import { NextResponse } from 'next/server';
import {
  describeInvalidMusicId,
  fetchNeteaseSongMeta,
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
    const data = await fetchNeteaseSongMeta(id);
    if (!data) {
      return NextResponse.json(
        { success: false, message: '未找到该歌曲，可能是 VIP 歌曲或 ID 错误' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '网易云接口请求失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
