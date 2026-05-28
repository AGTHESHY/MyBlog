import { NextResponse } from 'next/server';
import { getProjects } from '../../../../lib/content-store';

export async function GET() {
  const data = await getProjects();
  return NextResponse.json({ success: true, data });
}
