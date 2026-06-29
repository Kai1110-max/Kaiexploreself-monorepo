import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from './en/translation.json';
import translationKR from './kr/translation.json';
import translationZH from './zh/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  kr: {
    translation: translationKR,
  },
  zh: {
    translation: translationZH,
  }
};

i18n
  // .use(HttpBackend)
  // .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en',
    supportedLngs: ['en', 'kr', 'zh'],
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    resources,
    react: {
      useSuspense: true
    }
  });

export default i18n;
