import { User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@milieu/ui';
import { ComingSoon } from '@/components/ComingSoon';

export default function Screen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.profile')} body={t('placeholder.profile')} icon={<User size={28} color={colors.brand.DEFAULT} />} />;
}
