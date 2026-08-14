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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage === 'or' ? 'om' : savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
