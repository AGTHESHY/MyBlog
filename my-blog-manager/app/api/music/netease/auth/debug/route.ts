import { NextResponse } from 'next/server';
import {
  NETEASE_OPENAPI_BASE,
  fetchClientAccessToken,
  getNeteaseOpenConfigHint,
  getNeteasePrivateKeyDiagnostics,
  isNeteaseOpenApiConfigured,
} from '../../../../../../lib/netease-open-api';

export const dynamic = 'force-dynamic';

/** 检查环境变量是否进入进程（不返回密钥内容） */
export async function GET() {
  const appId = process.env.NETEASE_APP_ID?.trim() || '';
  const appSecret = process.env.NETEASE_APP_SECRET?.trim() || '';
  const keyDiag = getNeteasePrivateKeyDiagnostics();
  let clientTokenOk = false;
  let clientTokenMessage: string | undefined;
  if (isNeteaseOpenApiConfigured()) {
    try {
      const token = await fetchClientAccessToken();
      clientTokenOk = !!token;
      clientTokenMessage = token ? '匿名 token 获取成功' : '签名或凭证错误，请检查 AppSecret 与 PKCS8 私钥是否匹配控制台公钥';
    } catch (e) {
      clientTokenMessage = e instanceof Error ? e.message : '获取 token 失败';
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      hasAppId: appId.length > 0,
      hasAppSecret: appSecret.length > 0,
      privateKeyLength: keyDiag.privateKeyLength,
      privateKeySource: keyDiag.privateKeySource,
      envPrivateKeyLength: (process.env.NETEASE_PRIVATE_KEY?.trim() || '').length,
      configured: isNeteaseOpenApiConfigured(),
      clientTokenOk,
      clientTokenMessage,
      apiBase: NETEASE_OPENAPI_BASE,
      authMode: 'cli-anonymous',
      hint: getNeteaseOpenConfigHint(),
      setupDoc:
        'https://developer.music.163.com/st/developer/document?docId=2327e302009c437eb02af48f63d6e514',
      personalDevDoc:
        'https://developer.music.163.com/st/developer/document?docId=3b75ab8e475d41ca93d91ebd4dfd383f',
    },
  });
}
