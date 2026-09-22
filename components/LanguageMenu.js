import { useState, useEffect } from 'react';
import { setLang, t, languages } from '../lib/i18n';

export default function LanguageMenu({ onChange }) {
  const [lang, setLangLocal] = useState('fr');
  useEffect(()=>{ setLang(lang); if(onChange) onChange(lang); },[lang,onChange]);
  return (
    <select value={lang} onChange={e=> setLangLocal(e.target.value)} aria-label={t('langMenu')}>
      {languages.map(l=> <option key={l} value={l}>{t('lang'+l.toUpperCase())}</option>)}
    </select>
  );
}
