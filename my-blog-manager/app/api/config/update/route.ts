import { NextRequest, NextResponse } from 'next/server';
import { updateSiteSettings } from '../../../../lib/content-store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  await updateSiteSettings(body.updates || {});
  return NextResponse.json({ success: true, message: 'config updated' });
}
