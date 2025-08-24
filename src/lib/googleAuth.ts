import { supabase } from './supabase';

declare global {
  interface Window {
    gapi: any;
  }
}

export const handleGoogleCallback = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
    if (error) throw error;
    
    const token = data.session?.provider_token;
    const refreshToken = data.session?.provider_refresh_token;
    
    console.log('[Google provider_token?]', !!token, '[refresh?]', !!refreshToken);
    
    if (token) {
      // Store token securely in session storage
      sessionStorage.setItem('google_access_token', token);
      if (refreshToken) {
        sessionStorage.setItem('google_refresh_token', refreshToken);
      }
      return token;
    }
  } catch (error) {
    console.error('[Google Callback Error]', error);
  }
  return null;
};

export const getStoredGoogleToken = (): string | null => {
  return sessionStorage.getItem('google_access_token');
};

export const clearStoredGoogleToken = (): void => {
  sessionStorage.removeItem('google_access_token');
  sessionStorage.removeItem('google_refresh_token');
};

export const initGoogleAPI = async (): Promise<boolean> => {
  try {
    if (typeof window.gapi === 'undefined') {
      console.error('[Google API] gapi not loaded');
      return false;
    }

    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
        }).then(() => {
          console.log('[Google API] Initialized successfully');
          resolve();
        }).catch(reject);
      });
    });
    
    return true;
  } catch (error) {
    console.error('[Google API Init Error]', error);
    return false;
  }
};

export const setGoogleToken = (token: string): boolean => {
  if (window.gapi?.client) {
    window.gapi.client.setToken({ access_token: token });
    const isSet = !!window.gapi.client.getToken()?.access_token;
    console.log('[Google API] Token set successfully:', isSet);
    return isSet;
  }
  return false;
};
