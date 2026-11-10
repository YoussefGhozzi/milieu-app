/* Formatage FR des dates, heures et montants pour la démo. */

const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

export const time = (iso: string | Date) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** « Aujourd'hui », « Demain », sinon « mar. 12 nov. ». */
export const dayLabel = (iso: string | Date, now = new Date()) => {
  const d = new Date(iso);
  if (sameDay(d, now)) return 'Aujourd’hui';
  if (sameDay(d, addDays(now, 1))) return 'Demain';
  if (sameDay(d, addDays(now, -1))) return 'Hier';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const dayLong = (iso: string | Date) => {
  const d = new Date(iso);
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const dayShort = (d: Date) => DAYS[d.getDay()].replace('.', '');
export const monthShort = (d: Date) => MONTHS[d.getMonth()];

/** Montant en dinars tunisiens : « 225 DT », « 8,500 DT » (3 décimales seulement si nécessaire). */
export const dt = (n: number) => {
  const fixed = Number.isInteger(n) ? String(n) : n.toFixed(3).replace('.', ',');
  return `${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DT`;
};

/** Heures restantes avant un instant. */
export const hoursUntil = (iso: string, now = new Date()) => (new Date(iso).getTime() - now.getTime()) / 3600e3;

export const relative = (iso: string, now = new Date()) => {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'à l’instant';
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  return dayLabel(iso, now);
};

export const plural = (n: number, one: string, many: string) => `${n} ${Math.abs(n) > 1 ? many : one}`;
