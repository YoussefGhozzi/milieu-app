import type {
  Account, Course, Gym, NetworkDb, NetworkNotification, Promotion, Rating, Recurrence, Role, Ticket, TokenMove,
} from '@milieu/contracts';
import {
  aggregateRatings, cancellationPolicy, canRateTicket, checkInTiming, fullName, generateTicketCode, isNoShowDue, METHOD_LABEL,
  occurrences, overlaps, promoLabel, promoState, quoteRecharge as quoteFromPromotions, RECURRENCE_LABEL, sessionKey, TAKES_SEAT,
  formatTnd, type CoachRating, type RechargeQuote,
} from '@milieu/contracts';

/*
 * Les règles pures (récurrences, fenêtre de scan, annulation, absences, devis, évaluations) vivent dans
 * `@milieu/contracts` (dossier domain/) : l'app et l'API appliquent exactement les mêmes. Elles sont réexportées
 * ici pour que les écrans continuent d'importer depuis ce fichier.
 */
export {
  CHECKIN_AFTER_H, CHECKIN_BEFORE_H, DEFAULT_SPAN, formatTnd, fullName, lastDay, METHOD_LABEL, nthOccurrence, occurrenceCount,
  occurrences, promoLabel, promoState, RECURRENCE_LABEL, sessionKey,
} from '@milieu/contracts';
export type { CoachRating, PromoState, RechargeQuote } from '@milieu/contracts';

/*
 * « Backend » local du réseau MILIEU : toutes les règles métier du workflow
 * coach → accueil → client → scan. Chaque fonction de mutation reçoit une copie de la base
 * (`db`), la modifie et lève une `ApiError` lisible si l'action est refusée.
 * Le jour où l'API existe, ces fonctions deviennent des appels HTTP avec les mêmes entrées et sorties.
 */

export class ApiError extends Error {}
const fail = (message: string): never => { throw new ApiError(message); };

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Séances : un cours validé se répète selon sa récurrence             */
/* ------------------------------------------------------------------ */

export interface GymSession {
  key: string;
  course: Course;
  start: Date;
  end: Date;
  /** Places prises (réservées, présentes ou absentes). */
  booked: number;
  left: number;
  coach?: Account;
}

export function seatsTaken(db: NetworkDb, courseId: string, atIso: string) {
  return db.tickets.filter((t) => t.courseId === courseId && t.occurrenceAt === atIso && TAKES_SEAT.includes(t.status)).length;
}

