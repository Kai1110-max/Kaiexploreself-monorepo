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

const savedLanguage = localStorage.getItem('i18nextLng') || 'en';

i18n
  // .use(HttpBackend)
  // .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
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

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;
