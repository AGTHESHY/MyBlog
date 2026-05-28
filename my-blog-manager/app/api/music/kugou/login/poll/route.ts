import { NextRequest, NextResponse } from 'next/server';
import { pollKugouQrLogin } from '../../../../../../lib/kugou-auth';
import { getClientIpFromHeaders } from '../../../../../../lib/kugou-request';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')?.trim();
  if (!sessionId) {
    return NextResponse.json({ success: false, message: '缺少 sessionId' }, { status: 400 });
  }
  try {
    const data = await pollKugouQrLogin(sessionId, getClientIpFromHeaders(req.headers));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '轮询失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
