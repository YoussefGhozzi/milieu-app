import '../global.css';
import '@/i18n';
import '@/lib/interop';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { colors } from '@milieu/ui';
import { DemoProvider } from '@/demo/DemoProvider';
import { ApiMemberProvider } from '@/api/ApiMemberProvider';
import { isApi } from '@/api/config';

/** Données du membre : vraie API (EXPO_PUBLIC_DATA_SOURCE=api) ou démo autonome (par défaut). */
const MemberProvider = isApi ? ApiMemberProvider : DemoProvider;
import { NetworkProvider } from '@/backend/NetworkProvider';
import { LaunchScreen } from '@/components/LaunchScreen';
import { ToastProvider } from '@/components/Toast';
import { AppThemeProvider, useAppTheme } from '@/theme/AppTheme';

function Shell() {
  const { mode } = useAppTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, primary: colors.brand.DEFAULT, background: colors.background, card: colors.surface.DEFAULT, text: colors.foreground.DEFAULT, border: colors.border.DEFAULT } };
  return (
    <ThemeProvider value={theme}>
      <ToastProvider>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="booking/success" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [launched, setLaunched] = useState(false);
  const done = useCallback(() => setLaunched(true), []);
  // Polices de la marque (web) : Archivo Black pour les titres, Montserrat pour le texte.
  useEffect(() => {
    if (Platform.OS !== 'web' || document.getElementById('milieu-fonts')) return;
    const link = document.createElement('link');
    link.id = 'milieu-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Montserrat:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
  return (
    <MemberProvider>
      <NetworkProvider>
        <AppThemeProvider><Shell /></AppThemeProvider>
        {!launched && <LaunchScreen onDone={done} />}
      </NetworkProvider>
    </MemberProvider>
  );
}
