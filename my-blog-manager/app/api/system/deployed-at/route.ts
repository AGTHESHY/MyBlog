import { NextResponse } from 'next/server';
import { getDeployedAtInfo } from '../../../../lib/deploy-time';

export async function GET() {
  const { deployedAt, source } = await getDeployedAtInfo();
  return NextResponse.json({ success: true, deployedAt, source });
}
