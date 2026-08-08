/**
 * HomePage Component
 *
 * Landing page displayed when no session is selected. Provides quick access to:
 * - Theme toggle (dark/light mode)
 * - UI scale adjustment
 * - Terminal shell preference (Windows only)
 * - List of active sessions (running/waiting)
 *
 * Replaces the previous EmptyState component to provide a more functional
 * default view that allows users to configure settings without opening
 * the full Settings dialog.
 */
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Globe, Terminal, Palette, Eye } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useConfigStore } from '../stores/configStore';
import { useSessionStore } from '../stores/sessionStore';
import { API } from '../utils/api';
import { Dropdown } from './ui/Dropdown';
import { StartupEntryCard } from '../../../UpdateWuruize/frontend/ProjectEntryWidgets';
import {
  LANGUAGE_OPTIONS,
  getSessionStatusLabel,
  getShellPreferenceLabel,
  getThemeLabel,
  type Language,
  useI18n,
} from '../../../UpdateWuruize/frontend/I18nContext';

function getFallbackPlatform(): string {
  if (typeof navigator === 'undefined') {
    return '';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('windows')) return 'win32';
  if (userAgent.includes('mac')) return 'darwin';
  if (userAgent.includes('linux')) return 'linux';
  return '';
}

export function HomePage() {
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useConfigStore();
  const { sessions, setActiveSession } = useSessionStore();
  const { t } = useI18n();

  const [platform, setPlatform] = useState<string>('');
  const [availableShells, setAvailableShells] = useState<Array<{id: string; name: string; path: string}>>([]);
  const [preferredShell, setPreferredShell] = useState<string>('auto');

  const uiScale = config?.uiScale ?? 1.0;
  const currentLanguage = config?.language ?? 'en';

  // Filter for active sessions (running or waiting)
  const activeSessions = sessions.filter(
    s => s.status === 'running' || s.status === 'waiting'
  );

  // Fetch platform and available shells on mount
  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI?.getPlatform) {
      setPlatform(getFallbackPlatform());
      return;
    }

    electronAPI
      .getPlatform()
      .then(async (p) => {
        setPlatform(p);
        if (p === 'win32') {
          try {
            const shellsResponse = await API.config.getAvailableShells();
            if (shellsResponse.success) {
              setAvailableShells(shellsResponse.data);
            }
          } catch (error) {
            console.error('Failed to fetch available shells:', error);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to get platform:', error);
        setPlatform(getFallbackPlatform());
      });
  }, []);

  // Sync preferredShell with config
  useEffect(() => {
    if (config?.preferredShell) {
      setPreferredShell(config.preferredShell);
    }
  }, [config?.preferredShell]);

  const handleScaleChange = async (delta: number) => {
    const newScale = Math.round((uiScale + delta) * 10) / 10; // Avoid floating point issues
    if (newScale >= 0.8 && newScale <= 1.5) {
      await updateConfig({ uiScale: newScale }).catch(() => {});
    }
  };

  const handleShellChange = async (shell: string) => {
    setPreferredShell(shell);
    await updateConfig({ preferredShell: shell as 'auto' | 'gitbash' | 'powershell' | 'pwsh' | 'cmd' }).catch(() => {});
  };

  const handleLanguageChange = async (language: Language) => {
    await updateConfig({ language }).catch(() => {});
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-primary">
      <div className="w-full max-w-4xl">
        <div className="space-y-8">

            {/* Quick Preferences */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">{t('home.preferences')}</h2>

              {/* Theme */}
              <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-text-secondary" />
                  <span className="text-text-primary">{t('common.theme.label')}</span>
                </div>
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md bg-surface-tertiary hover:bg-surface-hover text-sm text-text-primary border border-border-secondary focus:outline-none focus:ring-2 focus:ring-interactive cursor-pointer flex items-center gap-2"
                    >
                      <span>{getThemeLabel(theme, t)}</span>
                      <ChevronDown className="w-3 h-3 text-text-tertiary" />
                    </button>
                  }
                  items={[
                    { id: 'light', label: t('common.theme.light'), onClick: () => setTheme('light') },
                    { id: 'dark', label: t('common.theme.dark'), onClick: () => setTheme('dark') },
                    { id: 'oled', label: t('common.theme.oled'), onClick: () => setTheme('oled') },
                  ]}
                  selectedId={theme}
                  position="bottom-right"
                  width="sm"
                />
              </div>

              {/* UI Scale */}
              <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-text-secondary" />
                  <span className="text-text-primary">{t('common.uiScale.label')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleScaleChange(-0.1)}
                    disabled={uiScale <= 0.8}
                    className="p-1 rounded-md bg-surface-tertiary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-text-secondary w-10 text-center">{uiScale.toFixed(1)}x</span>
                  <button
                    onClick={() => handleScaleChange(0.1)}
                    disabled={uiScale >= 1.5}
                    className="p-1 rounded-md bg-surface-tertiary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-text-secondary" />
                  <span className="text-text-primary">{t('common.language.label')}</span>
                </div>
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md bg-surface-tertiary hover:bg-surface-hover text-sm text-text-primary border border-border-secondary focus:outline-none focus:ring-2 focus:ring-interactive cursor-pointer flex items-center gap-2"
                    >
                      <span>{currentLanguage === 'zh' ? t('common.language.chinese') : t('common.language.english')}</span>
                      <ChevronDown className="w-3 h-3 text-text-tertiary" />
                    </button>
                  }
                  items={LANGUAGE_OPTIONS.map((option) => ({
                    id: option.id,
                    label: t(option.labelKey),
                    onClick: () => handleLanguageChange(option.id),
                  }))}
                  selectedId={currentLanguage}
                  position="bottom-right"
                  width="sm"
                />
              </div>

              {/* Terminal Shell (Windows only) */}
              {platform === 'win32' && (
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-text-secondary" />
                    <span className="text-text-primary">{t('common.terminalShell.label')}</span>
                  </div>
                  <Dropdown
                    trigger={
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-md bg-surface-tertiary hover:bg-surface-hover text-sm text-text-primary border border-border-secondary focus:outline-none focus:ring-2 focus:ring-interactive cursor-pointer flex items-center gap-2"
                      >
                        <span>{getShellPreferenceLabel(preferredShell, availableShells.find(s => s.id === preferredShell)?.name, t)}</span>
                        <ChevronDown className="w-3 h-3 text-text-tertiary" />
                      </button>
                    }
                    items={[
                      { id: 'auto', label: t('common.shell.autoShort'), onClick: () => handleShellChange('auto') },
                      ...availableShells.map(shell => ({
                        id: shell.id,
                        label: shell.name,
                        onClick: () => handleShellChange(shell.id),
                      })),
                    ]}
                    selectedId={preferredShell}
                    position="bottom-right"
                    width="sm"
                  />
                </div>
              )}

              <StartupEntryCard />
            </div>

            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text-primary">{t('home.activePanes')}</h2>
                <div className="space-y-2">
                  {activeSessions.slice(0, 5).map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setActiveSession(session.id)}
                      className="w-full flex items-center justify-between p-3 bg-surface-secondary rounded-lg hover:bg-surface-hover text-left"
                    >
                      <span className="text-text-primary truncate">{session.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        session.status === 'waiting'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {getSessionStatusLabel(session.status, t)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback message */}
            <p className="text-sm text-text-tertiary">
              {t('home.getStarted')}
            </p>
          </div>
        </div>
    </div>
  );
}
