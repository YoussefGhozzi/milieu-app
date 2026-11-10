import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CreditCard, Lock, Smartphone, Store } from 'lucide-react-native';
import { Button, Card, Divider, Text, TokenAmount, cn, colors } from '@milieu/ui';
import { useDemo, type PaymentOutcome } from '@/demo/DemoProvider';
import { BottomBar, Header } from '@/components/Chrome';
import { Tap } from '@/components/motion';
import { dt } from '@/lib/format';

const METHODS = [
  { id: 'card', icon: CreditCard, label: 'Carte bancaire', note: 'Visa, Mastercard, carte nationale' },
  { id: 'mobile', icon: Smartphone, label: 'Paiement mobile', note: 'Portefeuille électronique tunisien' },
  { id: 'desk', icon: Store, label: 'Payer à l’accueil', note: 'Espèces ou TPE, jetons crédités après paiement' },
] as const;

/** A18 — Paiement : récapitulatif, moyen de paiement, paiement simulé. */
export default function Checkout() {
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const { studio, balance, buyPack } = useDemo();
  const pack = studio.packs.find((p) => p.id === packId) ?? studio.packs[0];
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('card');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [processing, setProcessing] = useState(false);

  const pay = () => {
    const outcome: PaymentOutcome = method === 'desk' ? 'pending' : simulateFailure ? 'failure' : 'success';
    setProcessing(true);
    setTimeout(() => {
      const r = buyPack(pack.id, outcome);
      setProcessing(false);
      router.replace({ pathname: '/payment-result', params: { status: outcome, pack: pack.id, after: String(r.balanceAfter) } });
    }, 1600);
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Paiement" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="w-full max-w-xl gap-5 self-center px-5">
          <Card className="gap-3">
            <Text variant="overline" tone="muted">Votre commande</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text variant="heading" className="font-bold tracking-widest">Pack {pack.name}</Text>
                <TokenAmount value={pack.tokens} size="sm" suffix="jetons" />
              </View>
              <Text variant="title" className="font-bold">{dt(pack.priceTnd)}</Text>
            </View>
            <Divider />
            <View className="flex-row justify-between"><Text variant="label" tone="muted">Solde actuel</Text><Text variant="label">{balance} jetons</Text></View>
            <View className="flex-row justify-between"><Text variant="label" tone="muted">Solde après achat</Text><Text variant="label" tone="brand" className="font-semibold">{balance + pack.tokens} jetons</Text></View>
          </Card>

          <View className="gap-3">
            <Text variant="heading">Moyen de paiement</Text>
            {METHODS.map((m) => {
              const I = m.icon;
              const active = m.id === method;
              return (
                <Tap key={m.id} onPress={() => setMethod(m.id)} accessibilityState={{ selected: active }} accessibilityLabel={m.label}>
                  <View className={cn('flex-row items-center gap-4 rounded-lg border p-4', active ? 'border-brand bg-brand-soft' : 'border-border bg-surface')}>
                    <I size={22} color={active ? colors.brand.DEFAULT : colors.foreground.muted} />
                    <View className="flex-1">
                      <Text variant="body" className="font-semibold">{m.label}</Text>
                      <Text variant="caption" tone="muted">{m.note}</Text>
                    </View>
                    <View className={cn('h-5 w-5 items-center justify-center rounded-full border-2', active ? 'border-brand' : 'border-border-strong')}>
                      {active ? <View className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}
                    </View>
                  </View>
                </Tap>
              );
            })}
          </View>

          <View className="flex-row items-center gap-2">
            <Lock size={14} color={colors.foreground.subtle} />
            <Text variant="caption" tone="subtle" className="flex-1">Paiement sécurisé par la passerelle de paiement. MILIEU ne voit jamais vos données bancaires.</Text>
          </View>

          {method !== 'desk' ? (
            <Text variant="caption" tone="subtle" onPress={() => setSimulateFailure(!simulateFailure)} className="text-center underline">
              Mode démo : {simulateFailure ? 'le paiement sera refusé' : 'le paiement sera accepté'} (toucher pour changer)
            </Text>
          ) : null}
        </View>
      </ScrollView>
      <BottomBar>
        <Button block size="lg" label={method === 'desk' ? 'Réserver mon pack à l’accueil' : `Payer ${dt(pack.priceTnd)}`} onPress={pay} />
      </BottomBar>

      <Modal visible={processing} transparent animationType="fade">
        <Animated.View entering={FadeIn} style={{ flex: 1, backgroundColor: 'rgba(9,9,9,0.85)', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
          <Text variant="heading">Paiement en cours…</Text>
          <Text variant="label" tone="muted">Ne fermez pas l’application.</Text>
        </Animated.View>
      </Modal>
    </View>
  );
}
