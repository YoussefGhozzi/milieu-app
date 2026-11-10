import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, Infinity as InfinityIcon } from 'lucide-react-native';
import { Badge, Button, Text, TokenAmount, cn, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { BottomBar, Header } from '@/components/Chrome';
import { Tap } from '@/components/motion';
import { dt } from '@/lib/format';

/** A17 — Boutique de packs : prix par jeton, économies, équivalence en cours. */
export default function Shop() {
  const { studio, balance } = useDemo();
  const [selected, setSelected] = useState('routine');
  const base = studio.packs[0].priceTnd / studio.packs[0].tokens;
  const pack = studio.packs.find((p) => p.id === selected)!;

  return (
    <View className="flex-1 bg-background">
      <Header title="Acheter des jetons" right={<TokenAmount value={balance} size="sm" />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          <Text tone="muted" className="mb-2">Packs prépayés, sans abonnement. Vos jetons achetés n’expirent jamais.</Text>
          {studio.packs.map((p, i) => {
            const perToken = p.priceTnd / p.tokens;
            const saving = Math.round((1 - perToken / base) * 100);
            const active = p.id === selected;
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 70).springify().damping(18)}>
                <Tap onPress={() => setSelected(p.id)} accessibilityState={{ selected: active }} accessibilityLabel={`Pack ${p.name}, ${p.tokens} jetons, ${dt(p.priceTnd)}`}>
                  <View className={cn('rounded-xl border-2 p-5', active ? 'border-brand bg-brand-soft' : 'border-border bg-surface')}>
                    <View className="flex-row items-start justify-between">
                      <View className="gap-1">
                        <View className="flex-row items-center gap-2">
                          <Text variant="heading" className="font-bold tracking-widest">{p.name}</Text>
                          {p.badge === 'popular' ? <Badge tone="brand" label="Le plus choisi" /> : null}
                          {p.badge === 'best_value' ? <Badge tone="success" label="Meilleur prix" /> : null}
                        </View>
                        <TokenAmount value={p.tokens} suffix="jetons" />
                      </View>
                      <View className={cn('h-7 w-7 items-center justify-center rounded-full border-2', active ? 'border-brand bg-brand' : 'border-border-strong')}>
                        {active ? <Check size={16} color={colors.brand.foreground} strokeWidth={3} /> : null}
                      </View>
                    </View>
                    <View className="mt-4 flex-row items-end justify-between">
                      <View>
                        <Text variant="title" className="font-bold">{dt(p.priceTnd)}</Text>
                        <Text variant="caption" tone="muted">{dt(perToken)} le jeton</Text>
                      </View>
                      <View className="items-end gap-1">
                        {saving > 0 ? <Text variant="label" tone="success" className="font-semibold">−{saving} % par jeton</Text> : null}
                        <Text variant="caption" tone="muted">≈ {Math.floor(p.tokens / 4)} cours de Lagree</Text>
                      </View>
                    </View>
                  </View>
                </Tap>
              </Animated.View>
            );
          })}
          <View className="mt-2 flex-row items-center gap-3 rounded-lg border border-border bg-surface-sunken p-4">
            <InfinityIcon size={20} color={colors.brand.DEFAULT} />
            <Text variant="caption" tone="muted" className="flex-1">Bonus de bienvenue, offres heures creuses et récompenses s’ajoutent automatiquement à votre solde.</Text>
          </View>
        </View>
      </ScrollView>
      <BottomBar>
        <Button block size="lg" label={`Continuer · ${dt(pack.priceTnd)}`} onPress={() => router.push(`/checkout/${pack.id}`)} />
      </BottomBar>
    </View>
  );
}
