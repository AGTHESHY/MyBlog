import { NextRequest, NextResponse } from 'next/server';
import { loadKugouSession } from '../../../../../lib/kugou-auth';
import { fetchKugouSongMeta } from '../../../../../lib/kugou-music';
import {
  fetchOpenApiSongMeta,
  isKugouOpenApiConfigured,
  parseOpenApiStorageId,
} from '../../../../../lib/kugou-openapi';
import { getClientIpFromHeaders } from '../../../../../lib/kugou-request';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ success: false, message: '缺少歌曲 ID' }, { status: 400 });
  }

  try {
    const openSongId = parseOpenApiStorageId(id);
    if (openSongId && isKugouOpenApiConfigured()) {
      const session = await loadKugouSession();
      if (session?.device_id) {
        const data = await fetchOpenApiSongMeta(
          {
            token: session.token,
            userid: session.userid,
            device_id: session.device_id,
            loginAt: session.loginAt,
            source: 'openapi',
          },
          openSongId,
          getClientIpFromHeaders(request.headers)
        );
        if (data) return NextResponse.json({ success: true, data });
      }
    }

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
