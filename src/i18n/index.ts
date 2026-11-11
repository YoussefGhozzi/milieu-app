import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import type { Lang } from '@milieu/contracts';
import { fr } from './fr';
import { en } from './en';
import { ar } from './ar';
import { setTranslator } from '@milieu/ui';
import { translateText } from './translate';

const SUPPORTED: Lang[] = ['fr', 'en', 'ar'];
const LANG_KEY = 'milieu.lang';
const storedLang = (): Lang | undefined => {
  try { return Platform.OS === 'web' ? (localStorage.getItem(LANG_KEY) as Lang | null) ?? undefined : undefined; } catch { return undefined; }
};
const deviceLang = storedLang() ?? (getLocales()[0]?.languageCode as Lang | undefined);

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } },
  lng: deviceLang && SUPPORTED.includes(deviceLang) ? deviceLang : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

setTranslator(translateText);
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = i18n.language;
}

export const isRTL = (lang: string) => lang === 'ar';

/**
 * Change la langue et le sens de lecture.
 * Web : appliqué immédiatement. Téléphone : le passage en RTL demande un redémarrage de l'app.
 * Renvoie true si un redémarrage est nécessaire.
 */
export function setLanguage(lang: Lang): boolean {
  i18n.changeLanguage(lang);
  try { if (Platform.OS === 'web') localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  const rtl = isRTL(lang);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    return false;
  }
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    return true;
  }
  return false;
}

/** Locale de formatage des dates et montants. */
export const localeOf = (lang: string) => (lang === 'ar' ? 'ar-TN' : lang === 'en' ? 'en-GB' : 'fr-FR');

export default i18n;
