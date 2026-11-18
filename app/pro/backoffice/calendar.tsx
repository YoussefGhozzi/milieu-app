import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNetwork } from '@/backend/NetworkProvider';
import { listSessions } from '@/backend/engine';
import { addDays } from '@/lib/format';
import { WeekCalendar, startOfWeek } from '@/pro/Calendar';
import { ChoiceChips, Page, PageHeader } from '@/pro/ui';
import { openSession } from '@/pro/nav';

/** Calendrier de toute la salle, filtrable par coach. */
export default function BackofficeCalendar() {
  const { db, myGym } = useNetwork();
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [coach, setCoach] = useState('all');
  const coaches = db.accounts.filter((a) => a.role === 'coach' && a.gymId === myGym?.id);
  const sessions = useMemo(() => (myGym
    ? listSessions(db, { gymId: myGym.id, from: week, to: addDays(week, 7), coachId: coach === 'all' ? undefined : coach })
    : []), [db, myGym, week, coach]);
  if (!myGym) return null;
  return (
    <Page>
      <PageHeader overline={myGym.name} title="Calendrier de la salle" subtitle="Tous les cours validés. Touchez une séance pour voir les inscrits et valider les présences." />
      <View className="mb-5">
        <ChoiceChips value={coach} onChange={setCoach} options={[{ key: 'all', label: 'Tous les coachs' }, ...coaches.map((c) => ({ key: c.id, label: c.firstName }))]} />
      </View>
      <WeekCalendar sessions={sessions} week={week} onWeekChange={setWeek} onPressSession={openSession} />
    </Page>
  );
}
