import { useMemo } from 'react';
import { GitBranch, Play, Save, Square } from 'lucide-react';
import {
  interpolateTranslation,
  useI18n,
} from '../../../../UpdateWuruize/frontend/I18nContext';
import type {
  BatchActionType,
  BatchControlRun,
  BatchResultStatus,
} from '../../types/projectDashboard';
import { formatFullDateTime } from '../../utils/timestampUtils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface BatchControlToolbarProps {
  isBatchMode: boolean;
  selectedCount: number;
  didAutoResetFilter: boolean;
  lastRun: BatchControlRun | null;
  onSelectFiltered: () => void;
  onSelectRunning: () => void;
  onSelectWaiting: () => void;
  onSelectChanges: () => void;
  onSelectFailed: () => void;
  onClearSelection: () => void;
  onStartAction: (action: BatchActionType) => void;
  onClearLastRun: () => void;
}

function getBatchResultChipClass(status: BatchResultStatus): string {
  switch (status) {
    case 'success':
      return 'border-status-success/30 bg-status-success/10 text-status-success';
    case 'failed':
      return 'border-status-error/30 bg-status-error/10 text-status-error';
    case 'queued':
      return 'border-interactive/30 bg-interactive/10 text-interactive';
    case 'skipped':
    default:
      return 'border-border-primary bg-surface-secondary text-text-secondary';
  }
}

export function BatchControlToolbar({
  isBatchMode,
  selectedCount,
  didAutoResetFilter,
  lastRun,
  onSelectFiltered,
  onSelectRunning,
  onSelectWaiting,
  onSelectChanges,
  onSelectFailed,
  onClearSelection,
  onStartAction,
  onClearLastRun,
}: BatchControlToolbarProps) {
  const { t } = useI18n();

  const actionLabelMap: Record<BatchActionType, string> = useMemo(
    () => ({
      stop: t('dashboard.batch.action.stop'),
      'git-status': t('dashboard.batch.action.gitStatus'),
      'run-tests': t('dashboard.batch.action.runTests'),
      'save-snapshot': t('dashboard.batch.action.saveSnapshot'),
    }),
    [t],
  );

  const statusLabelMap: Record<BatchResultStatus, string> = useMemo(
    () => ({
      queued: t('dashboard.batch.results.status.queued'),
      success: t('dashboard.batch.results.status.success'),
      failed: t('dashboard.batch.results.status.failed'),
      skipped: t('dashboard.batch.results.status.skipped'),
    }),
    [t],
  );

  const runSummary = useMemo(() => {
    if (!lastRun) {
      return null;
    }

    return lastRun.results.reduce(
      (summary, result) => {
        summary[result.status] += 1;
        return summary;
      },
      { queued: 0, success: 0, failed: 0, skipped: 0 } satisfies Record<BatchResultStatus, number>,
    );
  }, [lastRun]);

  if (!isBatchMode && !lastRun) {
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
                    onClick={() => onStartAction('stop')}
                    disabled={selectedCount === 0}
                    className="px-2.5 py-1 text-xs"
                  >
                    {t('dashboard.batch.action.stop')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<GitBranch className="h-4 w-4" />}
                    onClick={() => onStartAction('git-status')}
                    disabled={selectedCount === 0}
                    className="px-2.5 py-1 text-xs"
                  >
                    {t('dashboard.batch.action.gitStatus')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Play className="h-4 w-4" />}
                    onClick={() => onStartAction('run-tests')}
                    disabled={selectedCount === 0}
                    className="px-2.5 py-1 text-xs"
                  >
                    {t('dashboard.batch.action.runTests')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Save className="h-4 w-4" />}
                    onClick={() => onStartAction('save-snapshot')}
                    disabled={selectedCount === 0}
                    className="px-2.5 py-1 text-xs"
                  >
                    {t('dashboard.batch.action.saveSnapshot')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {lastRun && runSummary && (
        <Card padding="sm" className="border border-interactive/20 bg-interactive/5 px-3 py-2.5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-text-primary">{t('dashboard.batch.results.title')}</div>
                <div className="text-[11px] leading-4 text-text-secondary">
                  {interpolateTranslation(t('dashboard.batch.results.summary'), {
                    action: actionLabelMap[lastRun.action],
                    total: lastRun.targetedCount,
                    success: runSummary.success,
                    queued: runSummary.queued,
                    failed: runSummary.failed,
                    skipped: runSummary.skipped,
                  })}
                </div>
                <div className="text-[11px] text-text-tertiary">{formatFullDateTime(lastRun.createdAt)}</div>
              </div>

              <Button variant="ghost" size="sm" onClick={onClearLastRun} className="px-2 py-1 text-xs">
                {t('dashboard.batch.results.clear')}
              </Button>
            </div>

            <div className="rounded-lg border border-dashed border-border-secondary bg-surface-primary/80 px-3 py-2 text-[11px] leading-4 text-text-secondary">
              {t('dashboard.batch.results.prototypeNote')}
            </div>

            {(lastRun.command || lastRun.note) && (
              <div className="flex flex-wrap gap-2 text-[11px] text-text-secondary">
                {lastRun.command && (
                  <span>
                    {t('dashboard.batch.results.command')}
                    <span className="ml-1 rounded bg-surface-secondary px-2 py-0.5 font-mono text-text-primary">
                      {lastRun.command}
                    </span>
                  </span>
                )}
                {lastRun.note && (
                  <span>
                    {t('dashboard.batch.results.note')}
                    <span className="ml-1 rounded bg-surface-secondary px-2 py-0.5 text-text-primary">
                      {lastRun.note}
                    </span>
                  </span>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              {lastRun.results.map((result) => (
                <div
                  key={result.sessionId}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border-primary bg-surface-primary px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-text-primary">{result.workspaceLabel}</div>
                    <div className="text-[11px] leading-4 text-text-secondary">{result.detail}</div>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getBatchResultChipClass(result.status)}`}
                  >
                    {statusLabelMap[result.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
