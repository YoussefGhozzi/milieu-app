import { invalidationsFor, REALTIME_EVENTS, REALTIME_PATH, type RealtimeEvent } from '@milieu/contracts';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { http, queryClient } from './client';
import { REALTIME_URL } from './config';
import { tokenStore } from './tokens';

const KNOWN = new Set<string>(REALTIME_EVENTS);

/**
 * Temps réel : une connexion Socket.IO tant que l'utilisateur est connecté.
 * Chaque événement recharge seulement les données concernées (`invalidationsFor` du contrat).
 * Jeton expiré ou session renouvelée : on obtient un jeton neuf puis on se reconnecte ; au retour de l'app au premier plan,
 * tout est rechargé (des événements ont pu être manqués pendant la veille).
 * Renvoie l'état de la connexion (pour afficher « hors ligne » si besoin).
 */
export function useRealtime(enabled: boolean) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const socket = io(REALTIME_URL, {
      path: REALTIME_PATH,
      transports: ['websocket'],
      // Le jeton est relu à chaque (re)connexion : toujours le plus récent.
      auth: (cb) => cb({ token: tokenStore.getAccessToken() as string | null }),
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 15_000,
    });
    socketRef.current = socket;

    const renew = async () => {
      if (stopped) return;
      if (await http.refresh().catch(() => false)) socket.connect();
    };
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err: Error & { data?: { code?: string } }) => {
      const code = err.data?.code ?? err.message;
      if (code === 'AUTH_EXPIRED' || code === 'AUTH_REQUIRED') void renew();
    });
    socket.on('session.revoked', (p: { reason?: string }) => { if (p?.reason === 'expired') void renew(); });
    socket.onAny((event: string, payload: unknown) => {
      if (!KNOWN.has(event)) return;
      for (const key of invalidationsFor(event as RealtimeEvent, payload as never)) void queryClient.invalidateQueries({ queryKey: [...key] });
    });

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void queryClient.invalidateQueries();
      if (!socket.connected) socket.connect();
    });
    return () => {
      stopped = true;
      sub.remove();
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  return { connected, socket: socketRef };
}
