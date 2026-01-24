import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import translations from "./translations.json";

const I18nContext = createContext(null);

const DEFAULT_LANG = "en";
const STORAGE_KEY = "lang";
const RTL_LANGS = new Set(["ar"]);

function getFromStorage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getFromStorage());

  useEffect(() => {
    const dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);

    const font = RTL_LANGS.has(lang)
        ? '"Cairo", system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif'
        : '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

    document.documentElement.style.setProperty("--app-font", font);

        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {}
    }, [lang]);


  const value = useMemo(() => {
    const dict = translations[lang] || translations[DEFAULT_LANG];

    const t = (key, fallback) => {
      const val = getByPath(dict, key);
      if (typeof val === "string") return val;

      // fallback: пробуем default язык
      const defVal = getByPath(translations[DEFAULT_LANG], key);
      if (typeof defVal === "string") return defVal;

      return fallback ?? key; // если нет перевода
    };

    return {
      lang,
      setLang,
      isRTL: RTL_LANGS.has(lang),
      t
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
