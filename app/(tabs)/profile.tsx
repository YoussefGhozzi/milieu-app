import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CircleHelp, LogOut, Palette, RotateCcw, Settings, Sparkles, UserRound } from 'lucide-react-native';
import { Avatar, Badge, Card, Divider, ListRow, Text, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';

/** A22 — Profil : identité, statistiques, accès aux réglages, à l'aide et à la déconnexion. */
export default function Profile() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { state, balance, unread, logout, resetDemo } = useDemo();
  const attended = state.bookings.filter((b) => b.status === 'attended').length;
  const upcoming = state.bookings.filter((b) => b.status === 'booked').length;
  const since = new Date(state.member.memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const stats = [
    { label: 'Cours suivis', value: attended },
    { label: 'À venir', value: upcoming },
    { label: 'Jetons', value: balance },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View className="w-full max-w-2xl self-center px-5">
        <Appear>
          <View className="items-center gap-3">
            <Avatar name={`${state.member.firstName} ${state.member.lastName}`} size={88} />
            <View className="items-center">
              <Text variant="title">{state.member.firstName} {state.member.lastName}</Text>
              <Text variant="label" tone="muted">Membre depuis {since}</Text>
            </View>
            <Badge tone="success" label="Niveau Regular · MILIEU Perks" />
          </View>
        </Appear>

        <Appear index={1}>
          <View className="mt-6 flex-row gap-3">
            {stats.map((s) => (
              <View key={s.label} className="flex-1 items-center gap-1 rounded-lg border border-border bg-surface py-4">
                <Text variant="title" className="font-bold">{s.value}</Text>
                <Text variant="caption" tone="muted">{s.label}</Text>
              </View>
            ))}
          </View>
        </Appear>

        <Appear index={2}>
          <Card className="mt-6 py-1">
            <ListRow icon={<UserRound size={18} color={colors.brand.DEFAULT} />} title="Mes informations" subtitle={state.member.email} onPress={() => router.push('/account')} />
            <Divider />
            <ListRow icon={<Bell size={18} color={colors.brand.DEFAULT} />} title="Notifications" subtitle={unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'} onPress={() => router.push('/notifications')} />
            <Divider />
            <ListRow icon={<Settings size={18} color={colors.brand.DEFAULT} />} title="Réglages" subtitle="Langue, notifications, confidentialité" onPress={() => router.push('/settings')} />
            <Divider />
            <ListRow icon={<CircleHelp size={18} color={colors.brand.DEFAULT} />} title="Aide et contact" subtitle="FAQ, règles du studio, nous joindre" onPress={() => router.push('/help')} />
          </Card>
        </Appear>

        <Appear index={3}>
          <Card className="mt-4 py-1">
            <ListRow icon={<Sparkles size={18} color={colors.energy.DEFAULT} />} title="MILIEU Perks" subtitle="Niveaux, série, café offert, parrainage" onPress={() => router.push('/perks')} />
          </Card>
        </Appear>

        <Appear index={4}>
          <Card className="mt-6 py-1">
            <ListRow icon={<Palette size={18} color={colors.foreground.muted} />} title="Direction visuelle (démo)" onPress={() => router.push('/catalogue')} />
            <Divider />
            <ListRow icon={<RotateCcw size={18} color={colors.foreground.muted} />} title="Recommencer la démo" subtitle="Revient à l’écran de bienvenue avec les données d’origine"
              onPress={() => { resetDemo(); router.replace('/welcome'); }} />
            <Divider />
            <ListRow icon={<LogOut size={18} color={colors.danger.DEFAULT} />} title="Se déconnecter" chevron={false}
              onPress={() => { logout(); toast('Vous êtes déconnecté', 'info'); router.replace('/login'); }} />
          </Card>
          <Text variant="caption" tone="subtle" className="mt-6 text-center">MILIEU · version de démonstration 0.1</Text>
        </Appear>
      </View>
    </ScrollView>
  );
}
