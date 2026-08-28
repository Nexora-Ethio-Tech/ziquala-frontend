import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import amTranslation from './locales/am.json';
import omTranslation from './locales/om.json';

const resources = {
  en: {
    translation: enTranslation
  },
  am: {
    translation: amTranslation
  },
  om: {
    translation: omTranslation
  }
};

const savedLanguage = localStorage.getItem('ziquala_language') || localStorage.getItem('ziquala_lang') || 'en';
const activeLang = savedLanguage === 'or' ? 'om' : savedLanguage;

const updateDomLanguage = (lng: string) => {
  const currentLang = lng === 'or' ? 'om' : lng;
  document.documentElement.setAttribute('lang', currentLang);
  document.documentElement.setAttribute('data-lang', currentLang);
  if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute('data-lang', currentLang);
  }
};

updateDomLanguage(activeLang);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: activeLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => {
  updateDomLanguage(lng);
});

export default i18n;
