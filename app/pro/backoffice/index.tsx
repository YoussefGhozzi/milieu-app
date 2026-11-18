import { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ClipboardCheck, Coins, ScanLine, UserCheck, Wallet } from 'lucide-react-native';
import { Button, Text, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { METHOD_LABEL, fullName, listSessions } from '@/backend/engine';
import { Appear } from '@/components/motion';
import { addDays, dayLong, relative, startOfDay } from '@/lib/format';
import { SessionCard } from '@/pro/Calendar';
import { RequestCard } from '@/pro/RequestCard';
import { AutoGrid, Page, PageHeader, Panel, StatCard } from '@/pro/ui';
import { openSession } from '@/pro/nav';

/** Tableau de bord de l'accueil : demandes à valider, séances du jour, recharges récentes. */
export default function BackofficeHome() {
  const { db, me, myGym } = useNetwork();
  const now = new Date();

  const data = useMemo(() => {
    if (!me || !myGym) return null;
    const today = listSessions(db, { gymId: myGym.id, from: startOfDay(now), to: addDays(startOfDay(now), 1) });
    const pending = db.courses.filter((c) => c.gymId === myGym.id && c.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const recharges = db.moves.filter((m) => m.gymId === myGym.id && m.type === 'recharge').sort((a, b) => b.at.localeCompare(a.at));
    const todayIds = new Set(today.map((s) => `${s.course.id}@${s.start.toISOString()}`));
    return {
      today, pending,
      presentToday: db.tickets.filter((t) => t.status === 'attended' && todayIds.has(`${t.courseId}@${t.occurrenceAt}`)).length,
      bookedToday: today.reduce((n, s) => n + s.booked, 0),
      monthTokens: recharges.filter((m) => m.at >= monthStart).reduce((n, m) => n + m.amount, 0),
      recentRecharges: recharges.slice(0, 5),
    };
  }, [db, me, myGym]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me || !myGym || !data) return null;
  return (
    <Page>
      <PageHeader overline={`Accueil · ${myGym.name}`} title={`Bonjour ${me.firstName}`} subtitle={dayLong(now)}
        right={<View className="flex-row gap-3">
          <Button variant="secondary" label="Recharger" icon={<Wallet size={18} color={colors.foreground.DEFAULT} />} onPress={() => router.push('/pro/backoffice/clients')} />
          <Button label="Scanner" icon={<ScanLine size={18} color={colors.brand.foreground} />} onPress={() => router.push('/pro/backoffice/scan')} />
        </View>} />

      <AutoGrid min={160}>
        <StatCard index={0} icon={ClipboardCheck} label="Cours à valider" value={data.pending.length} color={colors.warning.DEFAULT} hint="Demandes des coachs" onPress={() => router.push('/pro/backoffice/requests')} />
        <StatCard index={1} icon={UserCheck} label="Présents aujourd’hui" value={`${data.presentToday} / ${data.bookedToday}`} color={colors.energy.DEFAULT} hint="Scannés / réservés" />
        <StatCard index={2} icon={ScanLine} label="Séances aujourd’hui" value={data.today.length} color={colors.info.DEFAULT} />
        <StatCard index={3} icon={Coins} label="Jetons rechargés ce mois" value={data.monthTokens} hint="Paiements reçus à l’accueil" />
      </AutoGrid>

      <View className="mt-6">
        <AutoGrid min={380} gap={20}>
          <Appear index={4}>
            <Panel title="À valider en priorité" action={data.pending.length > 2 ? 'Tout voir' : undefined} onAction={() => router.push('/pro/backoffice/requests')}>
              {data.pending.length ? (
                <View className="gap-4">{data.pending.slice(0, 2).map((c, i) => <RequestCard key={c.id} course={c} index={i} />)}</View>
              ) : <Text variant="label" tone="muted">Aucune demande en attente. 🎉</Text>}
            </Panel>
          </Appear>
          <Appear index={5}>
            <View className="gap-5">
              <Panel title="Séances du jour" action="Calendrier" onAction={() => router.push('/pro/backoffice/calendar')}>
                {data.today.length ? <View className="gap-3">{data.today.map((s) => <SessionCard key={s.key} s={s} onPress={() => openSession(s)} />)}</View>
                  : <Text variant="label" tone="muted">Aucune séance aujourd’hui.</Text>}
              </Panel>
              <Panel title="Dernières recharges" action="Clients" onAction={() => router.push('/pro/backoffice/clients')}>
                {data.recentRecharges.length ? data.recentRecharges.map((m) => (
                  <View key={m.id} className="flex-row items-center gap-3 py-2">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-success-soft"><Coins size={16} color={colors.success.DEFAULT} /></View>
                    <View className="flex-1">
                      <Text variant="label" className="font-semibold">{fullName(db.accounts.find((a) => a.id === m.clientId))}</Text>
                      <Text variant="caption" tone="muted">{m.method ? METHOD_LABEL[m.method] : ''} · {relative(m.at)}</Text>
                    </View>
                    <Text variant="label" tone="success" className="font-bold">+{m.amount}</Text>
                  </View>
                )) : <Text variant="label" tone="muted">Aucune recharge pour l’instant.</Text>}
              </Panel>
            </View>
          </Appear>
        </AutoGrid>
      </View>
    </Page>
  );
}
