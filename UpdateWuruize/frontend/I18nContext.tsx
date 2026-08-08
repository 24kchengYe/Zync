import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConfigStore } from '../../frontend/src/stores/configStore';
import type { AppConfig } from '../../frontend/src/types/config';
import {
  getTranslation,
  isLanguage,
  type Language,
  type TranslationKey,
} from './i18n';

const STORAGE_KEY = 'zync-language';

interface I18nContextValue {
  language: Language;
  t: (key: TranslationKey) => string;
}

const globalI18nState = globalThis as typeof globalThis & {
  __ZYNC_I18N_CONTEXT__?: React.Context<I18nContextValue | undefined>;
  __ZYNC_I18N_WARNED__?: boolean;
};

const I18nContext =
  globalI18nState.__ZYNC_I18N_CONTEXT__ ??
  createContext<I18nContextValue | undefined>(undefined);

if (!globalI18nState.__ZYNC_I18N_CONTEXT__) {
  globalI18nState.__ZYNC_I18N_CONTEXT__ = I18nContext;
}

const FALLBACK_LANGUAGE: Language = 'en';
const FALLBACK_I18N_CONTEXT: I18nContextValue = {
  language: FALLBACK_LANGUAGE,
  t: (key) => getTranslation(FALLBACK_LANGUAGE, key),
};

function normalizeLanguage(language: AppConfig['language']): Language {
  return language && isLanguage(language) ? language : 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useConfigStore();
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEY);
    return savedLanguage && isLanguage(savedLanguage) ? savedLanguage : 'en';
  });

  useEffect(() => {
    if (!config) {
      return;
    }

    setLanguage(normalizeLanguage(config.language));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const t = (key: TranslationKey) => getTranslation(language, key);

  return (
    <I18nContext.Provider value={{ language, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    if (!globalI18nState.__ZYNC_I18N_WARNED__) {
      console.warn('[I18n] Missing I18nProvider context, falling back to English translations.');
      globalI18nState.__ZYNC_I18N_WARNED__ = true;
    }
    return FALLBACK_I18N_CONTEXT;
  }

  return context;
}

export {
  LANGUAGE_OPTIONS,
  getDeleteProjectConfirmText,
  getThemeLabel,
  getShellPreferenceLabel,
  getSessionStatusLabel,
  getWorkspaceCountLabel,
  interpolateTranslation,
  type Language,
} from './i18n';
