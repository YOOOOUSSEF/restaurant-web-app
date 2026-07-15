import { createContext, useContext, type ReactNode } from "react";
import { useI18n, type I18n } from "./useI18n";

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const i18n = useI18n();
  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
}

export function useI18nContext(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18nContext must be used within I18nProvider");
  return ctx;
}
