import en from './locales/en.js';
import ru from './locales/ru.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';
import zh from './locales/zh.js';

// Все доступные языки
const locales = {
  en,
  ru,
  es,
  fr,
  de,
  ja,
  ko,
  zh
};

// Функция для получения перевода по ключу
export function t(key, params = {}) {
  // Получаем текущий язык из localStorage или используем английский по умолчанию
  const currentLanguage = localStorage.getItem('language') || 'en';
  
  // Получаем словарь для текущего языка
  const translations = locales[currentLanguage] || locales.en;
  
  // Разбираем вложенные ключи (например, 'summary.noInsights')
  let translation = key.split('.').reduce((obj, k) => obj && obj[k], translations) || key;
  
  // Заменяем параметры в строке, если они есть
  Object.keys(params).forEach(param => {
    translation = translation.replace(`{${param}}`, params[param]);
  });
  
  return translation;
}

// Функция для установки языка
export function setLanguage(language) {
  localStorage.setItem('language', language);
  // Отправляем событие об изменении языка
  window.dispatchEvent(new CustomEvent('language-changed', { detail: { language } }));
}

// Функция для получения текущего языка
export function getCurrentLanguage() {
  return localStorage.getItem('language') || 'en';
}

// Функция для получения списка доступных языков
export function getAvailableLanguages() {
  return [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' }
  ];
}