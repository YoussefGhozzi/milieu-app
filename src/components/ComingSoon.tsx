import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, Screen, Text } from '@milieu/ui';

/** Écran provisoire d'un onglet dont le ticket n'est pas encore livré. */
export function ComingSoon({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text variant="title" className="mt-4">{title}</Text>
      <EmptyState icon={icon} title={t('common.soon')} body={body} />
    </Screen>
  );
}
