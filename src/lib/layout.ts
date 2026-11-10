import { useWindowDimensions } from 'react-native';

/**
 * Points de rupture de l'app (largeur en px) :
 * - compact : petits téléphones (< 360 de large, ex. iPhone SE 1re génération) ou écrans courts (< 700 de haut)
 * - téléphone : 360 à 767
 * - tablette : 768 et plus → listes sur 2 colonnes, contenu centré
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isCompact = width < 360 || height < 700;
  return { width, height, isTablet, isCompact, cols: isTablet ? 2 : 1 };
}
