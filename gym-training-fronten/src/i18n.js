import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en_v2.json';
import es from './locales/es_v2.json';

const browserLanguage = navigator.language?.split('-')[0] || 'en';

i18n
    .use(initReactI18next)
    .init({
        lng: browserLanguage,
        resources: {
            en: { translation: en },
            es: { translation: es }
        },
        fallbackLng: 'en',
        interpolation: { escapeValue: false }
    });

export default i18n;
