import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { KeyRound, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@milieu/contracts';
import { Button, Card, Chip, Divider, ListRow, SectionHeader, Sheet, Text, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { Header } from '@/components/Chrome';
import { useToast } from '@/components/Toast';
import { setLanguage } from '@/i18n';
import { useAppTheme } from '@/theme/AppTheme';

function ToggleRow({ title, subtitle, value, onChange }: { title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="min-h-16 flex-row items-center gap-3 py-3">
      <View className="flex-1">
        <Text variant="body">{title}</Text>
        <Text variant="caption" tone="muted">{subtitle}</Text>
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange}
        trackColor={{ false: colors.border.strong, true: colors.brand.DEFAULT }} thumbColor={colors.foreground.DEFAULT} />
    </View>
  );
}

/** A23 — Réglages : langue, notifications, sécurité, consentements, suppression du compte. */
export default function SettingsScreen() {
  const { i18n } = useTranslation();
  const toast = useToast();
  const { resetDemo, live } = useDemo();
  const { mode, setMode } = useAppTheme();
  const [prefs, setPrefs] = useState({ reminders: true, waitlist: true, offers: false, marketing: false, analytics: true });
  const [del, setDel] = useState(false);
  const set = (k: keyof typeof prefs) => (v: boolean) => setPrefs({ ...prefs, [k]: v });

  return (
    <View className="flex-1 bg-background">
      <Header title="Réglages" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="w-full max-w-xl self-center px-5">
          <SectionHeader title="Langue" />
          <View className="flex-row gap-2">
            {([['fr', 'Français'], ['en', 'English'], ['ar', 'العربية']] as [Lang, string][]).map(([l, label]) => (
              <Chip key={l} label={label} selected={i18n.language === l}
                onPress={() => { const restart = setLanguage(l); if (restart) toast('Redémarrez l’app pour appliquer l’arabe', 'info'); }} />
            ))}
          </View>

          <SectionHeader title="Apparence" />
          <View className="flex-row gap-2">
            <Chip label="Mode nuit" selected={mode === 'dark'} onPress={() => setMode('dark')} />
            <Chip label="Mode jour" selected={mode === 'light'} onPress={() => setMode('light')} />
          </View>

          <SectionHeader title="Notifications" />
          <Card className="py-1">
            <ToggleRow title="Rappels de cours" subtitle="2 h avant chaque cours réservé" value={prefs.reminders} onChange={set('reminders')} />
            <Divider />
            <ToggleRow title="Places libérées" subtitle="Quand vous passez de la liste d’attente à confirmé" value={prefs.waitlist} onChange={set('waitlist')} />
            <Divider />
            <ToggleRow title="Offres du studio" subtitle="Heures creuses, dernière minute" value={prefs.offers} onChange={set('offers')} />
          </Card>

          <SectionHeader title="Sécurité" />
          <Card className="py-1">
            <ListRow icon={<KeyRound size={18} color={colors.brand.DEFAULT} />} title="Changer le mot de passe" onPress={() => router.push('/forgot')} />
          </Card>

          <SectionHeader title="Confidentialité" />
          <Card className="py-1">
            <ToggleRow title="Communications marketing" subtitle="E-mails et SMS promotionnels" value={prefs.marketing} onChange={set('marketing')} />
            <Divider />
            <ToggleRow title="Mesure d’audience anonyme" subtitle="Nous aide à améliorer l’app" value={prefs.analytics} onChange={set('analytics')} />
          </Card>
          <Text variant="label" tone="brand" className="mt-3" onPress={() => toast('Export de vos données demandé : vous le recevrez par e-mail', 'info')}>Télécharger mes données</Text>

          <View className="mt-8">
            <Button block variant="ghost" label="Supprimer mon compte" icon={<Trash2 size={18} color={colors.danger.DEFAULT} />} onPress={() => setDel(true)} />
          </View>
        </View>
      </ScrollView>

      <Sheet open={del} onClose={() => setDel(false)} title="Supprimer votre compte ?">
        <View className="gap-4">
          {live ? (
            <Text tone="muted">La suppression de votre compte se fait à l’accueil de votre salle : vos réservations à venir et vos jetons restants y sont réglés avec vous.</Text>
          ) : (
            <>
              <Text tone="muted">Vos réservations à venir seront annulées et vos jetons restants seront perdus. Cette action est définitive.</Text>
              <Button block size="lg" variant="destructive" label="Supprimer définitivement"
                onPress={() => { setDel(false); resetDemo(); toast('Compte supprimé (démo)', 'info'); router.replace('/welcome'); }} />
            </>
          )}
          <Button block variant="ghost" label="Annuler" onPress={() => setDel(false)} />
        </View>
      </Sheet>
    </View>
  );
}
