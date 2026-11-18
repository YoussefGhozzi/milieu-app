import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, CalendarClock, CheckCircle2, Coins, MapPin, Repeat, Users } from 'lucide-react-native';
import { Avatar, Button, EmptyState, Sheet, Text, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { RECURRENCE_LABEL, cancelCourse, checkIn, fullName, getSession } from '@/backend/engine';
import { DisciplineArt, SeatsBar } from '@/components/ClassVisuals';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { dayLong, time } from '@/lib/format';
import { recurrenceSummary } from '@/pro/courseText';
import { AutoGrid, Page, Panel, TicketPill } from '@/pro/ui';

/** Détail d'une séance pour le coach et l'accueil : inscrits, présences, actions. */
export default function ProSession() {
  const { c, at } = useLocalSearchParams<{ c: string; at: string }>();
  const { db, me, run } = useNetwork();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!me) return <Redirect href="/pro" />;
  const s = c && at ? getSession(db, c, at) : undefined;
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/pro/${me.role}` as never));

  if (!s || s.course.gymId !== me.gymId) {
    return <Page><EmptyState title="Séance introuvable" body="Elle a peut-être été annulée." action={<Button label="Retour" onPress={back} />} /></Page>;
  }
  const tickets = db.tickets
    .filter((t) => t.courseId === s.course.id && t.occurrenceAt === s.start.toISOString())
    .map((t) => ({ t, client: db.accounts.find((a) => a.id === t.clientId) }))
    .sort((a, b) => fullName(a.client).localeCompare(fullName(b.client)));
  const canScan = me.role === 'backoffice' || (me.role === 'coach' && s.course.coachId === me.id);
  const present = tickets.filter((x) => x.t.status === 'attended').length;

  return (
    <Page maxWidth={1000}>
      <Pressable onPress={back} className="mb-4 flex-row items-center gap-2 self-start" hitSlop={8}>
        <ArrowLeft size={16} color={colors.foreground.muted} /><Text variant="label" tone="muted">Retour</Text>
      </Pressable>
      <Appear>
        <View className="overflow-hidden rounded-xl border border-border">
          <DisciplineArt disciplineId={s.course.category} height={170} rounded={0} iconSize={64} />
          <View className="absolute bottom-5 left-5 right-5">
            <Text variant="overline" tone="muted">{RECURRENCE_LABEL[s.course.recurrence]} · avec {fullName(s.coach)}</Text>
            <Text variant="display" className="text-[34px] leading-[40px]">{s.course.title}</Text>
          </View>
        </View>
      </Appear>

      <View className="mt-5">
        <AutoGrid min={180} gap={12}>
          <Fact icon={CalendarClock} label="Quand" value={`${dayLong(s.start)} · ${time(s.start)}–${time(s.end)}`} />
          <Fact icon={MapPin} label="Studio" value={s.course.room} />
          <Fact icon={Coins} label="Prix" value={`${s.course.tokenCost} jetons`} />
          <Fact icon={Repeat} label="Récurrence" value={recurrenceSummary(s.course)} />
        </AutoGrid>
      </View>

      <Appear index={2}>
        <Panel title="Liste de présence" className="mt-5">
          <View className="mb-4 gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2"><Users size={16} color={colors.foreground.muted} /><Text variant="label" className="font-semibold">{s.booked} inscrit{s.booked > 1 ? 's' : ''} sur {s.course.capacity}</Text></View>
              <Text variant="label" tone="success" className="font-semibold">{present} présent{present > 1 ? 's' : ''}</Text>
            </View>
            <SeatsBar booked={s.booked} capacity={s.course.capacity} />
          </View>
          {tickets.length ? tickets.map(({ t, client }, i) => (
            <Animated.View key={t.id} entering={FadeInDown.delay(i * 40)} className="flex-row items-center gap-3 border-t border-border py-3">
              <Avatar name={fullName(client)} size={40} />
              <View className="flex-1">
                <Text variant="label" className="font-semibold">{fullName(client)}</Text>
                <Text variant="caption" tone="muted">{t.code}</Text>
              </View>
              {t.status === 'booked' && canScan ? (
                <Button size="sm" variant="secondary" label="Valider" icon={<CheckCircle2 size={14} color={colors.success.DEFAULT} />} onPress={() => {
                  const r = run((d) => checkIn(d, me, t.code));
                  toast(r.ok ? `Présence de ${client?.firstName} validée` : r.error, r.ok ? 'success' : 'danger');
                }} />
              ) : <TicketPill status={t.status} />}
            </Animated.View>
          )) : <Text variant="label" tone="muted">Personne n’a encore réservé cette séance.</Text>}
        </Panel>
      </Appear>

      {me.role === 'backoffice' && s.course.status === 'approved' ? (
        <View className="mt-5 items-start">
          <Button variant="ghost" label="Annuler ce cours (toutes les séances à venir)" onPress={() => setConfirmCancel(true)} />
        </View>
      ) : null}

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Annuler le cours ?">
        <View className="w-full max-w-xl gap-3 self-center">
          <Text tone="muted">« {s.course.title} » disparaîtra des calendriers. Les clients inscrits aux séances à venir récupèrent leurs jetons et sont prévenus.</Text>
          <Button block variant="destructive" label="Annuler le cours" onPress={() => {
            const r = run((d) => cancelCourse(d, me, s.course.id));
            setConfirmCancel(false);
            toast(r.ok ? 'Cours annulé, jetons rendus aux clients' : r.error, r.ok ? 'info' : 'danger');
            if (r.ok) back();
          }} />
          <Button block variant="ghost" label="Garder le cours" onPress={() => setConfirmCancel(false)} />
        </View>
      </Sheet>
    </Page>
  );
}

function Fact({ icon: I, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <View className="gap-1 rounded-lg border border-border bg-surface p-3">
      <I size={16} color={colors.foreground.muted} />
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="label" className="font-semibold">{value}</Text>
    </View>
  );
}
