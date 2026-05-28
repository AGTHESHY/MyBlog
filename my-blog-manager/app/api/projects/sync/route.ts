import { NextRequest, NextResponse } from 'next/server';
import { replaceProjects } from '../../../../lib/content-store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  await replaceProjects(Array.isArray(body.projects) ? body.projects : []);
  return NextResponse.json({ success: true, message: 'projects synced' });
}
