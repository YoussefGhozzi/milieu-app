import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ReceiptText } from 'lucide-react-native';
import type { LedgerEntry } from '@milieu/contracts';
import { Card, Chip, Divider, EmptyState, Text, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { Header } from '@/components/Chrome';
import { LedgerRow } from '@/components/Ledger';
import { dayLabel } from '@/lib/format';

const FILTERS: { key: string; label: string; types: LedgerEntry['type'][] }[] = [
  { key: 'all', label: 'Tout', types: [] },
  { key: 'in', label: 'Achats et bonus', types: ['purchase', 'bonus', 'reward'] },
  { key: 'book', label: 'Réservations', types: ['hold', 'consume'] },
  { key: 'refund', label: 'Remboursements', types: ['release'] },
];

/** A16 — Historique complet des jetons, groupé par jour. */
export default function HistoryScreen() {
  const { state } = useDemo();
  const [filter, setFilter] = useState('all');
  const f = FILTERS.find((x) => x.key === filter)!;
  const entries = state.ledger.filter((e) => !f.types.length || f.types.includes(e.type));
  const groups = entries.reduce<Record<string, LedgerEntry[]>>((acc, e) => {
    const k = dayLabel(e.at);
    (acc[k] ??= []).push(e);
    return acc;
  }, {});

  return (
    <View className="flex-1 bg-background">
      <Header title="Historique des jetons" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-12 grow-0" contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {FILTERS.map((x) => <Chip key={x.key} label={x.label} selected={filter === x.key} onPress={() => setFilter(x.key)} />)}
      </ScrollView>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="w-full max-w-2xl gap-5 self-center px-5 pt-4">
          {entries.length === 0 ? (
            <EmptyState icon={<ReceiptText size={28} color={colors.foreground.muted} />} title="Aucun mouvement" body="Rien à afficher pour ce filtre." />
          ) : (Object.entries(groups) as [string, LedgerEntry[]][]).map(([day, list], gi) => (
            <Animated.View key={`${filter}-${day}`} entering={FadeInDown.delay(gi * 60)}>
              <Text variant="overline" tone="muted" className="mb-2">{day}</Text>
              <Card className="py-1">
                {list.map((e, i) => <View key={e.id}>{i > 0 ? <Divider /> : null}<LedgerRow entry={e} /></View>)}
              </Card>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
