import i18n from 'i18next';
import { EN } from './dict.en';
import { AR } from './dict.ar';

/*
 * Traduction par texte source : le français écrit dans les écrans sert de clé (principe de gettext).
 * Clés avec variables : {n} = un nombre, {s} = un texte libre ; la traduction les reprend avec $1, $2…
 * Un texte absent du dictionnaire reste en français.
 */
const DICTS: Record<string, Record<string, string>> = { en: EN, ar: AR };
const compiled: Record<string, { re: RegExp; out: string }[]> = {};
const escapeRe = (s: string) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');

function patterns(lang: string) {
  if (!compiled[lang]) {
    compiled[lang] = Object.entries(DICTS[lang])
      .filter(([k]) => k.includes('{n}') || k.includes('{s}'))
      .map(([k, out]) => ({
        re: new RegExp('^' + escapeRe(k).split('{n}').join('(\\d+(?:[.,]\\d+)?)').split('{s}').join('(.+?)') + '$'),
        out,
      }));
  }
  return compiled[lang];
}

function core(text: string, lang: string, depth = 0): string {
  const dict = DICTS[lang];
  if (Object.prototype.hasOwnProperty.call(dict, text)) return dict[text];
  if (depth > 2) return text;
  for (const p of patterns(lang)) {
    const m = text.match(p.re);
    if (m) return p.out.replace(/\$(\d)/g, (_, i) => core(m[Number(i)], lang, depth + 1));
  }
  if (text.includes(' · ')) return text.split(' · ').map((part) => core(part, lang, depth + 1)).join(' · ');
  return text;
}

export function translateText(text: string): string {
  const lang = i18n.language;
  if (!DICTS[lang] || !text) return text;
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m || !m[2]) return text;
  return m[1] + core(m[2], lang) + m[3];
}
