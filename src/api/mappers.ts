import {
  studio as demoStudio,
  type ApiClassSession, type ApiCoach, type ApiGym, type ApiLedgerEntry, type ApiMe, type ApiNotification, type ApiTicket,
  type AppNotification, type Booking, type ClassSession, type Coach, type Discipline, type LedgerEntry, type Member, type Room, type Studio,
} from '@milieu/contracts';

/*
 * Correspondance « vraie API » → modèle des écrans client (celui de la démo) : les écrans ne changent presque pas.
 * Fonctions pures, testées dans mappers.test.ts.
 */

/** Infos propres à une séance que le modèle de la démo ne porte pas (titre du cours, description). */
export interface SessionExtra { title: string; description: string; coach: ApiClassSession['coach']; roomName: string }

/** Séance d'un ticket (passée ou hors de la période chargée) : capacité inconnue, on n'affiche pas de places. */
type TicketSession = ApiTicket['session'];

export function toClassSession(s: ApiClassSession): ClassSession {
  return {
    id: s.id, disciplineId: s.category, coachId: s.coach.id, roomId: s.room.id, startsAt: s.startsAt, durationMin: s.durationMin,
    capacity: s.capacity, booked: Math.min(s.seatsTaken, s.capacity), tokenCost: s.tokenCost, status: s.status,
  };
}

function fromTicketSession(s: TicketSession, tokenCost: number): ClassSession {
  return {
    id: s.id, disciplineId: s.category, coachId: s.coach.id, roomId: s.room.id, startsAt: s.startsAt, durationMin: s.durationMin,
    capacity: 0, booked: 0, tokenCost, status: s.status === 'cancelled' ? 'cancelled' : 'scheduled',
  };
}

/** Séances du calendrier + séances de mes tickets (pour afficher l'historique), sans doublon. */
export function mergeSessions(calendar: ApiClassSession[], tickets: ApiTicket[]) {
  const sessions = new Map<string, ClassSession>();
  const extras = new Map<string, SessionExtra>();
  for (const t of tickets) {
    sessions.set(t.session.id, fromTicketSession(t.session, t.tokenCost));
    extras.set(t.session.id, { title: t.session.title, description: '', coach: t.session.coach, roomName: t.session.room.name });
  }
  for (const s of calendar) {
    sessions.set(s.id, toClassSession(s));
    extras.set(s.id, { title: s.title, description: s.description, coach: s.coach, roomName: s.room.name });
  }
  return { sessions: [...sessions.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt)), extras };
}

/** Réservation des écrans + code court du ticket (affiché sous le QR, à taper par l'accueil si besoin). */
export function toBooking(t: ApiTicket): Booking & { code: string } {
  return {
    id: t.id, sessionId: t.session.id, status: t.status, createdAt: t.createdAt, code: t.code,
    ...(t.waitlistPosition ? { waitlistPosition: t.waitlistPosition } : {}),
    ...(t.qr ? { qr: t.qr } : {}),
  };
}

const LEDGER_TYPE: Record<ApiLedgerEntry['type'], LedgerEntry['type']> = {
  recharge: 'purchase', bonus: 'bonus', hold: 'hold', release: 'release', consume: 'consume', adjustment: 'adjustment', expire: 'expire',
};
/** Un débit définitif (`consume`) apparaît avec le nombre de jetons débités (déjà retenus à la réservation). */
export const toLedgerEntry = (m: ApiLedgerEntry): LedgerEntry => ({
  id: m.id, at: m.at, type: LEDGER_TYPE[m.type], amount: m.type === 'consume' ? -m.settled : m.amount, label: m.label,
});

const NOTIFICATION_KIND: Record<string, AppNotification['kind']> = {
  recharge: 'tokens_credited', course_cancelled: 'class_cancelled', booking: 'waitlist_promoted', no_show: 'info', late_cancel: 'info',
  check_in: 'info', new_course: 'info', promo: 'info', rating: 'info',
};
export const toNotification = (n: ApiNotification): AppNotification => ({
  id: n.id, at: n.createdAt, kind: NOTIFICATION_KIND[n.kind] ?? 'info', title: n.title, body: n.body, read: n.read,
});

