import {
  getSessionStatusLabel,
  interpolateTranslation,
  type Language,
} from '../../I18nContext';
import type {
  ProjectActivityStreamView,
  ProjectActivitySummaryCard,
} from './projectActivityStreamViewState';
import type {
  ProjectActivityRuntimeStatus,
  ProjectActivityStreamEntry,
} from './projectActivityStreamState';
import type { TranslationKey } from '../../i18n';

type Translator = (key: TranslationKey) => string;

export interface ProjectActivityWorkspaceRow {
  sessionId: string;
  workspaceLabel: string;
  pathLabel: string;
  branchName: string;
  runtimeStatus: ProjectActivityRuntimeStatus;
  hasUncommittedChanges: boolean;
  isStale: boolean;
  lastActivity?: string;
  createdAt?: string;
}

export function formatActivityRelativeTime(value: Date | string, language: Language): string {
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

export function getHeartbeatSessionId(workspaceRows: ProjectActivityWorkspaceRow[]) {
  const priority = {
    error: 0,
    waiting: 1,
    running: 2,
    initializing: 3,
    completed_unviewed: 4,
    ready: 5,
    stopped: 6,
    unknown: 7,
  } satisfies Record<ProjectActivityRuntimeStatus, number>;

  return workspaceRows
    .slice()
    .sort((left, right) => {
      const priorityDifference = priority[left.runtimeStatus] - priority[right.runtimeStatus];
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const leftActivity = Date.parse(left.lastActivity ?? left.createdAt ?? '');
      const rightActivity = Date.parse(right.lastActivity ?? right.createdAt ?? '');

      if (!Number.isNaN(leftActivity) && !Number.isNaN(rightActivity) && leftActivity !== rightActivity) {
        return rightActivity - leftActivity;
      }

      return left.workspaceLabel.localeCompare(right.workspaceLabel);
    })[0]?.sessionId ?? null;
}

export function getSourceVariant(source: ProjectActivityStreamEntry['source']) {
  switch (source) {
    case 'summary':
      return 'primary' as const;
    case 'heartbeat':
      return 'info' as const;
    case 'status':
    default:
      return 'default' as const;
  }
}

export function getStatusVariant(runtimeStatus: ProjectActivityRuntimeStatus) {
  switch (runtimeStatus) {
    case 'running':
    case 'ready':
      return 'success' as const;
    case 'waiting':
      return 'warning' as const;
    case 'error':
      return 'error' as const;
    case 'completed_unviewed':
      return 'primary' as const;
    case 'initializing':
    case 'stopped':
    case 'unknown':
    default:
      return 'default' as const;
  }
}

export function getEntrySourceLabel(entry: ProjectActivityStreamEntry, t: Translator) {
  if (entry.source === 'summary') {
    return t('dashboard.stream.source.summary');
  }

  if (entry.source === 'heartbeat') {
    return t('dashboard.stream.source.heartbeat');
  }

  return t('dashboard.stream.source.status');
}

export function getEntryBody(entry: ProjectActivityStreamEntry, t: Translator) {
  if (entry.event === 'summary_captured') {
    return entry.summaryText || t('dashboard.stream.event.summaryCapturedFallback');
  }

  if (entry.event === 'workspace_bootstrapped') {
    return interpolateTranslation(t('dashboard.stream.event.workspaceBootstrapped'), {
      status: getSessionStatusLabel(entry.runtimeStatus, t),
    });
  }

  if (entry.event === 'runtime_status_changed') {
    return interpolateTranslation(t('dashboard.stream.event.runtimeStatusChanged'), {
      status: getSessionStatusLabel(entry.runtimeStatus, t),
    });
  }

  if (entry.event === 'git_state_changed') {
    if (entry.hasUncommittedChanges && entry.isStale) {
      return t('dashboard.stream.event.gitStateChanged.changesAndBehind');
    }

    if (entry.hasUncommittedChanges) {
      return t('dashboard.stream.event.gitStateChanged.changes');
    }

    if (entry.isStale) {
      return t('dashboard.stream.event.gitStateChanged.behind');
    }

    return t('dashboard.stream.event.gitStateChanged.clean');
  }

  if (entry.runtimeStatus === 'error') {
    return t('dashboard.stream.event.heartbeat.error');
  }

  if (entry.runtimeStatus === 'waiting') {
    return t('dashboard.stream.event.heartbeat.waiting');
  }

  if (entry.runtimeStatus === 'running') {
    return t('dashboard.stream.event.heartbeat.running');
  }

  return interpolateTranslation(t('dashboard.stream.event.heartbeat.default'), {
    status: getSessionStatusLabel(entry.runtimeStatus, t),
  });
}

export function buildManagerBrief(
  workspaceRows: ProjectActivityWorkspaceRow[],
  entries: ProjectActivityStreamEntry[],
  t: Translator,
) {
  const failedWorkspace = workspaceRows.find((workspace) => workspace.runtimeStatus === 'error');
  if (failedWorkspace) {
    return interpolateTranslation(t('dashboard.stream.brief.failed'), {
      workspace: failedWorkspace.workspaceLabel,
    });
  }

  const waitingWorkspace = workspaceRows.find((workspace) => workspace.runtimeStatus === 'waiting');
  if (waitingWorkspace) {
    return interpolateTranslation(t('dashboard.stream.brief.waiting'), {
      workspace: waitingWorkspace.workspaceLabel,
    });
  }

  const changedWorkspace = workspaceRows.find((workspace) => workspace.hasUncommittedChanges);
  if (changedWorkspace) {
    return interpolateTranslation(t('dashboard.stream.brief.changes'), {
      workspace: changedWorkspace.workspaceLabel,
    });
  }

  const runningWorkspace = workspaceRows.find((workspace) => workspace.runtimeStatus === 'running');
  if (runningWorkspace) {
    return interpolateTranslation(t('dashboard.stream.brief.running'), {
      workspace: runningWorkspace.workspaceLabel,
    });
  }

  if (entries[0]) {
    return interpolateTranslation(t('dashboard.stream.brief.latest'), {
      workspace: entries[0].workspaceLabel,
    });
  }

  return t('dashboard.stream.brief.idle');
}

export function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getViewLabel(view: ProjectActivityStreamView, t: Translator) {
  if (view === 'semantic') {
    return t('dashboard.stream.view.semantic');
  }

  if (view === 'summary') {
    return t('dashboard.stream.view.summary');
  }

  return t('dashboard.stream.view.raw');
}

export function getViewDescription(view: ProjectActivityStreamView, t: Translator) {
  if (view === 'semantic') {
    return t('dashboard.stream.view.semanticDescription');
  }

  if (view === 'summary') {
    return t('dashboard.stream.view.summaryDescription');
  }

  return t('dashboard.stream.view.rawDescription');
}

export function getSummarySignalLabel(card: ProjectActivitySummaryCard, t: Translator) {
  switch (card.latestSignal) {
    case 'summary':
      return t('dashboard.stream.summary.source.summary');
    case 'semantic':
      return t('dashboard.stream.summary.source.semantic');
    case 'raw':
      return t('dashboard.stream.summary.source.raw');
    case 'none':
    default:
      return t('dashboard.stream.summary.source.none');
  }
}

export function getSummaryBody(card: ProjectActivitySummaryCard, t: Translator) {
  if (card.latestSummary) {
    return card.latestSummary;
  }

  if (card.latestSemanticEntry) {
    return getEntryBody(card.latestSemanticEntry, t);
  }

  if (card.latestRawEntry) {
    return getEntryBody(card.latestRawEntry, t);
  }

  return t('dashboard.stream.summary.idle');
}

export function getSummarySupportText(card: ProjectActivitySummaryCard, t: Translator) {
  if (card.latestSummary) {
    return getSummarySignalLabel(card, t);
  }

  if (card.latestSemanticEntry || card.latestRawEntry) {
    return t('dashboard.stream.summary.fallback');
  }

  return getSummarySignalLabel(card, t);
}

export function getActiveEntryCount(
  activeView: ProjectActivityStreamView,
  rawEntries: ProjectActivityStreamEntry[],
  semanticEntries: ProjectActivityStreamEntry[],
  summaryCards: ProjectActivitySummaryCard[],
) {
  if (activeView === 'semantic') {
    return semanticEntries.length;
  }

  if (activeView === 'summary') {
    return summaryCards.length;
  }

  return rawEntries.length;
}
