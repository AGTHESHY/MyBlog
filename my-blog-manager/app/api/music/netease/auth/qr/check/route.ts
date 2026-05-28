import { NextResponse } from 'next/server';
import { pollOpenApiQrLogin } from '../../../../../../../lib/netease-open-api';
import { clearNeteaseQrPending, loadNeteaseQrPending } from '../../../../../../../lib/netease-user-session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { sessionId?: string; unikey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: '请求体无效' }, { status: 400 });
  }

  const sessionId = String(body.sessionId ?? '').trim();
  const unikey = String(body.unikey ?? '').trim();
  if (!sessionId || !unikey) {
    return NextResponse.json({ success: false, message: '缺少 sessionId 或 unikey' }, { status: 400 });
  }

  const pending = await loadNeteaseQrPending(sessionId);
  if (!pending || pending.unikey !== unikey) {
    return NextResponse.json(
      { success: false, message: '登录会话无效，请重新获取二维码', data: { status: 'error' } },
      { status: 400 }
    );
  }

  if (pending.expiresAt < Date.now()) {
    await clearNeteaseQrPending(sessionId);
    return NextResponse.json({
      success: true,
      data: { status: 'expired', message: '二维码已过期（约 2 分钟），请刷新后重试' },
    });
  }

  const result = await pollOpenApiQrLogin(unikey);

  if (result.status === 'success') {
    await clearNeteaseQrPending(sessionId);
    return NextResponse.json({
      success: true,
      data: {
        status: 'success',
        message: '登录成功',
        user: {
          nickname: result.session?.nickname,
          avatar: result.session?.avatar,
        },
      },
    });
  }

  if (result.status === 'expired') {
    await clearNeteaseQrPending(sessionId);
  }

  return NextResponse.json({
    success: true,
    data: {
      status: result.status,
      message: result.message,
    },
  });
}
