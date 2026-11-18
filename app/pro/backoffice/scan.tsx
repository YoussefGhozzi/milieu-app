import { useNetwork } from '@/backend/NetworkProvider';
import { Scanner } from '@/pro/Scanner';
import { Page, PageHeader } from '@/pro/ui';

/** L'accueil scanne les tickets de tous les cours de la salle. */
export default function BackofficeScan() {
  const { myGym } = useNetwork();
  return (
    <Page>
      <PageHeader overline={myGym?.name} title="Scanner un ticket" subtitle="Valide la présence du client et débite les jetons de la séance." />
      <Scanner />
    </Page>
  );
}
