import { useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { AlertTriangle, CalendarPlus, Expand, Hourglass, Navigation, ShieldCheck, X } from 'lucide-react-native';
import { Badge, Button, EmptyState, Sheet, Text, TokenAmount, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { problemMessage } from '@milieu/contracts';
import i18n from '@/i18n';
import { BottomBar, Header } from '@/components/Chrome';
import { DisciplineArt, statusBadge } from '@/components/ClassVisuals';
import { useToast } from '@/components/Toast';
import { disciplineStyle } from '@/lib/disciplines';
import { dayLong, hoursUntil, time } from '@/lib/format';

/** A13 — Détail d'une réservation avec QR plein écran · A14 — Annulation. */
export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { state, view, cancel, studio } = useDemo();
  const { width } = useWindowDimensions();
  const qrSize = Math.min(190, width - 150);
  const qrFull = Math.min(300, width - 80);
  const [full, setFull] = useState(false);
  const [sheet, setSheet] = useState(false);
  const booking = state.bookings.find((b) => b.id === id);
  const v = booking ? view(booking.sessionId) : undefined;

  if (!booking || !v) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Réservation" />
        <EmptyState title="Réservation introuvable" action={<Button label="Mes réservations" onPress={() => router.replace('/(tabs)/bookings')} />} />
      </View>
    );
  }

  const st = disciplineStyle(v.discipline.id);
  const upcoming = new Date(v.session.startsAt) > new Date();
  const active = upcoming && (booking.status === 'booked' || booking.status === 'waitlist');
  const late = hoursUntil(v.session.startsAt) < studio.cancelHours;
  const badge = statusBadge(booking.status);
  // Vraie API : le code court du ticket (MLU-XXXX-XXXX), que l'accueil peut taper si le QR ne passe pas.
  const code = (booking as { code?: string }).code ?? (booking.qr ?? booking.id).slice(-8).toUpperCase();

  const doCancel = async () => {
    try {
      const r = await cancel(booking.id);
      setSheet(false);
      toast(booking.status === 'waitlist' ? 'Vous avez quitté la liste d’attente' : r.late ? 'Réservation annulée (annulation tardive)' : `Réservation annulée · ${r.refunded} jetons remboursés`, r.late ? 'info' : 'success');
    } catch (e) {
      setSheet(false);
      toast(problemMessage(e, i18n.language as 'fr' | 'en' | 'ar'), 'danger');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Ma réservation" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-xl gap-4 self-center px-5">
          {/* Billet */}
          <Animated.View entering={FadeInDown.duration(450)}>
            <View className="overflow-hidden rounded-xl border border-border bg-surface">
              <View>
                <DisciplineArt disciplineId={v.discipline.id} height={130} rounded={0} iconSize={48} />
                <View className="absolute bottom-4 left-5 right-5 flex-row items-end justify-between">
                  <View>
                    <Text variant="overline" style={{ color: st.color }}>{v.discipline.name}</Text>
                    <Text variant="title" className="capitalize">{dayLong(v.session.startsAt)}</Text>
                  </View>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>
              </View>
              <View className="flex-row flex-wrap gap-y-3 p-5">
                <Info label="Heure" value={time(v.session.startsAt)} />
                <Info label="Durée" value={`${v.session.durationMin} min`} />
                <Info label="Salle" value={v.room.name} />
                <Info label="Coach" value={`${v.coach.firstName} ${v.coach.lastName[0]}.`} />
              </View>

              {/* Séparation façon billet */}
              <View className="flex-row items-center">
                <View className="-ml-3 h-6 w-6 rounded-full bg-background" />
                <View className="mx-2 flex-1 border-t border-dashed border-border-strong" />
                <View className="-mr-3 h-6 w-6 rounded-full bg-background" />
              </View>

              {booking.status === 'booked' && upcoming ? (
                <Animated.View entering={ZoomIn.delay(200).springify()} style={{ alignItems: 'center', padding: 20, gap: 12 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Afficher le QR en plein écran" onPress={() => setFull(true)} className="rounded-xl bg-white p-4">
                    <QRCode value={booking.qr ?? booking.id} size={qrSize} backgroundColor="#ffffff" color="#121316" />
                  </Pressable>
                  <Text variant="label" tone="muted">Code {code} · présentez ce QR à l’accueil</Text>
                  <Button size="sm" variant="ghost" label="Plein écran" icon={<Expand size={16} color={colors.brand.DEFAULT} />} onPress={() => setFull(true)} />
                </Animated.View>
              ) : booking.status === 'waitlist' ? (
                <View className="items-center gap-2 p-6">
                  <Hourglass size={32} color={colors.warning.DEFAULT} />
                  <Text variant="title">Position {booking.waitlistPosition}</Text>
                  <Text tone="muted" className="text-center">Vous serez inscrit automatiquement si une place se libère. Aucun jeton débité pour l’instant.</Text>
                </View>
              ) : (
                <View className="items-center gap-1 p-6">
                  <Text variant="heading">{badge.label}</Text>
                  <Text tone="muted" className="text-center">
                    {booking.status === 'attended' ? 'Merci pour votre venue ! Ce cours a bien été validé.' : booking.status === 'late_cancel' ? `Annulée moins de ${studio.cancelHours} h avant : les jetons n’ont pas été remboursés.` : 'Cette réservation n’est plus active.'}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {booking.status === 'booked' && upcoming ? (
            <Animated.View entering={FadeInDown.delay(150)} style={{ flexDirection: 'row', gap: 12 }}>
              <Button className="flex-1" variant="secondary" label="Calendrier" icon={<CalendarPlus size={18} color={colors.foreground.DEFAULT} />} onPress={() => toast('Ajouté à votre calendrier')} />
              <Button className="flex-1" variant="secondary" label="Itinéraire" icon={<Navigation size={18} color={colors.foreground.DEFAULT} />} onPress={() => toast(`${studio.name} · ${studio.address}`, 'info')} />
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      {active ? (
        <BottomBar>
          <Button block variant="ghost" label={booking.status === 'waitlist' ? 'Quitter la liste d’attente' : 'Annuler la réservation'} onPress={() => setSheet(true)} />
        </BottomBar>
      ) : null}

      {/* A14 — Annulation : la conséquence en jetons est lue avant de confirmer */}
      <Sheet open={sheet} onClose={() => setSheet(false)} title={booking.status === 'waitlist' ? 'Quitter la liste d’attente ?' : 'Annuler ce cours ?'}>
        <View className="gap-4">
          {booking.status === 'waitlist' ? (
            <Text tone="muted">Vous perdrez votre position sur la liste d’attente. Aucun jeton n’est concerné.</Text>
          ) : late ? (
            <View className="flex-row gap-3 rounded-lg border border-danger/40 bg-danger-soft p-4">
              <AlertTriangle size={20} color={colors.danger.DEFAULT} />
              <View className="flex-1 gap-1">
                <Text variant="label" className="font-semibold">Annulation tardive</Text>
                <Text variant="label" tone="muted">Le cours commence dans moins de {studio.cancelHours} h : les {v.session.tokenCost} jetons ne seront pas remboursés.</Text>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-3 rounded-lg border border-success/40 bg-success-soft p-4">
              <ShieldCheck size={20} color={colors.success.DEFAULT} />
              <View className="flex-1 gap-1">
                <Text variant="label" className="font-semibold">Annulation gratuite</Text>
                <View className="flex-row items-center gap-2">
                  <TokenAmount value={v.session.tokenCost} size="sm" />
                  <Text variant="label" tone="muted">remboursés immédiatement sur votre solde.</Text>
                </View>
              </View>
            </View>
          )}
          <Button block size="lg" variant={late && booking.status !== 'waitlist' ? 'destructive' : 'primary'} label="Confirmer l’annulation" onPress={doCancel} />
          <Button block variant="ghost" label="Garder ma place" onPress={() => setSheet(false)} />
        </View>
      </Sheet>

      {/* QR plein écran, fond blanc pour la lecture à l'accueil */}
      <Modal visible={full} animationType="fade" onRequestClose={() => setFull(false)}>
        <View className="flex-1 items-center justify-center gap-6 bg-white p-6">
          <Text variant="title" className="text-black">{v.discipline.name} · {time(v.session.startsAt)}</Text>
          <QRCode value={booking.qr ?? booking.id} size={qrFull} backgroundColor="#ffffff" color="#121316" />
          <Text variant="label" className="text-black">Code {code} · luminosité au maximum conseillée</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setFull(false)} className="mt-4 h-14 w-14 items-center justify-center rounded-full bg-black">
            <X size={24} color="#ffffff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 gap-0.5">
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="label" className="font-semibold">{value}</Text>
    </View>
  );
}
