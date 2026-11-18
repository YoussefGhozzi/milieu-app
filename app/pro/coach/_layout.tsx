import { CalendarDays, LayoutDashboard, ListChecks, ScanLine, UserRound } from 'lucide-react-native';
import { useNetwork } from '@/backend/NetworkProvider';
import { ProShell } from '@/pro/ProShell';

export default function CoachLayout() {
  const { db, me } = useNetwork();
  const pending = me ? db.courses.filter((c) => c.coachId === me.id && c.status === 'pending').length : 0;
  return (
    <ProShell
      role="coach"
      items={[
        { name: 'index', title: 'Tableau de bord', short: 'Accueil', icon: LayoutDashboard },
        { name: 'calendar', title: 'Calendrier', icon: CalendarDays },
        { name: 'courses', title: 'Mes cours', short: 'Cours', icon: ListChecks, badge: pending || undefined },
        { name: 'scan', title: 'Scanner un ticket', short: 'Scanner', icon: ScanLine },
        { name: 'profile', title: 'Mon profil', short: 'Profil', icon: UserRound },
      ]}
      hidden={['new']}
    />
  );
}
