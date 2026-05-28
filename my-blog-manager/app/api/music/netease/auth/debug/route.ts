import { NextResponse } from 'next/server';
import {
  getNeteaseOpenConfigHint,
  isNeteaseOpenApiConfigured,
} from '../../../../../../lib/netease-open-api';

export const dynamic = 'force-dynamic';

/** 检查环境变量是否进入进程（不返回密钥内容） */
export async function GET() {
  const appId = process.env.NETEASE_APP_ID?.trim() || '';
  const appSecret = process.env.NETEASE_APP_SECRET?.trim() || '';
  const privateKey = process.env.NETEASE_PRIVATE_KEY?.trim() || '';

  return NextResponse.json({
    success: true,
    data: {
      hasAppId: appId.length > 0,
      hasAppSecret: appSecret.length > 0,
      privateKeyLength: privateKey.length,
      configured: isNeteaseOpenApiConfigured(),
      hint: getNeteaseOpenConfigHint(),
    },
  });
}
