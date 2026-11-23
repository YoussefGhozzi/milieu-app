import type { TokenStore } from '@milieu/contracts';
import { isWeb } from './config';

/*
 * Où sont gardés les jetons :
 * - jeton d'accès (15 min) : en mémoire seulement, jamais écrit sur le disque ;
 * - jeton de session (30 jours) :
 *   · téléphone : expo-secure-store (Keychain iOS, Keystore Android), chiffré par le système ;
 *   · web : cookie httpOnly posé par l'API (mode cookie), illisible par JavaScript.
 * Le web retient seulement qu'une session existe (`milieu.session` = 1) pour tenter un renouvellement au démarrage.
 */

const REFRESH_KEY = 'milieu.refresh';
const FLAG_KEY = 'milieu.session';

let access: string | null = null;
let refresh: string | null | undefined;

type SecureStoreModule = typeof import('expo-secure-store');
let secure: SecureStoreModule | null = null;
const secureStore = (): SecureStoreModule => (secure ??= require('expo-secure-store') as SecureStoreModule);

const flag = (on: boolean) => {
  if (!isWeb) return;
  try { if (on) window.localStorage.setItem(FLAG_KEY, '1'); else window.localStorage.removeItem(FLAG_KEY); } catch { /* stockage bloqué */ }
};

export const tokenStore: TokenStore = {
  getAccessToken: () => access,
  getRefreshToken: async () => {
    if (isWeb) return null;
    if (refresh === undefined) refresh = await secureStore().getItemAsync(REFRESH_KEY).catch(() => null);
    return refresh;
  },
  save: async (t) => {
    access = t.accessToken;
    flag(true);
    if (!isWeb && t.refreshToken) {
      refresh = t.refreshToken;
      await secureStore().setItemAsync(REFRESH_KEY, t.refreshToken).catch(() => undefined);
    }
  },
  clear: async () => {
    access = null;
    refresh = null;
    flag(false);
    if (!isWeb) await secureStore().deleteItemAsync(REFRESH_KEY).catch(() => undefined);
  },
};

/** Une session a-t-elle été ouverte sur cet appareil (à restaurer au démarrage) ? */
export async function hasStoredSession() {
  if (isWeb) {
    try { return window.localStorage.getItem(FLAG_KEY) === '1'; } catch { return false; }
  }
  return !!(await tokenStore.getRefreshToken());
}
