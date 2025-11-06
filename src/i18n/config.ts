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

// get language from start params or default to 'en'
const getInitialLanguage = (): string => {
  // check start_param from Telegram WebApp (multiple ways to access it)
  const startParam = window.Telegram?.WebApp?.startParam || 
                     window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  
  if (startParam) {
    // start_param can be a string like "lang=en" or just "en"
    const langMatch = startParam.match(/lang=([a-z]{2})/i) || startParam.match(/^([a-z]{2})$/i);
    if (langMatch) {
      const lang = langMatch[1].toLowerCase();
      if (['en', 'de', 'uk', 'ru'].includes(lang)) {
        return lang;
      }
    }
  }
  
  // check URL params as fallback
  const urlParams = new URLSearchParams(window.location.search);
  const langFromUrl = urlParams.get('lang');
  if (langFromUrl && ['en', 'de', 'uk', 'ru'].includes(langFromUrl.toLowerCase())) {
    return langFromUrl.toLowerCase();
  }
  
  return 'en';
};

const initialLanguage = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already does escaping
    },
  });

export default i18n;
