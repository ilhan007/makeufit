"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en.json";
import bg from "./bg.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en }, bg: { translation: bg } },
      fallbackLng: "en",
      supportedLngs: ["en", "bg"],
      detection: {
        order: ["localStorage"],
        caches: ["localStorage"],
        lookupLocalStorage: "i18n_lang",
      },
      interpolation: { escapeValue: false },
    });
}

export default i18n;
