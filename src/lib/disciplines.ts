import { Activity, Flame, Infinity as InfinityIcon, Wind, Zap, type LucideIcon } from 'lucide-react-native';
import { getThemeMode } from '@milieu/ui';

/** Identité visuelle de chaque discipline : icône et couleur d'accent (une teinte par thème, pour rester lisible). */
const STYLES: Record<string, { dark: string; light: string; icon: LucideIcon; mood: string }> = {
  lagree: { dark: '#FF6B1A', light: '#C2410C', icon: Activity, mood: 'Lent. Intense. Précis.' },
  'hot-sculpt': { dark: '#FF4D6A', light: '#BE123C', icon: Flame, mood: 'Chaleur et énergie' },
  'mat-pilates': { dark: '#A78BFA', light: '#6D28D9', icon: InfinityIcon, mood: 'Gainage et contrôle' },
  mobility: { dark: '#22C55E', light: '#15803D', icon: Wind, mood: 'Respirer, s’étirer, récupérer' },
  functional: { dark: '#38BDF8', light: '#0369A1', icon: Zap, mood: 'Force et circuits' },
};

export const disciplineStyle = (id: string) => {
  const s = STYLES[id] ?? STYLES.lagree;
  return { color: s[getThemeMode()], icon: s.icon, mood: s.mood };
};

export const INTENSITY_LABEL = ['', 'Douce', 'Modérée', 'Intense'];
