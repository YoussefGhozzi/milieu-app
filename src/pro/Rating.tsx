import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { CheckCircle2, MessageSquareQuote, Star, X } from 'lucide-react-native';
import { Avatar, Button, Text, cn, colors } from '@milieu/ui';
import type { Account, Ticket } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { coachRating, fullName, rateSession, type CoachRating } from '@/backend/engine';
import { disciplineStyle } from '@/lib/disciplines';
import { dayLabel, relative, time } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { CATEGORIES } from './courseText';

const GOLD = '#FBBF24';

/** Photo de profil du coach, ou ses initiales s'il n'en a pas. */
export function CoachAvatar({ coach, size = 48 }: { coach?: Account; size?: number }) {
  if (coach?.photoUrl) {
    return <Image source={{ uri: coach.photoUrl }} accessibilityLabel={fullName(coach)} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface.raised }} />;
  }
  return <Avatar name={fullName(coach)} size={size} />;
}

/** Étoiles en lecture seule (gère les demi-valeurs à l'affichage). */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View className="flex-row items-center" accessibilityLabel={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <View key={i} style={{ width: size, height: size, marginRight: 1 }}>
            <Star size={size} color={colors.border.strong} fill={colors.border.strong} />
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: size * fill, overflow: 'hidden' }}>
              <Star size={size} color={GOLD} fill={GOLD} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Pastille « ★ 4,8 · 12 avis ». */
export function RatingBadge({ rating, compact }: { rating: CoachRating; compact?: boolean }) {
  if (!rating.count) return <View className="rounded-full bg-surface-raised px-2.5 py-1"><Text variant="caption" tone="muted" className="font-semibold">Nouveau coach</Text></View>;
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(251,191,36,0.16)' }}>
      <Star size={13} color={GOLD} fill={GOLD} />
      <Text variant="caption" className="font-bold" style={{ color: GOLD }}>{rating.avg.toFixed(1).replace('.', ',')}</Text>
      {!compact ? <Text variant="caption" tone="muted">· {rating.count} avis</Text> : null}
    </View>
  );
}

