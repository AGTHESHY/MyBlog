import { NextResponse } from 'next/server';
import { fetchKugouSong } from '../../../../../lib/kugou-music';

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
    const song = await fetchKugouSong(id);
    if (!song) {
      return NextResponse.json(
        { success: false, message: '未找到该歌曲，请检查酷狗 ID 或 hash|album_id 格式' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: song });
  } catch (error) {
    const message = error instanceof Error ? error.message : '酷狗接口请求失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
