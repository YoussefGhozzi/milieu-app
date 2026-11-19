import { NetworkDbSchema } from '@milieu/contracts';
import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { buildSeed } from './seed';

/*
 * Scénario complet du réseau MILIEU sur le moteur local (coach → accueil → client → scan → recharge → évaluation),
 * joué dans l'ordre sur une même base. Chaque vérification devient un test nommé.
 */
const results: { name: string; pass: boolean }[] = [];
const ok = (c: unknown, m: string) => { results.push({ name: m, pass: !!c }); };
const throws = (fn: () => unknown, m: string) => {
  try { fn(); ok(false, `${m} (aucune erreur levée)`); } catch (e) { ok(e instanceof E.ApiError, `${m} -> "${(e as Error).message}"`); }
};


const db = buildSeed();
ok(NetworkDbSchema.safeParse(db).success, 'seed valide selon le contrat Zod');
const acc = (id: string) => db.accounts.find((a) => a.id === id)!;
const admin = acc('u-admin'), bo = acc('u-bo-phosphor'), yas = acc('u-yasmine'), nour = acc('u-nour'), boLac = acc('u-bo-lac');

// Comptes : coach créé uniquement par l'admin
throws(() => E.createAccount(db, bo, { role: 'coach', gymId: bo.gymId, firstName: 'X', lastName: 'Y', email: 'x@y.tn', phone: '', password: 'milieu2026' }), 'accueil ne peut pas créer de coach');
const coach = E.createAccount(db, admin, { role: 'coach', gymId: 'g-phosphor', firstName: 'Test', lastName: 'Coach', email: 'test@milieu.tn', phone: '', password: 'milieu2026' });
ok(coach.role === 'coach', 'admin crée un coach');

// 1. Coach crée un cours hebdo
const start = new Date(Date.now() + 3 * 864e5); start.setHours(20, 0, 0, 0);
const until = new Date(start.getTime() + 30 * 864e5);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const c = E.createCourse(db, coach, { title: 'Test Flow', category: 'lagree', description: '', room: 'Studio Lagree', startsAt: start.toISOString(), durationMin: 50, capacity: 2, tokenCost: 4, recurrence: 'weekly', until: ymd(until) });
ok(c.status === 'pending', 'cours en attente après création');
ok(E.occurrenceCount(c) === 5, `5 séances hebdo sur 30 jours (=${E.occurrenceCount(c)})`);
ok(E.listSessions(db, { gymId: 'g-phosphor', from: new Date(), to: until }).every((s) => s.course.id !== c.id), 'non visible avant validation');
throws(() => E.bookSession(db, nour, c.id, start.toISOString()), 'réservation impossible avant validation');
ok(db.notifications.some((n) => n.accountId === bo.id && n.kind === 'course_submitted' && n.body.includes('Test Flow')), 'accueil notifié');

// 2. Validation
throws(() => E.reviewCourse(db, boLac, c.id, 'approved'), "l'accueil d'une autre salle ne peut pas valider");
throws(() => E.reviewCourse(db, bo, c.id, 'rejected', ''), 'refus sans raison interdit');
E.reviewCourse(db, bo, c.id, 'approved');
ok(E.listSessions(db, { gymId: 'g-phosphor', from: new Date(), to: until }).some((s) => s.course.id === c.id), 'visible dans le calendrier après validation');
ok(db.notifications.some((n) => n.accountId === nour.id && n.kind === 'new_course'), 'clients notifiés du nouveau cours');

// 3. Réservation + jetons
const before = E.walletOf(db, nour.id);
const t = E.bookSession(db, nour, c.id, start.toISOString());
const afterBook = E.walletOf(db, nour.id);
ok(afterBook.available === before.available - 4 && afterBook.held === before.held + 4, `réservation retient 4 jetons (${before.available}→${afterBook.available}, réservés ${afterBook.held})`);
throws(() => E.bookSession(db, nour, c.id, start.toISOString()), 'double réservation refusée');
ok(/^MLU-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(t.code), `code ticket ${t.code}`);
const leila = E.createAccount(db, bo, { role: 'client', gymId: bo.gymId, firstName: 'Zero', lastName: 'Jeton', email: 'zero@ex.com', phone: '', password: 'milieu2026' });
throws(() => E.bookSession(db, leila, c.id, start.toISOString()), 'solde insuffisant refusé (nouveau client à 0)');
E.rechargeTokens(db, bo, leila.id, 10, 'cash');
ok(E.walletOf(db, leila.id).available >= 10, 'recharge accueil créditée');
throws(() => E.rechargeTokens(db, boLac, leila.id, 10, 'cash'), "recharge refusée hors salle");
E.bookSession(db, leila, c.id, start.toISOString());
const sami = acc('u-sami');
throws(() => E.bookSession(db, sami, c.id, start.toISOString()), 'complet (capacité 2)');

