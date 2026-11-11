const { colors, radius, fontSize, fontFamily } = require('@milieu/ui/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  // Thème sombre fixe : le mode sombre ne suit pas le réglage du système (sinon erreur NativeWind sur le web).
  darkMode: 'class',
  theme: { extend: { colors, borderRadius: radius, fontSize, fontFamily } },
  plugins: [],
};
