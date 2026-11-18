import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarClock, Clock, MapPin, QrCode, ShieldAlert, ShieldCheck, Store, UserRound, Users } from 'lucide-react-native';
import { Button, Card, EmptyState, Sheet, Text, TokenAmount, colors } from '@milieu/ui';
import { useClientAccount, useNetwork } from '@/backend/NetworkProvider';
import { bookSession, coachRating, fullName, getSession, walletOf } from '@/backend/engine';
import { BottomBar, Checkbox, Header } from '@/components/Chrome';
import { DisciplineArt, SeatsBar } from '@/components/ClassVisuals';
import { Appear, Tap } from '@/components/motion';
import { CoachAvatar, CoachProfileModal, RatingBadge } from '@/pro/Rating';
import { useToast } from '@/components/Toast';
import { disciplineStyle } from '@/lib/disciplines';
import { dayLabel, dayLong, hoursUntil, time } from '@/lib/format';

/** Séance d'un cours de la salle : détail, places en direct et réservation (ticket QR). */
export default function ClubSession() {
  const { c, at } = useLocalSearchParams<{ c: string; at: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { db, run } = useNetwork();
  const { client, gym } = useClientAccount();
  const [sheet, setSheet] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  const s = c && at ? getSession(db, c, at) : undefined;
  if (!s || !client || !gym || s.course.status !== 'approved' || s.course.gymId !== gym.id) {
    return (
      <View className="flex-1 bg-background">
        <Header />
        <EmptyState title="Séance introuvable" body="Ce cours n’est plus au planning de votre salle." action={<Button label="Ma salle" onPress={() => router.replace('/club')} />} />
      </View>
    );
  }

  const st = disciplineStyle(s.course.category);
  const wallet = walletOf(db, client.id);
  const mine = db.tickets.find((t) => t.clientId === client.id && t.courseId === s.course.id && t.occurrenceAt === s.start.toISOString() && (t.status === 'booked' || t.status === 'attended'));
  const started = s.start.getTime() <= Date.now();
  const after = wallet.available - s.course.tokenCost;
  const freeUntil = new Date(s.start.getTime() - gym.cancelHours * 3600e3);
  const lateAlready = hoursUntil(s.start.toISOString()) < gym.cancelHours;

  const confirm = () => {
    setBusy(true);
    setTimeout(() => {
      const r = run((d) => bookSession(d, client, s.course.id, s.start.toISOString()));
      setBusy(false);
      if (!r.ok) { toast(r.error, 'danger'); return; }
      setSheet(false);
      router.replace({ pathname: '/club/ticket/[id]', params: { id: r.value.id, new: '1' } });
    }, 800);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View>
          <DisciplineArt disciplineId={s.course.category} height={260 + insets.top} rounded={0} iconSize={84} />
          <View className="absolute left-0 right-0 top-0"><Header transparent /></View>
          <View className="absolute bottom-6 left-0 right-0">
            <View className="w-full max-w-xl self-center px-5">
              <Text variant="overline" style={{ color: st.color }}>{st.mood}</Text>
              <Text variant="display" className="mt-1 text-[38px] leading-[44px]">{s.course.title}</Text>
            </View>
          </View>
        </View>

        <View className="w-full max-w-xl gap-4 self-center px-5 pt-5">
          <Appear>
            <View className="flex-row items-center gap-2">
              <CalendarClock size={18} color={colors.brand.DEFAULT} />
              <Text variant="heading" className="capitalize">{dayLong(s.start)} · {time(s.start)}–{time(s.end)}</Text>
            </View>
          </Appear>
          <Appear index={1}>
            <View className="flex-row flex-wrap gap-3">
              <Fact icon={Clock} label="Durée" value={`${s.course.durationMin} min`} />
              <Fact icon={MapPin} label="Studio" value={s.course.room} />
              <Fact icon={Users} label="Places" value={`${s.course.capacity} max`} />
              <Fact icon={Store} label="Salle" value={gym.name} />
            </View>
          </Appear>
          <Appear index={2}>
            <Card className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text variant="label" className="font-semibold">{s.left === 0 ? 'Cours complet' : s.left === 1 ? 'Dernière place !' : `${s.left} places restantes`}</Text>
                <Text variant="caption" tone="muted">{s.booked}/{s.course.capacity}</Text>
              </View>
              <SeatsBar booked={s.booked} capacity={s.course.capacity} />
            </Card>
          </Appear>
          <Appear index={3}>
            <Tap onPress={() => setCoachOpen(true)} accessibilityLabel={`Voir le profil de ${fullName(s.coach)}`}>
              <Card className="flex-row items-center gap-4">
                <CoachAvatar coach={s.coach} size={56} />
                <View className="flex-1 gap-0.5">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text variant="caption" tone="muted">Votre coach</Text>
                    <RatingBadge rating={coachRating(db, s.course.coachId)} compact />
                  </View>
                  <Text variant="heading">{fullName(s.coach)}</Text>
                  {s.coach?.bio ? <Text variant="label" tone="muted" numberOfLines={2}>{s.coach.bio}</Text> : null}
                  <View className="mt-1 flex-row items-center gap-1"><UserRound size={14} color={colors.brand.DEFAULT} /><Text variant="label" tone="brand" className="font-semibold">Voir le profil du coach</Text></View>
                </View>
              </Card>
            </Tap>
          </Appear>
          {s.course.description ? (
            <Appear index={4}>
              <Text variant="heading">Le cours</Text>
              <Text tone="muted" className="mt-2 leading-6">{s.course.description}</Text>
            </Appear>
          ) : null}
          <Appear index={5}>
            <View className="gap-3 rounded-lg border border-border bg-surface-sunken p-4">
              <View className="flex-row gap-3">
                <ShieldCheck size={20} color={colors.success.DEFAULT} />
                <View className="flex-1">
                  <Text variant="label" className="font-semibold">Annulation gratuite jusqu’à {gym.cancelHours} h avant</Text>
                  <Text variant="caption" tone="muted" className="mt-0.5">{lateAlready ? 'La séance est dans moins de 24 h : une annulation ne serait plus remboursée.' : `Soit jusqu’à ${dayLabel(freeUntil).toLowerCase()} ${time(freeUntil)}.`}</Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <ShieldAlert size={20} color={colors.warning.DEFAULT} />
                <Text variant="caption" tone="muted" className="flex-1">Absent sans avoir annulé à temps : la place vous était réservée, les jetons sont débités automatiquement.</Text>
              </View>
            </View>
          </Appear>
        </View>
      </ScrollView>

      <BottomBar>
        {mine ? (
          <Button block size="lg" variant="outline" label={mine.status === 'attended' ? 'Présence validée · voir le ticket' : 'Voir mon ticket QR'} icon={<QrCode size={18} color={colors.brand.DEFAULT} />} onPress={() => router.push(`/club/ticket/${mine.id}`)} />
        ) : started ? (
          <Text variant="label" tone="muted" className="py-3 text-center">Cette séance a déjà commencé.</Text>
        ) : s.left === 0 ? (
          <Text variant="label" tone="danger" className="py-3 text-center">Complet. Revenez plus tard : une place peut se libérer.</Text>
        ) : after < 0 ? (
          <View className="gap-1 py-1">
            <Text variant="label" tone="danger" className="text-center">Il vous manque {-after} jeton{-after > 1 ? 's' : ''} pour ce cours.</Text>
            <Text variant="caption" tone="muted" className="text-center">Rechargez à l’accueil de {gym.name} (espèces ou TPE).</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-4">
            <View>
              <TokenAmount value={s.course.tokenCost} />
              <Text variant="caption" tone="muted">Solde : {wallet.available}</Text>
            </View>
            <Button className="flex-1" size="lg" label="Réserver ma place" onPress={() => { setAgree(false); setSheet(true); }} />
          </View>
        )}
      </BottomBar>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Confirmer la réservation">
        <View className="w-full max-w-xl gap-3 self-center">
          <Text tone="muted">{s.course.title} · {dayLabel(s.start)} à {time(s.start)} · avec {s.coach?.firstName}</Text>
          <View className="gap-3 rounded-lg bg-surface-raised p-4">
            <Row label="Prix de la séance" value={<TokenAmount value={s.course.tokenCost} size="sm" />} />
            <Row label="Solde disponible" value={<TokenAmount value={wallet.available} size="sm" tone="default" />} />
            <View className="h-px bg-border" />
            <Row label="Solde après réservation" value={<TokenAmount value={after} size="sm" />} strong />
          </View>
          <Text variant="caption" tone="muted">Les jetons sont réservés maintenant et débités quand le coach ou l’accueil scanne votre ticket.</Text>
          <Checkbox checked={agree} onChange={setAgree} label={`J’ai compris : sans annulation au moins ${gym.cancelHours} h avant, une absence est débitée.`} />
          <Button block size="lg" label={`Confirmer · ${s.course.tokenCost} jetons`} disabled={!agree} loading={busy} onPress={confirm} />
          <Button block variant="ghost" label="Annuler" onPress={() => setSheet(false)} />
        </View>
      </Sheet>
      <CoachProfileModal coach={s.coach} open={coachOpen} onClose={() => setCoachOpen(false)} />
    </View>
  );
}

function Fact({ icon: I, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <View className="w-[47.5%] gap-1 rounded-lg border border-border bg-surface p-3">
      <I size={16} color={colors.foreground.muted} />
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="label" className="font-semibold" numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="label" tone={strong ? 'default' : 'muted'} className={strong ? 'font-semibold' : ''}>{label}</Text>
      {value}
    </View>
  );
}
