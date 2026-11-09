import '../global.css';
import '@/i18n';
import { useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { colors } from '@milieu/ui';
import { DemoProvider } from '@/demo/DemoProvider';
import { LaunchScreen } from '@/components/LaunchScreen';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: colors.brand.DEFAULT, background: colors.background, card: colors.surface.DEFAULT, text: colors.foreground.DEFAULT, border: colors.border.DEFAULT },
};

export default function RootLayout() {
  const [launched, setLaunched] = useState(false);
  const done = useCallback(() => setLaunched(true), []);
  return (
    <ThemeProvider value={theme}>
      <DemoProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        {!launched && <LaunchScreen onDone={done} />}
      </DemoProvider>
    </ThemeProvider>
  );
}