export function toMember(me: ApiMe, lang: Member['lang']): Member {
  return {
    id: me.id, firstName: me.firstName, lastName: me.lastName, email: me.email, phone: me.phone,
    memberSince: me.createdAt.slice(0, 10), lang,
  };
}

/** « Studio » de la salle du client : studios, disciplines présentes au calendrier, coachs. Pas de packs (recharge à l'accueil). */
export function toStudio(gym: ApiGym | undefined, coaches: ApiCoach[], calendar: ApiClassSession[], sessions: ClassSession[], extras: Map<string, SessionExtra>): Studio {
  const categories = [...new Set(sessions.map((s) => s.disciplineId))];
  const known = new Map(demoStudio.disciplines.map((d) => [d.id, d]));
  const disciplines: Discipline[] = (categories.length ? categories : ['lagree']).map((c) => known.get(c) ?? {
    id: c, name: c.replace(/-/g, ' ').replace(/^\w/, (x) => x.toUpperCase()), roomKind: 'multi', tokenCost: 1, durationMin: 50, intensity: 2, description: '',
  });
  const capacityOf = new Map<string, number>();
  for (const s of calendar) capacityOf.set(s.room.id, Math.max(capacityOf.get(s.room.id) ?? 1, s.capacity));
  const rooms: Room[] = (gym?.rooms ?? []).filter((r) => r.active).map((r) => ({ id: r.id, name: r.name, kind: /lagree/i.test(r.name) ? 'lagree' : 'multi', capacity: capacityOf.get(r.id) ?? 1 }));
  const coachList = new Map<string, Coach>(coaches.map((c) => [c.id, { id: c.id, firstName: c.firstName, lastName: c.lastName, bio: c.bio, disciplineIds: c.specialties.length ? c.specialties : ['lagree'] }]));
  // Un ancien coach (désactivé) peut encore apparaître dans l'historique : on le garde pour l'affichage.
  for (const { coach } of extras.values()) {
    if (!coachList.has(coach.id)) coachList.set(coach.id, { id: coach.id, firstName: coach.firstName, lastName: coach.lastName, bio: '', disciplineIds: ['lagree'] });
  }
  for (const s of calendar) if (!rooms.some((x) => x.id === s.room.id)) rooms.push({ id: s.room.id, name: s.room.name, kind: 'multi', capacity: capacityOf.get(s.room.id) ?? 1 });
  return {
    name: gym?.name ?? 'MILIEU', address: gym ? [gym.address, gym.city].filter(Boolean).join(', ') : '', cancelHours: gym?.cancelHours ?? 24,
    rooms: rooms.length ? rooms : [{ id: 'room', name: 'Studio', kind: 'multi', capacity: 1 }], disciplines, coaches: [...coachList.values()], packs: [],
  };
}

/** Discipline affichée pour une séance : celle de la catégorie, avec le vrai titre et la description du cours. */
export function disciplineFor(studio: Studio, session: ClassSession, extra?: SessionExtra): Discipline {
  const base = studio.disciplines.find((d) => d.id === session.disciplineId) ?? demoStudio.disciplines.find((d) => d.id === session.disciplineId) ?? studio.disciplines[0]!;
  return { ...base, name: extra?.title || base.name, description: extra?.description || base.description, tokenCost: session.tokenCost, durationMin: session.durationMin };
}

/** Room et coach d'une séance, même hors de la liste (ticket ancien, studio désactivé). */
export function roomFor(studio: Studio, session: ClassSession, extra?: SessionExtra): Room {
  return studio.rooms.find((r) => r.id === session.roomId) ?? { id: session.roomId, name: extra?.roomName ?? 'Studio', kind: 'multi', capacity: session.capacity || 1 };
}
export function coachFor(studio: Studio, session: ClassSession, extra?: SessionExtra): Coach {
  return studio.coaches.find((c) => c.id === session.coachId)
    ?? { id: session.coachId, firstName: extra?.coach.firstName ?? 'Coach', lastName: extra?.coach.lastName ?? '', bio: '', disciplineIds: ['lagree'] };
}
