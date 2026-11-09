import { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, CalendarX2, Clock, MapPin, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@milieu/contracts';
import {
  Avatar, Badge, Button, Card, Chip, Divider, EmptyState, ListRow, PressableCard, Screen, SeatsBadge, SectionHeader,
  Sheet, Skeleton, Text, TokenAmount, colors,
} from '@milieu/ui';
import { setLanguage } from '@/i18n';

/** DEMO-01 / DEMO-04 — Direction visuelle : couleurs, typographie et composants, sur l'app réelle. */
export default function Catalogue() {
  const { t, i18n } = useTranslation();
  const [sheet, setSheet] = useState(false);
  const [filter, setFilter] = useState('all');

  const switchLang = (lang: Lang) => {
    const needsRestart = setLanguage(lang);
    if (needsRestart) Alert.alert('MILIEU', 'Redémarrez l’app pour appliquer le sens de lecture.');
  };

  const swatches: [string, string][] = [
    ['brand', colors.brand.DEFAULT], ['background', colors.background], ['surface', colors.surface.DEFAULT],
    ['raised', colors.surface.raised], ['border', colors.border.DEFAULT], ['text', colors.foreground.DEFAULT],
    ['muted', colors.foreground.muted], ['success', colors.success.DEFAULT], ['warning', colors.warning.DEFAULT],
    ['danger', colors.danger.DEFAULT],
  ];

  return (
    <Screen>
      <View className="mt-4 flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={12}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface">
          <ArrowLeft size={20} color={colors.foreground.DEFAULT} />
        </Pressable>
        <View className="flex-row gap-2">
          {(['fr', 'en', 'ar'] as Lang[]).map((l) => (
            <Chip key={l} label={l.toUpperCase()} selected={i18n.language === l} onPress={() => switchLang(l)} />
          ))}
        </View>
      </View>

      <Text variant="title" className="mt-6">{t('catalogue.title')}</Text>
      <Text tone="muted" className="mt-2">{t('catalogue.intro')}</Text>

      <SectionHeader title={t('catalogue.colors')} />
      <View className="flex-row flex-wrap gap-3">
        {swatches.map(([name, hex]) => (
          <View key={name} className="w-[30%] gap-1.5">
            <View style={{ backgroundColor: hex }} className="h-14 rounded-lg border border-border" />
            <Text variant="caption" tone="muted">{name} · {hex}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title={t('catalogue.type')} />
      <Card className="gap-2">
        <Text variant="display">Display 32</Text>
        <Text variant="title">Title 24</Text>
        <Text variant="heading">Heading 18</Text>
        <Text>Body 16 — Réservez votre prochain cours en trois gestes.</Text>
        <Text variant="label" tone="muted">Label 14 · texte secondaire</Text>
        <Text variant="caption" tone="subtle">Caption 12 · mentions</Text>
        <Text variant="overline" tone="brand">Overline · Lagree</Text>
      </Card>

      <SectionHeader title={t('catalogue.buttons')} />
      <View className="gap-3">
        <Button label="Réserver · 4 jetons" block />
        <Button label="Rejoindre la liste d’attente" variant="outline" block />
        <Button label="Voir le planning" variant="secondary" block />
        <View className="flex-row gap-3">
          <Button label="Annuler" variant="ghost" />
          <Button label="Supprimer" variant="destructive" />
          <Button label="…" loading />
        </View>
        <Button label="Indisponible" disabled block />
      </View>

      <SectionHeader title={t('catalogue.badges')} />
      <View className="flex-row flex-wrap gap-2">
        <SeatsBadge booked={4} capacity={14} />
        <SeatsBadge booked={3} capacity={5} />
        <SeatsBadge booked={4} capacity={5} />
        <SeatsBadge booked={5} capacity={5} />
        <Badge label="Bonus · expire le 19/11" tone="brand" />
        <Badge label="Confirmée" tone="success" />
      </View>

      <SectionHeader title={t('catalogue.chips')} />
      <View className="flex-row flex-wrap gap-2">
        {['all', 'Lagree', 'Hot Sculpt', 'Mat Pilates', 'Mobility'].map((f) => (
          <Chip key={f} label={f === 'all' ? 'Tous' : f} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      <SectionHeader title={t('catalogue.cards')} action="Voir tout" />
      <PressableCard accessibilityLabel="Lagree, demain 18:00, 4 jetons" onPress={() => setSheet(true)}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 gap-1">
            <Text variant="overline" tone="brand">Lagree</Text>
            <Text variant="heading">Sculpt & Burn</Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Clock size={14} color={colors.foreground.muted} />
              <Text variant="label" tone="muted">Demain · 18:00 · 50 min</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <MapPin size={14} color={colors.foreground.muted} />
              <Text variant="label" tone="muted">Studio Lagree · Yasmine</Text>
            </View>
          </View>
          <TokenAmount value={4} size="sm" />
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <SeatsBadge booked={4} capacity={5} />
          <Avatar name="Yasmine Ben Ali" size={32} />
        </View>
      </PressableCard>

      <Card className="mt-3 py-1">
        <ListRow icon={<Plus size={18} color={colors.brand.DEFAULT} />} title="Pack MOVE" subtitle="25 jetons · 9,000 TND / jeton" right={<Text variant="label">225 TND</Text>} onPress={() => {}} />
        <Divider />
        <ListRow icon={<CalendarX2 size={18} color={colors.danger.DEFAULT} />} title="Annulation tardive" subtitle="Hot Sculpt · vendredi" right={<Text variant="label" tone="danger">−3</Text>} chevron={false} />
      </Card>

      <SectionHeader title={t('catalogue.sheet')} />
      <Button label={t('catalogue.openSheet')} variant="secondary" block onPress={() => setSheet(true)} />

      <SectionHeader title={t('catalogue.states')} />
      <Card>
        <View className="gap-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </View>
      </Card>
      <Card className="mt-3">
        <EmptyState icon={<CalendarX2 size={28} color={colors.foreground.muted} />} title={t('catalogue.empty')} body={t('catalogue.emptyBody')}
          action={<Button label="Voir le planning" size="sm" />} />
      </Card>
      <Text variant="caption" tone="subtle" className="mt-6 text-center">Platform : {Platform.OS} · {i18n.language}</Text>

      <Sheet open={sheet} onClose={() => setSheet(false)} title={t('catalogue.sheetTitle')}>
        <Text tone="muted">{t('catalogue.sheetBody')}</Text>
        <View className="my-5 flex-row items-center justify-between rounded-lg bg-surface-raised p-4">
          <Text variant="label" tone="muted">Solde après réservation</Text>
          <TokenAmount value={12} />
        </View>
        <Button label={t('common.confirm')} block onPress={() => setSheet(false)} />
        <Button label={t('common.cancel')} variant="ghost" block className="mt-2" onPress={() => setSheet(false)} />
      </Sheet>
    </Screen>
  );
}