// 4. Scan : trop tôt (séance dans 3 jours)
throws(() => E.checkIn(db, coach, t.code), 'scan trop tôt refusé');
throws(() => E.checkIn(db, acc('u-mehdi'), 'MLU-NOUR-FLOW'), "coach ne scanne pas le cours d'un autre");
throws(() => E.checkIn(db, acc('u-bo-lac'), 'MLU-NOUR-FLOW'), 'accueil d’une autre salle ne scanne pas');
void yas;

// 5. Ticket de la séance « bientôt » (seed) : scan OK
const soonBefore = E.walletOf(db, nour.id);
const r = E.checkIn(db, bo, 'mlu-nour-flow ');
ok(r.ticket.status === 'attended', 'scan accueil valide la présence (code normalisé)');
const soonAfter = E.walletOf(db, nour.id);
ok(soonAfter.available === soonBefore.available && soonAfter.held === soonBefore.held - 4 && soonAfter.spent === soonBefore.spent + 4, 'jetons débités définitivement au scan');
throws(() => E.checkIn(db, bo, 'MLU-NOUR-FLOW'), 'double scan refusé');
throws(() => E.checkIn(db, bo, 'MLU-XXXX-XXXX'), 'code inconnu');

// 6. Annulation à temps (> 24 h) : remboursé
const c1 = E.walletOf(db, nour.id);
const res = E.cancelTicket(db, nour, t.id);
ok(!res.late && res.refunded === 4 && E.walletOf(db, nour.id).available === c1.available + 4, 'annulation > 24 h : 4 jetons rendus');

// 7. Annulation tardive (< 24 h) : Sami sur la séance « bientôt »
const s1 = E.walletOf(db, sami.id);
const late = E.cancelTicket(db, sami, 't-2');
const s2 = E.walletOf(db, sami.id);
ok(late.late && s2.available === s1.available && s2.spent === s1.spent + 4, 'annulation < 24 h : jetons débités');

// 8. Absence : balayage après la fin de séance
const nb = E.walletOf(db, nour.id);
const n = E.sweepNoShows(db, Date.now() + 40 * 864e5);
const na = E.walletOf(db, nour.id);
ok(n >= 1 && db.tickets.find((x) => x.id === 't-3')!.status === 'no_show', `absences débitées automatiquement (${n})`);
ok(na.available === nb.available && na.held < nb.held, 'absence : réservés → débités, solde disponible inchangé');

// 9. Récurrences
const base = { durationMin: 60, until: '2027-12-31' } as const;
const m = E.occurrences({ ...base, startsAt: new Date(2027, 0, 31, 10).toISOString(), recurrence: 'monthly' }, new Date(2027, 0, 1), new Date(2027, 4, 1));
ok(m.map((d) => d.getDate()).join(',') === '31,28,31,30', `mensuel le 31 → dernier jour du mois (${m.map((d) => d.getDate())})`);
const y = E.occurrences({ ...base, until: '2030-12-31', startsAt: new Date(2027, 5, 1, 9).toISOString(), recurrence: 'yearly' }, new Date(2027, 0, 1), new Date(2031, 0, 1));
ok(y.length === 4, `annuel : 4 séances 2027-2030 (${y.length})`);
ok(NetworkDbSchema.safeParse(db).success, 'base toujours valide après tout le parcours');

