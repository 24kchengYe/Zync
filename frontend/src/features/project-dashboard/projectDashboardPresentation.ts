import type { Language } from '../../I18nContext';
import type { MainBranchStatus } from '../../types/projectDashboard';
import type { Session } from '../../types/session';

export type RuntimeStatus = Session['status'] | 'unknown';
export type AttentionState =
  | 'healthy'
  | 'waiting'
  | 'failed'
  | 'behind'
  | 'completed'
  | 'initializing'
  | 'stopped'
  | 'ready'
  | 'unknown';

export function getWorkspaceLabel(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/');
  return normalizedPath.split('/').pop() || normalizedPath;
}

export function formatRelativeTime(value: Date | string, language: Language): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const relativeTimeFormat = new Intl.RelativeTimeFormat(language === 'zh' ? 'zh-CN' : 'en', {
    numeric: 'auto',
  });

  const intervals = [
    { limit: 60, divisor: 1, unit: 'second' as const },
    { limit: 3600, divisor: 60, unit: 'minute' as const },
    { limit: 86400, divisor: 3600, unit: 'hour' as const },
    { limit: 604800, divisor: 86400, unit: 'day' as const },
  ];

  for (const interval of intervals) {
    if (Math.abs(diffSeconds) < interval.limit) {
      return relativeTimeFormat.format(Math.round(diffSeconds / interval.divisor), interval.unit);
    }
  }

  return relativeTimeFormat.format(Math.round(diffSeconds / 604800), 'week');
}

export function getAttentionState(runtimeStatus: RuntimeStatus, isStale: boolean): AttentionState {
  if (runtimeStatus === 'error') {
    return 'failed';
  }

  if (runtimeStatus === 'waiting') {
    return 'waiting';
  }

  if (runtimeStatus === 'completed_unviewed') {
    return 'completed';
  }

  if (runtimeStatus === 'initializing') {
    return 'initializing';
  }

  if (runtimeStatus === 'stopped') {
    return 'stopped';
  }

  if (runtimeStatus === 'ready') {
    return 'ready';
  }

  if (isStale) {
    return 'behind';
  }

  if (runtimeStatus === 'unknown') {
    return 'unknown';
  }

  return 'healthy';
}

export function getAgentChipClass(runtimeStatus: RuntimeStatus): string {
  switch (runtimeStatus) {
    case 'running':
      return 'border-status-success/30 bg-status-success/10 text-status-success';
    case 'waiting':
      return 'border-status-warning/30 bg-status-warning/10 text-status-warning';
    case 'error':
      return 'border-status-error/30 bg-status-error/10 text-status-error';
    case 'completed_unviewed':
      return 'border-interactive/30 bg-interactive/10 text-interactive';
    case 'initializing':
      return 'border-text-tertiary/30 bg-surface-tertiary text-text-secondary';
    case 'ready':
      return 'border-status-success/20 bg-status-success/5 text-status-success';
    case 'stopped':
      return 'border-text-tertiary/30 bg-surface-secondary text-text-secondary';
    case 'unknown':
    default:
      return 'border-text-tertiary/30 bg-surface-secondary text-text-secondary';
  }
}

export function getAgentDotClass(runtimeStatus: RuntimeStatus): string {
  switch (runtimeStatus) {
    case 'running':
      return 'bg-status-success';
    case 'waiting':
      return 'bg-status-warning';
    case 'error':
      return 'bg-status-error';
    case 'completed_unviewed':
      return 'bg-interactive';
    case 'initializing':
      return 'bg-text-tertiary';
    case 'ready':
      return 'bg-status-success';
    case 'stopped':
    case 'unknown':
    default:
      return 'bg-text-tertiary';
  }
}

export function getAttentionChipClass(attentionState: AttentionState): string {
  switch (attentionState) {
    case 'failed':
      return 'border-status-error/30 bg-status-error/10 text-status-error';
    case 'waiting':
    case 'behind':
      return 'border-status-warning/30 bg-status-warning/10 text-status-warning';
    case 'completed':
      return 'border-interactive/30 bg-interactive/10 text-interactive';
    case 'healthy':
    case 'ready':
      return 'border-status-success/20 bg-status-success/5 text-status-success';
    case 'initializing':
      return 'border-text-tertiary/30 bg-surface-tertiary text-text-secondary';
    case 'stopped':
    case 'unknown':
    default:
      return 'border-text-tertiary/30 bg-surface-secondary text-text-secondary';
  }
}

export function getSyncSummary(mainBranchStatus?: MainBranchStatus): {
  syncValue: string;
  syncCaptionKey:
    | 'dashboard.summary.projectSync.captionSynced'
    | 'dashboard.summary.projectSync.captionBehind'
    | 'dashboard.summary.projectSync.captionAhead'
    | 'dashboard.summary.projectSync.captionDiverged';
  count?: number;
} {
  if (!mainBranchStatus || mainBranchStatus.status === 'up-to-date') {
    return {
      syncValue: 'dashboard.summary.projectSync.synced',
      syncCaptionKey: 'dashboard.summary.projectSync.captionSynced',
    };
  }

  if (mainBranchStatus.status === 'behind') {
    return {
      syncValue: 'dashboard.summary.projectSync.behind',
      syncCaptionKey: 'dashboard.summary.projectSync.captionBehind',
      count: mainBranchStatus.behindCount ?? 0,
    };
  }

  if (mainBranchStatus.status === 'ahead') {
    return {
      syncValue: 'dashboard.summary.projectSync.ahead',
      syncCaptionKey: 'dashboard.summary.projectSync.captionAhead',
      count: mainBranchStatus.aheadCount ?? 0,
    };
  }

  return {
    syncValue: 'dashboard.summary.projectSync.diverged',
    syncCaptionKey: 'dashboard.summary.projectSync.captionDiverged',
  };
}
