import { NextRequest, NextResponse } from 'next/server';
import { createKugouQrLogin } from '../../../../../../lib/kugou-auth';
import { getClientIpFromHeaders } from '../../../../../../lib/kugou-request';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const data = await createKugouQrLogin(getClientIpFromHeaders(req.headers));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '生成二维码失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
