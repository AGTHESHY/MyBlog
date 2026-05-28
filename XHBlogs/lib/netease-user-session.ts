import { getSiteSetting, updateSiteSettings } from './content-store';

const SESSION_KEY = 'netease_user_session';

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
