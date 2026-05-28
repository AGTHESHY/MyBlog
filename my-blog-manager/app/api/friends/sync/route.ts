import { NextRequest, NextResponse } from 'next/server';
import { replaceFriends } from '../../../../lib/content-store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  await replaceFriends(Array.isArray(body.friends) ? body.friends : []);
  return NextResponse.json({ success: true, message: 'friends synced' });
}