/** Note moyenne + répartition par nombre d'étoiles. */
export function RatingSummary({ rating }: { rating: CoachRating }) {
  return (
    <View className="flex-row flex-wrap items-center gap-6">
      <View className="items-center gap-1">
        <Text variant="display" className="text-[44px] leading-[50px]">{rating.count ? rating.avg.toFixed(1).replace('.', ',') : '—'}</Text>
        <Stars value={rating.avg} size={16} />
        <Text variant="caption" tone="muted">{rating.count} évaluation{rating.count > 1 ? 's' : ''}</Text>
      </View>
      <View className="min-w-[180px] flex-1 gap-1.5">
        {[5, 4, 3, 2, 1].map((s) => {
          const n = rating.distribution[s - 1];
          const pct = rating.count ? n / rating.count : 0;
          return (
            <View key={s} className="flex-row items-center gap-2">
              <Text variant="caption" tone="muted" className="w-3">{s}</Text>
              <Star size={11} color={GOLD} fill={GOLD} />
              <View className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
                <Animated.View entering={FadeIn.delay(100 * (5 - s))} style={{ width: `${pct * 100}%`, height: 8, borderRadius: 4, backgroundColor: GOLD }} />
              </View>
              <Text variant="caption" tone="subtle" className="w-5 text-right">{n}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function ReviewItem({ r }: { r: { stars: number; comment?: string; at: string; clientId: string; courseId: string } }) {
  const { db } = useNetwork();
  const client = db.accounts.find((a) => a.id === r.clientId);
  const course = db.courses.find((c) => c.id === r.courseId);
  return (
    <View className="gap-1.5 rounded-lg bg-surface-raised p-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="label" className="font-semibold">{client ? `${client.firstName} ${client.lastName.charAt(0)}.` : 'Client'}</Text>
        <Stars value={r.stars} size={12} />
      </View>
      {r.comment ? <Text variant="label" tone="muted">« {r.comment} »</Text> : null}
      <Text variant="caption" tone="subtle">{course?.title} · {relative(r.at)}</Text>
    </View>
  );
}

/** Petite fenêtre « profil du coach » vue par le client : photo, parcours, note en haut à droite, avis. */
export function CoachProfileModal({ coach, open, onClose }: { coach?: Account; open: boolean; onClose: () => void }) {
  const { db } = useNetwork();
  if (!coach) return null;
  const rating = coachRating(db, coach.id);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 p-4">
        <Pressable className="absolute inset-0" accessibilityLabel="Fermer" onPress={onClose} />
        <Animated.View entering={ZoomIn.springify().damping(16)} className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface" style={{ maxHeight: '88%' }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="h-24 bg-brand-soft" />
            <View className="-mt-12 items-center gap-2 px-5">
              <View className="rounded-full border-4 border-surface"><CoachAvatar coach={coach} size={96} /></View>
              <Text variant="title" className="text-center">{fullName(coach)}</Text>
              <Text variant="overline" tone="brand">Coach</Text>
              {coach.specialties?.length ? (
                <View className="flex-row flex-wrap justify-center gap-2">
                  {coach.specialties.map((k) => {
                    const st = disciplineStyle(k);
                    const I = st.icon;
                    return (
                      <View key={k} className="flex-row items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: `${st.color}22` }}>
                        <I size={12} color={st.color} />
                        <Text variant="caption" className="font-semibold" style={{ color: st.color }}>{CATEGORIES.find((c) => c.key === k)?.label ?? k}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
            <View className="mt-5 gap-2 px-5">
              <Text variant="label" className="font-semibold">Parcours</Text>
              <Text tone="muted" className="leading-6">{coach.bio || 'Ce coach n’a pas encore présenté son parcours.'}</Text>
            </View>
            {rating.count ? (
              <View className="mt-5 gap-3 px-5">
                <View className="flex-row items-center gap-2">
                  <Stars value={rating.avg} size={16} />
                  <Text variant="label" className="font-semibold">{rating.avg.toFixed(1).replace('.', ',')} / 5</Text>
                  <Text variant="caption" tone="muted">· {rating.count} séance{rating.count > 1 ? 's' : ''} évaluée{rating.count > 1 ? 's' : ''}</Text>
                </View>
                {rating.reviews.slice(0, 3).map((r, i) => (
                  <Animated.View key={r.id} entering={FadeInDown.delay(150 + i * 70)}><ReviewItem r={r} /></Animated.View>
                ))}
              </View>
            ) : (
              <Text variant="caption" tone="subtle" className="mt-5 px-5">Pas encore d’évaluation : soyez le premier à noter ce coach après votre séance.</Text>
            )}
          </ScrollView>
          {/* Note du coach, en haut à droite de la fenêtre */}
          <View className="absolute right-3 top-3 flex-row items-center gap-2">
            <RatingBadge rating={rating} />
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-background/70">
              <X size={16} color={colors.foreground.DEFAULT} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const STAR_WORDS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Exceptionnel'];

function StarButton({ i, active, onPress }: { i: number; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  useEffect(() => { if (active) scale.value = withSequence(withSpring(1.3, { damping: 6 }), withSpring(1)); }, [active, scale]);
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${i} étoile${i > 1 ? 's' : ''}`} onPress={onPress} hitSlop={6}>
      <Animated.View style={style}><Star size={40} color={active ? GOLD : colors.border.strong} fill={active ? GOLD : 'transparent'} strokeWidth={1.5} /></Animated.View>
    </Pressable>
  );
}

/** Fiche d'évaluation d'une séance terminée : note obligatoire, avis facultatif. */
export function RatingSheet({ ticket, open, onClose }: { ticket?: Ticket; open: boolean; onClose: () => void }) {
  const { db, run } = useNetwork();
  const toast = useToast();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { if (open) { setStars(0); setComment(''); setDone(false); } }, [open, ticket?.id]);
  if (!ticket) return null;
  const course = db.courses.find((c) => c.id === ticket.courseId);
  const coach = db.accounts.find((a) => a.id === course?.coachId);
  const client = db.accounts.find((a) => a.id === ticket.clientId);

  const submit = () => {
    if (!client) return;
    const r = run((d) => rateSession(d, client, ticket.id, stars, comment));
    if (!r.ok) { toast(r.error, 'danger'); return; }
    setDone(true);
    setTimeout(onClose, 1600);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 p-4">
        <Pressable className="absolute inset-0" accessibilityLabel="Fermer" onPress={onClose} />
        <Animated.View entering={ZoomIn.springify().damping(16)} className="w-full max-w-md gap-4 rounded-xl border border-border bg-surface p-6">
          {done ? (
            <Animated.View entering={ZoomIn} className="items-center gap-3 py-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success-soft"><CheckCircle2 size={36} color={colors.success.DEFAULT} /></View>
              <Text variant="title" className="text-center">Merci !</Text>
              <Text tone="muted" className="text-center">Votre avis aide {coach?.firstName} et les autres membres.</Text>
            </Animated.View>
          ) : (
            <>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text variant="overline" tone="brand">Évaluer la séance</Text>
                  <Text variant="title" className="mt-1">{course?.title}</Text>
                  <Text variant="caption" tone="muted">{dayLabel(ticket.occurrenceAt)} · {time(ticket.occurrenceAt)}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Plus tard" onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-surface-raised"><X size={16} color={colors.foreground.DEFAULT} /></Pressable>
              </View>
              <View className="flex-row items-center gap-3 rounded-lg bg-surface-raised p-3">
                <CoachAvatar coach={coach} size={44} />
                <View className="flex-1">
                  <Text variant="caption" tone="muted">Comment était votre coach ?</Text>
                  <Text variant="heading">{fullName(coach)}</Text>
                </View>
              </View>
              <View className="items-center gap-2">
                <View accessibilityRole="radiogroup" className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((i) => <StarButton key={i} i={i} active={i <= stars} onPress={() => setStars(i)} />)}
                </View>
                <Text variant="label" className={cn('font-semibold', !stars && 'opacity-0')} style={{ color: GOLD }}>{STAR_WORDS[stars] || '·'}</Text>
              </View>
              <View className="gap-1.5">
                <View className="flex-row items-center gap-2"><MessageSquareQuote size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">Votre avis (facultatif)</Text></View>
                <TextInput multiline maxLength={500} value={comment} onChangeText={setComment} placeholder="Ce que vous avez aimé, ce qui pourrait être amélioré…" placeholderTextColor={colors.foreground.subtle}
                  style={{ minHeight: 84, color: colors.foreground.DEFAULT, fontSize: 15, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border.DEFAULT, backgroundColor: colors.surface.sunken, textAlignVertical: 'top', outlineStyle: 'none' } as never} />
              </View>
              <Button block size="lg" label={stars ? `Envoyer ${stars} étoile${stars > 1 ? 's' : ''}` : 'Choisissez une note'} disabled={!stars} onPress={submit} />
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
