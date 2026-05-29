import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { updateSiteSettings } from '../../../../lib/content-store';
import { filterSiteSettingUpdates } from '../../../../lib/runtime-site-config';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const updates = filterSiteSettingUpdates(body.updates || {});
  await updateSiteSettings(updates);
  revalidatePath('/', 'layout');
  revalidatePath('/about');
  return NextResponse.json({ success: true, message: 'config updated' });
}
