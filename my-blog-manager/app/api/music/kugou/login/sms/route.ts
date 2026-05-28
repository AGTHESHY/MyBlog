import { NextRequest, NextResponse } from 'next/server';
import { sendKugouSmsCode } from '../../../../../../lib/kugou-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mobile = String(body?.mobile || '').trim();
    if (!mobile) {
      return NextResponse.json({ success: false, message: '请填写手机号' }, { status: 400 });
    }
    const data = await sendKugouSmsCode(mobile);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '发送验证码失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
