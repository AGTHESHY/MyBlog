import { NextResponse } from 'next/server';
import { getCloudMusicIds } from '../../../../lib/site-music';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ids = await getCloudMusicIds();
    return NextResponse.json({ success: true, data: { ids } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取播放列表失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
