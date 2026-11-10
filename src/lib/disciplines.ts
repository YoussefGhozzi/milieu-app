import { Activity, Flame, Infinity as InfinityIcon, Wind, Zap, type LucideIcon } from 'lucide-react-native';

/** Identité visuelle de chaque discipline : couleur d'accent et icône (aucune photo dans la démo). */
export const DISCIPLINE_STYLE: Record<string, { color: string; icon: LucideIcon; mood: string }> = {
  lagree: { color: '#FF6B1A', icon: Activity, mood: 'Lent. Intense. Précis.' },
  'hot-sculpt': { color: '#FF4D6A', icon: Flame, mood: 'Chaleur et énergie' },
  'mat-pilates': { color: '#A78BFA', icon: InfinityIcon, mood: 'Gainage et contrôle' },
  mobility: { color: '#22C55E', icon: Wind, mood: 'Respirer, s’étirer, récupérer' },
  functional: { color: '#38BDF8', icon: Zap, mood: 'Force et circuits' },
};

export const disciplineStyle = (id: string) => DISCIPLINE_STYLE[id] ?? DISCIPLINE_STYLE.lagree;

export const INTENSITY_LABEL = ['', 'Douce', 'Modérée', 'Intense'];
