import { NextResponse } from 'next/server';
import { clearKugouSession, loadKugouSession } from '../../../../../lib/kugou-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await loadKugouSession();
    if (!session) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({
      success: true,
      data: {
        nickname: session.nickname || `酷狗用户 ${session.userid}`,
        pic: session.pic || '',
        userid: session.userid,
        loginAt: session.loginAt,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '读取登录状态失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearKugouSession();
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '退出失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
