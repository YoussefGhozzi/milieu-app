import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { CalendarClock, CheckCircle2, MapPin, PartyPopper, ScanLine, ShieldAlert, ShieldCheck, Star } from 'lucide-react-native';
import { Button, EmptyState, Sheet, Text, TokenAmount, colors } from '@milieu/ui';
import { useClientAccount, useNetwork } from '@/backend/NetworkProvider';
import { canRate, cancelTicket, fullName } from '@/backend/engine';
import { CoachAvatar, CoachProfileModal, RatingSheet, Stars } from '@/pro/Rating';
import { BottomBar, Header } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { disciplineStyle } from '@/lib/disciplines';
import { dayLabel, dayLong, hoursUntil, time } from '@/lib/format';
import { TicketPill } from '@/pro/ui';

/** Ticket d'entrée : le QR que le coach ou l'accueil scanne pour valider la présence. */
export default function ClubTicket() {
  const { id, new: fresh } = useLocalSearchParams<{ id: string; new?: string }>();
  const { db, run } = useNetwork();
  const { client, gym } = useClientAccount();
  const toast = useToast();
  const [sheet, setSheet] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const t = db.tickets.find((x) => x.id === id && x.clientId === client?.id);
  const course = t ? db.courses.find((c) => c.id === t.courseId) : undefined;
  if (!t || !course || !client || !gym) {
    return <View className="flex-1 bg-background"><Header title="Ticket" /><EmptyState title="Ticket introuvable" action={<Button label="Ma salle" onPress={() => router.replace('/club')} />} /></View>;
  }
  const coach = db.accounts.find((a) => a.id === course.coachId);
  const rateable = canRate(db, t);
  const myRating = db.ratings.find((r) => r.ticketId === t.id);
  const st = disciplineStyle(course.category);
  const start = new Date(t.occurrenceAt);
  const h = hoursUntil(t.occurrenceAt);
  const late = h < gym.cancelHours;
  const active = t.status === 'booked';
  const countdown = h <= 0 ? 'En cours' : h < 1 ? `Dans ${Math.max(1, Math.round(h * 60))} min` : h < 24 ? `Dans ${Math.round(h)} h` : dayLabel(start);

  const cancel = () => {
    const r = run((d) => cancelTicket(d, client, t.id));
    setSheet(false);
    if (!r.ok) { toast(r.error, 'danger'); return; }
    toast(r.value.late ? 'Réservation annulée. Annulation tardive : jetons non rendus.' : `Réservation annulée, ${r.value.refunded} jetons rendus`, r.value.late ? 'info' : 'success');
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Mon ticket" onBack={() => router.replace('/club')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-md gap-5 self-center px-5">
          {fresh && active ? (
            <Animated.View entering={ZoomIn.springify().damping(14)} className="items-center gap-2 pt-2">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success-soft"><PartyPopper size={32} color={colors.success.DEFAULT} /></View>
              <Text variant="title" className="text-center">C’est réservé !</Text>
              <Text tone="muted" className="text-center">Votre place est gardée. Présentez ce QR à l’entrée.</Text>
            </Animated.View>
          ) : null}

          <Appear index={1}>
            <View className="overflow-hidden rounded-xl border border-border bg-surface">
              <View style={{ height: 6, backgroundColor: st.color }} />
              <View className="items-center gap-4 p-6">
                <View className="flex-row items-center gap-2">
                  <TicketPill status={t.status} />
                  {active ? <Text variant="label" tone="brand" className="font-semibold">{countdown}</Text> : null}
                </View>
                <Text variant="title" className="text-center">{course.title}</Text>
                <View className="rounded-xl bg-white p-4" style={{ opacity: active || t.status === 'attended' ? 1 : 0.35 }}>
                  <QRCode value={t.code} size={210} backgroundColor="#ffffff" color="#000000" />
                  {t.status === 'attended' ? (
                    <View className="absolute inset-0 items-center justify-center">
                      <Animated.View entering={ZoomIn} className="h-20 w-20 items-center justify-center rounded-full bg-success"><CheckCircle2 size={44} color="#fff" /></Animated.View>
                    </View>
                  ) : null}
                </View>
                <Text variant="heading" className="font-bold tracking-widest">{t.code}</Text>
                <View className="w-full flex-row items-center justify-center gap-2 rounded-lg bg-surface-raised p-3">
                  <ScanLine size={16} color={colors.foreground.muted} />
                  <Text variant="caption" tone="muted" className="flex-1">À scanner par {coach?.firstName ?? 'le coach'} ou par l’accueil à votre arrivée.</Text>
                </View>
              </View>
              <View className="flex-row border-t border-dashed border-border-strong">
                <View className="flex-1 gap-1 p-4">
                  <View className="flex-row items-center gap-1.5"><CalendarClock size={14} color={colors.foreground.muted} /><Text variant="caption" tone="muted">Quand</Text></View>
                  <Text variant="label" className="font-semibold capitalize">{dayLong(start)}</Text>
                  <Text variant="label" className="font-semibold">{time(start)} · {course.durationMin} min</Text>
                </View>
                <View className="flex-1 gap-1 border-l border-dashed border-border-strong p-4">
                  <View className="flex-row items-center gap-1.5"><MapPin size={14} color={colors.foreground.muted} /><Text variant="caption" tone="muted">Où</Text></View>
                  <Text variant="label" className="font-semibold">{course.room}</Text>
                  <Text variant="label" tone="muted">{gym.name}</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between border-t border-border px-4 py-3">
                <Pressable accessibilityRole="button" accessibilityLabel={`Voir le profil de ${fullName(coach)}`} onPress={() => setCoachOpen(true)} className="flex-row items-center gap-2 active:opacity-70" hitSlop={6}>
                  <CoachAvatar coach={coach} size={28} />
                  <View>
                    <Text variant="label" className="font-semibold">{fullName(coach)}</Text>
                    <Text variant="caption" tone="brand">Voir le profil</Text>
                  </View>
                </Pressable>
                <TokenAmount value={t.tokenCost} size="sm" suffix={t.status === 'attended' || t.status === 'no_show' || t.status === 'late_cancel' ? 'débités' : 'réservés'} />
              </View>
            </View>
          </Appear>

          {rateable ? (
            <Animated.View entering={FadeInDown.delay(200)} className="gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-background/50"><Star size={22} color="#FBBF24" fill="#FBBF24" /></View>
                <View className="flex-1">
                  <Text variant="heading">Comment s’est passée la séance ?</Text>
                  <Text variant="caption" tone="muted">Notez {coach?.firstName} : 30 secondes, et votre avis aide toute la communauté.</Text>
                </View>
              </View>
              <Button block label="Évaluer la séance" onPress={() => setRateOpen(true)} />
            </Animated.View>
          ) : myRating ? (
            <Animated.View entering={FadeInDown.delay(200)} className="flex-row items-center gap-3 rounded-lg border border-border bg-surface p-4">
              <Text variant="label" tone="muted" className="flex-1">Votre évaluation</Text>
              <Stars value={myRating.stars} size={16} />
            </Animated.View>
          ) : null}

          {active ? (
            <Animated.View entering={FadeInDown.delay(200)} className="flex-row gap-3 rounded-lg border border-border bg-surface-sunken p-4">
              {late ? <ShieldAlert size={20} color={colors.warning.DEFAULT} /> : <ShieldCheck size={20} color={colors.success.DEFAULT} />}
              <Text variant="caption" tone="muted" className="flex-1">
                {late
                  ? `Moins de ${gym.cancelHours} h avant la séance : si vous annulez ou ne venez pas, les ${t.tokenCost} jetons sont débités.`
                  : `Annulation gratuite jusqu’à ${dayLabel(new Date(start.getTime() - gym.cancelHours * 3600e3)).toLowerCase()} ${time(new Date(start.getTime() - gym.cancelHours * 3600e3))}. Ensuite, une absence est débitée.`}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
      {active ? (
        <BottomBar>
          <Button block variant="ghost" label="Annuler ma réservation" onPress={() => setSheet(true)} />
        </BottomBar>
      ) : null}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Annuler la réservation ?">
        <View className="w-full max-w-xl gap-3 self-center">
          {late ? (
            <View className="flex-row gap-3 rounded-lg bg-warning-soft p-4">
              <ShieldAlert size={20} color={colors.warning.DEFAULT} />
              <Text variant="label" className="flex-1">Annulation tardive (moins de {gym.cancelHours} h) : vos {t.tokenCost} jetons ne seront pas rendus. Votre place sera libérée pour un autre membre.</Text>
            </View>
          ) : (
            <View className="flex-row gap-3 rounded-lg bg-success-soft p-4">
              <ShieldCheck size={20} color={colors.success.DEFAULT} />
              <Text variant="label" className="flex-1">Vous êtes dans les temps : vos {t.tokenCost} jetons vous sont rendus immédiatement.</Text>
            </View>
          )}
          <Button block variant="destructive" label="Annuler la réservation" onPress={cancel} />
          <Button block variant="ghost" label="Garder ma place" onPress={() => setSheet(false)} />
        </View>
      </Sheet>
      <CoachProfileModal coach={coach} open={coachOpen} onClose={() => setCoachOpen(false)} />
      <RatingSheet ticket={t} open={rateOpen} onClose={() => setRateOpen(false)} />
    </View>
  );
}
