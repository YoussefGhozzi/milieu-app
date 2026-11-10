import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { CalendarX2 } from 'lucide-react-native';
import { Chip, EmptyState, Text, cn, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { ClassCard } from '@/components/ClassVisuals';
import { Tap } from '@/components/motion';
import { addDays, dayShort, sameDay, startOfDay } from '@/lib/format';

function LiveDot() {
  const o = useSharedValue(1);
  useEffect(() => { o.value = withRepeat(withTiming(0.25, { duration: 900 }), -1, true); }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success.DEFAULT }, style]} />;
}

/** A07 — Planning : jours, filtres par discipline et salle, places en direct. */
export default function Planning() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ d?: string }>();
  const { state, studio, view, bookingFor } = useDemo();
  const today = startOfDay(new Date());
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today.getTime()]);
  const [day, setDay] = useState(0);
  const [discipline, setDiscipline] = useState<string>(params.d ?? 'all');
  const [room, setRoom] = useState<string>('all');

  useEffect(() => { if (params.d) setDiscipline(params.d); }, [params.d]);

  const now = new Date();
  const list = state.sessions
    .filter((s) => sameDay(new Date(s.startsAt), days[day]) && new Date(s.startsAt) > now)
    .filter((s) => discipline === 'all' || s.disciplineId === discipline)
    .filter((s) => room === 'all' || s.roomId === room)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 12 }}>
      <View className="w-full max-w-xl self-center px-5">
        <View className="flex-row items-end justify-between">
          <Text variant="display">Planning</Text>
          <View className="mb-2 flex-row items-center gap-2">
            <LiveDot />
            <Text variant="caption" tone="muted">Places en direct</Text>
          </View>
        </View>
      </View>

      {/* Jours */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 max-h-20 grow-0" contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {days.map((d, i) => {
          const active = i === day;
          return (
            <Tap key={d.toISOString()} onPress={() => setDay(i)} accessibilityLabel={d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} accessibilityState={{ selected: active }}>
              <View className={cn('h-[72px] w-14 items-center justify-center gap-1 rounded-lg border', active ? 'border-brand bg-brand' : 'border-border bg-surface')}>
                <Text variant="caption" tone={active ? 'onBrand' : 'muted'} className="capitalize">{i === 0 ? 'Auj.' : dayShort(d)}</Text>
                <Text variant="heading" tone={active ? 'onBrand' : 'default'} className="font-bold">{d.getDate()}</Text>
              </View>
            </Tap>
          );
        })}
      </ScrollView>

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 max-h-12 grow-0" contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        <Chip label="Toutes" selected={discipline === 'all'} onPress={() => setDiscipline('all')} />
        {studio.disciplines.map((d) => (
          <Chip key={d.id} label={d.name} selected={discipline === d.id} onPress={() => setDiscipline(discipline === d.id ? 'all' : d.id)} />
        ))}
      </ScrollView>
      <View className="mt-2 w-full max-w-xl flex-row gap-2 self-center px-5">
        {[{ id: 'all', name: 'Toutes les salles' }, ...studio.rooms].map((r) => (
          <Text key={r.id} variant="label" tone={room === r.id ? 'brand' : 'subtle'} onPress={() => setRoom(r.id)}
            className={cn('py-2', room === r.id && 'font-semibold underline')}>{r.name}</Text>
        ))}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-xl gap-3 self-center px-5 pt-2">
          <Text variant="caption" tone="muted">{list.length} cours · {days[day].toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          {list.length === 0 ? (
            <EmptyState icon={<CalendarX2 size={28} color={colors.foreground.muted} />} title="Aucun cours"
              body="Aucun cours ne correspond à ces filtres ce jour-là. Essayez un autre jour ou une autre discipline." />
          ) : (
            list.map((s, i) => (
              <Animated.View key={`${s.id}-${discipline}-${room}-${day}`} entering={FadeInDown.delay(i * 40).duration(350)}>
                <ClassCard v={view(s.id)!} status={bookingFor(s.id)?.status} onPress={() => router.push(`/class/${s.id}`)} />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
