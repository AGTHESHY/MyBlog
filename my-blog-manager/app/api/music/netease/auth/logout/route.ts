import { NextResponse } from 'next/server';
import { logoutNeteaseUser } from '../../../../../../lib/netease-open-api';

export const dynamic = 'force-dynamic';

export async function POST() {
  await logoutNeteaseUser();
  return NextResponse.json({ success: true, message: '已退出网易云用户登录' });
}
