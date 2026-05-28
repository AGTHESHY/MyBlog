import { NextResponse } from 'next/server';
import { exchangeNeteaseAuthCode } from '../../../../../../lib/netease-open-api';
import { consumeOAuthState, getNeteaseRedirectUri } from '../../../../../../lib/netease-user-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const origin = reqUrl.origin;
  const settingsUrl = new URL('/settings', origin);
  settingsUrl.searchParams.set('tab', 'music');

  const oauthError = reqUrl.searchParams.get('error');
  const code = reqUrl.searchParams.get('code');
  const state = reqUrl.searchParams.get('state');

  if (oauthError) {
    settingsUrl.searchParams.set('netease', 'denied');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set('netease', 'missing_code');
    return NextResponse.redirect(settingsUrl);
  }

  const stateOk = await consumeOAuthState(state);
  if (!stateOk) {
    settingsUrl.searchParams.set('netease', 'state_invalid');
    return NextResponse.redirect(settingsUrl);
  }

  const redirectUri = getNeteaseRedirectUri(request);
  const { session, message } = await exchangeNeteaseAuthCode(code, redirectUri);

  if (session) {
    settingsUrl.searchParams.set('netease', 'ok');
  } else {
    settingsUrl.searchParams.set('netease', 'fail');
    if (message) settingsUrl.searchParams.set('msg', message.slice(0, 120));
  }

  return NextResponse.redirect(settingsUrl);
}
