import { formatTnd, quoteRecharge, queryKeys, type Promotion } from '@milieu/contracts';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Gift, ReceiptText, Store, UserRound } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Badge, Text, TokenAmount, colors } from '@milieu/ui';
import { api } from '@/api/client';
import { isApi } from '@/api/config';
import { Header } from '@/components/Chrome';
import { Grid } from '@/components/Grid';
import { useDemo } from '@/demo/DemoProvider';

/*
 * Recharger ses jetons : uniquement à l'accueil de la salle (espèces, TPE, virement). Pas de paiement en ligne.
 * La page montre le prix du jeton de la salle et quelques montants, promotions en cours appliquées
 * (même calcul que l'accueil : règle partagée `quoteRecharge`).
 */

const AMOUNTS = [10, 20, 40];

interface Tariffs { gymName: string; address: string; unitPriceTnd: number; promos: Promotion[] }

function TariffsScreen({ t }: { t: Tariffs }) {
  const { balance, state } = useDemo();
  const quotes = AMOUNTS.map((n) => ({ n, q: quoteRecharge(t.unitPriceTnd, t.promos, n) }));
  const steps = [
    { icon: Store, title: 'Passez à l’accueil', body: `${t.gymName}${t.address ? ` · ${t.address}` : ''}` },
    { icon: UserRound, title: 'Donnez votre nom ou votre e-mail', body: `${state.member.firstName} ${state.member.lastName}`.trim() + (state.member.email ? ` · ${state.member.email}` : '') },
    { icon: ReceiptText, title: 'Jetons crédités tout de suite', body: 'Vous recevez une notification et un reçu numéroté.' },
  ];
  return (
    <View className="flex-1 bg-background">
      <Header title="Recharger mes jetons" right={<TokenAmount value={balance} size="sm" />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-3xl gap-4 self-center px-5">
          <Text tone="muted">Les jetons se rechargent à l’accueil de votre salle. Pas d’abonnement, pas de paiement en ligne : vos jetons n’expirent pas.</Text>

          <View className="flex-row flex-wrap gap-2">
            <Badge label="Espèces" />
            <Badge label="Carte (TPE)" />
            <Badge label="Virement" />
          </View>

          <View className="rounded-xl border border-border bg-surface p-5">
            <Text variant="overline" tone="brand">Prix du jeton</Text>
            <Text variant="display" className="mt-1">{formatTnd(t.unitPriceTnd)}</Text>
            <Text variant="caption" tone="muted">{t.gymName}</Text>
          </View>

          {t.promos.length ? t.promos.map((p, i) => {
            const I = p.kind === 'percent_off' ? BadgePercent : Gift;
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 70)}>
                <View className="flex-row items-center gap-3 rounded-xl bg-energy p-4">
                  <I size={22} color={colors.energy.foreground} />
                  <View className="flex-1">
                    <Text variant="label" className="font-bold text-energy-foreground">{p.title}</Text>
                    <Text variant="caption" className="text-energy-foreground opacity-80">
                      {p.kind === 'percent_off' ? `−${p.value} % sur la recharge` : `+${p.value} jetons offerts dès ${p.minTokens} jetons`} · jusqu’au {new Date(`${p.endsOn}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          }) : null}

          <Text variant="heading" className="mt-2">Exemples</Text>
          <Grid>{quotes.map(({ n, q }, i) => (
            <Animated.View key={n} entering={FadeInDown.delay(i * 70).springify().damping(18)}>
              <View className="rounded-xl border border-border bg-surface p-5">
                <TokenAmount value={n} suffix="jetons" />
                {q.bonus ? <Text variant="label" tone="success" className="mt-1 font-semibold">+{q.bonus} offerts</Text> : null}
                <View className="mt-3 flex-row items-end justify-between">
                  <Text variant="title" className="font-bold">{formatTnd(q.total)}</Text>
                  {q.discount > 0 ? <Text variant="caption" tone="muted" className="line-through">{formatTnd(n * t.unitPriceTnd)}</Text> : null}
                </View>
              </View>
            </Animated.View>
          ))}</Grid>

          <Text variant="heading" className="mt-2">Comment ça marche</Text>
          {steps.map((s, i) => {
            const I = s.icon;
            return (
              <View key={s.title} className="flex-row items-center gap-3 rounded-lg border border-border bg-surface p-4">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-soft"><Text variant="label" tone="brand" className="font-bold">{i + 1}</Text></View>
                <View className="flex-1">
                  <Text variant="label" className="font-semibold">{s.title}</Text>
                  <Text variant="caption" tone="muted">{s.body}</Text>
                </View>
                <I size={18} color={colors.foreground.muted} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function DemoShop() {
  const { studio } = useDemo();
  return <TariffsScreen t={{ gymName: studio.name, address: studio.address, unitPriceTnd: studio.packs[0] ? studio.packs[0].priceTnd / studio.packs[0].tokens : 10, promos: [] }} />;
}

function ApiShop() {
  const gyms = useQuery({ queryKey: [...queryKeys.gyms], queryFn: () => api.gyms.list() });
  const promos = useQuery({ queryKey: [...queryKeys.promotions], queryFn: () => api.promotions.list({ state: 'active' }) });
  const gym = gyms.data?.[0];
  const list: Promotion[] = (promos.data ?? []).map((p) => ({ ...p, createdBy: '', active: p.active }));
  return <TariffsScreen t={{ gymName: gym?.name ?? 'Votre salle', address: gym ? [gym.address, gym.city].filter(Boolean).join(', ') : '', unitPriceTnd: (gym?.tokenPriceMillimes ?? 10_000) / 1000, promos: list }} />;
}

export default isApi ? ApiShop : DemoShop;
