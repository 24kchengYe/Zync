import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle, Clock, GitBranch, GitFork } from 'lucide-react';
import type { MainBranchStatus, RemoteStatus } from '../../types/projectDashboard';
import { interpolateTranslation, useI18n } from '../../../../UpdateWuruize/frontend/I18nContext';

interface MultiOriginStatusProps {
  mainBranch: string;
  mainBranchStatus?: MainBranchStatus;
  remotes?: RemoteStatus[];
  onReviewUpdates?: () => void;
}

export const MultiOriginStatus: React.FC<MultiOriginStatusProps> = ({
  mainBranch,
  mainBranchStatus,
  remotes = [],
  onReviewUpdates,
}) => {
  const { t } = useI18n();

  if (!mainBranchStatus) {
    return null;
  }

  const upstream = remotes.find(remote => remote.isUpstream || remote.name === 'upstream');
  const origin = remotes.find(remote => !remote.isUpstream && remote.name === 'origin');
  const hasMultipleRemotes = remotes.length > 1;

  const upstreamNeedsUpdate = upstream && upstream.status !== 'up-to-date';
  const originNeedsUpdate = origin && origin.status !== 'up-to-date';
  const localNeedsUpdate = mainBranchStatus.status !== 'up-to-date';
  const hasUpdatesNeeded = upstreamNeedsUpdate || originNeedsUpdate || localNeedsUpdate;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up-to-date':
        return <CheckCircle className="h-4 w-4 text-status-success" />;
      case 'behind':
        return <AlertCircle className="h-4 w-4 text-status-warning" />;
      case 'ahead':
        return <Clock className="h-4 w-4 text-interactive" />;
      case 'diverged':
        return <AlertCircle className="h-4 w-4 text-status-error" />;
      default:
        return null;
    }
  };

  const getRemoteStatusText = (remote: RemoteStatus) => {
    switch (remote.status) {
      case 'behind':
        return interpolateTranslation(t('dashboard.sync.status.behindCount'), { count: remote.behindCount });
      case 'ahead':
        return interpolateTranslation(t('dashboard.sync.status.aheadCount'), { count: remote.aheadCount });
      case 'diverged':
        return interpolateTranslation(t('dashboard.sync.status.divergedCount'), {
          ahead: remote.aheadCount,
          behind: remote.behindCount,
        });
      case 'up-to-date':
      default:
        return t('dashboard.sync.status.upToDate');
    }
  };

  const getLocalStatusText = () => {
    const { status, aheadCount = 0, behindCount = 0 } = mainBranchStatus;

    switch (status) {
      case 'behind':
        return interpolateTranslation(t('dashboard.sync.status.behindOriginCount'), { count: behindCount });
      case 'ahead':
        return interpolateTranslation(t('dashboard.sync.status.aheadOriginCount'), { count: aheadCount });
      case 'diverged':
        return interpolateTranslation(t('dashboard.sync.status.divergedOriginCount'), {
          ahead: aheadCount,
          behind: behindCount,
        });
      case 'up-to-date':
      default:
        return t('dashboard.sync.status.syncedWithOrigin');
    }
  };

  if (!hasMultipleRemotes) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <GitBranch className="h-4 w-4 text-text-tertiary" />
          <div>
            <h3 className="text-sm font-medium text-text-primary">
              {t('dashboard.sync.title')} ({mainBranch})
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-tertiary">
              {getStatusIcon(mainBranchStatus.status)}
              <span>{getLocalStatusText()}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border-primary bg-surface-primary">
        <div className="border-b border-border-primary bg-surface-secondary px-3 py-1.5">
          <h3 className="text-xs font-medium text-text-secondary">{t('dashboard.sync.remoteTitle')}</h3>
        </div>

        <div className="p-2.5">
          <div className="flex items-center gap-2.5">
            {upstream && (
              <>
                <div className="flex-1 rounded-lg border border-interactive/30 bg-interactive/10 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-interactive" />
                        <span className="text-xs font-semibold text-text-primary">
                          {upstream.name}/{upstream.branch}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-tertiary">{t('dashboard.sync.sourceRepository')}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-interactive">{getRemoteStatusText(upstream)}</span>
                      {getStatusIcon(upstream.status)}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
              </>
            )}

            {origin && (
              <>
                <div className="flex-1 rounded-lg border border-interactive/30 bg-interactive/10 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-interactive" />
                        <span className="text-xs font-semibold text-text-primary">
                          {origin.name}/{origin.branch}
                        </span>
                        {origin.isFork && (
                          <span className="inline-flex items-center gap-1 rounded bg-interactive/20 px-1.5 py-0.5 text-[11px] text-interactive">
                            <GitFork className="h-2.5 w-2.5" />
                            <span>{t('dashboard.sync.fork')}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-tertiary">{t('dashboard.sync.yourRemote')}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-interactive">{getRemoteStatusText(origin)}</span>
                      {getStatusIcon(origin.status)}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
              </>
            )}

            <div className="flex-1 rounded-lg border border-border-primary bg-surface-secondary p-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className="text-xs font-semibold text-text-primary">{mainBranch}</span>
                    <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[11px] text-text-secondary">
                      {t('dashboard.sync.local')}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-tertiary">{t('dashboard.sync.baseForWorkspaces')}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-text-secondary">{getLocalStatusText()}</span>
                  {getStatusIcon(mainBranchStatus.status)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasUpdatesNeeded && (
          <div className="border-t border-status-warning/30 bg-status-warning/10 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-status-warning" />
                <span className="text-xs font-medium text-status-warning">
                  {t('dashboard.sync.updatesAvailable')}
                </span>
              </div>
              {onReviewUpdates && (
                <button
                  onClick={onReviewUpdates}
                  className="rounded bg-status-warning px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-status-warning-hover"
                >
                  {t('dashboard.sync.reviewUpdates')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-border-primary bg-surface-secondary px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-tertiary">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-status-success" />
              <span>{t('dashboard.sync.legend.synced')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 text-status-warning" />
              <span>{t('dashboard.sync.legend.behind')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-interactive" />
              <span>{t('dashboard.sync.legend.ahead')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 text-status-error" />
              <span>{t('dashboard.sync.legend.diverged')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
