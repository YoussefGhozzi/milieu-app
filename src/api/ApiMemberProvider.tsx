import { ApiProblem, queryKeys, type Lang } from '@milieu/contracts';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DemoContext, type BookResult, type DemoContextValue, type SessionView, type Store } from '@/demo/DemoProvider';
import i18n from '@/i18n';
import { api, http, onSessionEnded, queryClient } from './client';
import { isWeb } from './config';
import { coachFor, disciplineFor, mergeSessions, roomFor, toBooking, toLedgerEntry, toMember, toNotification, toStudio } from './mappers';
import { useRealtime } from './realtime';
import { hasStoredSession, tokenStore } from './tokens';

/*
 * L'app client branchée sur la vraie API (EXPO_PUBLIC_DATA_SOURCE=api), avec la même interface `useDemo()` que la démo :
 * les écrans restent les mêmes, seules les données et les actions changent.
 */

type Status = 'booting' | 'anonymous' | 'authed';
const DAY = 864e5;
const ONBOARD_KEY = 'milieu.onboarded';

const readOnboarded = () => { if (!isWeb) return false; try { return window.localStorage.getItem(ONBOARD_KEY) === '1'; } catch { return false; } };
const writeOnboarded = () => { if (!isWeb) return; try { window.localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* stockage bloqué */ } };

/** Compte coach, accueil ou admin : ils utilisent l'app MILIEU Staff. */
const staffAccount = () => new ApiProblem(403, 'STAFF_ACCOUNT', 'Ce compte est un compte de l’équipe : utilisez l’app MILIEU Staff.');

export function ApiMemberProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Member>{children}</Member>
    </QueryClientProvider>
  );
}

