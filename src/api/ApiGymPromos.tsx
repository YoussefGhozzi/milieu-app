import { formatTnd, problemMessage, queryKeys, type ApiPendingRating } from '@milieu/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BadgePercent, CalendarClock, CheckCircle2, ChevronRight, Coins, Gift, MessageSquareQuote, Star, Store, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Avatar, Badge, Button, SectionHeader, Text, TokenAmount, colors } from '@milieu/ui';
import { DisciplineArt } from '@/components/ClassVisuals';
import { Appear, Tap } from '@/components/motion';
import { useToast } from '@/components/Toast';
import i18n from '@/i18n';
import { disciplineStyle } from '@/lib/disciplines';
import { dayLabel, time } from '@/lib/format';
import { api } from './client';

const GOLD = '#FBBF24';
const STAR_WORDS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];

/**
 * « À l'affiche » branché sur l'API : séances à noter, ma salle et mon solde, promotions en cours, prochains cours
 * (un par cours). Remplace GymPromos (réseau simulé) quand EXPO_PUBLIC_DATA_SOURCE=api.
 */
export function ApiGymPromos() {
  const gyms = useQuery({ queryKey: [...queryKeys.gyms], queryFn: () => api.gyms.list() });
  const wallet = useQuery({ queryKey: [...queryKeys.myWallet], queryFn: () => api.me.wallet() });
  const promos = useQuery({ queryKey: [...queryKeys.promotions], queryFn: () => api.promotions.list({ state: 'active' }) });
  const calendar = useQuery({ queryKey: [...queryKeys.sessions, 'affiche'], queryFn: () => api.sessions.list({ to: new Date(Date.now() + 21 * 864e5).toISOString() }) });
  const gym = gyms.data?.[0];

  const featured = useMemo(() => {
    const seen = new Set<string>();
    return (calendar.data?.items ?? []).filter((s) => !s.started && !seen.has(s.courseId) && seen.add(s.courseId)).slice(0, 8);
  }, [calendar.data]);

  if (!gym) return null;
  return (
    <Appear index={2}>
      <SectionHeader title="À l’affiche" action="Planning" onAction={() => router.push('/(tabs)/planning')} />
      <ApiRatePrompt />
      <Tap onPress={() => router.push('/(tabs)/wallet')} accessibilityLabel={`Ma salle ${gym.name}, ${wallet.data?.available ?? 0} jetons disponibles`}>
        <View className="mb-3 flex-row items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <Store size={18} color={colors.brand.DEFAULT} />
          <View className="flex-1">
            <Text variant="label" className="font-semibold">{gym.name}</Text>
            <Text variant="caption" tone="muted">1 jeton = {formatTnd(gym.tokenPriceMillimes / 1000)} à l’accueil · {wallet.data?.held ? `${wallet.data.held} réservés` : 'aucune réservation en cours'}</Text>
          </View>
          <TokenAmount value={wallet.data?.available ?? 0} size="sm" />
          <ChevronRight size={16} color={colors.foreground.subtle} />
        </View>
      </Tap>
      {promos.data?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} className="mb-3">
          {promos.data.map((p, i) => {
            const I = p.kind === 'percent_off' ? BadgePercent : Gift;
            const until = new Date(`${p.endsOn}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 80).springify().damping(18)}>
                <View className="w-[280px] flex-row items-center gap-3 rounded-xl bg-energy p-4">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-black/10"><I size={22} color={colors.energy.foreground} /></View>
                  <View className="flex-1">
                    <Text variant="overline" className="text-energy-foreground">Promo · jusqu’au {until}</Text>
                    <Text variant="label" className="font-bold text-energy-foreground">{p.title}</Text>
                    <Text variant="caption" className="text-energy-foreground opacity-80" numberOfLines={2}>{p.label} · à l’accueil</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      ) : null}
      {featured.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
          {featured.map((s) => {
            const st = disciplineStyle(s.category);
            return (
              <Tap key={s.id} onPress={() => router.push(`/class/${s.id}`)} accessibilityLabel={`${s.title}, ${dayLabel(s.startsAt)} à ${time(s.startsAt)}`}>
                <View className="w-[280px] overflow-hidden rounded-xl border border-border bg-surface">
                  <DisciplineArt disciplineId={s.category} height={130} rounded={0} iconSize={48} />
                  <View className="absolute left-3 top-3 flex-row gap-2">
                    {s.seatsLeft <= 2 && s.seatsLeft > 0 ? <Badge tone="warning" label={s.seatsLeft === 1 ? 'Dernière place' : '2 places'} /> : null}
                    {s.full ? <Badge tone="danger" label="Complet" /> : null}
                  </View>
                  <View className="gap-2 p-4">
                    <Text variant="overline" style={{ color: st.color }}>{st.mood}</Text>
                    <Text variant="heading" numberOfLines={1}>{s.title}</Text>
                    <View className="flex-row items-center gap-2">
                      <Avatar name={`${s.coach.firstName} ${s.coach.lastName}`} size={22} />
                      <Text variant="label" tone="muted">avec {s.coach.firstName}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5"><CalendarClock size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">{dayLabel(s.startsAt)} · {time(s.startsAt)}</Text></View>
                      <View className="flex-row items-center gap-1"><Coins size={14} color={colors.brand.DEFAULT} /><Text variant="label" tone="brand" className="font-bold">{s.tokenCost}</Text></View>
                    </View>
                  </View>
                </View>
              </Tap>
            );
          })}
        </ScrollView>
      ) : (
        <View className="items-center rounded-xl border border-dashed border-border-strong p-6">
          <Text variant="label" tone="muted" className="text-center">Aucun cours à venir pour l’instant dans votre salle.</Text>
        </View>
      )}
    </Appear>
  );
}

/** Séances terminées à noter (30 jours après la fin) : invite à évaluer le coach. */
export function ApiRatePrompt() {
  const pending = useQuery({ queryKey: [...queryKeys.pendingRatings], queryFn: () => api.me.pendingRatings() });
  const [item, setItem] = useState<ApiPendingRating | undefined>();
  return (
    <>
      {(pending.data?.items ?? []).slice(0, 2).map((t, i) => (
        <Animated.View key={t.ticketId} entering={FadeInDown.delay(i * 80)}>
          <Tap onPress={() => setItem(t)} accessibilityLabel={`Évaluer ${t.title}`}>
            <View className="mb-3 flex-row items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4">
              <Avatar name={`${t.coach.firstName} ${t.coach.lastName}`} size={44} />
              <View className="flex-1">
                <Text variant="label" className="font-bold">Comment était {t.title} ?</Text>
                <Text variant="caption" tone="muted">{dayLabel(t.startsAt)} avec {t.coach.firstName} · touchez pour noter</Text>
                <View className="mt-1 flex-row gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} color={GOLD} />)}</View>
              </View>
              <ChevronRight size={18} color={colors.foreground.muted} />
            </View>
          </Tap>
        </Animated.View>
      ))}
      <ApiRatingSheet item={item} onClose={() => setItem(undefined)} />
    </>
  );
}

function ApiRatingSheet({ item, onClose }: { item?: ApiPendingRating; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { setStars(0); setComment(''); setDone(false); setBusy(false); }, [item?.ticketId]);
  if (!item) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await api.tickets.rate(item.ticketId, stars, comment.trim() || undefined);
      setDone(true);
      await qc.invalidateQueries({ queryKey: [...queryKeys.pendingRatings] });
      setTimeout(onClose, 1600);
    } catch (e) {
      toast(problemMessage(e, i18n.language as 'fr' | 'en' | 'ar'), 'danger');
      // Déjà notée ou délai dépassé : la liste « à noter » est rechargée.
      void qc.invalidateQueries({ queryKey: [...queryKeys.pendingRatings] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 p-4">
        <Pressable className="absolute inset-0" accessibilityLabel="Fermer" onPress={onClose} />
        <Animated.View entering={ZoomIn.springify().damping(16)} className="w-full max-w-md gap-4 rounded-xl border border-border bg-surface p-6">
          {done ? (
            <View className="items-center gap-3 py-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success-soft"><CheckCircle2 size={36} color={colors.success.DEFAULT} /></View>
              <Text variant="title" className="text-center">Merci !</Text>
              <Text tone="muted" className="text-center">Votre avis aide {item.coach.firstName} et les autres membres.</Text>
            </View>
          ) : (
            <>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text variant="overline" tone="brand">Évaluer la séance</Text>
                  <Text variant="title" className="mt-1">{item.title}</Text>
                  <Text variant="caption" tone="muted">{dayLabel(item.startsAt)} · {time(item.startsAt)} · avec {item.coach.firstName}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Plus tard" onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-surface-raised"><X size={16} color={colors.foreground.DEFAULT} /></Pressable>
              </View>
              <View className="items-center gap-2">
                <View accessibilityRole="radiogroup" className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Pressable key={i} accessibilityRole="radio" accessibilityState={{ checked: i <= stars }} accessibilityLabel={`${i} étoile${i > 1 ? 's' : ''}`} hitSlop={6} onPress={() => setStars(i)}>
                      <Star size={36} color={GOLD} fill={i <= stars ? GOLD : 'transparent'} />
                    </Pressable>
                  ))}
                </View>
                <Text variant="label" className="font-semibold" style={{ color: GOLD, opacity: stars ? 1 : 0 }}>{STAR_WORDS[stars] || '·'}</Text>
              </View>
              <View className="gap-1.5">
                <View className="flex-row items-center gap-2"><MessageSquareQuote size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">Votre avis (facultatif)</Text></View>
                <TextInput multiline maxLength={500} value={comment} onChangeText={setComment} placeholder="Ce que vous avez aimé, ce qui pourrait être amélioré…" placeholderTextColor={colors.foreground.subtle}
                  style={{ minHeight: 84, color: colors.foreground.DEFAULT, fontSize: 15, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border.DEFAULT, backgroundColor: colors.surface.sunken, textAlignVertical: 'top', outlineStyle: 'none' } as never} />
              </View>
              <Button block size="lg" loading={busy} label={stars ? `Envoyer ${stars} étoile${stars > 1 ? 's' : ''}` : 'Choisissez une note'} disabled={!stars || busy} onPress={submit} />
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
