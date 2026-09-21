const LANG = {
  fr: {
    appName: 'ColorAnalyze',
    langMenu: 'Langue',
    langFr: 'Français',
    langEn: 'Anglais',
    palette: 'Palette de couleurs',
    harmony: 'Harmonie',
    atmosphere: 'Ambiance',
    guidance: 'Consignes de retouche',
    save: 'Enregistrer',
    load: 'Charger',
  },
  en: {
    appName: 'ColorAnalyze',
    langMenu: 'Language',
    langFr: 'French',
    langEn: 'English',
    palette: 'Color palette',
    harmony: 'Harmony',
    atmosphere: 'Atmosphere',
    guidance: 'Editing guidance',
    save: 'Save',
    load: 'Load',
  }
};

let current = 'fr';

export function setLang(l) { current = LANG[l] ? l : 'fr'; }
export function getLang() { return current; }
export function t(key) { return LANG[current][key] ?? key; }
export const languages = Object.keys(LANG);
export function getLabels() { return LANG[current]; }
