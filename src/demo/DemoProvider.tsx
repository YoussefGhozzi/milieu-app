import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  buildDemoState, studio, walletTotal,
  type Booking, type ClassSession, type Coach, type DemoState, type Discipline, type Room, type TokenPack,
} from '@milieu/contracts';

/*
 * État de la démo, en mémoire : aucun backend. Les actions ci-dessous ne font que simuler ce que l'API
 * fera en phase 2 (réserver, annuler, acheter), pour que le client vive un parcours complet et cohérent.
 */

type BonusLot = { amount: number; expiresAt: string };
type Hold = { purchased: number; bonus: BonusLot[] };

export interface SessionView { session: ClassSession; discipline: Discipline; coach: Coach; room: Room }

export type BookResult =
  | { kind: 'booked'; bookingId: string }
  | { kind: 'waitlist'; bookingId: string; position: number }
  | { kind: 'insufficient'; missing: number }
  | { kind: 'already'; bookingId: string };

export type PaymentOutcome = 'success' | 'pending' | 'failure';

export interface Store extends DemoState {
  onboarded: boolean;
  loggedIn: boolean;
  holds: Record<string, Hold>;
}

export interface DemoContextValue {
  state: Store;
  studio: typeof studio;
  balance: number;
  unread: number;
  view: (sessionId: string) => SessionView | undefined;
  bookingFor: (sessionId: string) => Booking | undefined;
  finishOnboarding: () => void;
  login: () => void;
  register: (firstName: string, contact: string) => void;
  logout: () => void;
  resetDemo: () => void;
  /** Asynchrone avec la vraie API : toujours attendre le résultat (`await book(id)`). */
  book: (sessionId: string) => BookResult | Promise<BookResult>;
  cancel: (bookingId: string) => { late: boolean; refunded: number } | Promise<{ late: boolean; refunded: number }>;
  simulateSeatFreed: (sessionId: string) => boolean;
  buyPack: (packId: string, outcome: PaymentOutcome) => { tokens: number; balanceAfter: number };
  markAllRead: () => void | Promise<void>;
  updateMember: (patch: Partial<DemoState['member']>) => void | Promise<void>;
  /** Vraie API (EXPO_PUBLIC_DATA_SOURCE=api) : données réelles, pas de simulation. Absent en démo. */
  live?: boolean;
  /** Vraie API : connexion par e-mail et mot de passe (en démo, `login()` suffit). */
  signIn?: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  /** Vraie API : choisir son mot de passe (première connexion) ou le changer. */
  changePassword?: (current: string, next: string) => Promise<void>;
  /** Vraie API : premier chargement en cours. */
  loading?: boolean;
  /** Vraie API : mot de passe temporaire à remplacer avant d'utiliser l'app. */
  mustChangePassword?: boolean;
  /** Vraie API : détail du solde réel. */
  walletDetail?: { available: number; held: number; spent: number; recharged: number; offered: number };
}

