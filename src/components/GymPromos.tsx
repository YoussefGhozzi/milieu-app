import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { CalendarClock, ChevronRight, Coins, Store } from 'lucide-react-native';
import { Avatar, Badge, SectionHeader, Text, TokenAmount, colors } from '@milieu/ui';
import { useClientAccount, useNetwork } from '@/backend/NetworkProvider';
import { fullName, listSessions, walletOf, type GymSession } from '@/backend/engine';
import { DisciplineArt } from '@/components/ClassVisuals';
import { Appear, Tap } from '@/components/motion';
import { disciplineStyle } from '@/lib/disciplines';
import { addDays, dayLabel, time } from '@/lib/format';
import { openClubSession } from '@/pro/nav';
import { PromoBanners, RatePrompt, tokenPriceText } from './ClubExtras';

const NEW_DAYS = 7;

/** « À l'affiche » : les cours validés de la salle du client, mis en avant comme une publicité. */
export function GymPromos() {
  const { db } = useNetwork();
  const { client, gym } = useClientAccount();

  const promos = useMemo(() => {
    if (!gym) return [];
    const now = new Date();
    const sessions = listSessions(db, { gymId: gym.id, from: now, to: addDays(now, 21) }).filter((s) => s.start > now);
    const firstPerCourse = new Map<string, GymSession>();
    for (const s of sessions) if (!firstPerCourse.has(s.course.id)) firstPerCourse.set(s.course.id, s);
    return [...firstPerCourse.values()].sort((a, b) => (b.course.reviewedAt ?? '').localeCompare(a.course.reviewedAt ?? '') || a.start.getTime() - b.start.getTime());
  }, [db, gym]);

  if (!client || !gym) return null;
  const wallet = walletOf(db, client.id);
  const isNew = (s: GymSession) => !!s.course.reviewedAt && Date.now() - new Date(s.course.reviewedAt).getTime() < NEW_DAYS * 864e5;

  return (
    <Appear index={2}>
      <SectionHeader title="À l’affiche" action="Ma salle" onAction={() => router.push('/club')} />
      <RatePrompt clientId={client.id} />
      <Tap onPress={() => router.push('/club')} accessibilityLabel={`Ma salle ${gym.name}, ${wallet.available} jetons disponibles`}>
        <View className="mb-3 flex-row items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <Store size={18} color={colors.brand.DEFAULT} />
          <View className="flex-1">
            <Text variant="label" className="font-semibold">{gym.name}</Text>
            <Text variant="caption" tone="muted">{tokenPriceText(gym.tokenPriceTnd)} à l’accueil · {wallet.held ? `${wallet.held} réservés` : 'aucune réservation en cours'}</Text>
          </View>
          <TokenAmount value={wallet.available} size="sm" />
          <ChevronRight size={16} color={colors.foreground.subtle} />
        </View>
      </Tap>
      <View className="mb-3"><PromoBanners gymId={gym.id} /></View>
      {promos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
          {promos.map((s) => {
            const st = disciplineStyle(s.course.category);
            return (
              <Tap key={s.key} onPress={() => openClubSession(s)} accessibilityLabel={`${s.course.title}, ${dayLabel(s.start)} à ${time(s.start)}`}>
                <View className="w-[280px] overflow-hidden rounded-xl border border-border bg-surface">
                  <DisciplineArt disciplineId={s.course.category} height={130} rounded={0} iconSize={48} />
                  <View className="absolute left-3 top-3 flex-row gap-2">
                    {isNew(s) ? <Badge tone="brand" label="Nouveau" /> : null}
                    {s.left <= 2 && s.left > 0 ? <Badge tone="warning" label={s.left === 1 ? 'Dernière place' : '2 places'} /> : null}
                    {s.left === 0 ? <Badge tone="danger" label="Complet" /> : null}
                  </View>
                  <View className="gap-2 p-4">
                    <Text variant="overline" style={{ color: st.color }}>{st.mood}</Text>
                    <Text variant="heading" numberOfLines={1}>{s.course.title}</Text>
                    <View className="flex-row items-center gap-2">
                      <Avatar name={fullName(s.coach)} size={22} />
                      <Text variant="label" tone="muted">avec {s.coach?.firstName}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5"><CalendarClock size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">{dayLabel(s.start)} · {time(s.start)}</Text></View>
                      <View className="flex-row items-center gap-1"><Coins size={14} color={colors.brand.DEFAULT} /><Text variant="label" tone="brand" className="font-bold">{s.course.tokenCost}</Text></View>
                    </View>
                  </View>
                </View>
              </Tap>
            );
          })}
        </ScrollView>
      ) : (
        <View className="items-center rounded-xl border border-dashed border-border-strong p-6">
          <Text variant="label" tone="muted" className="text-center">Aucun nouveau cours pour l’instant dans votre salle.</Text>
        </View>
      )}
    </Appear>
  );
}
