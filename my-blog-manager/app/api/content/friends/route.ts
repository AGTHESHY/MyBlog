import { NextResponse } from 'next/server';
import { getFriends } from '../../../../lib/content-store';

export async function GET() {
  const data = await getFriends();
  return NextResponse.json({ success: true, data });
}
