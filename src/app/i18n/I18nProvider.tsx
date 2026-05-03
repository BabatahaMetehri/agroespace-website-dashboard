import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dictionaries, LANGS, type Lang } from './translations';

type I18nContextValue = {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'agroespace.lang';

const detectInitial = (): Lang => {
  if (typeof window === 'undefined') return 'fr';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored && LANGS.some((l) => l.code === stored)) return stored;
  return 'fr';
};

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(detectInitial);

  const dir = useMemo(() => LANGS.find((l) => l.code === lang)?.dir ?? 'ltr', [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir,
      setLang: setLangState,
      t: (key, fallback) => {
        return dictionaries[lang]?.[key] ?? dictionaries.fr[key] ?? fallback ?? key;
      },
    }),
    [lang, dir]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
