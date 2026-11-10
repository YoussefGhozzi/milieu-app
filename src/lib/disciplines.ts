import { Activity, Flame, Infinity as InfinityIcon, Wind, Zap, type LucideIcon } from 'lucide-react-native';

/** Identité visuelle de chaque discipline : couleur d'accent et icône (aucune photo dans la démo). */
export const DISCIPLINE_STYLE: Record<string, { color: string; icon: LucideIcon; mood: string }> = {
  lagree: { color: '#c4a91a', icon: Activity, mood: 'Lent. Intense. Précis.' },
  'hot-sculpt': { color: '#f97316', icon: Flame, mood: 'Chaleur et énergie' },
  'mat-pilates': { color: '#a78bfa', icon: InfinityIcon, mood: 'Gainage et contrôle' },
  mobility: { color: '#34d399', icon: Wind, mood: 'Respirer, s’étirer, récupérer' },
  functional: { color: '#60a5fa', icon: Zap, mood: 'Force et circuits' },
};

export const disciplineStyle = (id: string) => DISCIPLINE_STYLE[id] ?? DISCIPLINE_STYLE.lagree;

export const INTENSITY_LABEL = ['', 'Douce', 'Modérée', 'Intense'];
