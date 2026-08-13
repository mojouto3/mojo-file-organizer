import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import gr from '../locales/gr.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import ru from '../locales/ru.json';

i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, gr: { translation: gr }, de: { translation: de }, es: { translation: es }, ru: { translation: ru } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18next;
