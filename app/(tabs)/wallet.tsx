import { Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@milieu/ui';
import { ComingSoon } from '@/components/ComingSoon';

export default function Screen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.wallet')} body={t('placeholder.wallet')} icon={<Wallet size={28} color={colors.brand.DEFAULT} />} />;
}
