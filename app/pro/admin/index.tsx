import { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Building2, CalendarCheck, Coins, Dumbbell, MapPin, UserPlus, Users } from 'lucide-react-native';
import { Badge, Button, Text, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { activePromotions, formatTnd } from '@/backend/engine';
import { Appear, Tap } from '@/components/motion';
import { AutoGrid, Page, PageHeader, StatCard } from '@/pro/ui';

/** Vue d'ensemble du réseau : toutes les salles, leurs équipes et leur activité. */
export default function AdminHome() {
  const { db, me } = useNetwork();
  const perGym = useMemo(() => db.gyms.map((g) => ({
    g,
    coaches: db.accounts.filter((a) => a.gymId === g.id && a.role === 'coach').length,
    clients: db.accounts.filter((a) => a.gymId === g.id && a.role === 'client').length,
    staff: db.accounts.filter((a) => a.gymId === g.id && a.role === 'backoffice').length,
    courses: db.courses.filter((c) => c.gymId === g.id && c.status === 'approved').length,
    pending: db.courses.filter((c) => c.gymId === g.id && c.status === 'pending').length,
    tokens: db.moves.filter((m) => m.gymId === g.id && m.type === 'recharge').reduce((n, m) => n + m.amount, 0),
  })), [db]);
  if (!me) return null;
  const sum = (k: 'coaches' | 'clients' | 'courses' | 'tokens') => perGym.reduce((n, x) => n + x[k], 0);

  return (
    <Page>
      <PageHeader overline="Administration" title="Réseau MILIEU" subtitle={`${db.gyms.length} salles · chaque coach, accueil et client appartient à sa salle.`}
        right={<Button label="Créer un compte" icon={<UserPlus size={18} color={colors.brand.foreground} />} onPress={() => router.push('/pro/admin/accounts')} />} />
      <AutoGrid min={160}>
        <StatCard index={0} icon={Building2} label="Salles" value={db.gyms.length} onPress={() => router.push('/pro/admin/gyms')} />
        <StatCard index={1} icon={Dumbbell} label="Coachs" value={sum('coaches')} color={colors.energy.DEFAULT} onPress={() => router.push('/pro/admin/accounts')} />
        <StatCard index={2} icon={Users} label="Clients" value={sum('clients')} color={colors.info.DEFAULT} />
        <StatCard index={3} icon={Coins} label="Jetons rechargés" value={sum('tokens')} color={colors.warning.DEFAULT} hint="Tous comptoirs confondus" />
      </AutoGrid>
      <Text variant="heading" className="mb-3 mt-8">Par salle</Text>
      <AutoGrid min={300}>
        {perGym.map((x, i) => (
          <Appear key={x.g.id} index={i}>
            <Tap onPress={() => router.push({ pathname: '/pro/admin/accounts', params: { gym: x.g.id } })} accessibilityLabel={x.g.name}>
              <View className="gap-4 rounded-xl border border-border bg-surface p-5">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text variant="heading">{x.g.name}</Text>
                    <View className="mt-1 flex-row items-center gap-1.5"><MapPin size={13} color={colors.foreground.muted} /><Text variant="caption" tone="muted">{x.g.address}</Text></View>
                  </View>
                  {x.pending ? <Badge tone="warning" label={`${x.pending} à valider`} /> : null}
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Badge label={`${x.staff} accueil`} />
                  <Badge label={`${x.coaches} coachs`} tone="success" />
                  <Badge label={`${x.clients} clients`} tone="brand" />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Badge tone="brand" label={`1 jeton = ${formatTnd(x.g.tokenPriceTnd)}`} />
                  {activePromotions(db, x.g.id).map((p) => <Badge key={p.id} tone="success" label={p.title} />)}
                </View>
                <View className="flex-row items-center gap-2">
                  <CalendarCheck size={14} color={colors.foreground.muted} />
                  <Text variant="label" tone="muted">{x.courses} cours actifs · {x.g.rooms.length} studio{x.g.rooms.length > 1 ? 's' : ''} · annulation {x.g.cancelHours} h</Text>
                </View>
              </View>
            </Tap>
          </Appear>
        ))}
      </AutoGrid>
    </Page>
  );
}
