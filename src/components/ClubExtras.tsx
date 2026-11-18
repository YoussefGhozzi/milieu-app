import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BadgePercent, ChevronRight, Gift, Star } from 'lucide-react-native';
import { Text, colors } from '@milieu/ui';
import type { Ticket } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { activePromotions, formatTnd, fullName, promoLabel, ratingsToGive } from '@/backend/engine';
import { Tap } from '@/components/motion';
import { CoachAvatar, RatingSheet } from '@/pro/Rating';
import { dayLabel } from '@/lib/format';

/** Promotions en cours de la salle du client (définies par l'administrateur), à régler à l'accueil. */
export function PromoBanners({ gymId }: { gymId: string }) {
  const { db } = useNetwork();
  const gym = db.gyms.find((g) => g.id === gymId);
  const promos = activePromotions(db, gymId);
  if (!gym || !promos.length) return null;
  const until = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {promos.map((p, i) => {
        const I = p.kind === 'percent_off' ? BadgePercent : Gift;
        return (
          <Animated.View key={p.id} entering={FadeInDown.delay(i * 80).springify().damping(18)}>
            <View className="w-[280px] flex-row items-center gap-3 rounded-xl bg-energy p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-black/10"><I size={22} color={colors.energy.foreground} /></View>
              <View className="flex-1">
                <Text variant="overline" className="text-energy-foreground">Promo · jusqu’au {until(p.endsOn)}</Text>
                <Text variant="label" className="font-bold text-energy-foreground">{p.title}</Text>
                <Text variant="caption" className="text-energy-foreground opacity-80" numberOfLines={2}>{promoLabel(p)} · à l’accueil</Text>
              </View>
            </View>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

/** Texte « 1 jeton = 10 DT » de la salle. */
export const tokenPriceText = (price: number) => `1 jeton = ${formatTnd(price)}`;

/** Séances terminées à évaluer : invite le client à noter son coach (fiche d'évaluation). */
export function RatePrompt({ clientId }: { clientId: string }) {
  const { db } = useNetwork();
  const [ticket, setTicket] = useState<Ticket | undefined>();
  const todo = ratingsToGive(db, clientId);
  return (
    <>
      {todo.slice(0, 2).map((t, i) => {
        const course = db.courses.find((c) => c.id === t.courseId);
        const coach = db.accounts.find((a) => a.id === course?.coachId);
        return (
          <Animated.View key={t.id} entering={FadeInDown.delay(i * 80)}>
            <Tap onPress={() => setTicket(t)} accessibilityLabel={`Évaluer ${course?.title}`}>
              <View className="mb-3 flex-row items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4">
                <CoachAvatar coach={coach} size={44} />
                <View className="flex-1">
                  <Text variant="label" className="font-bold">Comment était {course?.title} ?</Text>
                  <Text variant="caption" tone="muted">{dayLabel(t.occurrenceAt)} avec {fullName(coach)} · touchez pour noter</Text>
                  <View className="mt-1 flex-row gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} color="#FBBF24" />)}</View>
                </View>
                <ChevronRight size={18} color={colors.foreground.muted} />
              </View>
            </Tap>
          </Animated.View>
        );
      })}
      <RatingSheet ticket={ticket} open={!!ticket} onClose={() => setTicket(undefined)} />
    </>
  );
}
