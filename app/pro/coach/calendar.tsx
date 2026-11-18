import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Button, Text, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { listSessions } from '@/backend/engine';
import { Segmented } from '@/components/Chrome';
import { addDays } from '@/lib/format';
import { WeekCalendar, startOfWeek } from '@/pro/Calendar';
import { Page, PageHeader } from '@/pro/ui';
import { openSession } from '@/pro/nav';

/** Calendrier du coach : tous les cours validés de la salle, ses propres demandes en pointillés. */
export default function CoachCalendar() {
  const { db, me, myGym } = useNetwork();
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  const sessions = useMemo(() => {
    if (!me || !myGym) return [];
    const range = { gymId: myGym.id, from: week, to: addDays(week, 7) };
    const approved = listSessions(db, { ...range, coachId: scope === 'mine' ? me.id : undefined });
    const pending = listSessions(db, { ...range, coachId: me.id, statuses: ['pending'] });
    return [...approved, ...pending].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [db, me, myGym, week, scope]);

  if (!me || !myGym) return null;
  return (
    <Page>
      <PageHeader overline={myGym.name} title="Calendrier" subtitle="Les cours validés apparaissent chez tous les coachs et tous les clients de la salle."
        right={<Button label="Créer un cours" icon={<Plus size={18} color={colors.brand.foreground} />} onPress={() => router.push('/pro/coach/new')} />} />
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
        <View className="w-full max-w-[360px]">
          <Segmented value={scope} onChange={setScope} options={[{ key: 'all', label: 'Toute la salle' }, { key: 'mine', label: 'Mes cours' }]} />
        </View>
        <View className="flex-row flex-wrap items-center gap-4">
          <Legend color={colors.brand.DEFAULT} label="Mes cours" />
          <Legend color={colors.warning.DEFAULT} label="En attente de validation" dashed />
        </View>
      </View>
      <WeekCalendar sessions={sessions} week={week} onWeekChange={setWeek} highlight={(s) => s.course.coachId === me.id && s.course.status === 'approved'}
        onPressSession={(s) => (s.course.status === 'approved' ? openSession(s) : router.push('/pro/coach/courses'))} />
    </Page>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <View style={{ width: 14, height: 14, borderRadius: 4, borderWidth: 2, borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} />
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}
