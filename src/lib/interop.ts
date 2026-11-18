import Animated from 'react-native-reanimated';
import { cssInterop } from 'nativewind';

/*
 * Permet d'utiliser `className` (Tailwind / NativeWind) directement sur les vues animées de Reanimated.
 * Sans cela, la classe est ignorée (ex. une rangée `flex-row` animée s'afficherait en colonne).
 * Sans effet sur le code existant, qui n'utilise que `style` sur ces vues.
 */
cssInterop(Animated.View, { className: 'style' });
