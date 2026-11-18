import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { NetworkDbSchema, type Account, type Gym, type NetworkDb } from '@milieu/contracts';
import { useDemo } from '@/demo/DemoProvider';
import { ApiError, createAccount, pendingNoShows, sweepNoShows } from './engine';
import { buildSeed, DEMO_PASSWORD } from './seed';

/*
 * Base de données de démo : le navigateur (localStorage) joue le rôle du serveur.
 * - Toutes les salles, comptes, cours, tickets et jetons sont partagés entre onglets :
 *   ouvrez le coach dans un onglet, l'accueil dans un autre, le client dans un troisième.
 * - La session (« qui est connecté ») est propre à chaque onglet (sessionStorage).
 * Sur téléphone (pas de localStorage), les données vivent en mémoire le temps de la session.
 * TODO(backend) : remplacer load/save par l'API ; les règles sont déjà isolées dans engine.ts.
 */

const DB_KEY = 'milieu.network.v1';
const SESSION_KEY = 'milieu.network.session';
const web = Platform.OS === 'web' && typeof window !== 'undefined';

let memoryDb: NetworkDb | null = null;
let memorySession: string | null = null;

function load(): NetworkDb {
  if (web) {
    try {
      const raw = window.localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = NetworkDbSchema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
      }
    } catch { /* stockage illisible : on repart des données de démo */ }
  } else if (memoryDb) return memoryDb;
  const seed = buildSeed();
  save(seed);
  return seed;
}

function save(db: NetworkDb) {
  memoryDb = db;
  if (!web) return;
  try { window.localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* quota plein ou stockage bloqué */ }
}

const readSession = () => {
  if (!web) return memorySession;
  try { return window.sessionStorage.getItem(SESSION_KEY); } catch { return memorySession; }
};
const writeSession = (id: string | null) => {
  memorySession = id;
  if (!web) return;
  try { if (id) window.sessionStorage.setItem(SESSION_KEY, id); else window.sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
};

const clone = (db: NetworkDb): NetworkDb => JSON.parse(JSON.stringify(db));

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

interface NetworkContextValue {
  db: NetworkDb;
  /** Compte connecté dans l'espace pro (coach, accueil, admin). */
  me: Account | null;
  myGym: Gym | null;
  /** Exécute une mutation du moteur sur une copie de la base, puis enregistre. */
  run: <T>(fn: (draft: NetworkDb) => T) => Result<T>;
  signIn: (account: Account) => void;
  signOut: () => void;
  resetDemo: () => void;
}

const Ctx = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<NetworkDb>(load);
  const [sessionId, setSessionId] = useState<string | null>(readSession);
  const ref = useRef(db);
  ref.current = db;

  const commit = useCallback((next: NetworkDb) => { ref.current = next; save(next); setDb(next); }, []);

  const run = useCallback(<T,>(fn: (draft: NetworkDb) => T): Result<T> => {
    const draft = clone(ref.current);
    try {
      const value = fn(draft);
      commit(draft);
      return { ok: true, value };
    } catch (e) {
      if (e instanceof ApiError) return { ok: false, error: e.message };
      console.error(e);
      return { ok: false, error: 'Une erreur inattendue est survenue.' };
    }
  }, [commit]);

  // Absences : toute réservation non scannée après la fin de la séance est débitée automatiquement.
  useEffect(() => {
    const tick = () => { if (pendingNoShows(ref.current).length) run((d) => sweepNoShows(d)); };
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [run]);

  // Synchronisation entre onglets du navigateur.
  useEffect(() => {
    if (!web) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DB_KEY || !e.newValue) return;
      try {
        const parsed = NetworkDbSchema.safeParse(JSON.parse(e.newValue));
        if (parsed.success) { ref.current = parsed.data; memoryDb = parsed.data; setDb(parsed.data); }
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const me = useMemo(() => db.accounts.find((a) => a.id === sessionId && a.active) ?? null, [db.accounts, sessionId]);
  const myGym = useMemo(() => (me ? db.gyms.find((g) => g.id === me.gymId) ?? null : null), [db.gyms, me]);

  const value = useMemo<NetworkContextValue>(() => ({
    db, me, myGym, run,
    signIn: (a) => { writeSession(a.id); setSessionId(a.id); },
    signOut: () => { writeSession(null); setSessionId(null); },
    resetDemo: () => commit(buildSeed()),
  }), [db, me, myGym, run, commit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNetwork() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNetwork doit être utilisé dans <NetworkProvider>');
  return ctx;
}

/**
 * Pont avec l'app client existante : le membre connecté (DemoProvider) est retrouvé par son e-mail
 * dans le réseau. S'il n'existe pas encore (nouvelle inscription), il est créé dans la première salle.
 */
export function useClientAccount(): { client: Account | null; gym: Gym | null } {
  const { state } = useDemo();
  const { db, run } = useNetwork();
  const email = state.member.email.toLowerCase();
  const client = db.accounts.find((a) => a.role === 'client' && a.email === email) ?? null;

  useEffect(() => {
    if (client || !db.gyms.length) return;
    const admin = db.accounts.find((a) => a.role === 'admin');
    if (!admin) return;
    run((d) => createAccount(d, admin, {
      role: 'client', gymId: d.gyms[0].id, firstName: state.member.firstName, lastName: state.member.lastName,
      email, phone: state.member.phone, password: DEMO_PASSWORD,
    }));
  }, [client, db.gyms, db.accounts, email, run, state.member]);

  return { client, gym: client ? db.gyms.find((g) => g.id === client.gymId) ?? null : null };
}
