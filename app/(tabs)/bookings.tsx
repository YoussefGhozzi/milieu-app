import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CalendarPlus, History } from 'lucide-react-native';
import { Button, EmptyState, Text, colors } from '@milieu/ui';
import { useMyBookings } from '@/demo/DemoProvider';
import { Segmented } from '@/components/Chrome';
import { ClassCard } from '@/components/ClassVisuals';
import { Grid } from '@/components/Grid';

/** A12 — Mes réservations : à venir (avec liste d'attente) et historique. */
export default function Bookings() {
  const insets = useSafeAreaInsets();
  const { upcoming, past } = useMyBookings();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const rows = tab === 'upcoming' ? upcoming : past;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 12 }}>
      <View className="w-full max-w-3xl gap-4 self-center px-5">
        <Text variant="display">Réservations</Text>
        <Segmented value={tab} onChange={setTab} options={[{ key: 'upcoming', label: `À venir (${upcoming.length})` }, { key: 'past', label: 'Historique' }]} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-3xl gap-3 self-center px-5 pt-4">
          {rows.length === 0 ? (
            tab === 'upcoming' ? (
              <EmptyState icon={<CalendarPlus size={28} color={colors.brand.DEFAULT} />} title="Aucun cours à venir"
                body="Votre prochaine séance n’attend que vous." action={<Button label="Réserver un cours" onPress={() => router.push('/(tabs)/planning')} />} />
            ) : (
              <EmptyState icon={<History size={28} color={colors.foreground.muted} />} title="Pas encore d’historique" body="Vos cours passés apparaîtront ici." />
            )
          ) : (
            <Grid>{rows.map((r, i) => (
              <Animated.View key={`${tab}-${r.booking.id}`} entering={FadeInDown.delay(i * 50).duration(350)}>
                <ClassCard v={r.v} status={r.booking.status} showDay onPress={() => router.push(`/booking/${r.booking.id}`)} />
              </Animated.View>
            ))}</Grid>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
