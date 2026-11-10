import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BellOff, CalendarX2, Coins, Hourglass, Info, Timer } from 'lucide-react-native';
import type { AppNotification } from '@milieu/contracts';
import { EmptyState, Text, cn, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { Header } from '@/components/Chrome';
import { relative } from '@/lib/format';

const ICONS: Record<AppNotification['kind'], { icon: typeof Info; color: string }> = {
  reminder: { icon: Timer, color: colors.brand.DEFAULT },
  waitlist_promoted: { icon: Hourglass, color: colors.success.DEFAULT },
  class_cancelled: { icon: CalendarX2, color: colors.danger.DEFAULT },
  tokens_credited: { icon: Coins, color: colors.brand.DEFAULT },
  info: { icon: Info, color: colors.info.DEFAULT },
};

/** A21 — Notifications : rappels, place libérée, cours annulé par le studio, jetons crédités. */
export default function Notifications() {
  const { state, unread, markAllRead } = useDemo();
  return (
    <View className="flex-1 bg-background">
      <Header title="Notifications" right={unread > 0 ? <Text variant="label" tone="brand" onPress={markAllRead}>Tout lire</Text> : undefined} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-2 self-center px-5">
          {state.notifications.length === 0 ? (
            <EmptyState icon={<BellOff size={28} color={colors.foreground.muted} />} title="Rien de nouveau" body="Vos rappels et alertes de places apparaîtront ici." />
          ) : state.notifications.map((n, i) => {
            const m = ICONS[n.kind];
            const I = m.icon;
            return (
              <Animated.View key={n.id} entering={FadeInDown.delay(i * 50)}>
                <View className={cn('flex-row gap-3 rounded-lg border p-4', n.read ? 'border-border bg-surface' : 'border-brand/30 bg-brand-soft')}>
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-raised"><I size={18} color={m.color} /></View>
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text variant="label" className="flex-1 font-semibold">{n.title}</Text>
                      <Text variant="caption" tone="subtle">{relative(n.at)}</Text>
                    </View>
                    <Text variant="label" tone="muted">{n.body}</Text>
                  </View>
                  {!n.read ? <View className="mt-1.5 h-2 w-2 rounded-full bg-brand" /> : null}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
