import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import de from './de_v1.json';
import en from './en_v1.json';
import ru from './ru_v1.json';
import uk from './uk_v1.json';

const resources = {
  de: { translation: de },
  en: { translation: en },
  ru: { translation: ru },
  uk: { translation: uk },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already does escaping
    },
  });

export default i18n;
