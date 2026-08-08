import type { AppConfig } from '../../frontend/src/types/config';
import { en } from './locales/en';
import { zh } from './locales/zh';

export type Language = 'en' | 'zh';

type ThemePreference = NonNullable<AppConfig['theme']>;
type Translator = (key: TranslationKey) => string;

export type TranslationKey = keyof typeof en;

const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  zh,
};

const themeLabelKeys: Record<ThemePreference, TranslationKey> = {
  light: 'common.theme.light',
  dark: 'common.theme.dark',
  oled: 'common.theme.oled',
};

const sessionStatusKeys: Record<string, TranslationKey> = {
  initializing: 'common.status.initializing',
  ready: 'common.status.ready',
  running: 'common.status.running',
  waiting: 'common.status.waiting',
  stopped: 'common.status.stopped',
  completed_unviewed: 'common.status.completed',
  error: 'common.status.error',
  unknown: 'common.status.unknown',
};

export const LANGUAGE_OPTIONS: Array<{ id: Language; labelKey: TranslationKey }> = [
  { id: 'en', labelKey: 'common.language.english' },
  { id: 'zh', labelKey: 'common.language.chinese' },
];

export function isLanguage(value: string): value is Language {
  return value === 'en' || value === 'zh';
}

export function getTranslation(language: Language, key: TranslationKey): string {
  return translations[language][key] ?? translations.en[key];
}

export function getThemeLabel(theme: ThemePreference, t: Translator): string {
  return t(themeLabelKeys[theme]);
}

export function getShellPreferenceLabel(
  preferredShell: string,
  shellName: string | undefined,
  t: Translator,
  variant: 'short' | 'long' = 'short',
): string {
  if (preferredShell === 'auto') {
    return variant === 'long' ? t('common.shell.autoLong') : t('common.shell.autoShort');
  }

  return shellName ?? preferredShell;
}

export function getSessionStatusLabel(status: string, t: Translator): string {
  const key = sessionStatusKeys[status];
  return key ? t(key) : status;
}

export function interpolateTranslation(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

export function getWorkspaceCountLabel(count: number, t: Translator): string {
  const key = count === 1 ? 'common.workspaceCount.one' : 'common.workspaceCount.other';
  return interpolateTranslation(t(key), { count });
}

export function getDeleteProjectConfirmText(projectName: string, t: Translator): string {
  return interpolateTranslation(t('sidebar.projectDeleteConfirm'), { name: projectName });
}
