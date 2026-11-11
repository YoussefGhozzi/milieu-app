import { Image } from 'react-native';

/* Logo officiel MILIEU (fichiers extraits de la maquette du client). */
const SOURCES = {
  wordmark: { dark: require('../../assets/brand/wordmark.png'), light: require('../../assets/brand/wordmark-light.png'), orange: require('../../assets/brand/wordmark-orange.png') },
  mark: { dark: require('../../assets/brand/mark.png'), light: require('../../assets/brand/mark-light.png'), orange: require('../../assets/brand/mark-orange.png') },
} as const;
const RATIO = { wordmark: 520 / 130, mark: 160 / 142 };

export function Logo({ kind = 'wordmark', tone = 'orange', height = 24 }: { kind?: 'wordmark' | 'mark'; tone?: 'dark' | 'light' | 'orange'; height?: number }) {
  return <Image accessibilityLabel="MILIEU" source={SOURCES[kind][tone]} resizeMode="contain" style={{ height, width: height * RATIO[kind] }} />;
}

export const TAGLINE = 'Coffee · Sport · Community';
