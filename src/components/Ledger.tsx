import { View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, CheckCheck, Clock3, Gift, ShoppingBag, Undo2, Wrench } from 'lucide-react-native';
import type { LedgerEntry } from '@milieu/contracts';
import { Text, colors } from '@milieu/ui';
import { dayLabel, time } from '@/lib/format';

const META: Record<LedgerEntry['type'], { icon: typeof ShoppingBag; label: string; color: string }> = {
  purchase: { icon: ShoppingBag, label: 'Achat', color: colors.success.DEFAULT },
  bonus: { icon: Gift, label: 'Bonus', color: colors.brand.DEFAULT },
  reward: { icon: Gift, label: 'Récompense', color: colors.success.DEFAULT },
  hold: { icon: ArrowUpRight, label: 'Réservation', color: colors.foreground.muted },
  release: { icon: Undo2, label: 'Remboursement', color: colors.success.DEFAULT },
  consume: { icon: CheckCheck, label: 'Cours validé', color: colors.foreground.muted },
  expire: { icon: Clock3, label: 'Expiration', color: colors.danger.DEFAULT },
  adjustment: { icon: Wrench, label: 'Ajustement', color: colors.info.DEFAULT },
};

/** Une ligne de l'historique des jetons. */
export function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const m = META[entry.type];
  const I = entry.amount > 0 && entry.type === 'hold' ? ArrowDownLeft : m.icon;
  const positive = entry.amount > 0;
  return (
    <View className="flex-row items-center gap-3 py-3.5" accessible accessibilityLabel={`${m.label}, ${entry.label}, ${positive ? 'plus' : 'moins'} ${Math.abs(entry.amount)} jetons`}>
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-surface-raised"><I size={18} color={m.color} /></View>
      <View className="flex-1">
        <Text variant="body" numberOfLines={1}>{entry.label}</Text>
        <Text variant="caption" tone="muted">{m.label} · {dayLabel(entry.at)} {time(entry.at)}</Text>
      </View>
      <Text variant="heading" className="font-bold" style={{ color: positive ? colors.success.DEFAULT : colors.foreground.DEFAULT }}>
        {positive ? '+' : '−'}{Math.abs(entry.amount)}
      </Text>
    </View>
  );
}
