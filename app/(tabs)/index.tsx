import { router } from 'expo-router';
import { View } from 'react-native';
import { Palette } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Screen, Text, TokenAmount, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';

// Accueil provisoire : l'écran complet (A06) arrive au ticket DEMO-09.
export default function Home() {
  const { t } = useTranslation();
  const { state, balance } = useDemo();
  return (
    <Screen>
      <Text variant="overline" tone="brand" className="mt-6">MILIEU</Text>
      <Text variant="title" className="mt-1">{t('home.hello', { name: state.member.firstName })}</Text>
      <Card className="mt-6">
        <Text variant="label" tone="muted">{t('home.balance')}</Text>
        <View className="mt-2"><TokenAmount value={balance} size="lg" suffix={t('common.tokens')} /></View>
      </Card>
      <Button className="mt-6" variant="secondary" label={t('home.seeCatalogue')}
        icon={<Palette size={18} color={colors.foreground.DEFAULT} />} onPress={() => router.push('/catalogue')} />
    </Screen>
  );
}
