import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Bell, ChevronRight, Coffee, Hourglass, Moon, Plus, QrCode, Sun, Wallet } from 'lucide-react-native';
import { Avatar, Badge, Button, SectionHeader, Text, TokenAmount, colors } from '@milieu/ui';
import { useDemo, useMyBookings } from '@/demo/DemoProvider';
import { ClassCard, DisciplineArt } from '@/components/ClassVisuals';
import { Appear, Tap } from '@/components/motion';
import { Grid } from '@/components/Grid';
import { Logo } from '@/components/Logo';
import { useAppTheme } from '@/theme/AppTheme';
import { disciplineStyle } from '@/lib/disciplines';
import { dayLabel, dayLong, hoursUntil, locale, sameDay, time } from '@/lib/format';

/** A06 — Accueil : solde, prochain cours avec QR, cours du jour, disciplines. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const { state, studio, balance, unread, view, bookingFor } = useDemo();
  const { upcoming } = useMyBookings();
  const { mode, toggle } = useAppTheme();
  const next = upcoming.find((r) => r.booking.status === 'booked');
  const waiting = upcoming.filter((r) => r.booking.status === 'waitlist');
  const now = new Date();
  const today = state.sessions
    .filter((s) => new Date(s.startsAt) > now && sameDay(new Date(s.startsAt), now))
    .slice(0, 6);
  const soon = today.length ? today : state.sessions.filter((s) => new Date(s.startsAt) > now).slice(0, 6);
  const bonus = state.wallet.bonus[0];
  const h = next ? hoursUntil(next.v.session.startsAt) : 0;
  const countdown = h < 1 ? `Dans ${Math.max(1, Math.round(h * 60))} min` : h < 24 ? `Dans ${Math.round(h)} h` : dayLabel(next!.v.session.startsAt);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-3xl self-center px-5">
        {/* En-tête */}
        <Appear>
          <View className="flex-row items-center justify-between">
            <View>
              <View className="mb-3 flex-row items-center gap-3">
                <Logo height={20} />
                <Pressable accessibilityRole="button" accessibilityLabel={mode === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit'} onPress={toggle} hitSlop={10}
                  className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
                  {mode === 'dark' ? <Sun size={16} color={colors.warning.DEFAULT} /> : <Moon size={16} color={colors.info.DEFAULT} />}
                </Pressable>
              </View>
              <Text variant="caption" tone="muted" className="capitalize">{dayLong(now)}</Text>
              <Text variant="title">Bonjour {state.member.firstName}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable accessibilityRole="button" accessibilityLabel={`Notifications, ${unread} non lues`} onPress={() => router.push('/notifications')}
                className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface">
                <Bell size={20} color={colors.foreground.DEFAULT} />
                {unread > 0 ? (
                  <View className="absolute right-2 top-2 h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1">
                    <Text variant="caption" tone="onBrand" className="text-[10px] font-bold leading-[14px]">{unread}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Mon profil" onPress={() => router.push('/(tabs)/profile')}>
                <Avatar name={`${state.member.firstName} ${state.member.lastName}`} size={44} />
              </Pressable>
            </View>
          </View>
        </Appear>

        {/* Solde */}
        <Appear index={1}>
          <View className="mt-6 overflow-hidden rounded-xl border border-brand/30">
            <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="bal" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={colors.brand.DEFAULT} stopOpacity="0.55" />
                  <Stop offset="0.55" stopColor={colors.surface.raised} stopOpacity="1" />
                  <Stop offset="1" stopColor={colors.energy.DEFAULT} stopOpacity="0.35" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#bal)" />
            </Svg>
            <View className="p-5">
              <Text variant="overline" tone="brand">Votre solde</Text>
              <View className="mt-2 flex-row items-end gap-2">
                <TokenAmount value={balance} size="lg" />
                <Text variant="label" tone="muted" className="mb-1.5">M Tokens</Text>
              </View>
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Badge label={`${state.wallet.purchased} achetés`} />
                {bonus ? <Badge tone="brand" label={`${bonus.amount} bonus · jusqu’au ${new Date(bonus.expiresAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}`} /> : null}
              </View>
              <View className="mt-5 flex-row gap-3">
                <Button className="flex-1" label="Recharger" icon={<Plus size={18} color={colors.brand.foreground} />} onPress={() => router.push('/shop')} />
                <Button className="flex-1" variant="secondary" label="Portefeuille" icon={<Wallet size={18} color={colors.foreground.DEFAULT} />} onPress={() => router.push('/(tabs)/wallet')} />
              </View>
            </View>
          </View>
        </Appear>

        {/* Prochain cours */}
        <Appear index={2}>
          <SectionHeader title="Votre prochain cours" action={upcoming.length ? 'Tout voir' : undefined} onAction={() => router.push('/(tabs)/bookings')} />
          {next ? (
            <Tap onPress={() => router.push(`/booking/${next.booking.id}`)} accessibilityLabel={`Prochain cours : ${next.v.discipline.name}, ${countdown}`}>
              <View className="overflow-hidden rounded-xl border border-border bg-surface">
                <DisciplineArt disciplineId={next.v.discipline.id} height={120} rounded={0} iconSize={44} />
                <View className="absolute left-5 top-5">
                  <Badge tone="brand" label={countdown} />
                </View>
                <View className="flex-row items-center gap-4 p-5">
                  <View className="flex-1">
                    <Text variant="overline" style={{ color: disciplineStyle(next.v.discipline.id).color }}>{next.v.discipline.name}</Text>
                    <Text variant="heading" className="mt-1">{dayLabel(next.v.session.startsAt)} · {time(next.v.session.startsAt)}</Text>
                    <Text variant="label" tone="muted" className="mt-0.5">{next.v.room.name} · avec {next.v.coach.firstName}</Text>
                  </View>
                  <View className="items-center gap-1 rounded-lg bg-foreground p-3">
                    <QrCode size={28} color={colors.background} />
                    <Text variant="caption" className="font-semibold text-background">Mon QR</Text>
                  </View>
                </View>
              </View>
            </Tap>
          ) : (
            <View className="items-center gap-3 rounded-xl border border-dashed border-border-strong p-6">
              <Text variant="heading">Aucun cours prévu</Text>
              <Text tone="muted" className="text-center">Choisissez votre prochain cours dans le planning.</Text>
              <Button size="sm" label="Voir le planning" onPress={() => router.push('/(tabs)/planning')} />
            </View>
          )}
          {waiting.map((w) => (
            <Pressable key={w.booking.id} onPress={() => router.push(`/booking/${w.booking.id}`)}
              className="mt-3 flex-row items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4 active:opacity-80">
              <Hourglass size={18} color={colors.warning.DEFAULT} />
              <Text variant="label" className="flex-1">Liste d’attente · {w.v.discipline.name} {dayLabel(w.v.session.startsAt).toLowerCase()} {time(w.v.session.startsAt)} · position {w.booking.waitlistPosition}</Text>
              <ChevronRight size={16} color={colors.foreground.muted} />
            </Pressable>
          ))}
        </Appear>

        {/* Bientôt au studio */}
        <Appear index={3}>
          <SectionHeader title={today.length ? 'Aujourd’hui au studio' : 'Bientôt au studio'} action="Planning" onAction={() => router.push('/(tabs)/planning')} />
          <Grid>
            {soon.slice(0, 4).map((s) => {
              const v = view(s.id)!;
              return <ClassCard key={s.id} v={v} status={bookingFor(s.id)?.status} showDay={!today.length} onPress={() => router.push(`/class/${s.id}`)} />;
            })}
          </Grid>
        </Appear>

        {/* Disciplines */}
        <Appear index={4}>
          <SectionHeader title="Explorer par discipline" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {studio.disciplines.map((d) => {
              const st = disciplineStyle(d.id);
              const Icon = st.icon;
              return (
                <Tap key={d.id} onPress={() => router.push({ pathname: '/(tabs)/planning', params: { d: d.id } })} accessibilityLabel={`Voir les cours de ${d.name}`}>
                  <View className="w-36 gap-3 rounded-xl border border-border bg-surface p-4">
                    <View style={{ backgroundColor: `${st.color}22` }} className="h-11 w-11 items-center justify-center rounded-full">
                      <Icon size={22} color={st.color} />
                    </View>
                    <View>
                      <Text variant="label" className="font-semibold">{d.name}</Text>
                      <Text variant="caption" tone="muted">{d.tokenCost} jetons · {d.durationMin} min</Text>
                    </View>
                  </View>
                </Tap>
              );
            })}
          </ScrollView>
        </Appear>

        {/* MILIEU Perks */}
        <Appear index={5}>
          <Tap onPress={() => router.push('/perks')} accessibilityLabel="MILIEU Perks : 7 séances sur 10, un café offert disponible">
            <View className="mt-6 flex-row items-center gap-4 rounded-xl bg-energy p-5">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-black/10"><Coffee size={24} color={colors.energy.foreground} /></View>
              <View className="flex-1">
                <Text variant="overline" className="text-energy-foreground">MILIEU Perks</Text>
                <Text variant="heading" className="font-bold text-energy-foreground">7 / 10 séances · 1 café offert</Text>
              </View>
              <ChevronRight size={22} color={colors.energy.foreground} />
            </View>
          </Tap>
        </Appear>

        {/* Offre */}
        <Appear index={5}>
          <Tap onPress={() => router.push('/shop')}>
            <View className="mt-6 flex-row items-center gap-4 rounded-xl bg-brand p-5">
              <View className="flex-1">
                <Text variant="overline" tone="onBrand">Offre du moment</Text>
                <Text variant="heading" tone="onBrand" className="mt-1 font-bold">Pack ALL IN : 20 % d’économie par jeton</Text>
              </View>
              <ChevronRight size={22} color={colors.brand.foreground} />
            </View>
          </Tap>
        </Appear>
      </View>
    </ScrollView>
  );
}
