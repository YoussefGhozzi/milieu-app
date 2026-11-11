import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { vars } from 'nativewind';
import i18n from 'i18next';
import { applyTheme, colors, themeVariables, type ThemeMode } from '@milieu/ui';

const KEY = 'milieu.theme';
const read = (): ThemeMode => {
  try { if (Platform.OS === 'web' && localStorage.getItem(KEY) === 'light') return 'light'; } catch { /* stockage indisponible */ }
  return 'dark';
};

const Ctx = createContext<{ mode: ThemeMode; setMode: (m: ThemeMode) => void; toggle: () => void }>({ mode: 'dark', setMode: () => {}, toggle: () => {} });

/** Mode nuit / jour. Un changement de thème ou de langue redessine toute l'app (l'état de la démo est conservé). */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => { const m = read(); applyTheme(m); return m; });
  const [lang, setLang] = useState(i18n.language);

  useEffect(() => {
    const onLang = (l: string) => setLang(l);
    i18n.on('languageChanged', onLang);
    return () => { i18n.off('languageChanged', onLang); };
  }, []);

  const setMode = (m: ThemeMode) => {
    applyTheme(m);
    try { if (Platform.OS === 'web') localStorage.setItem(KEY, m); } catch { /* ignore */ }
    setModeState(m);
  };

  const variables = useMemo(() => themeVariables(mode), [mode]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(variables)) root.style.setProperty(k, v);
    root.style.backgroundColor = colors.background;
    root.style.colorScheme = mode;
  }, [variables, mode]);

  const value = useMemo(() => ({ mode, setMode, toggle: () => setMode(mode === 'dark' ? 'light' : 'dark') }), [mode]);
  return (
    <Ctx.Provider value={value}>
      <View key={`${mode}-${lang}`} style={[{ flex: 1, backgroundColor: colors.background }, vars(variables)]}>{children}</View>
    </Ctx.Provider>
  );
}

export const useAppTheme = () => useContext(Ctx);
