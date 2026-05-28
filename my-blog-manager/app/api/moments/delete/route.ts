import { NextRequest, NextResponse } from 'next/server';
import { deleteMoment } from '../../../../lib/content-store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ success: false, message: 'missing id' }, { status: 400 });
  await deleteMoment(String(body.id));
  return NextResponse.json({ success: true });
}
