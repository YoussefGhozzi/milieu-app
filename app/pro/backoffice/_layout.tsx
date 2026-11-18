import { CalendarDays, ClipboardCheck, LayoutDashboard, ScanLine, Wallet } from 'lucide-react-native';
import { useNetwork } from '@/backend/NetworkProvider';
import { ProShell } from '@/pro/ProShell';

export default function BackofficeLayout() {
  const { db, me } = useNetwork();
  const pending = me ? db.courses.filter((c) => c.gymId === me.gymId && c.status === 'pending').length : 0;
  return (
    <ProShell
      role="backoffice"
      items={[
        { name: 'index', title: 'Tableau de bord', short: 'Accueil', icon: LayoutDashboard },
        { name: 'requests', title: 'Validation des cours', short: 'Validations', icon: ClipboardCheck, badge: pending || undefined },
        { name: 'calendar', title: 'Calendrier', icon: CalendarDays },
        { name: 'clients', title: 'Clients & jetons', short: 'Jetons', icon: Wallet },
        { name: 'scan', title: 'Scanner un ticket', short: 'Scanner', icon: ScanLine },
      ]}
    />
  );
}
