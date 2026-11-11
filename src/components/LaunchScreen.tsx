import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text as RNText } from 'react-native';
import { colors } from '@milieu/ui';
import { Logo, TAGLINE } from './Logo';

/** A01 — Lancement aux couleurs de la marque : logo noir sur orange, puis fondu vers l'app. */
export function LaunchScreen({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const logo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logo, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [logo, opacity, onDone]);

  const scale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  return (
    <Animated.View accessibilityLabel="MILIEU" style={[StyleSheet.absoluteFill, { backgroundColor: colors.brand.DEFAULT, alignItems: 'center', justifyContent: 'center', opacity }]}>
      <Animated.View style={{ opacity: logo, transform: [{ scale }], alignItems: 'center', gap: 18 }}>
        <Logo kind="mark" tone="dark" height={84} />
        <Logo kind="wordmark" tone="dark" height={34} />
        <RNText style={{ color: '#000', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>{TAGLINE}</RNText>
      </Animated.View>
    </Animated.View>
  );
}
