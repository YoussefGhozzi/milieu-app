import { ApiClient, ApiProblem, createMilieuApi, type SessionEndReason } from '@milieu/contracts';
import { QueryClient } from '@tanstack/react-query';
import i18n from '@/i18n';
import { API_URL, isWeb } from './config';
import { tokenStore } from './tokens';

/** Fin de session décidée par le serveur (expirée, fermée ailleurs, compte désactivé) : l'app revient à la connexion. */
const sessionListeners = new Set<(reason: SessionEndReason) => void>();
export const onSessionEnded = (fn: (reason: SessionEndReason) => void) => { sessionListeners.add(fn); return () => { sessionListeners.delete(fn); }; };

export const http = new ApiClient({
  baseUrl: API_URL,
  tokens: tokenStore,
  refreshMode: isWeb ? 'cookie' : 'body',
  lang: () => i18n.language,
  onSessionEnded: (reason) => sessionListeners.forEach((fn) => fn(reason)),
  onContractMismatch: (path, issues) => console.warn(`[api] réponse inattendue pour ${path}`, issues),
});

export const api = createMilieuApi(http);

/** Erreur « normale » (4xx) : inutile de réessayer automatiquement. */
const final = (e: unknown) => e instanceof ApiProblem && e.status >= 400 && e.status < 500;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: (count, e) => count < 2 && !final(e),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
