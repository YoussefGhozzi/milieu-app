import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react-native';
import { Badge, Text, TokenAmount, cn, colors } from '@milieu/ui';
import type { GymSession } from '@/backend/engine';
import { fullName } from '@/backend/engine';
import { disciplineStyle } from '@/lib/disciplines';
import { addDays, dayShort, monthShort, sameDay, startOfDay, time } from '@/lib/format';
import { Tap } from '@/components/motion';

export const startOfWeek = (d: Date) => { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; return addDays(x, -day); };
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const monthLong = (d: Date) => MONTHS_LONG[d.getMonth()];

/** Carte d'une séance dans les calendriers et listes. */
export function SessionCard({ s, onPress, compact, footer, highlight }: { s: GymSession; onPress?: () => void; compact?: boolean; footer?: ReactNode; highlight?: boolean }) {
  const st = disciplineStyle(s.course.category);
  const Icon = st.icon;
  const pending = s.course.status === 'pending';
  const full = s.left === 0;
  const past = s.end.getTime() < Date.now();
  const body = (
    <View className={cn('flex-row overflow-hidden rounded-lg border bg-surface', pending ? 'border-dashed border-warning' : highlight ? 'border-brand' : 'border-border', past && 'opacity-60')}>
      <View style={{ width: 4, backgroundColor: pending ? colors.warning.DEFAULT : st.color }} />
      <View className={cn('flex-1', compact ? 'gap-1 p-2.5' : 'gap-1.5 p-4')}>
        <View className="flex-row items-center gap-1.5">
          <Icon size={compact ? 12 : 14} color={st.color} />
          <Text variant="caption" className="font-semibold" style={{ color: st.color }}>{time(s.start)}–{time(s.end)}</Text>
        </View>
        <Text variant={compact ? 'label' : 'heading'} className="font-semibold" numberOfLines={compact ? 2 : 1}>{s.course.title}</Text>
        {compact ? (
          <Text variant="caption" tone={s.left ? 'muted' : 'danger'} numberOfLines={1}>{s.coach?.firstName ?? ''} · {pending ? 'en attente' : s.left ? `${s.left} pl. libres` : 'complet'}</Text>
        ) : (
          <>
            <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
              <Text variant="label" tone="muted">{fullName(s.coach)}</Text>
              <View className="flex-row items-center gap-1"><MapPin size={12} color={colors.foreground.subtle} /><Text variant="caption" tone="muted">{s.course.room}</Text></View>
            </View>
            <View className="mt-1 flex-row flex-wrap items-center justify-between gap-2">
              {pending ? <Badge tone="warning" label="En attente de validation" />
                : full ? <Badge tone="danger" label="Complet" />
                : <Badge tone={s.left <= 2 ? 'warning' : 'success'} label={`${s.left} place${s.left > 1 ? 's' : ''} sur ${s.course.capacity}`} />}
              <TokenAmount value={s.course.tokenCost} size="sm" />
            </View>
          </>
        )}
        {footer}
      </View>
    </View>
  );
  return onPress ? <Tap onPress={onPress} scaleTo={0.98} accessibilityLabel={`${s.course.title}, ${time(s.start)}`}>{body}</Tap> : body;
}

/**
 * Calendrier de la semaine : 7 colonnes quand la place le permet, sinon bandeau de jours + liste du jour.
 * `sessions` peut couvrir plus large que la semaine affichée : le filtre est fait ici.
 */
