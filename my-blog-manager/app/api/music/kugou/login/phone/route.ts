import { NextRequest, NextResponse } from 'next/server';
import { loginKugouByPhone } from '../../../../../../lib/kugou-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mobile = String(body?.mobile || '').trim();
    const code = String(body?.code || '').trim();
    const mid = body?.mid ? String(body.mid) : undefined;
    if (!mobile || !code) {
      return NextResponse.json({ success: false, message: '请填写手机号和验证码' }, { status: 400 });
    }
    const data = await loginKugouByPhone(mobile, code, mid);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '登录失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
