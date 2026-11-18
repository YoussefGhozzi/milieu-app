import type { Account, Course, Gym, NetworkDb, Ticket, TokenMove } from '@milieu/contracts';
import { occurrences } from './engine';

/*
 * Données de démo du réseau MILIEU : 3 salles, un administrateur, un accueil par salle,
 * des coachs, des clients, des cours (validés, en attente, refusé) et quelques tickets.
 * Tout est calculé par rapport à « maintenant » : il y a toujours une séance à scanner dans l'heure.
 * Mot de passe de tous les comptes de démo : milieu2026
 */

export const DEMO_PASSWORD = 'milieu2026';

const iso = (d: Date) => d.toISOString();
const daysFrom = (base: Date, n: number, h: number, m = 0) => { const d = new Date(base); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d; };
const dateOnly = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function buildSeed(now = new Date()): NetworkDb {
  const created = iso(daysFrom(now, -60, 9));
  const acc = (id: string, role: Account['role'], gymId: string | null, firstName: string, lastName: string, email: string, extra: Partial<Account> = {}): Account => ({
    id, role, gymId, firstName, lastName, email, phone: '+216 20 000 000', password: DEMO_PASSWORD, active: true, createdAt: created, createdBy: role === 'admin' ? null : 'u-admin', ...extra,
  });

  const gyms: Gym[] = [
    { id: 'g-phosphor', name: 'MILIEU Phosphor', city: 'Tunis', address: 'Phosphor District, Tunis', cancelHours: 24, rooms: ['Studio Lagree', 'Studio Multi'], tokenPriceTnd: 10, createdAt: created },
    { id: 'g-lac', name: 'MILIEU Lac 2', city: 'Tunis', address: 'Les Berges du Lac 2, Tunis', cancelHours: 24, rooms: ['Studio A', 'Studio B'], tokenPriceTnd: 9.5, createdAt: created },
    { id: 'g-sousse', name: 'MILIEU Sousse', city: 'Sousse', address: 'Boulevard du 14 Janvier, Sousse', cancelHours: 24, rooms: ['Grand studio'], tokenPriceTnd: 8, createdAt: created },
  ];

  const accounts: Account[] = [
    acc('u-admin', 'admin', null, 'Admin', 'Réseau', 'admin@milieu.tn'),
    acc('u-bo-phosphor', 'backoffice', 'g-phosphor', 'Rania', 'Kefi', 'accueil.phosphor@milieu.tn'),
    acc('u-bo-lac', 'backoffice', 'g-lac', 'Walid', 'Sassi', 'accueil.lac@milieu.tn'),
    acc('u-bo-sousse', 'backoffice', 'g-sousse', 'Hiba', 'Mejri', 'accueil.sousse@milieu.tn'),
    acc('u-yasmine', 'coach', 'g-phosphor', 'Yasmine', 'Ben Ali', 'yasmine@milieu.tn', { bio: 'Coach Lagree certifiée à Los Angeles, 6 ans d’expérience. Ancienne danseuse, elle mise sur la précision du mouvement et la respiration. Spécialiste du renforcement profond et de la posture.', specialties: ['lagree', 'mat-pilates'] }),
    acc('u-mehdi', 'coach', 'g-phosphor', 'Mehdi', 'Trabelsi', 'mehdi@milieu.tn', { bio: 'Ancien athlète de l’équipe nationale d’athlétisme, diplômé STAPS. 8 ans de préparation physique : des séances intenses, rythmées et toujours adaptées à votre niveau.', specialties: ['functional', 'hot-sculpt'] }),
    acc('u-ines', 'coach', 'g-lac', 'Inès', 'Mansour', 'ines@milieu.tn', { bio: 'Professeure de Pilates et de mobilité, formée à Londres. Elle accompagne aussi la reprise après blessure.', specialties: ['mat-pilates', 'mobility'] }),
    acc('u-omar', 'coach', 'g-sousse', 'Omar', 'Chaabane', 'omar@milieu.tn', { bio: 'Coach functional et hot sculpt, champion régional de CrossFit. Énergie garantie.', specialties: ['functional', 'hot-sculpt'] }),
    // Nour = le compte de démo de l'app client (même e-mail).
    acc('u-nour', 'client', 'g-phosphor', 'Nour', 'Ben Salem', 'nour@example.com'),
    acc('u-sami', 'client', 'g-phosphor', 'Sami', 'Jlassi', 'sami@example.com'),
    acc('u-leila', 'client', 'g-phosphor', 'Leila', 'Hamdi', 'leila@example.com'),
    acc('u-aziz', 'client', 'g-lac', 'Aziz', 'Karoui', 'aziz@example.com'),
    acc('u-maya', 'client', 'g-sousse', 'Maya', 'Ferchichi', 'maya@example.com'),
  ];

  // Séance « bientôt » : dans 1 h environ (arrondie au quart d'heure), répétée chaque semaine depuis 2 semaines.
  const soon = new Date(now.getTime() + 60 * 60e3);
  soon.setMinutes(Math.ceil(soon.getMinutes() / 15) * 15, 0, 0);
  const soonFirst = new Date(soon); soonFirst.setDate(soonFirst.getDate() - 14);
  const reviewed = iso(daysFrom(now, -16, 11));

  const course = (c: Partial<Course> & Pick<Course, 'id' | 'gymId' | 'coachId' | 'title' | 'category' | 'room' | 'startsAt' | 'recurrence'>): Course => ({
    description: '', durationMin: 50, capacity: 10, tokenCost: 3, until: null, status: 'approved', createdAt: iso(daysFrom(now, -18, 10)),
    reviewedBy: c.status === 'pending' ? undefined : 'u-bo-phosphor', reviewedAt: c.status === 'pending' ? undefined : reviewed, ...c,
  });
  const in3months = dateOnly(daysFrom(now, 90, 0));

  const courses: Course[] = [
    course({ id: 'c-flow', gymId: 'g-phosphor', coachId: 'u-yasmine', title: 'Lagree Flow', category: 'lagree', room: 'Studio Lagree', startsAt: iso(soonFirst), recurrence: 'weekly', until: in3months, capacity: 5, tokenCost: 4,
      description: 'Renforcement lent et intense sur Megaformer. Idéal pour progresser en gainage et en posture.' }),
    course({ id: 'c-sunrise', gymId: 'g-phosphor', coachId: 'u-yasmine', title: 'Mat Pilates Sunrise', category: 'mat-pilates', room: 'Studio Multi', startsAt: iso(daysFrom(now, -13, 7, 30)), recurrence: 'weekly', until: in3months, capacity: 14, tokenCost: 2,
      description: 'Pilates au sol pour bien commencer la journée : respiration, gainage et mobilité.' }),
    course({ id: 'c-hot', gymId: 'g-phosphor', coachId: 'u-mehdi', title: 'Hot Sculpt Express', category: 'hot-sculpt', room: 'Studio Multi', startsAt: iso(daysFrom(now, -10, 18, 30)), recurrence: 'weekly', until: in3months, durationMin: 45, capacity: 12, tokenCost: 3,
      description: 'Sculpt cardio dans une salle chauffée. 45 minutes, poids légers, énergie maximale.' }),
    course({ id: 'c-masterclass', gymId: 'g-phosphor', coachId: 'u-yasmine', title: 'Masterclass Mobilité', category: 'mobility', room: 'Studio Multi', startsAt: iso(daysFrom(now, 3, 10)), recurrence: 'once', durationMin: 90, capacity: 20, tokenCost: 5,
      reviewedAt: iso(daysFrom(now, -1, 15)), description: 'Une séance exceptionnelle de 90 minutes pour libérer hanches, dos et épaules.' }),
    course({ id: 'c-power', gymId: 'g-phosphor', coachId: 'u-mehdi', title: 'Functional Power', category: 'functional', room: 'Studio Multi', startsAt: iso(daysFrom(now, 2, 12, 30)), recurrence: 'weekly', until: in3months, capacity: 10, tokenCost: 3, status: 'pending', createdAt: iso(daysFrom(now, 0, 8)),
      description: 'Circuits au poids du corps et kettlebells, sur l’heure du déjeuner.' }),
    course({ id: 'c-atelier', gymId: 'g-phosphor', coachId: 'u-yasmine', title: 'Atelier posture', category: 'mat-pilates', room: 'Studio Lagree', startsAt: iso(daysFrom(now, 8, 11)), recurrence: 'monthly', until: dateOnly(daysFrom(now, 365, 0)), durationMin: 75, capacity: 5, tokenCost: 5, status: 'pending', createdAt: iso(daysFrom(now, -1, 19)),
      description: 'Un samedi par mois : analyse de la posture et exercices correctifs en petit groupe.' }),
    course({ id: 'c-boxe', gymId: 'g-phosphor', coachId: 'u-mehdi', title: 'Cardio Boxe', category: 'functional', room: 'Studio Multi', startsAt: iso(daysFrom(now, 4, 18, 30)), recurrence: 'weekly', until: in3months, status: 'rejected',
      reviewNote: 'Le Studio Multi est déjà occupé par Hot Sculpt Express sur ce créneau. Proposez 20h00 ?', description: 'Boxe sans contact, cardio et coordination.' }),
    course({ id: 'c-lac-pilates', gymId: 'g-lac', coachId: 'u-ines', title: 'Pilates Lac', category: 'mat-pilates', room: 'Studio A', startsAt: iso(daysFrom(now, -6, 9)), recurrence: 'weekly', until: in3months, capacity: 12, tokenCost: 2, reviewedBy: 'u-bo-lac',
      description: 'Pilates au sol, tous niveaux.' }),
    course({ id: 'c-sousse-func', gymId: 'g-sousse', coachId: 'u-omar', title: 'Functional Sousse', category: 'functional', room: 'Grand studio', startsAt: iso(daysFrom(now, -5, 19)), recurrence: 'weekly', until: in3months, capacity: 16, tokenCost: 3, reviewedBy: 'u-bo-sousse',
      description: 'Circuit training en grand groupe.' }),
  ];

  const tickets: Ticket[] = [];
  const moves: TokenMove[] = [];
  const mv = (m: Omit<TokenMove, 'id'>) => moves.push({ id: `mv-${moves.length + 1}`, ...m });
  const recharge = (clientId: string, gymId: string, amount: number, daysAgo: number, by: string) =>
    mv({ gymId, clientId, at: iso(daysFrom(now, -daysAgo, 17)), type: 'recharge', amount, label: 'Recharge à l’accueil', by, method: 'cash' });

  recharge('u-nour', 'g-phosphor', 30, 20, 'u-bo-phosphor');
  recharge('u-sami', 'g-phosphor', 20, 12, 'u-bo-phosphor');
  recharge('u-leila', 'g-phosphor', 6, 15, 'u-bo-phosphor');
  recharge('u-aziz', 'g-lac', 15, 9, 'u-bo-lac');
  recharge('u-maya', 'g-sousse', 10, 7, 'u-bo-sousse');

  const occ = (id: string, offset: number) => {
    const c = courses.find((x) => x.id === id)!;
    const list = occurrences(c, daysFrom(now, -30, 0), daysFrom(now, 60, 0));
    const futureIdx = list.findIndex((d) => d.getTime() > now.getTime());
    return list[futureIdx + offset];
  };
  const ticket = (id: string, courseId: string, at: Date, clientId: string, code: string, status: Ticket['status']) => {
    const c = courses.find((x) => x.id === courseId)!;
    tickets.push({ id, gymId: c.gymId, courseId, occurrenceAt: iso(at), clientId, code, status, tokenCost: c.tokenCost, createdAt: iso(new Date(at.getTime() - 2 * 864e5)), closedAt: status === 'booked' ? undefined : iso(at), checkedInBy: status === 'attended' ? c.coachId : undefined });
    mv({ gymId: c.gymId, clientId, at: iso(new Date(at.getTime() - 2 * 864e5)), type: 'hold', amount: -c.tokenCost, label: `${c.title} · réservé`, by: clientId, ticketId: id });
    if (status === 'attended' || status === 'no_show') {
      mv({ gymId: c.gymId, clientId, at: iso(at), type: 'consume', amount: 0, settled: c.tokenCost, reason: status, label: `${c.title} · ${status === 'attended' ? 'présence validée' : 'absence sans annulation'}`, by: status === 'attended' ? c.coachId : null, ticketId: id });
    }
  };

  ticket('t-1', 'c-flow', occ('c-flow', 0), 'u-nour', 'MLU-NOUR-FLOW', 'booked');
  ticket('t-2', 'c-flow', occ('c-flow', 0), 'u-sami', 'MLU-SAMI-FLOW', 'booked');
  ticket('t-3', 'c-hot', occ('c-hot', 0), 'u-nour', 'MLU-NOUR-HOT1', 'booked');
  ticket('t-4', 'c-flow', occ('c-flow', -1), 'u-nour', 'MLU-NOUR-PAST', 'attended');
  ticket('t-5', 'c-sunrise', occ('c-sunrise', -1), 'u-leila', 'MLU-LEIL-ABS1', 'no_show');
  ticket('t-6', 'c-masterclass', occ('c-masterclass', 0), 'u-sami', 'MLU-SAMI-MOBI', 'booked');
  // Séance passée de Nour avec Mehdi, pas encore évaluée : la fiche d'évaluation s'affiche côté client.
  ticket('t-7', 'c-hot', occ('c-hot', -1), 'u-nour', 'MLU-NOUR-HOT0', 'attended');

  // Avis déjà reçus par les coachs (séances antérieures à l'app).
  const review = (i: number, coachId: string, courseId: string, clientId: string, stars: number, daysAgo: number, comment?: string) => ({
    id: `r-${i}`, gymId: courses.find((c) => c.id === courseId)!.gymId, coachId, clientId, courseId, ticketId: `hist-${i}`,
    occurrenceAt: iso(daysFrom(now, -daysAgo, 18)), stars, comment, at: iso(daysFrom(now, -daysAgo, 20)),
  });
  const ratings = [
    review(1, 'u-yasmine', 'c-flow', 'u-sami', 5, 3, 'Séance incroyable, Yasmine corrige chaque posture avec bienveillance.'),
    review(2, 'u-yasmine', 'c-sunrise', 'u-leila', 5, 6, 'Le meilleur moyen de commencer la journée !'),
    review(3, 'u-yasmine', 'c-flow', 'u-nour', 4, 9, 'Très exigeant mais on progresse vite.'),
    review(4, 'u-yasmine', 'c-sunrise', 'u-sami', 5, 12),
    review(5, 'u-mehdi', 'c-hot', 'u-sami', 4, 4, 'Grosse énergie, on transpire !'),
    review(6, 'u-mehdi', 'c-hot', 'u-leila', 3, 11, 'Un peu trop rapide pour une débutante.'),
    review(7, 'u-mehdi', 'c-hot', 'u-nour', 5, 18),
    review(8, 'u-ines', 'c-lac-pilates', 'u-aziz', 5, 5, 'Inès est d’une patience rare.'),
    review(9, 'u-omar', 'c-sousse-func', 'u-maya', 4, 3, 'Ambiance de folie.'),
  ];

  const promoDay = (n: number) => dateOnly(daysFrom(now, n, 0));
  const promotions = [
    { id: 'p-blackfriday', gymId: 'g-phosphor', title: 'Black Friday', description: '20 % de remise sur toutes les recharges de 20 jetons et plus.', kind: 'percent_off' as const, value: 20, minTokens: 20, startsOn: promoDay(-2), endsOn: promoDay(12), active: true, createdAt: created, createdBy: 'u-admin' },
    { id: 'p-pack40', gymId: 'g-phosphor', title: 'Pack fidélité', description: '5 jetons offerts pour 40 jetons achetés.', kind: 'bonus_tokens' as const, value: 5, minTokens: 40, startsOn: promoDay(-10), endsOn: promoDay(50), active: true, createdAt: created, createdBy: 'u-admin' },
    { id: 'p-lac-open', gymId: 'g-lac', title: 'Ouverture Lac 2', description: '3 jetons offerts dès 10 jetons achetés.', kind: 'bonus_tokens' as const, value: 3, minTokens: 10, startsOn: promoDay(-5), endsOn: promoDay(25), active: true, createdAt: created, createdBy: 'u-admin' },
    { id: 'p-sousse-ete', gymId: 'g-sousse', title: 'Rentrée Sousse', description: '10 % de remise sur toutes les recharges.', kind: 'percent_off' as const, value: 10, minTokens: 0, startsOn: promoDay(5), endsOn: promoDay(35), active: true, createdAt: created, createdBy: 'u-admin' },
  ];

  return {
    promotions,
    ratings,
    version: 1,
    gyms,
    accounts,
    courses,
    tickets,
    moves,
    notifications: [
      { id: 'n-1', accountId: 'u-bo-phosphor', at: iso(daysFrom(now, 0, 8)), kind: 'course_submitted', title: 'Nouvelle demande de cours', body: 'Mehdi Trabelsi propose « Functional Power » (hebdomadaire).', read: false, link: '/pro/backoffice/requests' },
      { id: 'n-2', accountId: 'u-bo-phosphor', at: iso(daysFrom(now, -1, 19)), kind: 'course_submitted', title: 'Nouvelle demande de cours', body: 'Yasmine Ben Ali propose « Atelier posture » (mensuel).', read: false, link: '/pro/backoffice/requests' },
      { id: 'n-3', accountId: 'u-mehdi', at: reviewed, kind: 'course_rejected', title: 'Cours refusé', body: '« Cardio Boxe » : le Studio Multi est déjà occupé sur ce créneau.', read: false, link: '/pro/coach/courses' },
      { id: 'n-4', accountId: 'u-yasmine', at: iso(daysFrom(now, -1, 15)), kind: 'course_approved', title: 'Cours validé 🎉', body: '« Masterclass Mobilité » est validé et visible dans tous les calendriers.', read: false, link: '/pro/coach/courses' },
      { id: 'n-5', accountId: 'u-nour', at: iso(daysFrom(now, -1, 15)), kind: 'new_course', title: 'Nouveau cours à l’affiche', body: '« Masterclass Mobilité » avec Yasmine Ben Ali. Réservez votre place !', read: false, link: '/club' },
    ],
  };
}
