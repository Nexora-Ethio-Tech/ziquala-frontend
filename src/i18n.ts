import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import amTranslation from './locales/am.json';
import omTranslation from './locales/om.json';
import enPublic from './locales/public.en.json';
import amPublic from './locales/public.am.json';
import omPublic from './locales/public.om.json';
import { normalizeLanguage } from './locales/languages';

const resources = {
  en: { translation: enTranslation, public: enPublic },
  am: { translation: amTranslation, public: amPublic },
  om: { translation: omTranslation, public: omPublic },
};

const readLanguage = () => {
  try {
    return normalizeLanguage(localStorage.getItem('ziquala_language') || localStorage.getItem('ziquala_lang') || 'en');
  } catch {
    return 'en';
  }
};

const syncLanguage = (value: string) => {
  const language = normalizeLanguage(value);
  document.title = resources[language].translation.common.schoolName;
  document.documentElement.lang = language;
  document.documentElement.dataset.lang = language;
  if (document.body) document.body.dataset.lang = language;
  try {
    localStorage.setItem('ziquala_language', language);
    // The legacy preference key mirrors the same global state.
    localStorage.setItem('ziquala_lang', language === 'om' ? 'or' : language);
  } catch {
    // The selected language remains usable when browser storage is unavailable.
  }
};

i18n.on('languageChanged', syncLanguage);
i18n.use(initReactI18next).init({
  resources,
  lng: readLanguage(),
  supportedLngs: ['en', 'am', 'om'],
  load: 'languageOnly',
  fallbackLng: 'en',
  defaultNS: 'translation',
  interpolation: { escapeValue: false },
});

window.addEventListener('storage', event => {
  if ((event.key === 'ziquala_language' || event.key === 'ziquala_lang') && event.newValue) {
    const language = normalizeLanguage(event.newValue);
    if (language !== normalizeLanguage(i18n.resolvedLanguage || i18n.language)) void i18n.changeLanguage(language);
  }
});

export default i18n;
