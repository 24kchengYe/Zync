import React from 'react';
import { AlertTriangle, Bot, GitBranch, MessageSquareMore, PencilLine } from 'lucide-react';
import type { MainBranchStatus } from '../../types/projectDashboard';
import { interpolateTranslation, useI18n } from '../../../../UpdateWuruize/frontend/I18nContext';
import { Card } from '../ui/Card';

interface StatusSummaryCardsProps {
  totalWorkspaces: number;
  runningCount: number;
  waitingCount: number;
  changedCount: number;
  failedCount: number;
  mainBranchStatus?: MainBranchStatus;
}

export const StatusSummaryCards: React.FC<StatusSummaryCardsProps> = ({
  totalWorkspaces,
  runningCount,
  waitingCount,
  changedCount,
  failedCount,
  mainBranchStatus,
}) => {
  const { t } = useI18n();

  const projectSyncValue = (() => {
    if (!mainBranchStatus) {
      return t('dashboard.summary.projectSync.loading');
    }

    switch (mainBranchStatus.status) {
      case 'behind':
        return interpolateTranslation(t('dashboard.summary.projectSync.behind'), {
          count: mainBranchStatus.behindCount ?? 0,
        });
      case 'ahead':
        return interpolateTranslation(t('dashboard.summary.projectSync.ahead'), {
          count: mainBranchStatus.aheadCount ?? 0,
        });
      case 'diverged':
        return t('dashboard.summary.projectSync.diverged');
      case 'up-to-date':
      default:
        return t('dashboard.summary.projectSync.synced');
    }
  })();

  const projectSyncCaption = (() => {
    if (!mainBranchStatus || mainBranchStatus.status === 'up-to-date') {
      return t('dashboard.summary.projectSync.captionSynced');
    }

    if (mainBranchStatus.status === 'behind') {
      return t('dashboard.summary.projectSync.captionBehind');
    }

    if (mainBranchStatus.status === 'ahead') {
      return t('dashboard.summary.projectSync.captionAhead');
    }

    return t('dashboard.summary.projectSync.captionDiverged');
  })();

  const cards = [
    {
      key: 'running',
      title: t('dashboard.summary.running.title'),
      value: String(runningCount),
      caption: interpolateTranslation(t('dashboard.summary.running.caption'), { count: runningCount, total: totalWorkspaces }),
      icon: Bot,
      accentClass: 'bg-status-success',
      iconClass: 'text-status-success',
    },
    {
      key: 'waiting',
      title: t('dashboard.summary.waiting.title'),
      value: String(waitingCount),
      caption: interpolateTranslation(t('dashboard.summary.waiting.caption'), { count: waitingCount, total: totalWorkspaces }),
      icon: MessageSquareMore,
      accentClass: 'bg-status-warning',
      iconClass: 'text-status-warning',
    },
    {
      key: 'changes',
      title: t('dashboard.summary.changes.title'),
      value: String(changedCount),
      caption: interpolateTranslation(t('dashboard.summary.changes.caption'), { count: changedCount, total: totalWorkspaces }),
      icon: PencilLine,
      accentClass: 'bg-amber-500',
      iconClass: 'text-amber-500',
    },
    {
      key: 'failed',
      title: t('dashboard.summary.failed.title'),
      value: String(failedCount),
      caption: interpolateTranslation(t('dashboard.summary.failed.caption'), { count: failedCount, total: totalWorkspaces }),
      icon: AlertTriangle,
      accentClass: 'bg-status-error',
      iconClass: 'text-status-error',
    },
    {
      key: 'project-sync',
      title: t('dashboard.summary.projectSync.title'),
      value: projectSyncValue,
      caption: projectSyncCaption,
      icon: GitBranch,
      accentClass:
        mainBranchStatus?.status === 'behind'
          ? 'bg-status-warning'
          : mainBranchStatus?.status === 'ahead'
            ? 'bg-interactive'
            : mainBranchStatus?.status === 'diverged'
              ? 'bg-status-error'
              : 'bg-status-success',
      iconClass:
        mainBranchStatus?.status === 'behind'
          ? 'text-status-warning'
          : mainBranchStatus?.status === 'ahead'
            ? 'text-interactive'
            : mainBranchStatus?.status === 'diverged'
              ? 'text-status-error'
              : 'text-status-success',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.key} padding="sm" className="h-full px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                  {card.title}
                </div>
                <div className="text-lg font-semibold leading-tight text-text-primary">
                  {card.value}
                </div>
                <div className="text-[11px] leading-4 text-text-secondary">
                  {card.caption}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-7 w-0.5 rounded-full ${card.accentClass}`}></div>
                <Icon className={`h-4 w-4 ${card.iconClass}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
