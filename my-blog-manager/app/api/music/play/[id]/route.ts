import { NextResponse } from 'next/server';
import {
  describeInvalidMusicId,
  fetchNeteaseSongPlayable,
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
    const data = await fetchNeteaseSongPlayable(id);
    if (!data?.src) {
      return NextResponse.json(
        { success: false, message: '无法获取播放地址，请检查开放平台凭证或歌曲 ID' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '音乐服务异常';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
