import { NextResponse } from 'next/server';
import { getNeteaseAuthStatus } from '../../../../../../lib/netease-open-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getNeteaseAuthStatus();
  return NextResponse.json({ success: true, data: status });
}
