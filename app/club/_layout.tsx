import { Redirect, Slot } from 'expo-router';
import { isApi } from '@/api/config';

/**
 * « Ma salle » du réseau simulé (démo multi-salles). Avec la vraie API, le planning, les réservations et le solde
 * des onglets sont déjà ceux de la salle du membre : on y renvoie.
 */
export default function ClubLayout() {
  if (isApi) return <Redirect href="/(tabs)/planning" />;
  return <Slot />;
}
