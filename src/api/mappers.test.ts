import type { ApiClassSession, ApiCoach, ApiGym, ApiLedgerEntry, ApiTicket } from '@milieu/contracts';
import { describe, expect, it } from 'vitest';
import { coachFor, disciplineFor, mergeSessions, roomFor, toBooking, toLedgerEntry, toNotification, toStudio } from './mappers';

const coach = { id: 'c1', firstName: 'Yasmine', lastName: 'Ben Ali', photoUrl: null };
const room = { id: 'r1', name: 'Studio Lagree' };
const session = (over: Partial<ApiClassSession> = {}): ApiClassSession => ({
  id: 's1', courseId: 'k1', gymId: 'g1', title: 'Lagree Flow', category: 'lagree', description: 'Megaformer', recurrence: 'weekly',
  startsAt: '2026-12-01T08:00:00.000Z', endsAt: '2026-12-01T08:50:00.000Z', durationMin: 50, capacity: 5, seatsTaken: 2, seatsLeft: 3, full: false,
  tokenCost: 4, status: 'scheduled', started: false, ended: false, room, coach, ...over,
});
const ticket = (over: Partial<ApiTicket> = {}): ApiTicket => ({
  id: 't1', code: 'MLU-ABCD-EFGH', status: 'booked', waitlistPosition: null, tokenCost: 4, qr: 'MLU.t1.sig', createdAt: '2026-11-20T10:00:00.000Z', closedAt: null, clientId: 'u1',
  cancellation: { possible: true, late: false, freeUntil: null },
  session: { id: 's1', courseId: 'k1', title: 'Lagree Flow', category: 'lagree', startsAt: '2026-12-01T08:00:00.000Z', endsAt: '2026-12-01T08:50:00.000Z', durationMin: 50, status: 'scheduled', room, coach },
  ...over,
});
const gym: ApiGym = { id: 'g1', name: 'MILIEU Phosphor', city: 'Tunis', address: 'Phosphor District', timezone: 'Africa/Tunis', cancelHours: 24, tokenPriceMillimes: 10_000, active: true, createdAt: '2026-01-01T00:00:00.000Z', rooms: [{ id: 'r1', name: 'Studio Lagree', active: true }, { id: 'r2', name: 'Ancien studio', active: false }] };
const apiCoach: ApiCoach = { id: 'c1', gymId: 'g1', firstName: 'Yasmine', lastName: 'Ben Ali', bio: 'Coach Lagree', specialties: ['lagree'], photoUrl: null, rating: { avg: 4.5, count: 2, distribution: [0, 0, 0, 1, 1] } };

describe('correspondance API → écrans client', () => {
  it('séance : places prises, catégorie comme discipline, titre du cours affiché', () => {
    const { sessions, extras } = mergeSessions([session()], []);
    expect(sessions[0]).toMatchObject({ id: 's1', disciplineId: 'lagree', coachId: 'c1', roomId: 'r1', capacity: 5, booked: 2, tokenCost: 4 });
    const studio = toStudio(gym, [apiCoach], [session()], sessions, extras);
    const d = disciplineFor(studio, sessions[0]!, extras.get('s1'));
    expect(d).toMatchObject({ id: 'lagree', name: 'Lagree Flow', description: 'Megaformer', tokenCost: 4 });
  });

  it('séance d’un ticket passé (hors calendrier) : visible dans l’historique, sans places affichées', () => {
    const old = ticket({ id: 't0', status: 'attended', session: { ...ticket().session, id: 's0', startsAt: '2026-10-01T08:00:00.000Z' } });
    const { sessions } = mergeSessions([session()], [old]);
    expect(sessions.map((s) => s.id)).toEqual(['s0', 's1']);
    expect(sessions[0]).toMatchObject({ capacity: 0, booked: 0 });
  });

  it('le calendrier (places à jour) l’emporte sur la séance du ticket', () => {
    const { sessions } = mergeSessions([session({ seatsTaken: 4 })], [ticket()]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.booked).toBe(4);
  });

  it('réservation : QR signé et code court ; liste d’attente avec sa position', () => {
    expect(toBooking(ticket())).toMatchObject({ id: 't1', sessionId: 's1', status: 'booked', qr: 'MLU.t1.sig', code: 'MLU-ABCD-EFGH' });
    const w = toBooking(ticket({ status: 'waitlist', waitlistPosition: 2, qr: null }));
    expect(w).toMatchObject({ status: 'waitlist', waitlistPosition: 2 });
    expect(w).not.toHaveProperty('qr');
  });

  it('historique : recharge → achat, débit définitif affiché en négatif', () => {
    const base: ApiLedgerEntry = { id: 'l1', type: 'recharge', amount: 10, settled: 0, reason: null, label: 'Recharge', ticketId: null, rechargeId: 'x', at: '2026-11-20T10:00:00.000Z' };
    expect(toLedgerEntry(base)).toMatchObject({ type: 'purchase', amount: 10 });
    expect(toLedgerEntry({ ...base, type: 'consume', amount: 0, settled: 4, reason: 'attended' })).toMatchObject({ type: 'consume', amount: -4 });
  });

  it('notification : type connu ou « info »', () => {
    const n = { id: 'n1', kind: 'recharge', title: 'Jetons', body: '10', link: null, read: false, createdAt: '2026-11-20T10:00:00.000Z' };
    expect(toNotification(n).kind).toBe('tokens_credited');
    expect(toNotification({ ...n, kind: 'nouveau_type' }).kind).toBe('info');
  });

  it('studio : studios actifs, coachs, pas de packs ; ancien coach et studio retrouvés pour l’historique', () => {
    const gone = ticket({ id: 't9', session: { ...ticket().session, id: 's9', room: { id: 'r9', name: 'Studio fermé' }, coach: { id: 'c9', firstName: 'Ancien', lastName: 'Coach', photoUrl: null } } });
    const { sessions, extras } = mergeSessions([session()], [gone]);
    const studio = toStudio(gym, [apiCoach], [session()], sessions, extras);
    expect(studio.rooms.map((r) => r.name)).toEqual(['Studio Lagree']);
    expect(studio.packs).toEqual([]);
    expect(studio.cancelHours).toBe(24);
    const s9 = sessions.find((s) => s.id === 's9')!;
    expect(coachFor(studio, s9, extras.get('s9'))).toMatchObject({ firstName: 'Ancien' });
    expect(roomFor(studio, s9, extras.get('s9'))).toMatchObject({ name: 'Studio fermé' });
  });

  it('salle sans séance ni coach : studio minimal valide (l’app ne plante pas)', () => {
    const studio = toStudio(undefined, [], [], [], new Map());
    expect(studio.disciplines.length).toBeGreaterThan(0);
    expect(studio.rooms.length).toBeGreaterThan(0);
  });
});
