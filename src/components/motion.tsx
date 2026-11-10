import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

/** Apparition douce vers le haut ; `index` décale les éléments d'une liste (effet cascade). */
export function Appear({ children, index = 0, delay = 0, style }: { children: ReactNode; index?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay + index * 60).duration(450).springify().damping(18)} style={style}>
      {children}
    </Animated.View>
  );
}

export function FadeInView({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={FadeIn.delay(delay).duration(400)} style={style}>{children}</Animated.View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Zone cliquable qui s'enfonce légèrement au toucher (retour tactile visuel). */
export function Tap({ children, style, scaleTo = 0.97, ...props }: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 20, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 260 }); }}
      style={[animated, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
