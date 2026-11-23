import { Slot } from 'expo-router';
import { Briefcase } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, colors } from '@milieu/ui';
import { isApi } from '@/api/config';
import { Header } from '@/components/Chrome';

const STAFF_URL = process.env.EXPO_PUBLIC_STAFF_URL || '';

/**
 * Espace professionnel (coach, accueil, admin). En démo, il vit dans cette app ; avec la vraie API, il est dans l'app
 * MILIEU Staff (comptes séparés, scan, caisse) : on y renvoie.
 */
export default function ProLayout() {
  const insets = useSafeAreaInsets();
  if (!isApi) return <Slot />;
  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom + 16 }}>
      <Header title="Espace professionnel" />
      <View className="w-full max-w-xl flex-1 justify-center gap-5 self-center px-5">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-soft"><Briefcase size={26} color={colors.brand.DEFAULT} /></View>
        <Text variant="display">MILIEU Staff</Text>
        <Text tone="muted">Coachs, accueil et administration utilisent l’app MILIEU Staff : calendrier, demandes de cours, scan des QR, recharges et caisse.</Text>
        {STAFF_URL ? <Button block size="lg" label="Ouvrir MILIEU Staff" onPress={() => void Linking.openURL(STAFF_URL)} /> : null}
      </View>
    </View>
  );
}
