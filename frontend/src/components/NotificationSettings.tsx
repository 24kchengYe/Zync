import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { ToggleField } from './ui/Toggle';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { SettingsSection } from './ui/SettingsSection';
import { Bell, BellOff, Volume2, VolumeX, Zap, Shield } from 'lucide-react';
import { useI18n } from '../I18nContext';

interface NotificationSettings {
  enabled: boolean;
  playSound: boolean;
  notifyOnStatusChange: boolean;
  notifyOnWaiting: boolean;
  notifyOnComplete: boolean;
}

interface NotificationSettingsProps {
  settings: NotificationSettings;
  onUpdateSettings: (settings: Partial<NotificationSettings>) => void;
}

export function NotificationSettings({ settings, onUpdateSettings }: NotificationSettingsProps) {
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const { t } = useI18n();

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert(t('notifications.permissions.browserUnsupported'));
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
  };

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification(t('common.appName'), {
        body: t('notifications.permissions.testBody'),
        icon: '/favicon.ico',
      });
    } else {
      alert(t('notifications.permissions.enableFirst'));
    }
  };

  const getPermissionIcon = () => {
    switch (permissionStatus) {
      case 'granted': return <Bell className="w-4 h-4 text-status-success" />;
      case 'denied': return <BellOff className="w-4 h-4 text-status-error" />;
      default: return <Shield className="w-4 h-4 text-status-warning" />;
    }
  };

  const getPermissionStatus = () => {
    switch (permissionStatus) {
      case 'granted': return { text: t('notifications.permissions.status.enabled'), color: 'text-status-success' };
      case 'denied': return { text: t('notifications.permissions.status.denied'), color: 'text-status-error' };
      default: return { text: t('notifications.permissions.status.notRequested'), color: 'text-status-warning' };
    }
  };

  const status = getPermissionStatus();

  return (
    <div className="space-y-6">
      {/* Browser Permissions */}
      <CollapsibleCard
        title={t('notifications.permissions.title')}
        subtitle={t('notifications.permissions.subtitle')}
        icon={getPermissionIcon()}
        defaultExpanded={true}
      >
        <SettingsSection
          title={t('notifications.permissions.access.title')}
          description={t('notifications.permissions.access.description')}
          icon={getPermissionIcon()}
        >
          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-secondary">
            <div className="flex items-center gap-3">
              {getPermissionIcon()}
              <div>
                <span className="text-sm font-medium text-text-primary">{t('notifications.permissions.statusLabel')}</span>
                <p className={`text-sm ${status.color} font-medium`}>
                  {status.text}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {permissionStatus !== 'granted' && (
                <Button
                  onClick={requestPermission}
                  size="sm"
                  variant="primary"
                >
                  {t('notifications.permissions.enableButton')}
                </Button>
              )}
              {permissionStatus === 'granted' && (
                <Button
                  onClick={testNotification}
                  size="sm"
                  variant="secondary"
                >
                  {t('notifications.permissions.testButton')}
                </Button>
              )}
            </div>
          </div>
          {permissionStatus === 'denied' && (
            <div className="mt-3 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
              <p className="text-xs text-status-error">
                {t('notifications.permissions.blocked')}
              </p>
            </div>
          )}
        </SettingsSection>
      </CollapsibleCard>

      {/* Notification Preferences */}
      <CollapsibleCard
        title={t('notifications.preferences.title')}
        subtitle={t('notifications.preferences.subtitle')}
        icon={settings.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        defaultExpanded={true}
      >
        <SettingsSection
          title={t('notifications.master.title')}
          description={t('notifications.master.description')}
          icon={settings.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        >
          <ToggleField
            label={t('notifications.master.toggleLabel')}
            description={t('notifications.master.toggleDescription')}
            checked={settings.enabled}
            onChange={(checked) => onUpdateSettings({ enabled: checked })}
          />
        </SettingsSection>

        <SettingsSection
          title={t('notifications.sound.title')}
          description={t('notifications.sound.description')}
          icon={settings.playSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        >
          <ToggleField
            label={t('notifications.sound.toggleLabel')}
            description={t('notifications.sound.toggleDescription')}
            checked={settings.playSound}
            onChange={(checked) => onUpdateSettings({ playSound: checked })}
          />
        </SettingsSection>

        <SettingsSection
          title={t('notifications.events.title')}
          description={t('notifications.events.description')}
          icon={<Zap className="w-4 h-4" />}
          spacing="sm"
        >
          <div className="space-y-3">
            <ToggleField
              label={t('notifications.events.statusChanges')}
              description={t('notifications.events.statusChangesDescription')}
              checked={settings.notifyOnStatusChange}
              onChange={(checked) => onUpdateSettings({ notifyOnStatusChange: checked })}
            />

            <ToggleField
              label={t('notifications.events.inputRequired')}
              description={t('notifications.events.inputRequiredDescription')}
              checked={settings.notifyOnWaiting}
              onChange={(checked) => onUpdateSettings({ notifyOnWaiting: checked })}
            />

            <ToggleField
              label={t('notifications.events.taskCompletion')}
              description={t('notifications.events.taskCompletionDescription')}
              checked={settings.notifyOnComplete}
              onChange={(checked) => onUpdateSettings({ notifyOnComplete: checked })}
            />
          </div>
        </SettingsSection>
      </CollapsibleCard>
    </div>
  );
}
