import { GitBranch, Play, Save, Square } from 'lucide-react';
import {
  interpolateTranslation,
  useI18n,
} from '../../I18nContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface BatchControlToolbarProps {
  isBatchMode: boolean;
  selectedCount: number;
  didAutoResetFilter: boolean;
  onSelectFiltered: () => void;
  onSelectRunning: () => void;
  onSelectWaiting: () => void;
  onSelectChanges: () => void;
  onSelectFailed: () => void;
  onClearSelection: () => void;
}

export function BatchControlToolbar({
  isBatchMode,
  selectedCount,
  didAutoResetFilter,
  onSelectFiltered,
  onSelectRunning,
  onSelectWaiting,
  onSelectChanges,
  onSelectFailed,
  onClearSelection,
}: BatchControlToolbarProps) {
  const { t } = useI18n();

  if (!isBatchMode) {
    return null;
  }

  return (
    <div className="space-y-2">
      {isBatchMode && (
        <Card padding="sm" className="border border-border-primary bg-surface-secondary/80 px-3 py-2.5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-medium text-text-primary">
                    {interpolateTranslation(t('dashboard.batch.mode.selectedCount'), { count: selectedCount })}
                  </div>
                  {didAutoResetFilter && (
                    <span className="rounded-full border border-status-warning/30 bg-status-warning/10 px-2 py-0.5 text-[11px] text-status-warning">
                      {t('dashboard.batch.mode.autoReset')}
                    </span>
                  )}
                </div>
                <div className="text-[11px] leading-4 text-text-secondary">
                  {t('dashboard.batch.mode.helper')}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border-primary pt-1.5">
              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex min-w-max items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={onSelectFiltered} className="px-2 py-1 text-xs">
                    {t('dashboard.batch.select.filtered')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onSelectRunning} className="px-2 py-1 text-xs">
                    {t('dashboard.batch.select.running')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onSelectWaiting} className="px-2 py-1 text-xs">
                    {t('dashboard.batch.select.waiting')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onSelectChanges} className="px-2 py-1 text-xs">
                    {t('dashboard.batch.select.changes')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onSelectFailed} className="px-2 py-1 text-xs">
                    {t('dashboard.batch.select.failed')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClearSelection} className="px-2 py-1 text-xs">
                    {t('dashboard.batch.select.clear')}
                  </Button>
                </div>
              </div>

              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex min-w-max items-center gap-1.5">
                  <Button
                    variant="warning"
                    size="sm"
                    icon={<Square className="h-4 w-4 fill-current" />}
                    disabled
                    title={t('dashboard.batch.action.notImplementedTitle')}
                    className="px-2.5 py-1 text-xs"
                  >
                    {t('dashboard.batch.action.stop')} ({t('dashboard.batch.action.previewBadge')})
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<GitBranch className="h-4 w-4" />}
                    disabled
                    title={t('dashboard.batch.action.notImplementedTitle')}
                    className="px-2.5 py-1 text-xs"
                  >
                    {t('dashboard.batch.action.gitStatus')} ({t('dashboard.batch.action.previewBadge')})
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Play className="h-4 w-4" />}
                    disabled
                    title={t('dashboard.batch.action.notImplementedTitle')}
                    className="px-2.5 py-1 text-xs"
                  >
                    {t('dashboard.batch.action.runTests')} ({t('dashboard.batch.action.previewBadge')})
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Save className="h-4 w-4" />}
                    disabled
                    title={t('dashboard.batch.action.notImplementedTitle')}
                    className="px-2.5 py-1 text-xs"
                  >
                    {t('dashboard.batch.action.saveSnapshot')} ({t('dashboard.batch.action.previewBadge')})
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border-secondary bg-surface-primary/80 px-3 py-2 text-[11px] leading-4 text-text-secondary">
                {t('dashboard.batch.action.previewNote')}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
