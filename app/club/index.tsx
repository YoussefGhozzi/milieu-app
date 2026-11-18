import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { ChevronRight, MapPin, Store, Ticket } from 'lucide-react-native';
import { Badge, Button, EmptyState, Text, TokenAmount, colors } from '@milieu/ui';
import { useClientAccount, useNetwork } from '@/backend/NetworkProvider';
import { canRate, listSessions, walletOf } from '@/backend/engine';
import { PromoBanners, RatePrompt, tokenPriceText } from '@/components/ClubExtras';
import { Stars } from '@/pro/Rating';
import { Header, Segmented } from '@/components/Chrome';
import { Appear, Tap } from '@/components/motion';
import { addDays, dayLabel, time } from '@/lib/format';
import { WeekCalendar, startOfWeek } from '@/pro/Calendar';
import { openClubSession } from '@/pro/nav';
import { MoveRow, TicketPill } from '@/pro/ui';

type Tab = 'agenda' | 'tickets' | 'tokens';

/** « Ma salle » côté client : calendrier des cours validés, tickets QR et jetons rechargés à l'accueil. */
export default function Club() {
  const { db } = useNetwork();
  const { client, gym } = useClientAccount();
  const [tab, setTab] = useState<Tab>('agenda');
  const [week, setWeek] = useState(() => startOfWeek(new Date()));

  const sessions = useMemo(() => (gym ? listSessions(db, { gymId: gym.id, from: week, to: addDays(week, 7) }) : []), [db, gym, week]);
  const tickets = useMemo(() => (client ? db.tickets.filter((t) => t.clientId === client.id) : []), [db.tickets, client]);
  if (!client || !gym) return <View className="flex-1 bg-background"><Header title="Ma salle" /></View>;

  const wallet = walletOf(db, client.id);
  const now = Date.now();
  const upcoming = tickets.filter((t) => t.status === 'booked' && new Date(t.occurrenceAt).getTime() > now - 3 * 3600e3).sort((a, b) => a.occurrenceAt.localeCompare(b.occurrenceAt));
  const past = tickets.filter((t) => !upcoming.includes(t)).sort((a, b) => b.occurrenceAt.localeCompare(a.occurrenceAt));
  const course = (id: string) => db.courses.find((c) => c.id === id);

  return (
    <View className="flex-1 bg-background">
      <Header title="Ma salle" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-5xl gap-5 self-center px-5">
          <Appear>
            <View className="overflow-hidden rounded-xl border border-brand/30">
              <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
                <Defs>
                  <LinearGradient id="club" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.brand.DEFAULT} stopOpacity="0.5" />
                    <Stop offset="0.6" stopColor={colors.surface.raised} stopOpacity="1" />
                    <Stop offset="1" stopColor={colors.energy.DEFAULT} stopOpacity="0.3" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#club)" />
              </Svg>
              <View className="flex-row flex-wrap items-end justify-between gap-4 p-5">
                <View className="min-w-[220px] flex-1 gap-1">
                  <View className="flex-row items-center gap-2"><Store size={16} color={colors.brand.DEFAULT} /><Text variant="overline" tone="brand">Votre salle</Text></View>
                  <Text variant="title">{gym.name}</Text>
                  <View className="flex-row items-center gap-1.5"><MapPin size={13} color={colors.foreground.muted} /><Text variant="caption" tone="muted">{gym.address}</Text></View>
                </View>
                <View className="items-end gap-1">
                  <Text variant="caption" tone="muted">Jetons disponibles</Text>
                  <TokenAmount value={wallet.available} size="lg" />
                  {wallet.held ? <Badge label={`+ ${wallet.held} réservés pour vos séances`} /> : null}
                </View>
              </View>
              <View className="mx-5 mb-5 flex-row items-center gap-3 rounded-lg bg-background/60 p-3">
                <Store size={16} color={colors.foreground.muted} />
                <View className="flex-1">
                  <Text variant="label" className="font-bold">{tokenPriceText(gym.tokenPriceTnd)}</Text>
                  <Text variant="caption" tone="muted">Pour recharger, passez à l’accueil (espèces ou TPE) : vos jetons sont crédités aussitôt sur votre compte.</Text>
                </View>
              </View>
            </View>
          </Appear>
          <PromoBanners gymId={gym.id} />
          <RatePrompt clientId={client.id} />

          <Appear index={1}>
            <View className="w-full max-w-[520px]">
              <Segmented value={tab} onChange={setTab} options={[
                { key: 'agenda', label: 'Planning' },
                { key: 'tickets', label: `Mes tickets${upcoming.length ? ` · ${upcoming.length}` : ''}` },
                { key: 'tokens', label: 'Jetons' },
              ]} />
            </View>
          </Appear>

          {tab === 'agenda' ? (
            <Animated.View entering={FadeIn}>
              <WeekCalendar sessions={sessions} week={week} onWeekChange={setWeek} onPressSession={openClubSession}
                highlight={(s) => tickets.some((t) => t.courseId === s.course.id && t.occurrenceAt === s.start.toISOString() && t.status === 'booked')}
                emptyHint="Pas de cours ce jour-là. Essayez un autre jour !" />
            </Animated.View>
          ) : null}

          {tab === 'tickets' ? (
            <Animated.View entering={FadeIn} className="gap-3">
              {upcoming.length ? upcoming.map((t, i) => {
                const c = course(t.courseId);
                return (
                  <Animated.View key={t.id} entering={FadeInDown.delay(i * 50)}>
                    <Tap onPress={() => router.push(`/club/ticket/${t.id}`)} accessibilityLabel={`Ticket ${c?.title}`}>
                      <View className="flex-row items-center gap-4 rounded-xl border border-border bg-surface p-4">
                        <View className="rounded-lg bg-white p-1.5"><QRCode value={t.code} size={56} /></View>
                        <View className="flex-1 gap-1">
                          <Text variant="heading" numberOfLines={1}>{c?.title}</Text>
                          <Text variant="label" tone="muted">{dayLabel(t.occurrenceAt)} · {time(t.occurrenceAt)} · {c?.room}</Text>
                          <TicketPill status={t.status} />
                        </View>
                        <ChevronRight size={18} color={colors.foreground.subtle} />
                      </View>
                    </Tap>
                  </Animated.View>
                );
              }) : (
                <EmptyState icon={<Ticket size={26} color={colors.foreground.muted} />} title="Aucun ticket à venir" body="Réservez une séance dans le planning : votre ticket QR apparaîtra ici."
                  action={<Button label="Voir le planning" onPress={() => setTab('agenda')} />} />
              )}
              {past.length ? <Text variant="heading" className="mt-4">Historique</Text> : null}
              {past.map((t) => {
                const c = course(t.courseId);
                return (
                  <Tap key={t.id} onPress={() => router.push(`/club/ticket/${t.id}`)}>
                    <View className="flex-row items-center gap-3 rounded-lg border border-border bg-surface p-3">
                      <View className="flex-1">
                        <Text variant="label" className="font-semibold">{c?.title}</Text>
                        <Text variant="caption" tone="muted">{dayLabel(t.occurrenceAt)} · {time(t.occurrenceAt)}</Text>
                      </View>
                      {db.ratings.find((r) => r.ticketId === t.id) ? <Stars value={db.ratings.find((r) => r.ticketId === t.id)!.stars} size={12} />
                        : canRate(db, t) ? <Text variant="caption" className="font-bold" style={{ color: '#FBBF24' }}>À noter ★</Text> : null}
                      <TicketPill status={t.status} />
                    </View>
                  </Tap>
                );
              })}
            </Animated.View>
          ) : null}

          {tab === 'tokens' ? (
            <Animated.View entering={FadeIn} className="rounded-xl border border-border bg-surface p-5">
              <View className="mb-3 flex-row flex-wrap gap-3">
                <Badge tone="success" label={`${wallet.recharged} rechargés`} />
                <Badge tone="warning" label={`${wallet.held} réservés`} />
                <Badge tone="danger" label={`${wallet.spent} débités`} />
              </View>
              {wallet.moves.map((m) => <MoveRow key={m.id} m={m} />)}
              {!wallet.moves.length ? <Text variant="label" tone="muted">Aucun mouvement pour l’instant.</Text> : null}
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