export function WeekCalendar({ sessions, week, onWeekChange, onPressSession, highlight, emptyHint }: {
  sessions: GymSession[]; week: Date; onWeekChange: (d: Date) => void; onPressSession?: (s: GymSession) => void;
  highlight?: (s: GymSession) => boolean; emptyHint?: string;
}) {
  const [w, setW] = useState(0);
  const [selected, setSelected] = useState(() => (sameDay(startOfWeek(new Date()), week) ? startOfDay(new Date()) : week));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);
  const byDay = useMemo(() => days.map((d) => sessions.filter((s) => sameDay(s.start, d))), [days, sessions]);
  // 7 colonnes seulement si chaque jour garde ~120 px (ordinateur) ; sinon bandeau de jours + liste.
  const columns = w >= 900;
  const end = days[6];
  const range = week.getMonth() === end.getMonth()
    ? `${week.getDate()} – ${end.getDate()} ${monthLong(end)} ${end.getFullYear()}`
    : `${week.getDate()} ${monthShort(week)} – ${end.getDate()} ${monthShort(end)} ${end.getFullYear()}`;
  const today = new Date();
  const move = (n: number) => { const next = addDays(week, 7 * n); onWeekChange(next); setSelected(n === 0 ? startOfDay(today) : next); };
  const selIndex = Math.max(0, days.findIndex((d) => sameDay(d, selected)));
  const list = byDay[selIndex] ?? [];

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <CalendarDays size={18} color={colors.brand.DEFAULT} />
          <Text variant="heading" className="capitalize">{range}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <NavBtn label="Semaine précédente" onPress={() => move(-1)}><ChevronLeft size={18} color={colors.foreground.DEFAULT} /></NavBtn>
          <Pressable accessibilityRole="button" onPress={() => { onWeekChange(startOfWeek(today)); setSelected(startOfDay(today)); }}
            className="h-10 justify-center rounded-full border border-border bg-surface px-4 active:bg-surface-raised">
            <Text variant="label" className="font-semibold">Aujourd’hui</Text>
          </Pressable>
          <NavBtn label="Semaine suivante" onPress={() => move(1)}><ChevronRight size={18} color={colors.foreground.DEFAULT} /></NavBtn>
        </View>
      </View>

      {columns ? (
        <Animated.View key={week.toISOString()} entering={FadeIn.duration(300)} className="flex-row gap-2">
          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            return (
              <View key={i} className="min-h-[220px] flex-1 gap-2 rounded-xl border border-border bg-surface-sunken p-2">
                <View className="items-center gap-1 pb-1">
                  <Text variant="caption" tone="muted" className="uppercase">{dayShort(d)}</Text>
                  <View className={cn('h-8 w-8 items-center justify-center rounded-full', isToday && 'bg-brand')}>
                    <Text variant="label" tone={isToday ? 'onBrand' : 'default'} className="font-bold">{d.getDate()}</Text>
                  </View>
                </View>
                {byDay[i].length ? byDay[i].map((s, k) => (
                  <Animated.View key={s.key} entering={FadeInDown.delay(k * 40).springify().damping(18)}>
                    <SessionCard s={s} compact highlight={highlight?.(s)} onPress={onPressSession ? () => onPressSession(s) : undefined} />
                  </Animated.View>
                )) : <Text variant="caption" tone="subtle" className="mt-4 text-center">—</Text>}
              </View>
            );
          })}
        </Animated.View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {days.map((d, i) => {
              const active = i === selIndex;
              const isToday = sameDay(d, today);
              return (
                <Pressable key={i} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setSelected(d)}
                  className={cn('w-[52px] items-center gap-1 rounded-xl border py-2.5', active ? 'border-brand bg-brand' : 'border-border bg-surface')}>
                  <Text variant="caption" tone={active ? 'onBrand' : 'muted'} className="uppercase">{dayShort(d)}</Text>
                  <Text variant="heading" tone={active ? 'onBrand' : 'default'} className="font-bold">{d.getDate()}</Text>
                  <View className={cn('h-1.5 w-1.5 rounded-full', byDay[i].length ? (active ? 'bg-brand-foreground' : 'bg-brand') : 'bg-transparent', isToday && !active && 'bg-energy')} />
                </Pressable>
              );
            })}
          </ScrollView>
          <Animated.View key={`${selected.toISOString()}`} entering={FadeIn.duration(250)} className="mt-4 gap-3">
            {list.length ? list.map((s, k) => (
              <Animated.View key={s.key} entering={FadeInDown.delay(k * 50).springify().damping(18)}>
                <SessionCard s={s} highlight={highlight?.(s)} onPress={onPressSession ? () => onPressSession(s) : undefined} />
              </Animated.View>
            )) : (
              <View className="items-center gap-2 rounded-xl border border-dashed border-border-strong p-8">
                <Clock size={22} color={colors.foreground.subtle} />
                <Text variant="label" tone="muted" className="text-center">{emptyHint ?? 'Aucune séance ce jour-là.'}</Text>
              </View>
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
}

function NavBtn({ children, label, onPress }: { children: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface active:bg-surface-raised">
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Sélecteurs de date et d'heure (sans dépendance native)             */
/* ------------------------------------------------------------------ */

const WEEK_HEAD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function DatePicker({ value, onChange, min }: { value: Date; onChange: (d: Date) => void; min?: Date }) {
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const first = startOfWeek(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const minDay = min ? startOfDay(min) : null;
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const canPrev = !minDay || new Date(month.getFullYear(), month.getMonth(), 0) >= minDay;
  return (
    <View className="gap-3 rounded-xl border border-border bg-surface-sunken p-3">
      <View className="flex-row items-center justify-between">
        <NavBtn label="Mois précédent" onPress={() => canPrev && shift(-1)}><ChevronLeft size={18} color={canPrev ? colors.foreground.DEFAULT : colors.foreground.subtle} /></NavBtn>
        <Text variant="heading" className="capitalize">{monthLong(month)} {month.getFullYear()}</Text>
        <NavBtn label="Mois suivant" onPress={() => shift(1)}><ChevronRight size={18} color={colors.foreground.DEFAULT} /></NavBtn>
      </View>
      <View className="flex-row">
        {WEEK_HEAD.map((d, i) => <Text key={i} variant="caption" tone="subtle" className="flex-1 text-center font-semibold">{d}</Text>)}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((d, i) => {
          const out = d.getMonth() !== month.getMonth();
          const disabled = !!minDay && d < minDay;
          const active = sameDay(d, value);
          const isToday = sameDay(d, new Date());
          return (
            <View key={i} style={{ width: `${100 / 7}%` }} className="items-center py-0.5">
              <Pressable accessibilityRole="button" accessibilityState={{ selected: active, disabled }} disabled={disabled}
                onPress={() => { const n = new Date(d); n.setHours(value.getHours(), value.getMinutes(), 0, 0); onChange(n); }}
                className={cn('h-10 w-10 items-center justify-center rounded-full', active ? 'bg-brand' : 'active:bg-surface-raised', isToday && !active && 'border border-brand')}>
                <Text variant="label" tone={active ? 'onBrand' : disabled ? 'subtle' : out ? 'subtle' : 'default'} className={cn('font-semibold', disabled && 'line-through opacity-50')}>{d.getDate()}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const MINUTES = [0, 15, 30, 45];

export function TimePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const set = (h: number, m: number) => { const n = new Date(value); n.setHours(h, m, 0, 0); onChange(n); };
  return (
    <View className="gap-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {HOURS.map((h) => {
          const active = value.getHours() === h;
          return (
            <Pressable key={h} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => set(h, value.getMinutes())}
              className={cn('h-11 w-14 items-center justify-center rounded-lg border', active ? 'border-brand bg-brand' : 'border-border bg-surface')}>
              <Text variant="label" tone={active ? 'onBrand' : 'default'} className="font-bold">{String(h).padStart(2, '0')}h</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="flex-row gap-2">
        {MINUTES.map((m) => {
          const active = value.getMinutes() === m;
          return (
            <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => set(value.getHours(), m)}
              className={cn('h-11 flex-1 items-center justify-center rounded-lg border', active ? 'border-brand bg-brand-soft' : 'border-border bg-surface')}>
              <Text variant="label" tone={active ? 'brand' : 'muted'} className="font-bold">:{String(m).padStart(2, '0')}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Icône + texte d'un participant (utilisé dans les listes de présence). */
export function SeatsLine({ s }: { s: GymSession }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Users size={14} color={colors.foreground.muted} />
      <Text variant="label" tone="muted">{s.booked}/{s.course.capacity} inscrits</Text>
    </View>
  );
}
