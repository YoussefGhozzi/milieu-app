import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Clock, MapPin } from 'lucide-react-native';
import { Avatar, Badge, SeatsBadge, Text, TokenAmount, colors } from '@milieu/ui';
import type { BookingStatus } from '@milieu/contracts';
import type { SessionView } from '@/demo/DemoProvider';
import { disciplineStyle } from '@/lib/disciplines';
import { dayLabel, time } from '@/lib/format';
import { Tap } from './motion';

/** Visuel d'une discipline (dégradé + icône), à la place d'une photo. */
export function DisciplineArt({ disciplineId, height = 200, rounded = 24, iconSize = 64 }: { disciplineId: string; height?: number; rounded?: number; iconSize?: number }) {
  const { color, icon: Icon } = disciplineStyle(disciplineId);
  const gid = `g-${disciplineId}`;
  return (
    <View style={{ height, borderRadius: rounded, overflow: 'hidden', backgroundColor: colors.surface.DEFAULT }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={`${gid}-l`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.55" />
            <Stop offset="1" stopColor={colors.background} stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id={`${gid}-r`} cx="85%" cy="15%" r="60%">
            <Stop offset="0" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gid}-l)`} />
        <Rect width="100%" height="100%" fill={`url(#${gid}-r)`} />
        <Circle cx="88%" cy="20%" r="70" stroke={color} strokeOpacity="0.25" strokeWidth="1" fill="none" />
        <Circle cx="88%" cy="20%" r="110" stroke={color} strokeOpacity="0.15" strokeWidth="1" fill="none" />
      </Svg>
      <View style={{ position: 'absolute', right: 24, top: 24 }}>
        <Icon size={iconSize} color={color} strokeWidth={1.5} />
      </View>
    </View>
  );
}

/** Barre de remplissage animée d'un cours. */
export function SeatsBar({ booked, capacity }: { booked: number; capacity: number }) {
  const ratio = Math.min(1, booked / capacity);
  const width = useSharedValue(0);
  useEffect(() => { width.value = withTiming(ratio, { duration: 700 }); }, [ratio, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  const color = ratio >= 1 ? colors.danger.DEFAULT : ratio >= 0.7 ? colors.warning.DEFAULT : colors.success.DEFAULT;
  return (
    <View accessibilityLabel={`${booked} places réservées sur ${capacity}`} style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface.raised, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color }, style]} />
    </View>
  );
}

const STATUS_BADGE: Partial<Record<BookingStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brand' }>> = {
  booked: { label: 'Réservé', tone: 'success' },
  waitlist: { label: 'Liste d’attente', tone: 'warning' },
  attended: { label: 'Présent', tone: 'brand' },
  late_cancel: { label: 'Annulation tardive', tone: 'danger' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
  no_show: { label: 'Absent', tone: 'danger' },
};

export const statusBadge = (s: BookingStatus) => STATUS_BADGE[s] ?? { label: s, tone: 'neutral' as const };

/** Carte d'un cours dans les listes (planning, accueil). */
export function ClassCard({ v, status, onPress, showDay }: { v: SessionView; status?: BookingStatus; onPress: () => void; showDay?: boolean }) {
  const { session, discipline, coach, room } = v;
  const { color, icon: Icon } = disciplineStyle(discipline.id);
  const badge = status ? statusBadge(status) : null;
  return (
    <Tap onPress={onPress} accessibilityLabel={`${discipline.name}, ${dayLabel(session.startsAt)} à ${time(session.startsAt)}, ${session.tokenCost} jetons`}>
      <View className="flex-row overflow-hidden rounded-xl border border-border bg-surface">
        <View style={{ width: 4, backgroundColor: color }} />
        <View className="w-[72px] items-center justify-center border-r border-border py-4">
          <Text variant="heading" className="font-bold">{time(session.startsAt)}</Text>
          <Text variant="caption" tone="muted">{session.durationMin} min</Text>
          {showDay ? <Text variant="caption" tone="subtle" className="mt-1 text-center">{dayLabel(session.startsAt)}</Text> : null}
        </View>
        <View className="flex-1 gap-1.5 p-4">
          <View className="flex-row items-center gap-2">
            <Icon size={14} color={color} />
            <Text variant="overline" style={{ color }}>{discipline.name}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Avatar name={`${coach.firstName} ${coach.lastName}`} size={24} />
            <Text variant="label">{coach.firstName}</Text>
            <Text variant="caption" tone="subtle">·</Text>
            <MapPin size={12} color={colors.foreground.subtle} />
            <Text variant="caption" tone="muted" numberOfLines={1}>{room.name}</Text>
          </View>
          <View className="mt-1 flex-row items-center justify-between">
            {badge ? <Badge label={badge.label} tone={badge.tone} /> : <SeatsBadge booked={session.booked} capacity={session.capacity} />}
            <TokenAmount value={session.tokenCost} size="sm" />
          </View>
        </View>
      </View>
    </Tap>
  );
}

/** Ligne compacte d'info (icône + texte). */
export function InfoLine({ icon, text }: { icon: 'clock' | 'map'; text: string }) {
  const I = icon === 'clock' ? Clock : MapPin;
  return (
    <View className="flex-row items-center gap-2">
      <I size={16} color={colors.foreground.muted} />
      <Text variant="label" tone="muted">{text}</Text>
    </View>
  );
}
