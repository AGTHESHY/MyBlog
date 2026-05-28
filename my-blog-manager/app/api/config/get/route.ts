import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function GET() {
  const rows = await query<RowDataPacket[]>('SELECT setting_key, value_text FROM site_settings');
  const data: Record<string, unknown> = {};
  for (const row of rows) {
    const key = String(row.setting_key);
    const raw = row.value_text;
    if (typeof raw !== 'string') {
      data[key] = raw;
      continue;
    }
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return NextResponse.json({ success: true, data });
}
