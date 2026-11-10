import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Text, colors } from '@milieu/ui';
import { useTranslation } from 'react-i18next';

/** A01 — Lancement : le logotype apparaît, puis s'efface sur l'app (1,4 s au total). */
export function LaunchScreen({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(1)).current;
  const logo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [logo, opacity, onDone]);

  const scale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  return (
    <Animated.View
      accessibilityLabel="MILIEU"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', opacity }]}
    >
      <Animated.View style={{ opacity: logo, transform: [{ scale }], alignItems: 'center' }}>
        <Text variant="display" tone="brand" className="text-[56px] leading-[64px]">mil!eu</Text>
        <Text variant="overline" tone="success" className="mt-2">{t('launch.tagline')}</Text>
      </Animated.View>
    </Animated.View>
  );
}
