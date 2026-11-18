import type { Course } from '@milieu/contracts';
import { dayLong, time } from '@/lib/format';

/** « Chaque lundi à 07:00 jusqu'au 15 février 2027 », etc. */
export function recurrenceSummary(c: Pick<Course, 'startsAt' | 'recurrence' | 'until'>) {
  const d = new Date(c.startsAt);
  const at = time(d);
  const until = c.until ? ` jusqu’au ${new Date(`${c.until}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
  if (c.recurrence === 'once') return `Le ${dayLong(d)} à ${at}`;
  if (c.recurrence === 'weekly') return `Chaque ${d.toLocaleDateString('fr-FR', { weekday: 'long' })} à ${at}${until}`;
  if (c.recurrence === 'monthly') return `Le ${d.getDate()} de chaque mois à ${at}${until}`;
  return `Chaque ${d.getDate()} ${d.toLocaleDateString('fr-FR', { month: 'long' })} à ${at}${until}`;
}

export const CATEGORIES = [
  { key: 'lagree', label: 'Lagree' },
  { key: 'hot-sculpt', label: 'Hot Sculpt' },
  { key: 'mat-pilates', label: 'Pilates' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'functional', label: 'Functional' },
];
