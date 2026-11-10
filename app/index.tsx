import { Redirect } from 'expo-router';
import { useDemo } from '@/demo/DemoProvider';

/** Aiguillage : présentation au premier lancement, puis connexion, puis l'app. */
export default function Index() {
  const { state } = useDemo();
  if (!state.onboarded) return <Redirect href="/welcome" />;
  if (!state.loggedIn) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
