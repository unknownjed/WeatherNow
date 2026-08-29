import googleConfig from '../../firebase-applet-config.json';

export interface CalendarUser {
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

let cachedAccessToken: string | null = null;
let cachedUser: CalendarUser | null = null;
let googleScriptPromise: Promise<void> | null = null;
const SESSION_KEY = 'weathernow_google_calendar_session';

interface StoredCalendarSession {
  accessToken: string;
  expiresAt: number;
  user: CalendarUser;
}

function restoreSession(): StoredCalendarSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredCalendarSession;
    if (!session.accessToken || !session.user?.email || session.expiresAt <= Date.now() + 60_000) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
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
  onAuthSuccess?: (user: CalendarUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  loadGoogleIdentity().catch(console.error);
  const restored = restoreSession();
  if (restored) {
    cachedUser = restored.user;
    cachedAccessToken = restored.accessToken;
  }
  if (cachedUser && cachedAccessToken) onAuthSuccess?.(cachedUser, cachedAccessToken);
  else onAuthFailure?.();
  return () => undefined;
};

export const googleSignIn = async (): Promise<{ user: CalendarUser; accessToken: string }> => {
  await loadGoogleIdentity();
  const clientId = googleConfig.oAuthClientId;
  if (!clientId) throw new Error('Google OAuth client ID is missing.');

  const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
      callback: (response: GoogleTokenResponse) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Google authorization failed.'));
          return;
        }
        resolve(response);
      },
      error_callback: (error: { type?: string }) => reject(new Error(error.type || 'Google sign-in popup failed.')),
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
  const token = tokenResponse.access_token!;

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!profileResponse.ok) throw new Error(`Google profile request failed (${profileResponse.status}).`);
  const profile = await profileResponse.json();

  cachedAccessToken = token;
  cachedUser = {
    email: profile.email,
    displayName: profile.name || null,
    photoURL: profile.picture || null,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    accessToken: token,
    expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
    user: cachedUser,
  } satisfies StoredCalendarSession));
  return { user: cachedUser, accessToken: token };
};

export const getAccessToken = async (): Promise<string | null> => cachedAccessToken;

export const logout = async () => {
  const token = cachedAccessToken;
  cachedAccessToken = null;
  cachedUser = null;
  sessionStorage.removeItem(SESSION_KEY);
  if (token && (window as any).google?.accounts?.oauth2) {
    await new Promise<void>((resolve) => (window as any).google.accounts.oauth2.revoke(token, resolve));
  }
};
