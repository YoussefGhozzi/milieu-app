import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock3, Gift, Plus, ShoppingBag } from 'lucide-react-native';
import { Button, Card, Divider, SectionHeader, Text, TokenAmount, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { LedgerRow } from '@/components/Ledger';
import { Appear } from '@/components/motion';

/** A15 — Portefeuille : solde par type de jetons et derniers mouvements. */
export default function Wallet() {
  const insets = useSafeAreaInsets();
  const { state, balance } = useDemo();
  const bonusTotal = state.wallet.bonus.reduce((n, b) => n + b.amount, 0);
  const firstExpiry = [...state.wallet.bonus].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0];
  const daysLeft = firstExpiry ? Math.ceil((new Date(firstExpiry.expiresAt).getTime() - Date.now()) / 864e5) : 0;

  const buckets = [
    { icon: ShoppingBag, color: colors.foreground.DEFAULT, label: 'Jetons achetés', value: state.wallet.purchased, note: 'N’expirent jamais' },
    { icon: Clock3, color: colors.brand.DEFAULT, label: 'Jetons bonus', value: bonusTotal, note: firstExpiry ? `Expirent dans ${daysLeft} jours · utilisés en premier` : 'Aucun bonus en cours' },
    { icon: Gift, color: colors.success.DEFAULT, label: 'Récompenses', value: state.wallet.reward, note: 'Bientôt : MILIEU Perks' },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-xl self-center px-5">
        <Appear><Text variant="display">Portefeuille</Text></Appear>

        <Appear index={1}>
          <View className="mt-5 items-center rounded-xl border border-brand/30 bg-brand-soft px-5 py-8">
            <Text variant="overline" tone="brand">Solde disponible</Text>
            <View className="mt-3"><TokenAmount value={balance} size="lg" /></View>
            <Text variant="label" tone="muted" className="mt-2">≈ {Math.floor(balance / 4)} cours de Lagree ou {Math.floor(balance / 2)} cours de Mat Pilates</Text>
            <Button className="mt-5" label="Acheter des jetons" icon={<Plus size={18} color={colors.brand.foreground} />} onPress={() => router.push('/shop')} />
          </View>
        </Appear>

        <Appear index={2}>
          <SectionHeader title="Détail du solde" />
          <Card className="py-1">
            {buckets.map((b, i) => {
              const I = b.icon;
              return (
                <View key={b.label}>
                  {i > 0 ? <Divider /> : null}
                  <View className="flex-row items-center gap-3 py-4">
                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-surface-raised"><I size={18} color={b.color} /></View>
                    <View className="flex-1">
                      <Text variant="body">{b.label}</Text>
                      <Text variant="caption" tone={b.label === 'Jetons bonus' && firstExpiry && daysLeft <= 14 ? 'warning' : 'muted'}>{b.note}</Text>
                    </View>
                    <Text variant="heading" className="font-bold">{b.value}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </Appear>

        <Appear index={3}>
          <SectionHeader title="Derniers mouvements" action="Tout voir" onAction={() => router.push('/history')} />
          <Card className="py-1">
            {state.ledger.slice(0, 5).map((e, i) => (
              <View key={e.id}>{i > 0 ? <Divider /> : null}<LedgerRow entry={e} /></View>
            ))}
          </Card>
        </Appear>

        <Appear index={4}>
          <View className="mt-6 gap-2 rounded-lg border border-border bg-surface-sunken p-4">
            <Text variant="label" className="font-semibold">Comment fonctionnent les jetons ?</Text>
            <Text variant="caption" tone="muted">Chaque cours coûte un nombre fixe de jetons (Lagree 4, Hot Sculpt 3, Pilates 2). Ils sont retenus à la réservation et remboursés si vous annulez au moins 12 h avant.</Text>
          </View>
        </Appear>
      </View>
    </ScrollView>
  );
}
