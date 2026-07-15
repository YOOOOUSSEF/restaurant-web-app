import { useState, useCallback, useMemo } from "react";
import { translations, type Lang, type Translations } from "./translations";

const STORAGE_KEY = "urbanbites-lang";

function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem(STORAGE_KEY) as Lang) || "en";
}

export function useI18n() {
  const [lang, setLangState] = useState<Lang>(getStoredLang());

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  }, []);

  const t = useMemo(() => {
    return translations[lang] as Translations;
  }, [lang]);

  const isRTL = lang === "ar";

  return { lang, setLang, t, isRTL };
}

export type I18n = ReturnType<typeof useI18n>;
