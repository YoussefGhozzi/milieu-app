import { BadgePercent, Building2, LayoutDashboard, UsersRound } from 'lucide-react-native';
import { ProShell } from '@/pro/ProShell';

export default function AdminLayout() {
  return (
    <ProShell
      role="admin"
      items={[
        { name: 'index', title: 'Vue réseau', short: 'Réseau', icon: LayoutDashboard },
        { name: 'gyms', title: 'Salles', icon: Building2 },
        { name: 'pricing', title: 'Tarifs & promos', short: 'Tarifs', icon: BadgePercent },
        { name: 'accounts', title: 'Comptes', icon: UsersRound },
      ]}
    />
  );
}
