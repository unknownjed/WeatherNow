import googleConfig from '../../firebase-applet-config.json';

import { CALENDAR_SESSION_KEY, clearCalendarSession, readCalendarSession, saveCalendarSession, validCalendarToken, type CalendarUser, type CalendarSession } from './calendarSession';
export type { CalendarUser } from './calendarSession';

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

const GOOGLE_DRIVE_JOURNAL_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/photoslibrary.appendonly',
  GOOGLE_DRIVE_JOURNAL_SCOPE,
];

export function hasJournalSyncScope(scope = ''): boolean {
  return new Set(scope.split(/\s+/).filter(Boolean)).has(GOOGLE_DRIVE_JOURNAL_SCOPE);
}

let cachedSession: CalendarSession | null = null;
let googleScriptPromise: Promise<void> | null = null;
const authListeners = new Set<() => void>();
const emitAuth = () => authListeners.forEach(listener => listener());

function restoreSession(): CalendarSession | null {
  try { return readCalendarSession(localStorage, sessionStorage); }
  catch { return cachedSession; }
}

function loadGoogleIdentity(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-weathernow-google-identity]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google sign-in could not be loaded.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.weathernowGoogleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export const initAuth = (
  onAuthSuccess?: (user: CalendarUser, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  loadGoogleIdentity().catch(console.error);
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let lastAccountState: string | undefined;
  const update = () => {
    clearTimeout(expiryTimer);
    cachedSession = restoreSession();
    if (!cachedSession) {
      if (lastAccountState !== 'signed-out') onAuthFailure?.();
      lastAccountState = 'signed-out';
      return;
    }
    const validToken = validCalendarToken(cachedSession);
    // Sessions created before journal cloud sync was added do not record the
    // Drive scope. Keep the remembered account, but renew authorization once
    // before exposing a token to Calendar/Journal consumers.
    const token = validToken && hasJournalSyncScope(cachedSession.grantedScopes) ? validToken : null;
    const accountState = JSON.stringify([cachedSession.user, token]);
    if (lastAccountState !== accountState) onAuthSuccess?.(cachedSession.user, token);
    lastAccountState = accountState;
    if (token) {
      expiryTimer = setTimeout(update, Math.min(2_147_483_647, Math.max(1, cachedSession.expiresAt - Date.now() - 60_000)));
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === CALENDAR_SESSION_KEY || event.key === null) update();
  };
  const onVisible = () => { if (document.visibilityState === 'visible') update(); };
  authListeners.add(update);
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', update);
  document.addEventListener('visibilitychange', onVisible);
  update();
  return () => {
    clearTimeout(expiryTimer);
    authListeners.delete(update);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', update);
    document.removeEventListener('visibilitychange', onVisible);
  };
};

export const googleSignIn = async (): Promise<{ user: CalendarUser; accessToken: string }> => {
  await loadGoogleIdentity();
  const clientId = googleConfig.oAuthClientId;
  if (!clientId) throw new Error('Google OAuth client ID is missing.');

  const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
    const remembered = restoreSession();
    let consentAttempted = !remembered;
    let tokenClient: any;
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES.join(' '),
      include_granted_scopes: true,
      callback: (response: GoogleTokenResponse) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Google authorization failed.'));
          return;
        }
        if (!hasJournalSyncScope(response.scope)) {
          if (!consentAttempted) {
            consentAttempted = true;
            tokenClient.requestAccessToken({ prompt: 'consent', hint: remembered?.user.email });
            return;
          }
          reject(new Error('Private Google Drive journal sync permission was not granted. Reconnect your Google account and approve the requested permissions.'));
          return;
        }
        resolve(response);
      },
      error_callback: (error: { type?: string }) => reject(new Error(error.type || 'Google sign-in popup failed.')),
    });
    tokenClient.requestAccessToken({ prompt: remembered ? '' : 'consent', ...(remembered ? { hint: remembered.user.email } : {}) });
  });
  const token = tokenResponse.access_token!;

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!profileResponse.ok) throw new Error(`Google profile request failed (${profileResponse.status}).`);
  const profile = await profileResponse.json();

  const user: CalendarUser = {
    email: profile.email,
    displayName: profile.name || null,
    photoURL: profile.picture || null,
  };
  const session: CalendarSession = {
    accessToken: token,
    expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
    grantedScopes: tokenResponse.scope || '',
    user,
  };
  saveCalendarSession(localStorage, sessionStorage, session);
  cachedSession = session;
  emitAuth();
  return { user, accessToken: token };
};

export const getAccessToken = async (): Promise<string | null> => validCalendarToken(restoreSession());

export const logout = async () => {
  const token = validCalendarToken(cachedSession);
  clearCalendarSession(localStorage, sessionStorage);
  cachedSession = null;

  // App handles the same-tab signed-out UI directly. Do not synchronously emit
  // an auth update here: that used to re-enter App while the logout click was
  // still tearing down Calendar/Journal UI. Other tabs still receive the
  // localStorage change through their normal storage listener.
  if (token && (window as any).google?.accounts?.oauth2) {
    (window as any).google.accounts.oauth2.revoke(token, () => undefined);
  }
};
