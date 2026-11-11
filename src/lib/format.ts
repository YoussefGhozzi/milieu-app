import i18n from 'i18next';

/* Formatage des dates, heures et montants dans la langue de l'app (français, anglais, arabe). */
type L = 'fr' | 'en' | 'ar';
const lang = (): L => (i18n.language === 'ar' ? 'ar' : i18n.language === 'en' ? 'en' : 'fr');
export const locale = () => ({ fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' })[lang()];

const DAYS: Record<L, string[]> = {
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};
const DAYS_LONG: Record<L, string[]> = {
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ar: DAYS.ar,
};
const MONTHS: Record<L, string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};
const WORDS: Record<L, { today: string; tomorrow: string; yesterday: string; now: string; minAgo: (n: number) => string; hAgo: (n: number) => string }> = {
  fr: { today: 'Aujourd’hui', tomorrow: 'Demain', yesterday: 'Hier', now: 'à l’instant', minAgo: (n) => `il y a ${n} min`, hAgo: (n) => `il y a ${n} h` },
  en: { today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', now: 'just now', minAgo: (n) => `${n} min ago`, hAgo: (n) => `${n} h ago` },
  ar: { today: 'اليوم', tomorrow: 'غدًا', yesterday: 'أمس', now: 'الآن', minAgo: (n) => `منذ ${n} د`, hAgo: (n) => `منذ ${n} س` },
};

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
  const w = WORDS[lang()];
  if (sameDay(d, now)) return w.today;
  if (sameDay(d, addDays(now, 1))) return w.tomorrow;
  if (sameDay(d, addDays(now, -1))) return w.yesterday;
  return `${DAYS[lang()][d.getDay()]} ${d.getDate()} ${MONTHS[lang()][d.getMonth()]}`;
};

export const dayLong = (iso: string | Date) => {
  const d = new Date(iso);
  return `${DAYS_LONG[lang()][d.getDay()]} ${d.getDate()} ${MONTHS[lang()][d.getMonth()]}`;
};

export const dayShort = (d: Date) => DAYS[lang()][d.getDay()].replace('.', '');
export const monthShort = (d: Date) => MONTHS[lang()][d.getMonth()];

/** Montant en dinars tunisiens : « 225 DT », « 8,500 DT » (3 décimales seulement si nécessaire). */
export const dt = (n: number) => {
  const fixed = Number.isInteger(n) ? String(n) : n.toFixed(3).replace('.', ',');
  return `${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DT`;
};

/** Heures restantes avant un instant. */
export const hoursUntil = (iso: string, now = new Date()) => (new Date(iso).getTime() - now.getTime()) / 3600e3;

export const relative = (iso: string, now = new Date()) => {
  const w = WORDS[lang()];
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return w.now;
  if (mins < 60) return w.minAgo(mins);
  const h = Math.round(mins / 60);
  if (h < 24) return w.hAgo(h);
  return dayLabel(iso, now);
};
