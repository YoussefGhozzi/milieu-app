import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Check, Clock3, X } from 'lucide-react-native';
import { Button, Card, Text, TokenAmount, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { BottomBar } from '@/components/Chrome';
import { dt } from '@/lib/format';

/** A19 — Résultat du paiement : réussi, en attente (accueil) ou refusé. */
export default function PaymentResult() {
  const { status, pack: packId, after } = useLocalSearchParams<{ status: 'success' | 'pending' | 'failure'; pack: string; after: string }>();
  const insets = useSafeAreaInsets();
  const { studio } = useDemo();
  const pack = studio.packs.find((p) => p.id === packId) ?? studio.packs[0];
  const ref = `MIL-${pack.id.toUpperCase().slice(0, 3)}-${String(Date.now()).slice(-5)}`;

  const ui = {
    success: { icon: Check, color: colors.success.DEFAULT, title: 'Paiement réussi', body: `${pack.tokens} jetons ont été ajoutés à votre solde. Bonnes séances !` },
    pending: { icon: Clock3, color: colors.warning.DEFAULT, title: 'Pack réservé', body: `Réglez ${dt(pack.priceTnd)} à l’accueil avec la référence ci-dessous : vos jetons seront crédités aussitôt.` },
    failure: { icon: X, color: colors.danger.DEFAULT, title: 'Paiement refusé', body: 'Votre banque a refusé le paiement. Aucun montant n’a été débité. Réessayez ou choisissez un autre moyen.' },
  }[status ?? 'success'];
  const I = ui.icon;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 64 }}>
      <View className="w-full max-w-xl flex-1 items-center gap-6 self-center px-5">
        <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: ui.color, alignItems: 'center', justifyContent: 'center' }}>
          <I size={52} color={colors.background} strokeWidth={3} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200)} style={{ alignItems: 'center' }}>
          <Text variant="display" className="text-center">{ui.title}</Text>
          <Text tone="muted" className="mt-3 text-center leading-6">{ui.body}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(350)} style={{ width: '100%' }}>
          <Card className="gap-3">
            <Row label="Pack" value={`${pack.name} · ${pack.tokens} jetons`} />
            <Row label="Montant" value={dt(pack.priceTnd)} />
            <Row label="Référence" value={ref} />
            {status === 'success' ? (
              <View className="flex-row items-center justify-between">
                <Text variant="label" tone="muted">Nouveau solde</Text>
                <TokenAmount value={Number(after)} size="sm" />
              </View>
            ) : null}
          </Card>
        </Animated.View>
      </View>
      <BottomBar>
        {status === 'success' ? (
          <>
            <Button block size="lg" label="Réserver un cours" onPress={() => router.replace('/(tabs)/planning')} />
            <Button block variant="ghost" className="mt-1" label="Voir mon portefeuille" onPress={() => router.replace('/(tabs)/wallet')} />
          </>
        ) : status === 'failure' ? (
          <>
            <Button block size="lg" label="Réessayer" onPress={() => router.replace(`/checkout/${pack.id}`)} />
            <Button block variant="ghost" className="mt-1" label="Retour à l’accueil" onPress={() => router.replace('/(tabs)')} />
          </>
        ) : (
          <Button block size="lg" label="Compris" onPress={() => router.replace('/(tabs)')} />
        )}
      </BottomBar>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="label" tone="muted">{label}</Text>
      <Text variant="label" className="font-semibold">{value}</Text>
    </View>
  );
}
