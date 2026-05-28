import { NextResponse } from 'next/server';
import { fetchKugouSongMeta } from '../../../../../lib/kugou-music';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ success: false, message: '缺少歌曲 ID' }, { status: 400 });
  }

  try {
    const data = await fetchKugouSongMeta(id);
    if (!data) {
      return NextResponse.json(
        { success: false, message: '未找到该歌曲，请确认酷狗歌曲 ID' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '酷狗接口请求失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
