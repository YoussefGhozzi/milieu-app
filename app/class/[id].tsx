import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarClock, Clock, Flame, Gauge, Hourglass, MapPin, QrCode, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Avatar, Button, Card, EmptyState, Sheet, Text, TokenAmount, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { BottomBar, Header } from '@/components/Chrome';
import { DisciplineArt, SeatsBar } from '@/components/ClassVisuals';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { INTENSITY_LABEL, disciplineStyle } from '@/lib/disciplines';
import { dayLabel, dayLong, hoursUntil, time } from '@/lib/format';

/** A08 détail · A09 confirmation · A11 liste d'attente. */
export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { view, bookingFor, balance, book, cancel, simulateSeatFreed, studio } = useDemo();
  const v = view(id);
  const [sheet, setSheet] = useState<'book' | 'waitlist' | null>(null);
  const [busy, setBusy] = useState(false);

  if (!v) {
    return (
      <View className="flex-1 bg-background">
        <Header />
        <EmptyState title="Cours introuvable" body="Ce cours n’existe plus ou a été déplacé." action={<Button label="Voir le planning" onPress={() => router.replace('/(tabs)/planning')} />} />
      </View>
    );
  }

  const { session, discipline, coach, room } = v;
  const st = disciplineStyle(discipline.id);
  const mine = bookingFor(session.id);
  const left = Math.max(0, session.capacity - session.booked);
  const full = left === 0;
  const after = balance - session.tokenCost;
  const freeCancelUntil = new Date(new Date(session.startsAt).getTime() - studio.cancelHours * 3600e3);
  const lateAlready = hoursUntil(session.startsAt) < studio.cancelHours;

  const confirm = () => {
    setBusy(true);
    setTimeout(() => {
      const r = book(session.id);
      setBusy(false);
      setSheet(null);
      if (r.kind === 'booked') router.replace({ pathname: '/booking/success', params: { id: r.bookingId } });
      else if (r.kind === 'waitlist') toast(`Vous êtes n° ${r.position} sur la liste d’attente`, 'info');
      else if (r.kind === 'insufficient') toast(`Il vous manque ${r.missing} jetons`, 'danger');
    }, 700);
  };

  const facts = [
    { icon: Clock, label: 'Durée', value: `${session.durationMin} min` },
    { icon: Gauge, label: 'Intensité', value: INTENSITY_LABEL[discipline.intensity] },
    { icon: MapPin, label: 'Salle', value: room.name },
    { icon: Flame, label: 'Places', value: `${session.capacity} max` },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View>
          <DisciplineArt disciplineId={discipline.id} height={280 + insets.top} rounded={0} iconSize={88} />
          <View className="absolute left-0 right-0 top-0"><Header transparent /></View>
          <View className="absolute bottom-6 left-0 right-0">
            <View className="w-full max-w-xl self-center px-5">
              <Text variant="overline" style={{ color: st.color }}>{st.mood}</Text>
              <Text variant="display" className="mt-1 text-[40px] leading-[46px]">{discipline.name}</Text>
            </View>
          </View>
        </View>

        <View className="w-full max-w-xl gap-4 self-center px-5 pt-5">
          <Appear>
            <View className="flex-row items-center gap-2">
              <CalendarClock size={18} color={colors.brand.DEFAULT} />
              <Text variant="heading" className="capitalize">{dayLong(session.startsAt)} · {time(session.startsAt)}</Text>
            </View>
          </Appear>

          <Appear index={1}>
            <View className="flex-row flex-wrap gap-3">
              {facts.map((f) => {
                const I = f.icon;
                return (
                  <View key={f.label} className="w-[47.5%] gap-1 rounded-lg border border-border bg-surface p-3">
                    <I size={16} color={colors.foreground.muted} />
                    <Text variant="caption" tone="muted">{f.label}</Text>
                    <Text variant="label" className="font-semibold">{f.value}</Text>
                  </View>
                );
              })}
            </View>
          </Appear>

          <Appear index={2}>
            <Card className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text variant="label" className="font-semibold">{full ? 'Cours complet' : left === 1 ? 'Dernière place !' : `${left} places restantes`}</Text>
                <Text variant="caption" tone="muted">{session.booked}/{session.capacity}</Text>
              </View>
              <SeatsBar booked={session.booked} capacity={session.capacity} />
              <Text variant="caption" tone="subtle">Mis à jour en direct</Text>
            </Card>
          </Appear>

          <Appear index={3}>
            <Card className="flex-row items-center gap-4">
              <Avatar name={`${coach.firstName} ${coach.lastName}`} size={56} />
              <View className="flex-1">
                <Text variant="caption" tone="muted">Votre coach</Text>
                <Text variant="heading">{coach.firstName} {coach.lastName}</Text>
                <Text variant="label" tone="muted" className="mt-0.5">{coach.bio}</Text>
              </View>
            </Card>
          </Appear>

          <Appear index={4}>
            <Text variant="heading">Le cours</Text>
            <Text tone="muted" className="mt-2 leading-6">{discipline.description}</Text>
          </Appear>

          <Appear index={5}>
            <View className="flex-row gap-3 rounded-lg border border-border bg-surface-sunken p-4">
              <ShieldCheck size={20} color={colors.success.DEFAULT} />
              <View className="flex-1">
                <Text variant="label" className="font-semibold">Annulation gratuite jusqu’à {studio.cancelHours} h avant</Text>
                <Text variant="caption" tone="muted" className="mt-0.5">
                  {lateAlready ? 'Le cours commence bientôt : une annulation ne serait plus remboursée.' : `Soit jusqu’au ${dayLabel(freeCancelUntil).toLowerCase()} à ${time(freeCancelUntil)}. Ensuite, les jetons ne sont pas remboursés.`}
                </Text>
              </View>
            </View>
          </Appear>
        </View>
      </ScrollView>

      <BottomBar>
        {mine?.status === 'booked' ? (
          <Button block size="lg" variant="outline" label="Voir mon QR d’entrée" icon={<QrCode size={18} color={colors.brand.DEFAULT} />} onPress={() => router.push(`/booking/${mine.id}`)} />
        ) : mine?.status === 'waitlist' ? (
          <View className="gap-2">
            <View className="flex-row items-center gap-2 rounded-lg bg-warning-soft p-3">
              <Hourglass size={16} color={colors.warning.DEFAULT} />
              <Text variant="label" className="flex-1">Liste d’attente : position {mine.waitlistPosition}. Aucun jeton débité.</Text>
            </View>
            <Button block label="Démo : une place se libère" icon={<Sparkles size={18} color={colors.brand.foreground} />}
              onPress={() => (simulateSeatFreed(session.id) ? toast('Une place s’est libérée : votre réservation est confirmée !') : toast('Solde insuffisant pour être promu', 'danger'))} />
            <Button block variant="ghost" label="Quitter la liste d’attente" onPress={() => { cancel(mine.id); toast('Vous avez quitté la liste d’attente', 'info'); }} />
          </View>
        ) : full ? (
          <Button block size="lg" variant="outline" label="Rejoindre la liste d’attente" icon={<Hourglass size={18} color={colors.brand.DEFAULT} />} onPress={() => setSheet('waitlist')} />
        ) : after < 0 ? (
          <View className="gap-2">
            <Text variant="label" tone="danger" className="text-center">Il vous manque {-after} jeton{-after > 1 ? 's' : ''} pour ce cours.</Text>
            <Button block size="lg" label="Recharger mes jetons" onPress={() => router.push('/shop')} />
          </View>
        ) : (
          <View className="flex-row items-center gap-4">
            <View>
              <TokenAmount value={session.tokenCost} />
              <Text variant="caption" tone="muted">Solde : {balance}</Text>
            </View>
            <Button className="flex-1" size="lg" label="Réserver" onPress={() => setSheet('book')} />
          </View>
        )}
      </BottomBar>

      {/* A09 — Confirmation */}
      <Sheet open={sheet === 'book'} onClose={() => setSheet(null)} title="Confirmer la réservation">
        <View className="gap-3">
          <Text tone="muted">{discipline.name} · {dayLabel(session.startsAt)} à {time(session.startsAt)} · avec {coach.firstName}</Text>
          <View className="gap-3 rounded-lg bg-surface-raised p-4">
            <Row label="Coût du cours" value={<TokenAmount value={session.tokenCost} size="sm" />} />
            <Row label="Solde actuel" value={<TokenAmount value={balance} size="sm" tone="default" />} />
            <View className="h-px bg-border" />
            <Row label="Solde après réservation" value={<TokenAmount value={after} size="sm" />} strong />
          </View>
          <Text variant="caption" tone="muted">Annulation gratuite jusqu’à {studio.cancelHours} h avant le cours. Le premier bonus qui expire est utilisé en premier.</Text>
          <Button block size="lg" label={`Confirmer · ${session.tokenCost} jetons`} loading={busy} onPress={confirm} />
          <Button block variant="ghost" label="Annuler" onPress={() => setSheet(null)} />
        </View>
      </Sheet>

      {/* A11 — Liste d'attente */}
      <Sheet open={sheet === 'waitlist'} onClose={() => setSheet(null)} title="Rejoindre la liste d’attente">
        <View className="gap-3">
          <Text tone="muted">Ce cours est complet. Si une place se libère, vous êtes inscrit automatiquement et prévenu par notification.</Text>
          <View className="gap-2 rounded-lg bg-surface-raised p-4">
            <Text variant="label">• Aucun jeton n’est débité maintenant.</Text>
            <Text variant="label">• {session.tokenCost} jetons seront retenus seulement si vous obtenez une place.</Text>
            <Text variant="label">• Vous pouvez quitter la liste à tout moment.</Text>
          </View>
          <Button block size="lg" label="Rejoindre la liste" loading={busy} onPress={confirm} />
          <Button block variant="ghost" label="Plus tard" onPress={() => setSheet(null)} />
        </View>
      </Sheet>
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
