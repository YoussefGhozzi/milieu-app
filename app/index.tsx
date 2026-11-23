import { Redirect } from 'expo-router';
import { useDemo } from '@/demo/DemoProvider';

/** Aiguillage : présentation au premier lancement, puis connexion, puis l'app. */
export default function Index() {
  const { state, loading } = useDemo();
  // Vraie API : on attend la restauration de la session avant d'aiguiller (sinon passage éclair par la connexion).
  if (loading) return null;
  if (!state.onboarded) return <Redirect href="/welcome" />;
  if (!state.loggedIn) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
