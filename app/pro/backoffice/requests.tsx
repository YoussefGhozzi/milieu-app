import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ClipboardCheck } from 'lucide-react-native';
import { EmptyState, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { Segmented } from '@/components/Chrome';
import { RequestCard } from '@/pro/RequestCard';
import { AutoGrid, Page, PageHeader } from '@/pro/ui';

/** Validation des cours proposés par les coachs de la salle. */
export default function Requests() {
  const { db, myGym } = useNetwork();
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const { pending, done } = useMemo(() => {
    const mine = db.courses.filter((c) => c.gymId === myGym?.id);
    return {
      pending: mine.filter((c) => c.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      done: mine.filter((c) => c.status !== 'pending').sort((a, b) => (b.reviewedAt ?? b.createdAt).localeCompare(a.reviewedAt ?? a.createdAt)),
    };
  }, [db.courses, myGym]);
  if (!myGym) return null;
  const list = tab === 'pending' ? pending : done;

  return (
    <Page>
      <PageHeader overline={myGym.name} title="Validation des cours" subtitle="Un cours validé apparaît aussitôt dans les calendriers des coachs et des clients, et à l’affiche dans l’app client." />
      <View className="mb-5 w-full max-w-[420px]">
        <Segmented value={tab} onChange={setTab} options={[{ key: 'pending', label: `À traiter · ${pending.length}` }, { key: 'done', label: `Historique · ${done.length}` }]} />
      </View>
      {list.length ? (
        <AutoGrid min={360} gap={16}>{list.map((c, i) => <RequestCard key={c.id} course={c} index={i} />)}</AutoGrid>
      ) : (
        <EmptyState icon={<ClipboardCheck size={28} color={colors.foreground.muted} />} title={tab === 'pending' ? 'Tout est à jour' : 'Aucun historique'}
          body={tab === 'pending' ? 'Les nouvelles demandes des coachs apparaîtront ici.' : 'Les cours validés et refusés apparaîtront ici.'} />
      )}
    </Page>
  );
}