// ---------- 10. Tarifs & promos ----------
const db2 = buildSeed();
const A = (id: string) => db2.accounts.find((a) => a.id === id)!;
throws(() => E.setTokenPrice(db2, A('u-bo-phosphor'), 'g-phosphor', 12), "l'accueil ne fixe pas le prix");
E.setTokenPrice(db2, A('u-admin'), 'g-phosphor', 12.5);
ok(db2.gyms.find((g) => g.id === 'g-phosphor')!.tokenPriceTnd === 12.5, 'admin fixe 1 jeton = 12,5 DT');
let q = E.quoteRecharge(db2, 'g-phosphor', 10);
ok(q.total === 125 && !q.percentPromo && q.bonus === 0, `10 jetons = 125 DT sans promo (min 20) -> ${q.total}`);
q = E.quoteRecharge(db2, 'g-phosphor', 20);
ok(q.base === 250 && q.discount === 50 && q.total === 200, `20 jetons : 250 DT −20 % = 200 DT -> ${q.total}`);
q = E.quoteRecharge(db2, 'g-phosphor', 40);
ok(q.total === 400 && q.bonus === 5, `40 jetons : −20 % et +5 offerts -> ${q.total} DT, +${q.bonus}`);
ok(E.quoteRecharge(db2, 'g-sousse', 10).percentPromo === undefined, 'promo programmée (future) non appliquée');
E.setPromotionActive(db2, A('u-admin'), 'p-blackfriday', false);
ok(E.quoteRecharge(db2, 'g-phosphor', 20).total === 250, 'promo désactivée non appliquée');
const before2 = E.walletOf(db2, 'u-nour').available;
const rq = E.rechargeTokens(db2, A('u-bo-phosphor'), 'u-nour', 40, 'cash');
ok(E.walletOf(db2, 'u-nour').available === before2 + 45 && rq.total === 500, `recharge 40 → +45 jetons, 500 DT encaissés (${rq.total})`);
ok(db2.moves.some((m) => m.type === 'recharge' && m.priceTnd === 500), 'montant encaissé enregistré');
throws(() => E.createPromotion(db2, A('u-bo-phosphor'), { gymId: 'g-phosphor', title: 'X', description: '', kind: 'percent_off', value: 10, minTokens: 0, startsOn: '2026-01-01', endsOn: '2026-01-02' }), "l'accueil ne crée pas de promo");
throws(() => E.createPromotion(db2, A('u-admin'), { gymId: 'g-lac', title: 'Bad', description: '', kind: 'percent_off', value: 95, minTokens: 0, startsOn: '2026-01-01', endsOn: '2026-01-02' }), 'remise > 90 % refusée');
const td = new Date(); const ymd2 = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}`;
const p = E.createPromotion(db2, A('u-admin'), { gymId: 'g-lac', title: 'Flash', description: '', kind: 'percent_off', value: 50, minTokens: 0, startsOn: ymd2, endsOn: ymd2 });
ok(E.promoState(p) === 'active' && E.quoteRecharge(db2, 'g-lac', 10).total === 47.5, `promo du jour active, Lac 10 × 9,5 −50 % = ${E.quoteRecharge(db2, 'g-lac', 10).total} DT`);
ok(db2.notifications.some((n) => n.accountId === 'u-aziz' && n.kind === 'promo'), 'clients de la salle notifiés de la promo');
ok(!db2.notifications.some((n) => n.accountId === 'u-nour' && n.title.includes('Flash')), "clients d'une autre salle non notifiés");

// ---------- 11. Évaluations ----------
const nour2 = A('u-nour');
const before3 = E.coachRating(db2, 'u-mehdi');
const todo = E.ratingsToGive(db2, 'u-nour');
ok(todo.some((t) => t.id === 't-7'), 'séance passée de Nour (t-7) à évaluer');
throws(() => E.rateSession(db2, A('u-sami'), 't-7', 5), "on n'évalue que ses propres séances");
throws(() => E.rateSession(db2, nour2, 't-1', 5), 'séance non suivie / non terminée refusée');
throws(() => E.rateSession(db2, nour2, 't-7', 6), 'note > 5 refusée');
E.rateSession(db2, nour2, 't-7', 5, '  Top séance !  ');
const after3 = E.coachRating(db2, 'u-mehdi');
ok(after3.count === before3.count + 1 && after3.avg >= before3.avg, `moyenne Mehdi ${before3.avg} → ${after3.avg} (${after3.count} avis)`);
ok(after3.reviews[0].comment === 'Top séance !', 'avis enregistré et nettoyé');
throws(() => E.rateSession(db2, nour2, 't-7', 4), 'double évaluation refusée');
ok(!E.ratingsToGive(db2, 'u-nour').some((t) => t.id === 't-7'), 'séance retirée de la liste à évaluer');
ok(db2.notifications.some((n) => n.accountId === 'u-mehdi' && n.kind === 'rating'), 'coach notifié du nouvel avis');
const yr = E.coachRating(db2, 'u-yasmine');
ok(yr.count === 4 && yr.avg === 4.8 && yr.distribution[4] === 3, `Yasmine 4,8/5 sur 4 avis (${yr.avg})`);
ok(NetworkDbSchema.safeParse(db2).success, 'base valide après tarifs et évaluations');
const legacy = JSON.parse(JSON.stringify(buildSeed())); delete legacy.promotions; delete legacy.ratings; for (const g of legacy.gyms) delete g.tokenPriceTnd;
const mig = NetworkDbSchema.safeParse(legacy);
ok(mig.success && mig.data.promotions.length === 0 && mig.data.gyms[0].tokenPriceTnd === 10, 'ancienne base du navigateur relue sans perte (valeurs par défaut)');

describe('moteur local du réseau (scénario complet)', () => {
  it('le scénario contient toutes les vérifications', () => expect(results.length).toBeGreaterThanOrEqual(59));
  for (const r of results) it(r.name, () => expect(r.pass).toBe(true));
});
