import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { CalendarPlus, Check } from 'lucide-react-native';
import { Button, Text, TokenAmount, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { BottomBar } from '@/components/Chrome';
import { useToast } from '@/components/Toast';
import { disciplineStyle } from '@/lib/disciplines';
import { dayLong, time } from '@/lib/format';

function Pulse() {
  const s = useSharedValue(1);
  useEffect(() => { s.value = withDelay(400, withRepeat(withTiming(1.6, { duration: 1400 }), -1, false)); }, [s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 1.6 - s.value }));
  return <Animated.View style={[{ position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: colors.success.DEFAULT }, style]} />;
}

/** A10 — Réservation réussie : confirmation animée, QR, ajout au calendrier. */
export default function BookingSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { state, view, balance } = useDemo();
  const booking = state.bookings.find((b) => b.id === id);
  const v = booking ? view(booking.sessionId) : undefined;
  if (!booking || !v) return null;
  const st = disciplineStyle(v.discipline.id);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 48, paddingBottom: 24 }}>
        <View className="w-full max-w-xl items-center gap-6 self-center px-5">
          <View className="h-28 w-28 items-center justify-center">
            <Pulse />
            <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.success.DEFAULT, alignItems: 'center', justifyContent: 'center' }}>
              <Check size={48} color={colors.background} strokeWidth={3} />
            </Animated.View>
          </View>
          <Animated.View entering={FadeInDown.delay(250)} style={{ alignItems: 'center' }}>
            <Text variant="display" className="text-center">C’est réservé !</Text>
            <Text tone="muted" className="mt-2 text-center">Votre place est confirmée. À très vite au studio.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)} style={{ width: '100%' }}>
            <View className="w-full overflow-hidden rounded-xl border border-border bg-surface">
              <View style={{ height: 4, backgroundColor: st.color }} />
              <View className="flex-row items-center gap-4 p-5">
                <View className="flex-1 gap-1">
                  <Text variant="overline" style={{ color: st.color }}>{v.discipline.name}</Text>
                  <Text variant="heading" className="capitalize">{dayLong(v.session.startsAt)}</Text>
                  <Text variant="label" tone="muted">{time(v.session.startsAt)} · {v.session.durationMin} min · {v.room.name}</Text>
                  <Text variant="label" tone="muted">avec {v.coach.firstName} {v.coach.lastName}</Text>
                </View>
                <View className="rounded-lg bg-white p-2">
                  <QRCode value={booking.qr ?? booking.id} size={84} backgroundColor="#ffffff" color="#090909" />
                </View>
              </View>
              <View className="flex-row items-center justify-between border-t border-border px-5 py-3">
                <Text variant="label" tone="muted">Nouveau solde</Text>
                <TokenAmount value={balance} size="sm" />
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
      <BottomBar>
        <Button block size="lg" label="Voir mon QR d’entrée" onPress={() => router.replace(`/booking/${booking.id}`)} />
        <View className="mt-2 flex-row gap-3">
          <Button className="flex-1" variant="secondary" label="Calendrier" icon={<CalendarPlus size={18} color={colors.foreground.DEFAULT} />} onPress={() => toast('Ajouté à votre calendrier')} />
          <Button className="flex-1" variant="secondary" label="Accueil" onPress={() => router.replace('/(tabs)')} />
        </View>
      </BottomBar>
    </View>
  );
}