export function listSessions(db: NetworkDb, opts: { gymId: string; from: Date; to: Date; coachId?: string; statuses?: Course['status'][] }): GymSession[] {
  const statuses = opts.statuses ?? ['approved'];
  const out: GymSession[] = [];
  for (const course of db.courses) {
    if (course.gymId !== opts.gymId || !statuses.includes(course.status)) continue;
    if (opts.coachId && course.coachId !== opts.coachId) continue;
    const coach = db.accounts.find((a) => a.id === course.coachId);
    for (const start of occurrences(course, opts.from, opts.to)) {
      const iso = start.toISOString();
      const booked = seatsTaken(db, course.id, iso);
      out.push({
        key: sessionKey(course.id, iso), course, start, end: new Date(start.getTime() + course.durationMin * 60e3),
        booked, left: Math.max(0, course.capacity - booked), coach,
      });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function getSession(db: NetworkDb, courseId: string, atIso: string): GymSession | undefined {
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return undefined;
  const at = new Date(atIso);
  const match = occurrences(course, new Date(at.getTime() - 60e3), new Date(at.getTime() + 60e3)).find((d) => d.getTime() === at.getTime());
  if (!match) return undefined;
  const iso = match.toISOString();
  const booked = seatsTaken(db, course.id, iso);
  return {
    key: sessionKey(course.id, iso), course, start: match, end: new Date(match.getTime() + course.durationMin * 60e3),
    booked, left: Math.max(0, course.capacity - booked), coach: db.accounts.find((a) => a.id === course.coachId),
  };
}

/** Séances validées de la même salle qui se chevauchent avec ce cours (12 prochaines semaines). */
export function roomConflicts(db: NetworkDb, course: Course): GymSession[] {
  const from = new Date(course.startsAt);
  const to = new Date(from.getTime() + 84 * 864e5);
  const mine = occurrences(course, from, to);
  const others = listSessions(db, { gymId: course.gymId, from, to }).filter((s) => s.course.id !== course.id && s.course.room === course.room);
  return others.filter((o) => mine.some((m) => overlaps(m, course.durationMin, o.start, o.end)));
}

/* ------------------------------------------------------------------ */
/* Jetons                                                             */
/* ------------------------------------------------------------------ */

export interface WalletView { available: number; held: number; spent: number; recharged: number; moves: TokenMove[] }

export function walletOf(db: NetworkDb, clientId: string): WalletView {
  const moves = db.moves.filter((m) => m.clientId === clientId).sort((a, b) => b.at.localeCompare(a.at));
  return {
    available: moves.reduce((s, m) => s + m.amount, 0),
    held: db.tickets.filter((t) => t.clientId === clientId && t.status === 'booked').reduce((s, t) => s + t.tokenCost, 0),
    spent: moves.filter((m) => m.type === 'consume').reduce((s, m) => s + (m.settled ?? 0), 0),
    recharged: moves.filter((m) => m.type === 'recharge').reduce((s, m) => s + m.amount, 0),
    moves,
  };
}

/* ------------------------------------------------------------------ */
/* Aides                                                              */
/* ------------------------------------------------------------------ */

const gymOf = (db: NetworkDb, id: string | null) => db.gyms.find((g) => g.id === id) ?? fail('Salle introuvable.');
const accountOf = (db: NetworkDb, id: string) => db.accounts.find((a) => a.id === id) ?? fail('Compte introuvable.');
const courseOf = (db: NetworkDb, id: string) => db.courses.find((c) => c.id === id) ?? fail('Cours introuvable.');
const must = (ok: unknown, message: string) => { if (!ok) fail(message); };
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dmy = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

function notify(db: NetworkDb, accountId: string, kind: NetworkNotification['kind'], title: string, body: string, link?: string) {
  db.notifications.unshift({ id: uid('n'), accountId, at: nowIso(), kind, title, body, read: false, link });
}
const staffOf = (db: NetworkDb, gymId: string) => db.accounts.filter((a) => a.role === 'backoffice' && a.gymId === gymId && a.active);

function move(db: NetworkDb, m: Omit<TokenMove, 'id' | 'at'>) {
  db.moves.push({ id: uid('mv'), at: nowIso(), ...m });
}

const ticketCode = () => generateTicketCode();

/* ------------------------------------------------------------------ */
/* Comptes et salles                                                  */
/* ------------------------------------------------------------------ */

export function login(db: NetworkDb, email: string, password: string): Account {
  const a = db.accounts.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!a || a.password !== password) fail('E-mail ou mot de passe incorrect.');
  if (!a!.active) fail('Ce compte est désactivé. Contactez l’administrateur.');
  return a!;
}

export function createGym(db: NetworkDb, actor: Account, input: { name: string; city: string; address: string; cancelHours: number; rooms: string[]; tokenPriceTnd?: number }): Gym {
  must(actor.role === 'admin', 'Seul l’administrateur peut créer une salle.');
  must(input.name.trim().length >= 2, 'Donnez un nom à la salle.');
  must(input.city.trim().length >= 2, 'Indiquez la ville.');
  const rooms = input.rooms.map((r) => r.trim()).filter(Boolean);
  must(rooms.length > 0, 'Ajoutez au moins un studio.');
  const price = input.tokenPriceTnd ?? 10;
  must(price >= 0.5 && price <= 1000, 'Prix du jeton : entre 0,5 et 1000 DT.');
  const gym: Gym = { id: uid('g'), name: input.name.trim(), city: input.city.trim(), address: input.address.trim(), cancelHours: input.cancelHours || 24, rooms, tokenPriceTnd: price, createdAt: nowIso() };
  db.gyms.push(gym);
  return gym;
}

export interface AccountInput {
  role: Role; gymId: string | null; firstName: string; lastName: string; email: string; phone: string; password: string;
  bio?: string; specialties?: string[];
}

export function createAccount(db: NetworkDb, actor: Account, input: AccountInput): Account {
  if (actor.role === 'admin') must(input.role !== 'admin', 'Un seul administrateur réseau.');
  else if (actor.role === 'backoffice') {
    must(input.role === 'client', 'L’accueil ne peut créer que des comptes clients. Les coachs sont créés par l’administrateur.');
    must(input.gymId === actor.gymId, 'Le client doit appartenir à votre salle.');
  } else fail('Vous ne pouvez pas créer de compte.');
  gymOf(db, input.gymId);
  must(input.firstName.trim().length >= 1, 'Indiquez le prénom.');
  must(/^\S+@\S+\.\S+$/.test(input.email.trim()), 'E-mail invalide.');
  must(!db.accounts.some((a) => a.email.toLowerCase() === input.email.trim().toLowerCase()), 'Cet e-mail est déjà utilisé.');
  must(input.password.length >= 6, 'Mot de passe : 6 caractères minimum.');
  const account: Account = {
    id: uid('u'), role: input.role, gymId: input.gymId, firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(), phone: input.phone.trim(), password: input.password,
    bio: input.bio?.trim() || undefined, specialties: input.specialties?.length ? input.specialties : undefined,
    active: true, createdAt: nowIso(), createdBy: actor.id,
  };
  db.accounts.push(account);
  return account;
}

export function setAccountActive(db: NetworkDb, actor: Account, accountId: string, active: boolean) {
  const target = accountOf(db, accountId);
  must(actor.role === 'admin' || (actor.role === 'backoffice' && target.role === 'client' && target.gymId === actor.gymId), 'Action non autorisée.');
  must(target.id !== actor.id, 'Vous ne pouvez pas désactiver votre propre compte.');
  target.active = active;
}

export function updateProfile(db: NetworkDb, actor: Account, patch: Partial<Pick<Account, 'firstName' | 'lastName' | 'phone' | 'bio' | 'specialties' | 'photoUrl'>>) {
  const me = accountOf(db, actor.id);
  if (patch.photoUrl) must(patch.photoUrl.length < 400_000, 'Photo trop lourde. Choisissez une image plus petite.');
  Object.assign(me, patch);
}

/* ------------------------------------------------------------------ */
/* Cours : proposition par le coach, validation par l'accueil         */
/* ------------------------------------------------------------------ */

export interface CourseInput {
  title: string; category: string; description: string; room: string; startsAt: string;
  durationMin: number; capacity: number; tokenCost: number; recurrence: Recurrence; until: string | null;
}

export function createCourse(db: NetworkDb, actor: Account, input: CourseInput): Course {
  must(actor.role === 'coach', 'Seuls les coachs proposent des cours.');
  const gym = gymOf(db, actor.gymId);
  must(input.title.trim().length >= 2, 'Donnez un titre au cours.');
  must(gym.rooms.includes(input.room), 'Choisissez un studio de la salle.');
  must(new Date(input.startsAt).getTime() > Date.now(), 'La première séance doit être dans le futur.');
  must(input.capacity >= 1 && input.capacity <= 200, 'Nombre de places : entre 1 et 200.');
  must(input.tokenCost >= 1 && input.tokenCost <= 50, 'Prix : entre 1 et 50 jetons.');
  must(input.durationMin >= 15 && input.durationMin <= 240, 'Durée : entre 15 min et 4 h.');
  if (input.recurrence !== 'once') {
    must(!!input.until, 'Choisissez jusqu’à quand le cours se répète.');
    must(new Date(`${input.until}T23:59:59`) > new Date(input.startsAt), 'La date de fin doit suivre la première séance.');
  }
  const course: Course = {
    id: uid('c'), gymId: gym.id, coachId: actor.id, title: input.title.trim(), category: input.category, description: input.description.trim(),
    room: input.room, startsAt: input.startsAt, durationMin: input.durationMin, capacity: input.capacity, tokenCost: input.tokenCost,
    recurrence: input.recurrence, until: input.recurrence === 'once' ? null : input.until, status: 'pending', createdAt: nowIso(),
  };
  db.courses.push(course);
  for (const s of staffOf(db, gym.id)) {
    notify(db, s.id, 'course_submitted', 'Nouvelle demande de cours', `${fullName(actor)} propose « ${course.title} » (${RECURRENCE_LABEL[course.recurrence].toLowerCase()}).`, '/pro/backoffice/requests');
  }
  return course;
}

export function reviewCourse(db: NetworkDb, actor: Account, courseId: string, decision: 'approved' | 'rejected', note?: string) {
  const course = courseOf(db, courseId);
  must(actor.role === 'backoffice' && actor.gymId === course.gymId, 'Seul l’accueil de cette salle peut valider ce cours.');
  must(course.status === 'pending', 'Ce cours a déjà été traité.');
  if (decision === 'rejected') must(!!note?.trim(), 'Indiquez la raison du refus au coach.');
  course.status = decision;
  course.reviewNote = note?.trim() || undefined;
  course.reviewedBy = actor.id;
  course.reviewedAt = nowIso();
  if (decision === 'approved') {
    notify(db, course.coachId, 'course_approved', 'Cours validé 🎉', `« ${course.title} » est validé et visible dans tous les calendriers.`, '/pro/coach/courses');
    for (const c of db.accounts.filter((a) => a.role === 'client' && a.gymId === course.gymId && a.active)) {
      notify(db, c.id, 'new_course', 'Nouveau cours à l’affiche', `« ${course.title} » avec ${fullName(db.accounts.find((a) => a.id === course.coachId))}. Réservez votre place !`, '/club');
    }
  } else {
    notify(db, course.coachId, 'course_rejected', 'Cours refusé', `« ${course.title} » : ${course.reviewNote}`, '/pro/coach/courses');
  }
}

/** Retire un cours : le coach peut retirer sa demande en attente ; l'accueil peut annuler un cours validé (jetons rendus). */
export function cancelCourse(db: NetworkDb, actor: Account, courseId: string) {
  const course = courseOf(db, courseId);
  const isCoach = actor.role === 'coach' && course.coachId === actor.id && course.status === 'pending';
  const isStaff = actor.role === 'backoffice' && actor.gymId === course.gymId && (course.status === 'approved' || course.status === 'pending');
  must(isCoach || isStaff, 'Action non autorisée sur ce cours.');
  course.status = 'cancelled';
  const now = Date.now();
  for (const t of db.tickets.filter((x) => x.courseId === course.id && x.status === 'booked' && new Date(x.occurrenceAt).getTime() > now)) {
    t.status = 'cancelled';
    t.closedAt = nowIso();
    move(db, { gymId: t.gymId, clientId: t.clientId, type: 'release', amount: t.tokenCost, label: `${course.title} (cours annulé par la salle)`, by: actor.id, ticketId: t.id });
    notify(db, t.clientId, 'booking', 'Cours annulé', `« ${course.title} » est annulé. Vos ${t.tokenCost} jetons vous sont rendus.`, '/club');
  }
}

/* ------------------------------------------------------------------ */
/* Réservation, annulation, présence                                  */
/* ------------------------------------------------------------------ */

export function bookSession(db: NetworkDb, actor: Account, courseId: string, atIso: string): Ticket {
  must(actor.role === 'client', 'Seuls les clients réservent.');
  const course = courseOf(db, courseId);
  must(course.status === 'approved', 'Ce cours n’est pas ouvert à la réservation.');
  must(course.gymId === actor.gymId, 'Ce cours appartient à une autre salle.');
  const s = getSession(db, courseId, atIso) ?? fail('Séance introuvable.');
  must(s.start.getTime() > Date.now(), 'Cette séance a déjà commencé.');
  must(!db.tickets.some((t) => t.clientId === actor.id && t.courseId === courseId && t.occurrenceAt === s.start.toISOString() && (t.status === 'booked' || t.status === 'attended')), 'Vous avez déjà une place pour cette séance.');
  must(s.left > 0, 'Plus de place disponible pour cette séance.');
  const wallet = walletOf(db, actor.id);
  if (wallet.available < course.tokenCost) fail(`Solde insuffisant : il vous manque ${course.tokenCost - wallet.available} jeton(s). Rechargez à l’accueil.`);
  const ticket: Ticket = {
    id: uid('t'), gymId: course.gymId, courseId, occurrenceAt: s.start.toISOString(), clientId: actor.id, code: ticketCode(),
    status: 'booked', tokenCost: course.tokenCost, createdAt: nowIso(),
  };
  db.tickets.push(ticket);
  move(db, { gymId: course.gymId, clientId: actor.id, type: 'hold', amount: -course.tokenCost, label: `${course.title} · réservé`, by: actor.id, ticketId: ticket.id });
  return ticket;
}

export function cancelTicket(db: NetworkDb, actor: Account, ticketId: string): { late: boolean; refunded: number } {
  const t = db.tickets.find((x) => x.id === ticketId) ?? fail('Ticket introuvable.');
  must(t.clientId === actor.id || (actor.role === 'backoffice' && actor.gymId === t.gymId), 'Action non autorisée.');
  must(t.status === 'booked', 'Cette réservation n’est plus active.');
  const course = courseOf(db, t.courseId);
  const gym = gymOf(db, t.gymId);
  const policy = cancellationPolicy(t.occurrenceAt, gym.cancelHours);
  must(!policy.started, 'La séance a déjà commencé.');
  const late = policy.late;
  t.status = late ? 'late_cancel' : 'cancelled';
  t.closedAt = nowIso();
  if (late) {
    move(db, { gymId: t.gymId, clientId: t.clientId, type: 'consume', amount: 0, settled: t.tokenCost, reason: 'late_cancel', label: `${course.title} · annulation tardive (moins de ${gym.cancelHours} h)`, by: actor.id, ticketId: t.id });
    return { late: true, refunded: 0 };
  }
  move(db, { gymId: t.gymId, clientId: t.clientId, type: 'release', amount: t.tokenCost, label: `${course.title} · annulé à temps`, by: actor.id, ticketId: t.id });
  return { late: false, refunded: t.tokenCost };
}

/* Présence validable de 12 h avant le début jusqu'à 1 h après la fin de la séance (checkInTiming). */

export interface CheckInResult { ticket: Ticket; client: Account; course: Course }

export function checkIn(db: NetworkDb, actor: Account, rawCode: string): CheckInResult {
  must(actor.role === 'coach' || actor.role === 'backoffice', 'Seuls le coach et l’accueil valident les présences.');
  const code = rawCode.trim().toUpperCase();
  must(code.length > 0, 'Saisissez ou scannez un code.');
  const t = db.tickets.find((x) => x.code === code) ?? fail('Ticket inconnu. Vérifiez le code.');
  must(t.gymId === actor.gymId, 'Ce ticket appartient à une autre salle.');
  const course = courseOf(db, t.courseId);
  if (actor.role === 'coach') must(course.coachId === actor.id, 'Ce ticket concerne le cours d’un autre coach.');
  const client = accountOf(db, t.clientId);
  const start = new Date(t.occurrenceAt);
  if (t.status === 'attended') fail(`Déjà validé${t.closedAt ? ` à ${hhmm(new Date(t.closedAt))}` : ''} : ${fullName(client)} est bien présent(e).`);
  if (t.status === 'cancelled' || t.status === 'late_cancel') fail('Cette réservation a été annulée.');
  if (t.status === 'no_show') fail('Séance terminée : le client a été marqué absent.');
  const timing = checkInTiming(start, course.durationMin);
  if (timing === 'too_early') fail(`Trop tôt : ce ticket est pour ${dmy(start)} à ${hhmm(start)}.`);
  if (timing === 'too_late') fail('Trop tard : la séance est terminée.');
  t.status = 'attended';
  t.closedAt = nowIso();
  t.checkedInBy = actor.id;
  move(db, { gymId: t.gymId, clientId: t.clientId, type: 'consume', amount: 0, settled: t.tokenCost, reason: 'attended', label: `${course.title} · présence validée`, by: actor.id, ticketId: t.id });
  notify(db, client.id, 'check_in', 'Présence validée', `Bon cours ! ${t.tokenCost} jetons débités pour « ${course.title} ». À la fin de la séance, vous pourrez noter votre coach.`, '/club');
  return { ticket: t, client, course };
}

/** Clients réservés qui ne se sont pas présentés : marqués absents, jetons débités. */
export function pendingNoShows(db: NetworkDb, now = Date.now()) {
  return db.tickets.filter((t) => isNoShowDue(t, db.courses.find((c) => c.id === t.courseId)?.durationMin, now));
}

export function sweepNoShows(db: NetworkDb, now = Date.now()): number {
  const list = pendingNoShows(db, now);
  for (const t of list) {
    const course = db.courses.find((c) => c.id === t.courseId);
    t.status = 'no_show';
    t.closedAt = new Date(now).toISOString();
    move(db, { gymId: t.gymId, clientId: t.clientId, type: 'consume', amount: 0, settled: t.tokenCost, reason: 'no_show', label: `${course?.title ?? 'Cours'} · absence sans annulation`, by: null, ticketId: t.id });
    notify(db, t.clientId, 'no_show', 'Absence enregistrée', `Vous n’étiez pas à « ${course?.title ?? 'votre cours'} » et la réservation n’a pas été annulée : ${t.tokenCost} jetons débités.`, '/club');
  }
  return list.length;
}

/* ------------------------------------------------------------------ */
/* Recharge à l'accueil                                               */
/* ------------------------------------------------------------------ */

export function rechargeTokens(db: NetworkDb, actor: Account, clientId: string, amount: number, method: NonNullable<TokenMove['method']>, note?: string): RechargeQuote {
  must(actor.role === 'backoffice', 'Seul l’accueil recharge les jetons.');
  const client = accountOf(db, clientId);
  must(client.role === 'client' && client.gymId === actor.gymId, 'Ce client n’appartient pas à votre salle.');
  must(Number.isInteger(amount) && amount >= 1 && amount <= 500, 'Montant : entre 1 et 500 jetons.');
  const q = quoteRecharge(db, client.gymId!, amount);
  move(db, {
    gymId: client.gymId!, clientId, type: 'recharge', amount, by: actor.id, method, priceTnd: q.total, promoId: q.percentPromo?.id,
    label: `${note?.trim() ? `Recharge accueil · ${note.trim()}` : 'Recharge à l’accueil'} · ${formatTnd(q.total)}${q.percentPromo ? ` (${q.percentPromo.title})` : ''}`,
  });
  if (q.bonus > 0 && q.bonusPromo) {
    move(db, { gymId: client.gymId!, clientId, type: 'bonus', amount: q.bonus, by: actor.id, promoId: q.bonusPromo.id, label: `Jetons offerts · ${q.bonusPromo.title}` });
  }
  notify(db, clientId, 'recharge', 'Jetons crédités',
    `${amount} jetons ajoutés${q.bonus ? ` + ${q.bonus} offerts` : ''} (${METHOD_LABEL[method].toLowerCase()}, ${formatTnd(q.total)}).`, '/club');
  return q;
}

/* ------------------------------------------------------------------ */
/* Tarifs et promotions (administrateur)                              */
/* ------------------------------------------------------------------ */

export const activePromotions = (db: NetworkDb, gymId: string, now = new Date()) =>
  db.promotions.filter((p) => p.gymId === gymId && promoState(p, now) === 'active');

/** Prix d'une recharge dans une salle, avec la meilleure remise et le meilleur bonus applicables. */
export function quoteRecharge(db: NetworkDb, gymId: string, amount: number, now = new Date()): RechargeQuote {
  const gym = gymOf(db, gymId);
  return quoteFromPromotions(gym.tokenPriceTnd, db.promotions.filter((p) => p.gymId === gymId), amount, now);
}

export function setTokenPrice(db: NetworkDb, actor: Account, gymId: string, price: number) {
  must(actor.role === 'admin', 'Seul l’administrateur fixe le prix du jeton.');
  must(Number.isFinite(price) && price >= 0.5 && price <= 1000, 'Prix du jeton : entre 0,5 et 1000 DT.');
  gymOf(db, gymId).tokenPriceTnd = Math.round(price * 1000) / 1000;
}

export interface PromotionInput { gymId: string; title: string; description: string; kind: Promotion['kind']; value: number; minTokens: number; startsOn: string; endsOn: string }

export function createPromotion(db: NetworkDb, actor: Account, input: PromotionInput): Promotion {
  must(actor.role === 'admin', 'Seul l’administrateur crée les promotions.');
  const gym = gymOf(db, input.gymId);
  must(input.title.trim().length >= 2, 'Donnez un titre à la promotion.');
  if (input.kind === 'percent_off') must(input.value >= 1 && input.value <= 90, 'Remise : entre 1 et 90 %.');
  else {
    must(input.value >= 1 && input.value <= 200, 'Bonus : entre 1 et 200 jetons.');
    must(input.minTokens >= 1, 'Indiquez à partir de combien de jetons achetés le bonus s’applique.');
  }
  must(input.endsOn >= input.startsOn, 'La date de fin doit suivre la date de début.');
  const promo: Promotion = {
    id: uid('p'), gymId: gym.id, title: input.title.trim(), description: input.description.trim(), kind: input.kind, value: input.value,
    minTokens: Math.max(0, input.minTokens), startsOn: input.startsOn, endsOn: input.endsOn, active: true, createdAt: nowIso(), createdBy: actor.id,
  };
  db.promotions.push(promo);
  if (promoState(promo) === 'active') {
    for (const c of db.accounts.filter((a) => a.role === 'client' && a.gymId === gym.id && a.active)) {
      notify(db, c.id, 'promo', `Promo : ${promo.title}`, `${promoLabel(promo)} à l’accueil de ${gym.name}, jusqu’au ${new Date(`${promo.endsOn}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`, '/club');
    }
  }
  return promo;
}

export function setPromotionActive(db: NetworkDb, actor: Account, promoId: string, active: boolean) {
  must(actor.role === 'admin', 'Seul l’administrateur gère les promotions.');
  const p = db.promotions.find((x) => x.id === promoId) ?? fail('Promotion introuvable.');
  p.active = active;
}

export function deletePromotion(db: NetworkDb, actor: Account, promoId: string) {
  must(actor.role === 'admin', 'Seul l’administrateur gère les promotions.');
  must(db.promotions.some((x) => x.id === promoId), 'Promotion introuvable.');
  db.promotions = db.promotions.filter((x) => x.id !== promoId);
}

/* ------------------------------------------------------------------ */
/* Évaluations des coachs                                             */
/* ------------------------------------------------------------------ */

const sessionEnd = (db: NetworkDb, t: Ticket) => {
  const c = db.courses.find((x) => x.id === t.courseId);
  return new Date(t.occurrenceAt).getTime() + (c?.durationMin ?? 60) * 60e3;
};

/** Le client peut-il évaluer ce ticket ? (présent, séance terminée, pas encore noté, moins de 30 jours) */
export function canRate(db: NetworkDb, t: Ticket, now = Date.now()) {
  return canRateTicket(t, sessionEnd(db, t), db.ratings.some((r) => r.ticketId === t.id), now);
}

export const ratingsToGive = (db: NetworkDb, clientId: string, now = Date.now()) =>
  db.tickets.filter((t) => t.clientId === clientId && canRate(db, t, now)).sort((a, b) => b.occurrenceAt.localeCompare(a.occurrenceAt));

export function rateSession(db: NetworkDb, actor: Account, ticketId: string, stars: number, comment?: string): Rating {
  const t = db.tickets.find((x) => x.id === ticketId) ?? fail('Séance introuvable.');
  must(t.clientId === actor.id, 'Vous ne pouvez évaluer que vos propres séances.');
  must(t.status === 'attended', 'Seules les séances auxquelles vous avez participé peuvent être évaluées.');
  must(sessionEnd(db, t) <= Date.now(), 'Vous pourrez évaluer la séance une fois terminée.');
  must(!db.ratings.some((r) => r.ticketId === t.id), 'Vous avez déjà évalué cette séance.');
  must(Number.isInteger(stars) && stars >= 1 && stars <= 5, 'Choisissez une note de 1 à 5 étoiles.');
  const course = courseOf(db, t.courseId);
  const text = comment?.trim().slice(0, 500);
  const rating: Rating = {
    id: uid('r'), gymId: t.gymId, coachId: course.coachId, clientId: actor.id, courseId: course.id, ticketId: t.id,
    occurrenceAt: t.occurrenceAt, stars, comment: text || undefined, at: nowIso(),
  };
  db.ratings.push(rating);
  notify(db, course.coachId, 'rating', `Nouvel avis · ${'★'.repeat(stars)}`, `${actor.firstName} a noté « ${course.title} »${text ? ` : « ${text.slice(0, 80)}${text.length > 80 ? '…' : ''} »` : '.'}`, '/pro/coach/profile');
  return rating;
}

/** Note moyenne d'un coach (toutes séances évaluées) et avis écrits les plus récents. */
export function coachRating(db: NetworkDb, coachId: string): CoachRating {
  return aggregateRatings(db.ratings.filter((r) => r.coachId === coachId));
}

export function markAllRead(db: NetworkDb, accountId: string) {
  for (const n of db.notifications) if (n.accountId === accountId) n.read = true;
}
