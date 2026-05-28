import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getNeteaseAuthorizeUrl, isNeteaseOpenApiConfigured } from '../../../../../../lib/netease-open-api';
import { getNeteaseRedirectUri, saveOAuthState } from '../../../../../../lib/netease-user-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isNeteaseOpenApiConfigured()) {
    return NextResponse.json(
      { success: false, message: '请先在 .env 配置 NETEASE_APP_ID / NETEASE_APP_SECRET / NETEASE_PRIVATE_KEY' },
      { status: 400 }
    );
  }

  const redirectUri = getNeteaseRedirectUri(request);
  const state = crypto.randomBytes(16).toString('hex');
  await saveOAuthState(state, Date.now() + 10 * 60_000);

  const url = await getNeteaseAuthorizeUrl(redirectUri, state);
  if (!url) {
    return NextResponse.json({ success: false, message: '无法生成授权登录地址' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      url,
      redirectUri,
      doc: 'https://developer.music.163.com/st/developer/document?docId=1a5fb2c7b30b44609fa81129a8e1908d',
      qrDoc: 'https://developer.music.163.com/st/developer/document?docId=2bb12a93e71a4be0842243b930c2f33c',
      hint: '推荐使用 POST /api/music/netease/auth/qr 扫码登录；本接口为 H5 授权回退',
    },
  });
}