function Member({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('booting');
  const [mustChange, setMustChange] = useState(false);
  const [onboarded, setOnboarded] = useState(readOnboarded);
  const authed = status === 'authed' && !mustChange;

  // Démarrage : session restaurée si l'appareil en a une (cookie sur le web, coffre sécurisé sur téléphone).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = (await hasStoredSession()) && (await http.refresh().catch(() => false));
      if (cancelled) return;
      if (ok) {
        const me = await api.me.get().catch(() => null);
        if (me?.role === 'client') { setMustChange(me.mustChangePassword); setStatus('authed'); return; }
        await tokenStore.clear();
      }
      setStatus('anonymous');
    })();
    return () => { cancelled = true; };
  }, []);

  // Session terminée par le serveur (expirée, fermée ailleurs, compte désactivé) : retour à la connexion, cache vidé.
  useEffect(() => onSessionEnded(() => { queryClient.clear(); setMustChange(false); setStatus('anonymous'); }), []);

  useRealtime(authed);

  const q = <T,>(key: readonly unknown[], fn: () => Promise<T>) => ({ queryKey: [...key], queryFn: fn, enabled: authed });
  const meQ = useQuery(q(queryKeys.me, () => api.me.get()));
  const gymsQ = useQuery(q(queryKeys.gyms, () => api.gyms.list()));
  const calendarQ = useQuery({ ...q(queryKeys.sessions, () => api.sessions.list({ from: new Date(Date.now() - DAY).toISOString(), to: new Date(Date.now() + 21 * DAY).toISOString() })), refetchInterval: 60_000 });
  const coachesQ = useQuery(q(queryKeys.coaches, () => api.coaches.list()));
  const ticketsQ = useQuery(q(queryKeys.myTickets, () => api.me.tickets({ scope: 'all', limit: 100 })));
  const walletQ = useQuery(q(queryKeys.myWallet, () => api.me.wallet()));
  const ledgerQ = useQuery(q(queryKeys.myLedger, () => api.me.ledger({ limit: 100 })));
  const notesQ = useQuery(q(queryKeys.notifications, () => api.me.notifications({ limit: 50 })));

  const derived = useMemo(() => {
    const calendar = calendarQ.data?.items ?? [];
    const tickets = ticketsQ.data?.items ?? [];
    const { sessions, extras } = mergeSessions(calendar, tickets);
    const studio = toStudio(gymsQ.data?.[0], coachesQ.data?.items ?? [], calendar, sessions, extras);
    return { sessions, extras, studio, tickets };
  }, [calendarQ.data, ticketsQ.data, gymsQ.data, coachesQ.data]);

  const lang = (['fr', 'en', 'ar'].includes(i18n.language) ? i18n.language : 'fr') as Lang;
  const available = walletQ.data?.available ?? 0;

  const state: Store = useMemo(() => ({
    member: meQ.data ? toMember(meQ.data, lang) : { id: '', firstName: '', lastName: '', email: 'client@milieu.tn', phone: '', memberSince: new Date().toISOString().slice(0, 10), lang },
    wallet: { purchased: available, bonus: [], reward: 0 },
    ledger: (ledgerQ.data?.items ?? []).map(toLedgerEntry),
    bookings: derived.tickets.map(toBooking),
    sessions: derived.sessions,
    notifications: (notesQ.data?.items ?? []).map(toNotification),
    onboarded: onboarded || status === 'authed',
    loggedIn: authed,
    holds: {},
  }), [meQ.data, lang, available, ledgerQ.data, derived, notesQ.data, onboarded, status, authed]);

  const view = useCallback((sessionId: string): SessionView | undefined => {
    const session = derived.sessions.find((s) => s.id === sessionId);
    if (!session) return undefined;
    const extra = derived.extras.get(sessionId);
    return { session, discipline: disciplineFor(derived.studio, session, extra), coach: coachFor(derived.studio, session, extra), room: roomFor(derived.studio, session, extra) };
  }, [derived]);

  const bookingFor = useCallback((sessionId: string) =>
    state.bookings.find((b) => b.sessionId === sessionId && (b.status === 'booked' || b.status === 'waitlist')), [state.bookings]);

  /** Après une action : recharger ce qui a changé (le temps réel le fait aussi, ceci rend l'écran juste tout de suite). */
  const refreshAfter = (...keys: (readonly unknown[])[]) => Promise.all(keys.map((k) => queryClient.invalidateQueries({ queryKey: [...k] })));

  const book = async (sessionId: string): Promise<BookResult> => {
    const existing = bookingFor(sessionId);
    if (existing) return { kind: 'already', bookingId: existing.id };
    const s = derived.sessions.find((x) => x.id === sessionId);
    const full = !!s && s.capacity > 0 && s.booked >= s.capacity;
    try {
      const t = await api.sessions.book(sessionId, { waitlist: full });
      await refreshAfter(queryKeys.myTickets, queryKeys.myWallet, queryKeys.myLedger, queryKeys.sessions);
      return t.status === 'waitlist' ? { kind: 'waitlist', bookingId: t.id, position: t.waitlistPosition ?? 1 } : { kind: 'booked', bookingId: t.id };
    } catch (e) {
      if (e instanceof ApiProblem) {
        if (e.code === 'WALLET_INSUFFICIENT') return { kind: 'insufficient', missing: Number(e.extra.missing ?? 0) };
        if (e.code === 'BOOKING_DUPLICATE' && typeof e.extra.ticketId === 'string') return { kind: 'already', bookingId: e.extra.ticketId };
        // Complet entre-temps : liste d'attente proposée par l'écran (les places se mettent à jour en direct).
        if (e.code === 'BOOKING_SESSION_FULL') await refreshAfter(queryKeys.sessions);
      }
      throw e;
    }
  };

  const cancel = async (bookingId: string) => {
    const r = await api.tickets.cancel(bookingId);
    await refreshAfter(queryKeys.myTickets, queryKeys.myWallet, queryKeys.myLedger, queryKeys.sessions);
    return { late: r.late, refunded: r.refunded };
  };

  const signIn = async (email: string, password: string) => {
    const session = await api.auth.login(email.trim(), password);
    if (session.account.role !== 'client') {
      await api.auth.logout(session.refreshToken).catch(() => undefined);
      throw staffAccount();
    }
    await tokenStore.save(session);
    queryClient.clear();
    setMustChange(session.account.mustChangePassword);
    setStatus('authed');
    writeOnboarded();
    setOnboarded(true);
    return { mustChangePassword: session.account.mustChangePassword };
  };

  const changePassword = async (current: string, next: string) => {
    const session = await api.auth.changePassword(current, next);
    await tokenStore.save(session);
    setMustChange(false);
    await refreshAfter(queryKeys.me);
  };

  const logout = () => {
    void (async () => {
      const refreshToken = await tokenStore.getRefreshToken();
      await api.auth.logout(refreshToken ?? undefined).catch(() => undefined);
      await tokenStore.clear();
      queryClient.clear();
      setStatus('anonymous');
    })();
  };

  const value: DemoContextValue = {
    state,
    studio: derived.studio,
    balance: available,
    unread: notesQ.data?.unread ?? 0,
    view,
    bookingFor,
    finishOnboarding: () => { writeOnboarded(); setOnboarded(true); },
    // En mode API, la connexion passe par `signIn` (e-mail + mot de passe) ; l'inscription se fait à l'accueil.
    login: () => undefined,
    register: () => undefined,
    logout,
    resetDemo: () => undefined,
    book,
    cancel,
    simulateSeatFreed: () => false,
    buyPack: () => ({ tokens: 0, balanceAfter: available }),
    markAllRead: async () => { await api.me.readAllNotifications(); await refreshAfter(queryKeys.notifications); },
    updateMember: async (patch) => {
      await api.me.update({ firstName: patch.firstName, lastName: patch.lastName, phone: patch.phone });
      await refreshAfter(queryKeys.me);
    },
    live: true,
    signIn,
    changePassword,
    loading: status === 'booting' || (authed && (meQ.isPending || walletQ.isPending)),
    mustChangePassword: status === 'authed' && mustChange,
    walletDetail: walletQ.data,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
