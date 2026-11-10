import { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { CalendarCheck2, Coins, QrCode } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@milieu/contracts';
import { Button, Chip, Text, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { setLanguage } from '@/i18n';
import { useLayout } from '@/lib/layout';

const SLIDES = [
  { icon: Coins, title: 'Un pack, des jetons', body: 'Achetez un pack de M Tokens une seule fois, puis utilisez-les pour tous vos cours. Sans abonnement.' },
  { icon: CalendarCheck2, title: 'Réservez en trois gestes', body: 'Lagree, Hot Sculpt, Pilates… Voyez les places en direct et réservez votre cours en quelques secondes.' },
  { icon: QrCode, title: 'Entrez avec votre QR', body: 'À l’arrivée, montrez votre QR à l’accueil. Votre place est confirmée, rien d’autre à faire.' },
];

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({ width: withSpring(active ? 28 : 8, { damping: 15 }), opacity: withSpring(active ? 1 : 0.4) }));
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: colors.brand.DEFAULT }, style]} />;
}

/** A02 — Bienvenue : 3 écrans de présentation et choix de la langue. */
export default function Welcome() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const { finishOnboarding } = useDemo();
  const { isCompact } = useLayout();
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const slideWidth = Math.min(width, 640);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / slideWidth));
  const next = () => {
    if (page < SLIDES.length - 1) scroller.current?.scrollTo({ x: (page + 1) * slideWidth, animated: true });
    else go('/register');
  };
  const go = (href: '/register' | '/login') => { finishOnboarding(); router.replace(href); };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
      <View className="flex-row items-center justify-between px-5">
        <Text variant="title" tone="brand" className="font-bold">mil!eu</Text>
        <View className="flex-row gap-2">
          {(['fr', 'en', 'ar'] as Lang[]).map((l) => (
            <Chip key={l} label={l.toUpperCase()} selected={i18n.language === l} onPress={() => setLanguage(l)} />
          ))}
        </View>
      </View>

      <View className="flex-1 items-center">
        <ScrollView
          ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={32}
          style={{ width: slideWidth, flexGrow: 0, flex: 1 }}
        >
          {SLIDES.map((s, i) => {
            const Icon = s.icon;
            return (
              <View key={s.title} style={{ width: slideWidth }} className="flex-1 justify-center px-8">
                <Animated.View entering={FadeIn.delay(300 + i * 100).duration(600)} style={{ marginBottom: isCompact ? 20 : 40, alignItems: 'center' }}>
                  <View className={isCompact ? 'h-28 w-28 items-center justify-center rounded-full border border-brand/30 bg-brand-soft' : 'h-40 w-40 items-center justify-center rounded-full border border-brand/30 bg-brand-soft'}>
                    <View className={isCompact ? 'h-20 w-20 items-center justify-center rounded-full bg-energy-soft' : 'h-28 w-28 items-center justify-center rounded-full bg-energy-soft'}>
                      <Icon size={isCompact ? 40 : 56} color={colors.brand.DEFAULT} strokeWidth={1.5} />
                    </View>
                  </View>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(450).duration(500)}>
                  <Text variant="overline" tone="brand" className="mb-3 text-center">{`0${i + 1} / 03`}</Text>
                  <Text variant={isCompact ? 'title' : 'display'} className="text-center">{s.title}</Text>
                  <Text tone="muted" className="mt-4 text-center leading-6">{s.body}</Text>
                </Animated.View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View className="w-full max-w-xl gap-6 self-center px-5">
        <View accessibilityLabel={`Écran ${page + 1} sur 3`} className="flex-row justify-center gap-2">
          {SLIDES.map((s, i) => <Dot key={s.title} active={i === page} />)}
        </View>
        <Button block size="lg" label={page < SLIDES.length - 1 ? 'Continuer' : 'Créer mon compte'} onPress={next} />
        <Button block variant="ghost" label="J’ai déjà un compte" onPress={() => go('/login')} />
      </View>
    </View>
  );
}
