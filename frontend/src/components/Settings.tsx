import { useState, useEffect, useCallback } from 'react';
import { NotificationSettings } from './NotificationSettings';
import { useNotifications } from '../hooks/useNotifications';
import { API } from '../utils/api';
import { optIn, capture, captureAndOptOut } from '../services/posthog';
import type { AppConfig, TerminalShortcut } from '../types/config';
import { useConfigStore } from '../stores/configStore';
import { useSessionStore } from '../stores/sessionStore';
import { panelApi } from '../services/panelApi';
import {
  Shield,
  ShieldOff,
  Settings as SettingsIcon,
  Palette,
  Zap,
  RefreshCw,
  FileText,
  Eye,
  BarChart3,
  Activity,
  ChevronUp,
  ChevronDown,
  Terminal,
  Globe,
  Cloud,
  Trash2,
  Copy,
  Check,
  Keyboard,
  Plus,
  Power,
  PowerOff,
  Loader2,
  Play
} from 'lucide-react';
import { Input, Textarea, Checkbox } from './ui/Input';
import { Button } from './ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { SettingsSection } from './ui/SettingsSection';
import { Dropdown } from './ui/Dropdown';
import {
  LANGUAGE_OPTIONS,
  getShellPreferenceLabel,
  getThemeLabel,
  interpolateTranslation,
  type Language,
  useI18n,
} from '../../../UpdateWuruize/frontend/I18nContext';

function getFallbackPlatform(): string {
  if (typeof navigator === 'undefined') {
    return 'darwin';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('windows')) return 'win32';
  if (userAgent.includes('mac')) return 'darwin';
  if (userAgent.includes('linux')) return 'linux';
  return 'darwin';
}

interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: string;
}