export const DemoContext = createContext<DemoContextValue | null>(null);
const nowIso = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function initialStore(): Store {
  return {
    ...buildDemoState(),
    onboarded: false,
    loggedIn: false,
    // Retenues des deux réservations à venir du compte de démo (déjà déduites du solde).
    holds: { 'b-1': { purchased: 4, bonus: [] }, 'b-2': { purchased: 2, bonus: [] } },
  };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Store>(initialStore);

  // Places « en direct » : d'autres membres réservent et annulent pendant la démo.
  useEffect(() => {
    const timer = setInterval(() => {
      setState((s) => {
        const mine = new Set(s.bookings.map((b) => b.sessionId));
        const candidates = s.sessions.filter((x) => new Date(x.startsAt) > new Date() && !mine.has(x.id));
        if (!candidates.length) return s;
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const delta = target.booked >= target.capacity ? -1 : target.booked === 0 ? 1 : Math.random() < 0.6 ? 1 : -1;
        return { ...s, sessions: s.sessions.map((x) => (x.id === target.id ? { ...x, booked: x.booked + delta } : x)) };
      });
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const view = useCallback((sessionId: string): SessionView | undefined => {
    const session = state.sessions.find((x) => x.id === sessionId);
    if (!session) return undefined;
    return {
      session,
      discipline: studio.disciplines.find((d) => d.id === session.disciplineId)!,
      coach: studio.coaches.find((c) => c.id === session.coachId)!,
      room: studio.rooms.find((r) => r.id === session.roomId)!,
    };
  }, [state.sessions]);

  const bookingFor = useCallback((sessionId: string) =>
    state.bookings.find((b) => b.sessionId === sessionId && (b.status === 'booked' || b.status === 'waitlist')), [state.bookings]);

  /** Retient `cost` jetons : bonus qui expirent le plus tôt d'abord, puis jetons achetés. */
  const takeTokens = (s: Store, cost: number): { wallet: Store['wallet']; hold: Hold } => {
    let remaining = cost;
    const bonus = [...s.wallet.bonus].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
    const used: BonusLot[] = [];
    const left: BonusLot[] = [];
    for (const lot of bonus) {
      const take = Math.min(lot.amount, remaining);
      if (take > 0) used.push({ amount: take, expiresAt: lot.expiresAt });
      if (lot.amount - take > 0) left.push({ amount: lot.amount - take, expiresAt: lot.expiresAt });
      remaining -= take;
    }
    return { wallet: { ...s.wallet, bonus: left, purchased: s.wallet.purchased - remaining }, hold: { purchased: remaining, bonus: used } };
  };

  const book = (sessionId: string): BookResult => {
    const existing = bookingFor(sessionId);
    if (existing) return { kind: 'already', bookingId: existing.id };
    const v = view(sessionId);
    if (!v) return { kind: 'insufficient', missing: 0 };
    const balance = walletTotal(state.wallet);
    const full = v.session.booked >= v.session.capacity;
    const id = uid('b');

    if (full) {
      const position = 1 + Math.floor(Math.random() * 3);
      setState((s) => ({
        ...s,
        bookings: [{ id, sessionId, status: 'waitlist', waitlistPosition: position, createdAt: nowIso() }, ...s.bookings],
      }));
      return { kind: 'waitlist', bookingId: id, position };
    }
    if (balance < v.session.tokenCost) return { kind: 'insufficient', missing: v.session.tokenCost - balance };

    setState((s) => {
      const { wallet, hold } = takeTokens(s, v.session.tokenCost);
      return {
        ...s,
        wallet,
        holds: { ...s.holds, [id]: hold },
        sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, booked: x.booked + 1 } : x)),
        bookings: [{ id, sessionId, status: 'booked', qr: `MILIEU-${id}`, createdAt: nowIso() }, ...s.bookings],
        ledger: [{ id: uid('l'), at: nowIso(), type: 'hold', amount: -v.session.tokenCost, label: v.discipline.name }, ...s.ledger],
      };
    });
    return { kind: 'booked', bookingId: id };
  };

  const cancel = (bookingId: string) => {
    const b = state.bookings.find((x) => x.id === bookingId);
    const v = b ? view(b.sessionId) : undefined;
    if (!b || !v) return { late: false, refunded: 0 };
    if (b.status === 'waitlist') {
      setState((s) => ({ ...s, bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, status: 'cancelled', waitlistPosition: undefined } : x)) }));
      return { late: false, refunded: 0 };
    }
    const late = (new Date(v.session.startsAt).getTime() - Date.now()) / 3600e3 < studio.cancelHours;
    const hold = state.holds[bookingId] ?? { purchased: v.session.tokenCost, bonus: [] };
    const refunded = late ? 0 : hold.purchased + hold.bonus.reduce((n, l) => n + l.amount, 0);
    setState((s) => ({
      ...s,
      wallet: late ? s.wallet : { ...s.wallet, purchased: s.wallet.purchased + hold.purchased, bonus: [...s.wallet.bonus, ...hold.bonus] },
      sessions: s.sessions.map((x) => (x.id === b.sessionId ? { ...x, booked: Math.max(0, x.booked - 1) } : x)),
      bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, status: late ? 'late_cancel' : 'cancelled' } : x)),
      ledger: late ? s.ledger : [{ id: uid('l'), at: nowIso(), type: 'release', amount: refunded, label: `${v.discipline.name} (annulation)` }, ...s.ledger],
    }));
    return { late, refunded };
  };

  /** Démo : une place se libère dans un cours où le membre est en liste d'attente → il est promu. */
  const simulateSeatFreed = (sessionId: string) => {
    const b = state.bookings.find((x) => x.sessionId === sessionId && x.status === 'waitlist');
    const v = view(sessionId);
    if (!b || !v || walletTotal(state.wallet) < v.session.tokenCost) return false;
    setState((s) => {
      const { wallet, hold } = takeTokens(s, v.session.tokenCost);
      return {
        ...s,
        wallet,
        holds: { ...s.holds, [b.id]: hold },
        bookings: s.bookings.map((x) => (x.id === b.id ? { ...x, status: 'booked', waitlistPosition: undefined, qr: `MILIEU-${b.id}` } : x)),
        ledger: [{ id: uid('l'), at: nowIso(), type: 'hold', amount: -v.session.tokenCost, label: v.discipline.name }, ...s.ledger],
        notifications: [{ id: uid('n'), at: nowIso(), kind: 'waitlist_promoted', title: 'Une place s’est libérée', body: `Votre place en ${v.discipline.name} est confirmée.`, read: false }, ...s.notifications],
      };
    });
    return true;
  };

  const buyPack = (packId: string, outcome: PaymentOutcome) => {
    const pack = studio.packs.find((p) => p.id === packId) as TokenPack;
    const before = walletTotal(state.wallet);
    if (outcome !== 'success') return { tokens: 0, balanceAfter: before };
    setState((s) => ({
      ...s,
      wallet: { ...s.wallet, purchased: s.wallet.purchased + pack.tokens },
      ledger: [{ id: uid('l'), at: nowIso(), type: 'purchase', amount: pack.tokens, label: `Pack ${pack.name}` }, ...s.ledger],
      notifications: [{ id: uid('n'), at: nowIso(), kind: 'tokens_credited', title: 'Jetons crédités', body: `${pack.tokens} jetons du pack ${pack.name} ajoutés à votre solde.`, read: false }, ...s.notifications],
    }));
    return { tokens: pack.tokens, balanceAfter: before + pack.tokens };
  };

  const value: DemoContextValue = {
    state,
    studio,
    balance: walletTotal(state.wallet),
    unread: state.notifications.filter((n) => !n.read).length,
    view,
    bookingFor,
    finishOnboarding: () => setState((s) => ({ ...s, onboarded: true })),
    login: () => setState((s) => ({ ...s, onboarded: true, loggedIn: true })),
    register: (firstName, contact) => setState((s) => ({
      ...s, onboarded: true, loggedIn: true,
      member: { ...s.member, firstName: firstName || s.member.firstName, email: contact.includes('@') ? contact : s.member.email, phone: contact.includes('@') ? s.member.phone : contact || s.member.phone },
    })),
    logout: () => setState((s) => ({ ...s, loggedIn: false })),
    resetDemo: () => setState(initialStore()),
    book,
    cancel,
    simulateSeatFreed,
    buyPack,
    markAllRead: () => setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    updateMember: (patch) => setState((s) => ({ ...s, member: { ...s.member, ...patch } })),
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo doit être utilisé dans <DemoProvider>');
  return ctx;
}

/** Réservations triées : à venir (la plus proche d'abord) et passées (la plus récente d'abord). */
export function useMyBookings() {
  const { state, view } = useDemo();
  const now = Date.now();
  const rows = state.bookings
    .map((b) => ({ booking: b, v: view(b.sessionId)! }))
    .filter((r) => r.v);
  const upcoming = rows
    .filter((r) => new Date(r.v.session.startsAt).getTime() > now && (r.booking.status === 'booked' || r.booking.status === 'waitlist'))
    .sort((a, b) => a.v.session.startsAt.localeCompare(b.v.session.startsAt));
  const past = rows
    .filter((r) => !upcoming.includes(r))
    .sort((a, b) => b.v.session.startsAt.localeCompare(a.v.session.startsAt));
  return { upcoming, past };
}
