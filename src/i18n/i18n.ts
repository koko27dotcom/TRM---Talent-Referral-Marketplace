import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'my', 'th', 'vi', 'zh', 'ms', 'ta'],
    ns: ['common', 'auth', 'jobs', 'referrals', 'payouts', 'navigation', 'validation'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    backend: {
      loadPath: '/api/localization/translations/{{lng}}?namespace={{ns}}',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