export function Settings({ isOpen, onClose, initialSection }: SettingsProps) {
  const [_config, setConfig] = useState<AppConfig | null>(null);
  const [verbose, setVerbose] = useState(false);
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState('');
  const [claudeExecutablePath, setClaudeExecutablePath] = useState('');
  const [defaultPermissionMode, setDefaultPermissionMode] = useState<'approve' | 'ignore'>('ignore');
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const [additionalPathsText, setAdditionalPathsText] = useState('');
  const [platform, setPlatform] = useState<string>('darwin');
  const [enableCommitFooter, setEnableCommitFooter] = useState(true);
  const [disableAutoContext, setDisableAutoContext] = useState(false);
  const [autoRenameToPR, setAutoRenameToPR] = useState<boolean>(true);
  const [uiScale, setUiScale] = useState(1.0);
  const [language, setLanguage] = useState<Language>('en');
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    playSound: true,
    notifyOnStatusChange: true,
    notifyOnWaiting: true,
    notifyOnComplete: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'shortcuts' | 'analytics'>('general');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [previousAnalyticsEnabled, setPreviousAnalyticsEnabled] = useState(true);
  const [preferredShell, setPreferredShell] = useState<string>('auto');
  const [availableShells, setAvailableShells] = useState<Array<{id: string; name: string; path: string}>>([]);
  const [cloudProvider] = useState<'gcp'>('gcp');
  const [cloudApiToken, setCloudApiToken] = useState('');
  const [cloudServerId, setCloudServerId] = useState('');
  const [cloudVncPassword, setCloudVncPassword] = useState('');
  const [vncPasswordCopied, setVncPasswordCopied] = useState(false);
  const [cloudRegion, setCloudRegion] = useState('');
  const [cloudGcpProjectId, setCloudGcpProjectId] = useState('');
  const [cloudGcpZone, setCloudGcpZone] = useState('');
  const [cloudTunnelPort, setCloudTunnelPort] = useState('8080');
  const [terminalShortcuts, setTerminalShortcuts] = useState<TerminalShortcut[]>([]);
  const [cloudSetupLoading, setCloudSetupLoading] = useState(false);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const { updateSettings } = useNotifications();
  const { theme, setTheme } = useTheme();
  const { fetchConfig: refreshConfigStore, updateConfig: updateGlobalConfig } = useConfigStore();
  const { t } = useI18n();
  const additionalPathsHelperText = platform === 'win32'
    ? t('settings.advanced.path.helperWindows')
    : t('settings.advanced.path.helperUnix');

  const handleRunCloudSetup = useCallback(async () => {
    if (!activeSessionId) return;
    setCloudSetupLoading(true);
    try {
      const panel = await panelApi.createPanel({
        sessionId: activeSessionId,
        type: 'terminal',
        title: t('settings.cloud.panelTitle'),
        initialState: {
          customState: {
            initialCommand: 'bash cloud/scripts/setup-cloud.sh'
          }
        }
      });
      await panelApi.setActivePanel(activeSessionId, panel.id);
      onClose();
    } catch (err) {
      console.error('[Settings] Failed to create cloud setup terminal:', err);
    } finally {
      setCloudSetupLoading(false);
    }
  }, [activeSessionId, onClose, t]);

  useEffect(() => {
    if (isOpen) {
      // Get platform first, then fetch config (needed for Windows shell detection)
      const electronAPI = window.electronAPI;
      if (electronAPI?.getPlatform) {
        electronAPI.getPlatform()
          .then((p) => {
            setPlatform(p);
            fetchConfig(p);
          })
          .catch((platformError) => {
            console.error('Failed to get platform in Settings:', platformError);
            const fallbackPlatform = getFallbackPlatform();
            setPlatform(fallbackPlatform);
            fetchConfig(fallbackPlatform);
          });
      } else {
        const fallbackPlatform = getFallbackPlatform();
        setPlatform(fallbackPlatform);
      }

      const loadAutoRename = async () => {
        try {
          const result = await window.electron?.invoke('preferences:get', 'auto_rename_sessions_to_pr') as IPCResponse<string>;
          if (result?.data !== undefined && result?.data !== null) {
            setAutoRenameToPR(result.data !== 'false');
          }
        } catch (error) {
          console.error('Failed to load auto-rename preference:', error);
        }
      };
      loadAutoRename();

      // Navigate to shortcuts tab when opened via Ctrl+Alt+/
      if (initialSection === 'terminal-shortcuts') {
        setActiveTab('shortcuts');
      }
    }
  }, [isOpen, initialSection]);

  const fetchConfig = async (currentPlatform?: string) => {
    try {
      const response = await API.config.get();
      if (!response.success) throw new Error(response.error || 'Failed to fetch config');
      const data = response.data;
      setConfig(data);
      setVerbose(data.verbose || false);
      setAnthropicApiKey(data.anthropicApiKey || '');
      setGlobalSystemPrompt(data.systemPromptAppend || '');
      setClaudeExecutablePath(data.claudeExecutablePath || '');
      setDefaultPermissionMode(data.defaultPermissionMode || 'ignore');
      setAutoCheckUpdates(data.autoCheckUpdates !== false); // Default to true
      setDevMode(data.devMode || false);
      setEnableCommitFooter(data.enableCommitFooter !== false); // Default to true
      setDisableAutoContext(data.disableAutoContext || false);
      setUiScale(data.uiScale || 1.0);
      setLanguage(data.language || 'en');

      // Load additional paths
      const paths = data.additionalPaths || [];
      setAdditionalPathsText(paths.join('\n'));

      // Load notification settings
      if (data.notifications) {
        setNotificationSettings(data.notifications);
        // Update the useNotifications hook with loaded settings
        updateSettings(data.notifications);
      }

      // Load analytics settings
      if (data.analytics) {
        const enabled = data.analytics.enabled !== false; // Default to true
        setAnalyticsEnabled(enabled);
        setPreviousAnalyticsEnabled(enabled);
      }

      // Fetch available shells on Windows
      const platformToCheck = currentPlatform || platform;
      if (platformToCheck === 'win32') {
        const shellsResponse = await API.config.getAvailableShells();
        if (shellsResponse.success) {
          setAvailableShells(shellsResponse.data);
        }
      }
      setPreferredShell(data.preferredShell || 'auto');

      // Load terminal shortcuts
      setTerminalShortcuts(data.terminalShortcuts ?? []);

      // Load cloud settings
      if (data.cloud) {
        // Provider is always GCP (IAP-secured)
        setCloudApiToken(data.cloud.apiToken || '');
        setCloudServerId(data.cloud.serverId || '');
        setCloudVncPassword(data.cloud.vncPassword || '');
        setCloudRegion(data.cloud.region || '');
        setCloudGcpProjectId(data.cloud.projectId || '');
        setCloudGcpZone(data.cloud.zone || '');
        setCloudTunnelPort(String(data.cloud.tunnelPort || 8080));
      }
    } catch (err) {
      setError(t('settings.errors.loadConfig'));
    }
  };

  const handleAutoRenameToggle = async (checked: boolean) => {
    setAutoRenameToPR(checked);
    try {
      await window.electron?.invoke('preferences:set', 'auto_rename_sessions_to_pr', checked ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to save auto-rename preference:', error);
    }
  };

  const handleLanguageChange = async (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    await updateGlobalConfig({ language: nextLanguage }).catch((languageError) => {
      console.error('Failed to update language:', languageError);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Parse the additional paths text into an array
      const parsedPaths = additionalPathsText
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      const response = await API.config.update({
        verbose,
        anthropicApiKey,
        systemPromptAppend: globalSystemPrompt,
        claudeExecutablePath,
        defaultPermissionMode,
        autoCheckUpdates,
        devMode,
        enableCommitFooter,
        disableAutoContext,
        language,
        uiScale,
        additionalPaths: parsedPaths,
        notifications: notificationSettings,
        analytics: {
          enabled: analyticsEnabled
        },
        preferredShell,
        terminalShortcuts,
        cloud: (cloudServerId || cloudGcpProjectId || cloudApiToken) ? {
          provider: cloudProvider,
          apiToken: cloudApiToken,
          serverId: cloudServerId || undefined,
          vncPassword: cloudVncPassword || undefined,
          region: cloudRegion || undefined,
          projectId: cloudGcpProjectId || undefined,
          zone: cloudGcpZone || undefined,
          tunnelPort: parseInt(cloudTunnelPort, 10) || 8080,
        } : undefined,
      });

      if (!response.success) {
        throw new Error(response.error || t('settings.errors.updateConfig'));
      }

      // Only toggle PostHog opt-in/opt-out after config save succeeds
      if (previousAnalyticsEnabled !== analyticsEnabled) {
        if (analyticsEnabled) {
          optIn();
          capture('analytics_opted_in');
        } else {
          captureAndOptOut('analytics_opted_out');
        }
      }

      // Update the useNotifications hook with new settings
      updateSettings(notificationSettings);

      // Refresh config from server
      await fetchConfig();

      // Also refresh the global config store
      await refreshConfigStore();

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.errors.updateConfig'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" showCloseButton={false}>
      <ModalHeader
        title={t('settings.title')}
        icon={<SettingsIcon className="w-5 h-5" />}
        onClose={onClose}
      />

      <ModalBody>
        {/* Tabs */}
        <div className="flex border-b border-border-primary mb-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-interactive border-b-2 border-interactive bg-interactive/5'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {t('settings.tabs.general')}
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'text-interactive border-b-2 border-interactive bg-interactive/5'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {t('settings.tabs.notifications')}
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'shortcuts'
                ? 'text-interactive border-b-2 border-interactive bg-interactive/5'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {t('settings.tabs.shortcuts')}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-interactive border-b-2 border-interactive bg-interactive/5'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {t('settings.tabs.analytics')}
          </button>
        </div>

        {activeTab === 'general' && (
          <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Appearance */}
            <CollapsibleCard
              title={t('settings.appearance.title')}
              subtitle={t('settings.appearance.subtitle')}
              icon={<Palette className="w-5 h-5" />}
              defaultExpanded={true}
            >
              <SettingsSection
                title={t('common.theme.label')}
                description={t('settings.appearance.theme.description')}
                icon={<Palette className="w-4 h-4" />}
              >
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="w-full px-4 py-3 bg-surface-secondary hover:bg-surface-hover rounded-lg transition-colors border border-border-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive cursor-pointer flex items-center justify-between"
                    >
                      <span>{getThemeLabel(theme, t)}</span>
                      <ChevronDown className="w-4 h-4 text-text-tertiary" />
                    </button>
                  }
                  items={[
                    { id: 'light', label: t('common.theme.light'), onClick: () => setTheme('light') },
                    { id: 'dark', label: t('common.theme.dark'), onClick: () => setTheme('dark') },
                    { id: 'oled', label: t('common.theme.oled'), onClick: () => setTheme('oled') },
                  ]}
                  selectedId={theme}
                  position="auto"
                  width="lg"
                />
              </SettingsSection>

              <SettingsSection
                title={t('common.uiScale.label')}
                description={t('settings.appearance.uiScale.description')}
                icon={<Eye className="w-4 h-4" />}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const newScale = Math.round((uiScale - 0.1) * 10) / 10;
                        if (newScale >= 0.8) {
                          setUiScale(newScale);
                          API.config.update({ uiScale: newScale });
                        }
                      }}
                      disabled={uiScale <= 0.8}
                      className="p-1.5 rounded-md bg-surface-tertiary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-text-primary w-12 text-center">
                      {uiScale.toFixed(1)}x
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newScale = Math.round((uiScale + 0.1) * 10) / 10;
                        if (newScale <= 1.5) {
                          setUiScale(newScale);
                          API.config.update({ uiScale: newScale });
                        }
                      }}
                      disabled={uiScale >= 1.5}
                      className="p-1.5 rounded-md bg-surface-tertiary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {[0.8, 1.0, 1.2, 1.5].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setUiScale(preset);
                          API.config.update({ uiScale: preset });
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                          uiScale === preset
                            ? 'bg-interactive text-white border-interactive'
                            : 'bg-surface-secondary text-text-secondary border-border-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {preset.toFixed(1)}x
                      </button>
                    ))}
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                title={t('common.language.label')}
                description={t('settings.appearance.language.description')}
                icon={<Globe className="w-4 h-4" />}
              >
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="w-full px-4 py-3 bg-surface-secondary hover:bg-surface-hover rounded-lg transition-colors border border-border-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive cursor-pointer flex items-center justify-between"
                    >
                      <span>{language === 'zh' ? t('common.language.chinese') : t('common.language.english')}</span>
                      <ChevronDown className="w-4 h-4 text-text-tertiary" />
                    </button>
                  }
                  items={LANGUAGE_OPTIONS.map((option) => ({
                    id: option.id,
                    label: t(option.labelKey),
                    onClick: () => handleLanguageChange(option.id),
                  }))}
                  selectedId={language}
                  position="auto"
                  width="lg"
                />
              </SettingsSection>
            </CollapsibleCard>

            {/* AI Integration */}
            <CollapsibleCard
              title={t('settings.ai.title')}
              subtitle={t('settings.ai.subtitle')}
              icon={<Zap className="w-5 h-5" />}
              defaultExpanded={true}
            >
              <SettingsSection
                title={t('settings.ai.smartNaming.title')}
                description={t('settings.ai.smartNaming.description')}
                icon={<FileText className="w-4 h-4" />}
              >
                <Input
                  label={t('settings.ai.smartNaming.apiKeyLabel')}
                  type="password"
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  placeholder={t('settings.ai.smartNaming.apiKeyPlaceholder')}
                  fullWidth
                  helperText={t('settings.ai.smartNaming.apiKeyHelper')}
                />
              </SettingsSection>

              <SettingsSection
                title={t('settings.ai.security.title')}
                description={t('settings.ai.security.description')}
                icon={defaultPermissionMode === 'approve' ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
              >
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-hover transition-colors border border-border-secondary">
                    <input
                      type="radio"
                      name="defaultPermissionMode"
                      value="ignore"
                      checked={defaultPermissionMode === 'ignore'}
                      onChange={(e) => setDefaultPermissionMode(e.target.value as 'ignore' | 'approve')}
                      className="text-interactive mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldOff className="w-4 h-4 text-text-tertiary" />
                        <span className="text-sm font-medium text-text-primary">{t('settings.ai.security.fast.title')}</span>
                        <span className="ml-auto px-2 py-0.5 text-xs bg-status-warning/20 text-status-warning rounded-full">{t('settings.ai.security.fast.badge')}</span>
                      </div>
                      <p className="text-xs text-text-tertiary leading-relaxed">
                        {t('settings.ai.security.fast.description')}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-hover transition-colors border border-border-secondary">
                    <input
                      type="radio"
                      name="defaultPermissionMode"
                      value="approve"
                      checked={defaultPermissionMode === 'approve'}
                      onChange={(e) => setDefaultPermissionMode(e.target.value as 'ignore' | 'approve')}
                      className="text-interactive mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-status-success" />
                        <span className="text-sm font-medium text-text-primary">{t('settings.ai.security.secure.title')}</span>
                      </div>
                      <p className="text-xs text-text-tertiary leading-relaxed">
                        {t('settings.ai.security.secure.description')}
                      </p>
                    </div>
                  </label>
                </div>
              </SettingsSection>

              <SettingsSection
                title={t('settings.ai.instructions.title')}
                description={t('settings.ai.instructions.description')}
                icon={<FileText className="w-4 h-4" />}
              >
                <Textarea
                  label={t('settings.ai.instructions.label')}
                  value={globalSystemPrompt}
                  onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                  placeholder={t('settings.ai.instructions.placeholder')}
                  rows={3}
                  fullWidth
                  helperText={t('settings.ai.instructions.helper')}
                />
              </SettingsSection>

              <SettingsSection
                title={t('settings.ai.commitAttribution.title')}
                description={t('settings.ai.commitAttribution.description')}
                icon={<FileText className="w-4 h-4" />}
              >
                <Checkbox
                  label={t('settings.ai.commitAttribution.checkbox')}
                  checked={enableCommitFooter}
                  onChange={(e) => setEnableCommitFooter(e.target.checked)}
                />
                <p className="text-xs text-text-tertiary mt-1">
                  {t('settings.ai.commitAttribution.helper')}
                </p>
              </SettingsSection>

              <SettingsSection
                title={t('settings.ai.autoRename.title')}
                description={t('settings.ai.autoRename.description')}
                icon={<FileText className="w-4 h-4" />}
              >
                <Checkbox
                  label={t('settings.ai.autoRename.checkbox')}
                  checked={autoRenameToPR}
                  onChange={(e) => handleAutoRenameToggle(e.target.checked)}
                />
                <p className="text-xs text-text-tertiary mt-1">
                  {t('settings.ai.autoRename.helper')}
                </p>
              </SettingsSection>

              <SettingsSection
                title={t('settings.ai.autoContext.title')}
                description={t('settings.ai.autoContext.description')}
                icon={<Activity className="w-4 h-4" />}
              >
                <Checkbox
                  label={t('settings.ai.autoContext.checkbox')}
                  checked={disableAutoContext}
                  onChange={(e) => setDisableAutoContext(e.target.checked)}
                />
                <p className="text-xs text-text-tertiary mt-1">
                  {t('settings.ai.autoContext.helper')}
                </p>
              </SettingsSection>
            </CollapsibleCard>

            {/* Cloud VM */}
            <CollapsibleCard
              title={t('settings.cloud.title')}
              subtitle={t('settings.cloud.subtitle')}
              icon={<Cloud className="w-5 h-5" />}
              defaultExpanded={false}
            >
              <SettingsSection
                title={t('settings.cloud.provider.title')}
                description={t('settings.cloud.provider.description')}
                icon={<Cloud className="w-4 h-4" />}
              >
                <div className="p-3 rounded-lg bg-surface-secondary border border-border-secondary">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{t('settings.cloud.provider.name')}</span>
                    <span className="px-2 py-0.5 text-xs bg-status-success/20 text-status-success rounded-full">{t('settings.cloud.provider.badge')}</span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">{t('settings.cloud.provider.specs')}</p>
                </div>
              </SettingsSection>

              <SettingsSection
                title={t('settings.cloud.setup.title')}
                description={t('settings.cloud.setup.description')}
                icon={<Play className="w-4 h-4" />}
              >
                <div className="p-3 rounded-lg bg-surface-secondary border border-border-secondary">
                  <p className="text-sm text-text-secondary mb-3">
                    {t('settings.cloud.setup.helper')}
                  </p>
                  {activeSessionId ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunCloudSetup}
                      disabled={cloudSetupLoading}
                    >
                      {cloudSetupLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Terminal className="w-4 h-4 mr-2" />
                      )}
                      {t('settings.cloud.setup.button')}
                    </Button>
                  ) : (
                    <p className="text-xs text-text-tertiary">
                      {t('settings.cloud.setup.empty')}
                    </p>
                  )}
                </div>
              </SettingsSection>

              <SettingsSection
                title={t('settings.cloud.apiToken.title')}
                description={t('settings.cloud.apiToken.description')}
                icon={<Shield className="w-4 h-4" />}
              >
                <Input
                  label={t('settings.cloud.apiToken.label')}
                  type="password"
                  value={cloudApiToken}
                  onChange={(e) => setCloudApiToken(e.target.value)}
                  placeholder={t('settings.cloud.apiToken.placeholder')}
                  fullWidth
                  helperText={t('settings.cloud.apiToken.helper')}
                />
              </SettingsSection>

              <SettingsSection
                title={t('settings.cloud.server.title')}
                description={t('settings.cloud.server.description')}
                icon={<FileText className="w-4 h-4" />}
              >
                <div className="space-y-3">
                  <Input
                    label={t('settings.cloud.server.idLabel')}
                    value={cloudServerId}
                    onChange={(e) => setCloudServerId(e.target.value)}
                    placeholder={t('settings.cloud.server.idPlaceholder')}
                    fullWidth
                    helperText={t('settings.cloud.server.idHelper')}
                  />
                  <div className="relative">
                    <Input
                      label={t('settings.cloud.server.vncLabel')}
                      type="password"
                      value={cloudVncPassword}
                      onChange={(e) => setCloudVncPassword(e.target.value)}
                      placeholder={t('settings.cloud.server.vncPlaceholder')}
                      fullWidth
                      helperText={t('settings.cloud.server.vncHelper')}
                    />
                    {cloudVncPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(cloudVncPassword);
                          setVncPasswordCopied(true);
                          setTimeout(() => setVncPasswordCopied(false), 2000);
                        }}
                        className="absolute right-2 top-[30px] p-1.5 rounded hover:bg-surface-secondary transition-colors"
                        title={t('common.copyPassword')}
                      >
                        {vncPasswordCopied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-text-secondary" />
                        )}
                      </button>
                    )}
                  </div>
                  <Input
                    label={t('settings.cloud.server.regionLabel')}
                    value={cloudRegion}
                    onChange={(e) => setCloudRegion(e.target.value)}
                    placeholder={t('settings.cloud.server.regionPlaceholder')}
                    fullWidth
                  />
                  {cloudProvider === 'gcp' && (
                    <>
                      <Input
                        label={t('settings.cloud.server.projectLabel')}
                        value={cloudGcpProjectId}
                        onChange={(e) => setCloudGcpProjectId(e.target.value)}
                        placeholder={t('settings.cloud.server.projectPlaceholder')}
                        fullWidth
                      />
                      <Input
                        label={t('settings.cloud.server.zoneLabel')}
                        value={cloudGcpZone}
                        onChange={(e) => setCloudGcpZone(e.target.value)}
                        placeholder={t('settings.cloud.server.zonePlaceholder')}
                        fullWidth
                      />
                      <Input
                        label={t('settings.cloud.server.portLabel')}
                        value={cloudTunnelPort}
                        onChange={(e) => setCloudTunnelPort(e.target.value)}
                        placeholder={t('settings.cloud.server.portPlaceholder')}
                        fullWidth
                        helperText={t('settings.cloud.server.portHelper')}
                      />
                    </>
                  )}
                </div>
              </SettingsSection>

              <SettingsSection
                title={t('settings.cloud.reset.title')}
                description={t('settings.cloud.reset.description')}
                icon={<Trash2 className="w-4 h-4" />}
              >
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-surface-secondary border border-border-secondary">
                    <p className="text-sm text-text-secondary mb-3">
                      {t('settings.cloud.reset.localHelper')}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        setCloudApiToken('');
                        setCloudServerId('');
                        setCloudVncPassword('');
                        setCloudRegion('');
                        setCloudGcpProjectId('');
                        setCloudGcpZone('');
                        setCloudTunnelPort('8080');
                        // Auto-save the cleared config
                        try {
                          await API.config.update({
                            cloud: undefined,
                          });
                        } catch (err) {
                          console.error('Failed to clear cloud config:', err);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('settings.cloud.reset.clearButton')}
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-sm text-text-secondary mb-2">
                      {t('settings.cloud.reset.destroyIntro')}
                    </p>
                    <code className="block text-xs bg-surface-primary p-2 rounded border border-border-primary mb-2 font-mono">
                      bash cloud/scripts/setup-cloud.sh --destroy
                    </code>
                    <p className="text-xs text-text-tertiary">
                      {t('settings.cloud.reset.destroyHelper')}
                    </p>
                  </div>
                </div>
              </SettingsSection>
            </CollapsibleCard>

            {/* System Updates */}
            <CollapsibleCard
              title={t('settings.updates.title')}
              subtitle={t('settings.updates.subtitle')}
              icon={<RefreshCw className="w-5 h-5" />}
              defaultExpanded={false}
            >
              <SettingsSection
                title={t('settings.updates.auto.title')}
                description={t('settings.updates.auto.description')}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-border-secondary">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      label={t('settings.updates.auto.checkbox')}
                      checked={autoCheckUpdates}
                      onChange={(e) => setAutoCheckUpdates(e.target.checked)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await API.checkForUpdates();
                        if (response.success && response.data) {
                          if (response.data.hasUpdate) {
                            // Update will be shown via the version update event
                          } else {
                            alert(t('settings.updates.auto.latest'));
                          }
                        }
                      } catch (error) {
                        console.error('Failed to check for updates:', error);
                        alert(t('settings.updates.auto.error'));
                      }
                    }}
                  >
                    {t('settings.updates.auto.checkNow')}
                  </Button>
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  {t('settings.updates.auto.helper')}
                </p>
              </SettingsSection>
            </CollapsibleCard>

            {/* Advanced Options */}
            <CollapsibleCard
              title={t('settings.advanced.title')}
              subtitle={t('settings.advanced.subtitle')}
              icon={<Eye className="w-5 h-5" />}
              defaultExpanded={false}
              variant="subtle"
            >
              <SettingsSection
                title={t('settings.advanced.debugging.title')}
                description={t('settings.advanced.debugging.description')}
                icon={<FileText className="w-4 h-4" />}
              >
                <Checkbox
                  label={t('settings.advanced.debugging.verboseLabel')}
                  checked={verbose}
                  onChange={(e) => setVerbose(e.target.checked)}
                />
                <p className="text-xs text-text-tertiary mt-1">
                  {t('settings.advanced.debugging.verboseHelper')}
                </p>
                
                <div className="mt-4">
                  <Checkbox
                    label={t('settings.advanced.debugging.devModeLabel')}
                    checked={devMode}
                    onChange={(e) => setDevMode(e.target.checked)}
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    {t('settings.advanced.debugging.devModeHelper')}
                  </p>
                </div>
              </SettingsSection>

              <SettingsSection
                title={t('settings.advanced.path.title')}
                description={t('settings.advanced.path.description')}
                icon={<FileText className="w-4 h-4" />}
              >
                <Textarea
                  label=""
                  value={additionalPathsText}
                  onChange={(e) => setAdditionalPathsText(e.target.value)}
                  placeholder={
                    platform === 'win32' 
                      ? "C:\\tools\\bin\nC:\\Program Files\\MyApp\n%USERPROFILE%\\bin"
                      : platform === 'darwin'
                      ? "/opt/homebrew/bin\n/usr/local/bin\n~/bin\n~/.cargo/bin"
                      : "/usr/local/bin\n/opt/bin\n~/bin\n~/.local/bin"
                  }
                  rows={4}
                  fullWidth
                  helperText={additionalPathsHelperText}
                />
              </SettingsSection>

              {platform === 'win32' && (
                <SettingsSection
                  title={t('common.terminalShell.label')}
                  description={t('settings.terminalShell.description')}
                  icon={<Terminal className="w-4 h-4" />}
                >
                  <Dropdown
                    trigger={
                      <button
                        type="button"
                        className="w-full px-4 py-3 bg-surface-secondary hover:bg-surface-hover rounded-lg transition-colors border border-border-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive cursor-pointer flex items-center justify-between"
                      >
                        <span>{getShellPreferenceLabel(preferredShell, availableShells.find(s => s.id === preferredShell)?.name, t, 'long')}</span>
                        <ChevronDown className="w-4 h-4 text-text-tertiary" />
                      </button>
                    }
                    items={[
                      { id: 'auto', label: t('common.shell.autoLong'), onClick: () => setPreferredShell('auto') },
                      ...availableShells.map(shell => ({
                        id: shell.id,
                        label: shell.name,
                        onClick: () => setPreferredShell(shell.id),
                      })),
                    ]}
                    selectedId={preferredShell}
                    position="auto"
                    width="lg"
                  />
                </SettingsSection>
              )}

              <SettingsSection
                title={t('settings.advanced.claude.title')}
                description={t('settings.advanced.claude.description')}
                icon={<FileText className="w-4 h-4" />}
              >
                <div className="flex gap-2">
                  <input
                    id="claudeExecutablePath"
                    type="text"
                    value={claudeExecutablePath}
                    onChange={(e) => setClaudeExecutablePath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-interactive text-text-primary bg-surface-secondary"
                    placeholder={t('settings.advanced.claude.inputPlaceholder')}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const result = await API.dialog.openFile({
                        title: t('settings.advanced.claude.dialogTitle'),
                        buttonLabel: t('settings.advanced.claude.dialogButton'),
                        properties: ['openFile'],
                        filters: [
                          { name: t('common.executables'), extensions: ['*'] }
                        ]
                      });
                      if (result.success && result.data) {
                        setClaudeExecutablePath(result.data);
                      }
                    }}
                  >
                    {t('common.browse')}
                  </Button>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {t('settings.advanced.claude.helper')}
                </p>
              </SettingsSection>
            </CollapsibleCard>

            {error && (
              <div className="text-status-error text-sm bg-status-error/10 border border-status-error/30 rounded-lg p-4">
                {error}
              </div>
            )}
          </form>
        )}
        
        {activeTab === 'notifications' && (
          <NotificationSettings
            settings={notificationSettings}
            onUpdateSettings={(updates) => {
              setNotificationSettings(prev => ({ ...prev, ...updates }));
            }}
          />
        )}

        {activeTab === 'shortcuts' && (
          <form id="shortcuts-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Keyboard className="w-5 h-5 text-text-secondary" />
              <div>
                <h3 className="text-sm font-medium text-text-primary">{t('settings.shortcuts.header.title')}</h3>
                <p className="text-xs text-text-tertiary">{t('settings.shortcuts.header.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {terminalShortcuts.map((shortcut, index) => (
                <div key={shortcut.id} className="p-3 rounded-lg bg-surface-secondary border border-border-secondary space-y-3">
                  <div className="flex items-center gap-3">
                    <Input
                      label={t('settings.shortcuts.label')}
                      value={shortcut.label}
                      onChange={(e) => {
                        const updated = [...terminalShortcuts];
                        updated[index] = { ...updated[index], label: e.target.value };
                        setTerminalShortcuts(updated);
                      }}
                      placeholder={t('settings.shortcuts.labelPlaceholder')}
                      fullWidth
                    />
                    <div className="flex-shrink-0 w-24">
                      <Input
                        label={t('settings.shortcuts.key')}
                        value={shortcut.key}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 1);
                          const updated = [...terminalShortcuts];
                          updated[index] = { ...updated[index], key: val };
                          setTerminalShortcuts(updated);
                        }}
                        placeholder={t('settings.shortcuts.keyPlaceholder')}
                        fullWidth
                      />
                    </div>
                    <div className="flex-shrink-0 flex items-end gap-1 pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...terminalShortcuts];
                          updated[index] = { ...updated[index], enabled: !updated[index].enabled };
                          setTerminalShortcuts(updated);
                        }}
                        className={`p-2 rounded-md transition-colors ${
                          shortcut.enabled
                            ? 'text-status-success hover:bg-status-success/10'
                            : 'text-text-tertiary hover:bg-surface-hover'
                        }`}
                        title={shortcut.enabled ? t('settings.shortcuts.toggleEnabled') : t('settings.shortcuts.toggleDisabled')}
                      >
                        {shortcut.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTerminalShortcuts(terminalShortcuts.filter((_, i) => i !== index));
                        }}
                        className="p-2 rounded-md text-text-tertiary hover:text-status-error hover:bg-status-error/10 transition-colors"
                        title={t('settings.shortcuts.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <Textarea
                    label={t('settings.shortcuts.snippet')}
                    value={shortcut.text}
                    onChange={(e) => {
                      const updated = [...terminalShortcuts];
                      updated[index] = { ...updated[index], text: e.target.value };
                      setTerminalShortcuts(updated);
                    }}
                    placeholder={t('settings.shortcuts.snippetPlaceholder')}
                    rows={2}
                    fullWidth
                  />
                  <p className="text-xs text-text-tertiary">
                    {shortcut.key
                      ? interpolateTranslation(t('settings.shortcuts.hotkey'), { key: shortcut.key.toUpperCase() })
                      : t('settings.shortcuts.hotkeyUnset')}
                  </p>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTerminalShortcuts([
                    ...terminalShortcuts,
                    {
                      id: crypto.randomUUID(),
                      label: '',
                      key: '',
                      text: '',
                      enabled: true,
                    },
                  ]);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('settings.shortcuts.add')}
              </Button>
              {terminalShortcuts.length === 0 && (
                <p className="text-sm text-text-tertiary">
                  {t('settings.shortcuts.empty')}
                </p>
              )}
            </div>

            {error && (
              <div className="text-status-error text-sm bg-status-error/10 border border-status-error/30 rounded-lg p-4">
                {error}
              </div>
            )}
          </form>
        )}

        {activeTab === 'analytics' && (
          <form id="analytics-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Analytics Overview */}
            <CollapsibleCard
              title={t('settings.analytics.overview.title')}
              subtitle={t('settings.analytics.overview.subtitle')}
              icon={<BarChart3 className="w-5 h-5" />}
              defaultExpanded={true}
              variant="subtle"
            >
              <div className="space-y-4">
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t('settings.analytics.overview.body')}
                </p>

                <div className="bg-surface-tertiary rounded-lg p-4 border border-border-secondary">
                  <h4 className="font-medium text-text-primary mb-3 text-sm">{t('settings.analytics.track.title')}</h4>
                  <ul className="space-y-1 text-xs text-text-secondary">
                    <li>• {t('settings.analytics.track.item1')}</li>
                    <li>• {t('settings.analytics.track.item2')}</li>
                    <li>• {t('settings.analytics.track.item3')}</li>
                    <li>• {t('settings.analytics.track.item4')}</li>
                    <li>• {t('settings.analytics.track.item5')}</li>
                    <li>• {t('settings.analytics.track.item6')}</li>
                  </ul>
                </div>

                <div className="bg-status-error/10 rounded-lg p-4 border border-status-error/30">
                  <h4 className="font-medium text-text-primary mb-3 text-sm">{t('settings.analytics.never.title')}</h4>
                  <ul className="space-y-1 text-xs text-text-secondary">
                    <li>• {t('settings.analytics.never.item1')}</li>
                    <li>• {t('settings.analytics.never.item2')}</li>
                    <li>• {t('settings.analytics.never.item3')}</li>
                    <li>• {t('settings.analytics.never.item4')}</li>
                    <li>• {t('settings.analytics.never.item5')}</li>
                    <li>• {t('settings.analytics.never.item6')}</li>
                  </ul>
                </div>

                <p className="text-xs text-text-tertiary italic">
                  {t('settings.analytics.overview.optOut')}
                </p>
              </div>
            </CollapsibleCard>

            {/* Analytics Settings */}
            <CollapsibleCard
              title={t('settings.analytics.settings.title')}
              subtitle={t('settings.analytics.settings.subtitle')}
              icon={<BarChart3 className="w-5 h-5" />}
              defaultExpanded={true}
            >
              <SettingsSection
                title={t('settings.analytics.enable.title')}
                description={t('settings.analytics.enable.description')}
                icon={<BarChart3 className="w-4 h-4" />}
              >
                <Checkbox
                  label={t('settings.analytics.enable.checkbox')}
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                />
                {!analyticsEnabled && (
                  <p className="text-xs text-status-warning mt-2">
                    {t('settings.analytics.enable.disabled')}
                  </p>
                )}
                {analyticsEnabled && (
                  <p className="text-xs text-status-success mt-2">
                    {t('settings.analytics.enable.enabled')}
                  </p>
                )}
              </SettingsSection>
            </CollapsibleCard>

            {error && (
              <div className="text-status-error text-sm bg-status-error/10 border border-status-error/30 rounded-lg p-4">
                {error}
              </div>
            )}
          </form>
        )}

      </ModalBody>

      {/* Footer */}
      {(activeTab === 'general' || activeTab === 'notifications' || activeTab === 'shortcuts' || activeTab === 'analytics') && (
        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type={activeTab === 'general' || activeTab === 'shortcuts' || activeTab === 'analytics' ? 'submit' : 'button'}
            form={
              activeTab === 'general'
                ? 'settings-form'
                : activeTab === 'shortcuts'
                  ? 'shortcuts-form'
                  : activeTab === 'analytics'
                    ? 'analytics-form'
                    : undefined
            }
            onClick={activeTab === 'notifications' ? (e) => handleSubmit(e as React.FormEvent) : undefined}
            disabled={isSubmitting}
            loading={isSubmitting}
            variant="primary"
          >
            {t('common.saveChanges')}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}
