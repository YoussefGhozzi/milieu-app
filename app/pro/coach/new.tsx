import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, Send, ShieldCheck, Sparkles, Users } from 'lucide-react-native';
import { Avatar, Badge, Button, Text, TokenAmount, cn, colors } from '@milieu/ui';
import type { Recurrence } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { createCourse, fullName, occurrenceCount, RECURRENCE_LABEL } from '@/backend/engine';
import { DisciplineArt } from '@/components/ClassVisuals';
import { TextField } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { disciplineStyle } from '@/lib/disciplines';
import { addDays, dayLong, time } from '@/lib/format';
import { DatePicker, TimePicker } from '@/pro/Calendar';
import { CATEGORIES, recurrenceSummary } from '@/pro/courseText';
import { ChoiceChips, Page, Stepper, useBreakpoint } from '@/pro/ui';

const DURATIONS = [30, 45, 50, 60, 75, 90];
const RECURRENCES: { key: Recurrence; label: string }[] = [
  { key: 'once', label: 'Une seule fois' }, { key: 'weekly', label: 'Chaque semaine' }, { key: 'monthly', label: 'Chaque mois' }, { key: 'yearly', label: 'Chaque année' },
];
const SPANS: Record<Exclude<Recurrence, 'once'>, { key: number; label: string }[]> = {
  weekly: [{ key: 1, label: '1 mois' }, { key: 3, label: '3 mois' }, { key: 6, label: '6 mois' }, { key: 12, label: '1 an' }],
  monthly: [{ key: 6, label: '6 mois' }, { key: 12, label: '1 an' }, { key: 24, label: '2 ans' }],
  yearly: [{ key: 24, label: '2 ans' }, { key: 36, label: '3 ans' }, { key: 60, label: '5 ans' }],
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

/** L'onglet reste monté entre deux visites : on repart d'un formulaire vierge à chaque sortie. */
export default function NewCourseScreen() {
  const [k, setK] = useState(0);
  const { from } = useLocalSearchParams<{ from?: string }>();
  useFocusEffect(useCallback(() => () => setK((x) => x + 1), []));
  return <NewCourse key={`${k}-${from ?? ''}`} />;
}

/** Création d'un cours par le coach : envoyé à l'accueil de sa salle pour validation. */
function NewCourse() {
  const { me, myGym, db, run } = useNetwork();
  const toast = useToast();
  const { wide } = useBreakpoint();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const source = from ? db.courses.find((c) => c.id === from && c.coachId === me?.id) : undefined;

  const [title, setTitle] = useState(source?.title ?? '');
  const [category, setCategory] = useState(source?.category ?? me?.specialties?.[0] ?? 'lagree');
  const [description, setDescription] = useState(source?.description ?? '');
  const [start, setStart] = useState(() => { const d = addDays(new Date(), 1); d.setHours(18, 0, 0, 0); return d; });
  const [duration, setDuration] = useState(source?.durationMin ?? 50);
  const [recurrence, setRecurrence] = useState<Recurrence>(source?.recurrence ?? 'weekly');
  const [spanMonths, setSpanMonths] = useState<number | null>(3);
  const [until, setUntil] = useState(() => plusMonths(addDays(new Date(), 1), 3));
  const [room, setRoom] = useState(source?.room ?? myGym?.rooms[0] ?? '');
  const [capacity, setCapacity] = useState(source?.capacity ?? 10);
  const [tokenCost, setTokenCost] = useState(source?.tokenCost ?? 3);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const untilDate = recurrence === 'once' ? null : spanMonths ? plusMonths(start, spanMonths) : until;
  const draft = { startsAt: start.toISOString(), recurrence, until: untilDate ? ymd(untilDate) : null, durationMin: duration };
  const total = useMemo(() => occurrenceCount(draft), [draft.startsAt, draft.recurrence, draft.until, draft.durationMin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me || !myGym) return null;
  const st = disciplineStyle(category);

  const submit = () => {
    setError('');
    if (title.trim().length < 2) { setError('Donnez un titre au cours.'); return; }
    setBusy(true);
    setTimeout(() => {
      const r = run((d) => createCourse(d, me, { title, category, description, room, startsAt: start.toISOString(), durationMin: duration, capacity, tokenCost, recurrence, until: draft.until }));
      setBusy(false);
      if (r.ok) setDone(true); else { setError(r.error); toast(r.error, 'danger'); }
    }, 600);
  };

  const preview = (
    <View className="gap-4">
      <Text variant="overline" tone="muted">Aperçu côté client</Text>
      <Animated.View key={category} entering={FadeIn.duration(300)} className="overflow-hidden rounded-xl border border-border bg-surface">
        <DisciplineArt disciplineId={category} height={150} rounded={0} iconSize={56} />
        <View className="absolute left-4 top-4"><Badge tone="brand" label="Nouveau" /></View>
        <View className="gap-2 p-4">
          <Text variant="overline" style={{ color: st.color }}>{CATEGORIES.find((c) => c.key === category)?.label}</Text>
          <Text variant="title" numberOfLines={2}>{title.trim() || 'Titre du cours'}</Text>
          <View className="flex-row items-center gap-2"><Avatar name={fullName(me)} size={26} /><Text variant="label" tone="muted">avec {me.firstName}</Text></View>
          <View className="flex-row items-center gap-2"><CalendarClock size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted" className="capitalize">{dayLong(start)} · {time(start)}</Text></View>
          <View className="flex-row items-center gap-2"><MapPin size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">{room} · {duration} min</Text></View>
          <View className="mt-1 flex-row items-center justify-between">
            <Badge tone="success" label={`${capacity} places`} />
            <TokenAmount value={tokenCost} size="sm" />
          </View>
        </View>
      </Animated.View>
      <View className="gap-3 rounded-xl border border-border bg-surface-sunken p-4">
        <Text variant="label" className="font-semibold">Après l’envoi</Text>
        {['La demande part à l’accueil de ' + myGym.name + '.', 'L’accueil valide ou refuse (avec une raison).', 'Validé : le cours apparaît dans tous les calendriers et à l’affiche chez les clients.'].map((t, i) => (
          <View key={i} className="flex-row gap-3">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-brand-soft"><Text variant="caption" tone="brand" className="font-bold">{i + 1}</Text></View>
            <Text variant="label" tone="muted" className="flex-1">{t}</Text>
          </View>
        ))}
      </View>
      {error ? <Text variant="label" tone="danger">{error}</Text> : null}
      <Button block size="lg" label="Envoyer pour validation" loading={busy} icon={<Send size={18} color={colors.brand.foreground} />} onPress={submit} />
    </View>
  );

  return (
    <Page maxWidth={1100}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/pro/coach/courses'))} className="mb-4 flex-row items-center gap-2 self-start" hitSlop={8}>
        <ArrowLeft size={16} color={colors.foreground.muted} />
        <Text variant="label" tone="muted">Mes cours</Text>
      </Pressable>
      <Appear>
        <Text variant="overline" tone="brand">{myGym.name}</Text>
        <Text variant="title" className="mt-1">{source ? 'Proposer à nouveau' : 'Créer un cours'}</Text>
        <Text tone="muted" className="mb-6 mt-1">Fixez le jour, l’heure, la récurrence et le nombre de places. L’accueil le valide avant publication.</Text>
      </Appear>

      <View className={cn('gap-6', wide && 'flex-row items-start')}>
        <View className="flex-1 gap-5">
          <Step n={1} title="Le cours">
            <TextField label="Titre" placeholder="Ex. Lagree Flow du soir" value={title} onChangeText={setTitle} maxLength={60} />
            <View className="gap-2">
              <Text variant="label" tone="muted">Type de cours</Text>
              <ChoiceChips value={category} onChange={setCategory} options={CATEGORIES}
                renderIcon={(k, active) => { const s = disciplineStyle(k); const I = s.icon; return <I size={14} color={active ? colors.brand.foreground : s.color} />; }} />
            </View>
            <View className="gap-1.5">
              <Text variant="label" tone="muted">Description (facultatif)</Text>
              <TextInput multiline value={description} onChangeText={setDescription} placeholder="Ce que les clients vont travailler, niveau conseillé…" placeholderTextColor={colors.foreground.subtle}
                style={{ minHeight: 96, color: colors.foreground.DEFAULT, fontSize: 15, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border.DEFAULT, backgroundColor: colors.surface.DEFAULT, textAlignVertical: 'top', outlineStyle: 'none' } as never} />
            </View>
          </Step>

          <Step n={2} title="Date et heure de la première séance">
            <View className={cn('gap-4', wide && 'flex-row')}>
              <View className={wide ? 'w-[340px]' : 'w-full'}><DatePicker value={start} onChange={setStart} min={new Date()} /></View>
              <View className="flex-1 gap-4">
                <View className="gap-2"><Text variant="label" tone="muted">Heure de début</Text><TimePicker value={start} onChange={setStart} /></View>
                <View className="gap-2"><Text variant="label" tone="muted">Durée</Text>
                  <ChoiceChips value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ key: d, label: `${d} min` }))} />
                </View>
                <View className="flex-row items-center gap-2 rounded-lg bg-brand-soft p-3">
                  <CalendarClock size={16} color={colors.brand.DEFAULT} />
                  <Text variant="label" className="flex-1 font-semibold capitalize">{dayLong(start)} · {time(start)} → {time(new Date(start.getTime() + duration * 60e3))}</Text>
                </View>
              </View>
            </View>
          </Step>

          <Step n={3} title="Récurrence">
            <ChoiceChips value={recurrence} onChange={(r) => { setRecurrence(r); if (r !== 'once') setSpanMonths(SPANS[r][1]?.key ?? SPANS[r][0].key); }} options={RECURRENCES} />
            {recurrence !== 'once' ? (
              <Animated.View entering={FadeIn} className="gap-3">
                <Text variant="label" tone="muted">Pendant</Text>
                <ChoiceChips value={spanMonths ?? -1} onChange={(v) => setSpanMonths(v === -1 ? null : v)} options={[...SPANS[recurrence], { key: -1, label: 'Date précise' }]} />
                {spanMonths === null ? <View className="max-w-[360px]"><DatePicker value={until} onChange={setUntil} min={start} /></View> : null}
              </Animated.View>
            ) : null}
            <View className="flex-row items-center gap-3 rounded-lg border border-border bg-surface-sunken p-3">
              <Sparkles size={16} color={colors.energy.DEFAULT} />
              <Text variant="label" className="flex-1">{recurrenceSummary(draft)}</Text>
              <Badge tone="success" label={`${total} séance${total > 1 ? 's' : ''}`} />
            </View>
          </Step>

          <Step n={4} title="Places et prix">
            <View className="gap-2">
              <Text variant="label" tone="muted">Studio</Text>
              <ChoiceChips value={room} onChange={setRoom} options={myGym.rooms.map((r) => ({ key: r, label: r }))} />
            </View>
            <View className="flex-row flex-wrap gap-8">
              <View className="gap-2"><View className="flex-row items-center gap-2"><Users size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">Nombre maximum de personnes</Text></View>
                <Stepper value={capacity} onChange={setCapacity} min={1} max={200} suffix="places" /></View>
              <View className="gap-2"><View className="flex-row items-center gap-2"><ShieldCheck size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">Prix par séance</Text></View>
                <Stepper value={tokenCost} onChange={setTokenCost} min={1} max={50} suffix="jetons" /></View>
            </View>
          </Step>

          {!wide ? preview : null}
        </View>
        {wide ? <View className="w-[360px]">{preview}</View> : null}
      </View>

      <Modal visible={done} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 p-5">
          <Animated.View entering={ZoomIn.springify().damping(14)} className="w-full max-w-sm items-center gap-4 rounded-xl border border-border bg-surface p-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-success-soft"><CheckCircle2 size={44} color={colors.success.DEFAULT} /></View>
            <Text variant="title" className="text-center">Demande envoyée</Text>
            <Text tone="muted" className="text-center">« {title.trim()} » ({RECURRENCE_LABEL[recurrence].toLowerCase()}) attend la validation de l’accueil. Vous serez notifié(e) de la décision.</Text>
            <Button block label="Voir mes cours" onPress={() => { setDone(false); router.replace('/pro/coach/courses'); }} />
          </Animated.View>
        </View>
      </Modal>
    </Page>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Appear index={n}>
      <View className="gap-4 rounded-xl border border-border bg-surface p-5">
        <View className="flex-row items-center gap-3">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-brand"><Text variant="label" tone="onBrand" className="font-bold">{n}</Text></View>
          <Text variant="heading">{title}</Text>
        </View>
        {children}
      </View>
    </Appear>
  );
}
