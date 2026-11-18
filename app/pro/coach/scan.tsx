import { useNetwork } from '@/backend/NetworkProvider';
import { Scanner } from '@/pro/Scanner';
import { Page, PageHeader } from '@/pro/ui';

/** Le coach scanne les tickets QR de ses propres cours. */
export default function CoachScan() {
  const { myGym } = useNetwork();
  return (
    <Page>
      <PageHeader overline={myGym?.name} title="Scanner un ticket" subtitle="Scannez le QR du client à l’entrée : sa présence est validée et ses jetons sont débités." />
      <Scanner />
    </Page>
  );
}
