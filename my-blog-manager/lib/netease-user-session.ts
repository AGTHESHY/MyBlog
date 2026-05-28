import { getSiteSetting, updateSiteSettings } from './content-store';

const SESSION_KEY = 'netease_user_session';
const OAUTH_STATE_KEY = 'netease_oauth_state';

export type NeteaseUserSession = {
  accessToken: string;
  refreshToken?: string;
  expireAt: number;
  openId?: string;
  nickname?: string;
  avatar?: string;
  loginAt: number;
};

export async function loadNeteaseUserSession(): Promise<NeteaseUserSession | null> {
  const raw = await getSiteSetting(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as NeteaseUserSession;
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveNeteaseUserSession(session: NeteaseUserSession) {
  await updateSiteSettings({ [SESSION_KEY]: session });
}

export async function clearNeteaseUserSession() {
  await updateSiteSettings({ [SESSION_KEY]: null });
}

export async function saveOAuthState(state: string, expireAt: number) {
  await updateSiteSettings({ [OAUTH_STATE_KEY]: { state, expireAt } });
}

export async function consumeOAuthState(incoming: string): Promise<boolean> {
  const raw = await getSiteSetting(OAUTH_STATE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { state?: string; expireAt?: number };
    await updateSiteSettings({ [OAUTH_STATE_KEY]: null });
    if (!parsed?.state || parsed.state !== incoming) return false;
    if (typeof parsed.expireAt === 'number' && parsed.expireAt < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function getNeteaseRedirectUri(request?: Request): string {
  const fromEnv = process.env.NETEASE_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  const base = process.env.BLOG_MANAGER_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_BLOG_MANAGER_URL?.trim();
  if (base) return `${base.replace(/\/$/, '')}/api/music/netease/auth/callback`;
  if (request) {
    const url = new URL(request.url);
    return `${url.origin}/api/music/netease/auth/callback`;
  }
  return 'http://localhost:3001/api/music/netease/auth/callback';
}
