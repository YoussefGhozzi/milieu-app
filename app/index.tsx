import { Redirect } from 'expo-router';

// L'accueil (bienvenue, inscription) sera branché ici au ticket DEMO-07 ; pour l'instant on entre dans l'app.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
