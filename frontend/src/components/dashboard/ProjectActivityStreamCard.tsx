import { useEffect, useMemo, useState } from 'react';
import { Activity, Download, ExternalLink, FileText } from 'lucide-react';
import type { Session } from '../../types/session';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatFullDateTime } from '../../utils/timestampUtils';
import {
  getSessionStatusLabel,
  interpolateTranslation,
  useI18n,
} from '../../I18nContext';
import {
  deriveProjectActivityStreamViews,
  type ProjectActivityStreamView,
  type ProjectActivitySummaryCard,
} from '../../ProjectActivityStreamViewState';
import {
  getActivityAgentLabel,
  getLatestSessionSummary,
} from '../../WorkspaceDashboardDetailState';
import {
  HEARTBEAT_INTERVAL_MS,
  getProjectActivityStreamStorageKey,
  syncProjectActivityStreamState,
  type ProjectActivityRuntimeStatus,
  type ProjectActivityStreamEntry,
  type ProjectActivityStreamState,
  type ProjectActivityWorkspaceState,
} from '../../ProjectActivityStreamDemoState';

type Language = ReturnType<typeof useI18n>['language'];
type Translator = ReturnType<typeof useI18n>['t'];

interface ProjectActivityWorkspaceRow {
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

interface ProjectActivityStreamCardProps {
  projectId: number;
  projectName: string;
  projectPath?: string;
  workspaceRows: ProjectActivityWorkspaceRow[];
  visibleWorkspaceRows: ProjectActivityWorkspaceRow[];
  sessions: Session[];
  filterLabel: string;
  interactionDisabled?: boolean;
  onOpenWorkspace?: (sessionId: string) => void;
}

function formatRelativeTime(value: Date | string, language: Language): string {
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

function getHeartbeatSessionId(workspaceRows: ProjectActivityWorkspaceRow[]) {
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

function getSourceVariant(source: ProjectActivityStreamEntry['source']) {
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

function getStatusVariant(runtimeStatus: ProjectActivityRuntimeStatus) {
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

function getEntrySourceLabel(entry: ProjectActivityStreamEntry, t: Translator) {
  if (entry.source === 'summary') {
    return t('dashboard.stream.source.summary');
  }

  if (entry.source === 'heartbeat') {
    return t('dashboard.stream.source.heartbeat');
  }

  return t('dashboard.stream.source.status');
}

function getEntryBody(entry: ProjectActivityStreamEntry, t: Translator) {
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

function buildManagerBrief(
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

function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getViewLabel(view: ProjectActivityStreamView, t: Translator) {
  if (view === 'semantic') {
    return t('dashboard.stream.view.semantic');
  }

  if (view === 'summary') {
    return t('dashboard.stream.view.summary');
  }

  return t('dashboard.stream.view.raw');
}

function getViewDescription(view: ProjectActivityStreamView, t: Translator) {
  if (view === 'semantic') {
    return t('dashboard.stream.view.semanticDescription');
  }

  if (view === 'summary') {
    return t('dashboard.stream.view.summaryDescription');
  }

  return t('dashboard.stream.view.rawDescription');
}

function getSummarySignalLabel(card: ProjectActivitySummaryCard, t: Translator) {
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

function getSummaryBody(card: ProjectActivitySummaryCard, t: Translator) {
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

function getSummarySupportText(card: ProjectActivitySummaryCard, t: Translator) {
  if (card.latestSummary) {
    return getSummarySignalLabel(card, t);
  }

  if (card.latestSemanticEntry || card.latestRawEntry) {
    return t('dashboard.stream.summary.fallback');
  }

  return getSummarySignalLabel(card, t);
}

function getActiveEntryCount(
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

export function ProjectActivityStreamCard({
  projectId,
  projectName,
  projectPath,
  workspaceRows,
  visibleWorkspaceRows,
  sessions,
  filterLabel,
  interactionDisabled = false,
  onOpenWorkspace,
}: ProjectActivityStreamCardProps) {
  const { t, language } = useI18n();
  const [activeView, setActiveView] = useState<ProjectActivityStreamView>('raw');
  const sessionMap = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  );
  const storageKey = useMemo(
    () =>
      getProjectActivityStreamStorageKey({
        projectId,
        projectPath,
      }),
    [projectId, projectPath],
  );

  const workspaceStates = useMemo<ProjectActivityWorkspaceState[]>(
    () =>
      workspaceRows.map((workspace) => {
        const session = sessionMap.get(workspace.sessionId);

        return {
          sessionId: workspace.sessionId,
          workspaceLabel: workspace.workspaceLabel,
          branchName: workspace.branchName,
          runtimeStatus: workspace.runtimeStatus,
          hasUncommittedChanges: workspace.hasUncommittedChanges,
          isStale: workspace.isStale,
          lastActivityAt: workspace.lastActivity ?? workspace.createdAt,
          latestSummary: getLatestSessionSummary(session),
          agentLabel: getActivityAgentLabel(session),
        };
      }),
    [sessionMap, workspaceRows],
  );

  const heartbeatSessionId = useMemo(
    () => getHeartbeatSessionId(visibleWorkspaceRows),
    [visibleWorkspaceRows],
  );

  const [streamState, setStreamState] = useState<ProjectActivityStreamState>(() =>
    syncProjectActivityStreamState({
      storageKey,
      workspaceStates,
      now: new Date().toISOString(),
    }),
  );

  useEffect(() => {
    setStreamState(
      syncProjectActivityStreamState({
        storageKey,
        workspaceStates,
        now: new Date().toISOString(),
      }),
    );
  }, [storageKey, workspaceStates]);

  useEffect(() => {
    if (visibleWorkspaceRows.length === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setStreamState(
        syncProjectActivityStreamState({
          storageKey,
          workspaceStates,
          heartbeatSessionId,
          now: new Date().toISOString(),
        }),
      );
    }, Math.max(4_000, Math.floor(HEARTBEAT_INTERVAL_MS / 2)));

    return () => {
      window.clearInterval(intervalId);
    };
  }, [heartbeatSessionId, storageKey, visibleWorkspaceRows.length, workspaceStates]);

  const visibleWorkspaceIdSet = useMemo(
    () => new Set(visibleWorkspaceRows.map((workspace) => workspace.sessionId)),
    [visibleWorkspaceRows],
  );

  const visibleEntries = useMemo(
    () => streamState.entries.filter((entry) => visibleWorkspaceIdSet.has(entry.sessionId)).slice(0, 30),
    [streamState.entries, visibleWorkspaceIdSet],
  );

  const streamViews = useMemo(
    () =>
      deriveProjectActivityStreamViews({
        entries: visibleEntries,
        visibleWorkspaceRows,
        sessions,
      }),
    [sessions, visibleEntries, visibleWorkspaceRows],
  );

  const rawEntries = useMemo(() => streamViews.rawEntries.slice(0, 30), [streamViews.rawEntries]);
  const semanticEntries = useMemo(
    () => streamViews.semanticEntries.slice(0, 24),
    [streamViews.semanticEntries],
  );
  const summaryCards = streamViews.summaryCards;

  const managerBrief = useMemo(
    () => buildManagerBrief(visibleWorkspaceRows, visibleEntries, t),
    [t, visibleEntries, visibleWorkspaceRows],
  );

  const activeEntryCount = getActiveEntryCount(
    activeView,
    rawEntries,
    semanticEntries,
    summaryCards,
  );

  const exportMarkdown = () => {
    const exportTime = new Date();
    const lines = [
      `# ${projectName} - ${t('dashboard.stream.title')}`,
      `${t('dashboard.stream.export.generatedAt')}: ${formatFullDateTime(exportTime)}`,
      `${t('dashboard.stream.export.scope')}: ${filterLabel}`,
      `${t('dashboard.stream.export.view')}: ${getViewLabel(activeView, t)}`,
      '',
    ];

    if (activeView === 'summary') {
      summaryCards.forEach((card, index) => {
        const flags = [
          card.hasUncommittedChanges ? t('dashboard.stream.export.flagChanges') : null,
          card.isStale ? t('dashboard.stream.export.flagBehind') : null,
        ].filter(Boolean);

        lines.push(`## ${index + 1}. ${card.workspaceLabel}`);
        lines.push(`- ${t('dashboard.stream.export.workspace')}: ${card.workspaceLabel}`);
        lines.push(`- ${t('dashboard.stream.export.status')}: ${getSessionStatusLabel(card.runtimeStatus, t)}`);
        lines.push(`- ${t('dashboard.stream.export.branch')}: ${card.branchName}`);
        lines.push(`- ${t('dashboard.stream.export.source')}: ${getSummarySignalLabel(card, t)}`);
        lines.push(`- ${t('dashboard.stream.export.detail')}: ${getSummaryBody(card, t)}`);
        if (flags.length > 0) {
          lines.push(`- ${t('dashboard.stream.export.flags')}: ${flags.join(', ')}`);
        }
        if (card.updatedAt) {
          lines.push(`- ${t('dashboard.stream.export.latestUpdate')}: ${formatFullDateTime(card.updatedAt)}`);
        }
        lines.push('');
      });
    } else {
      const exportEntries = activeView === 'semantic' ? semanticEntries : rawEntries;

      exportEntries.forEach((entry, index) => {
        const flags = [
          entry.hasUncommittedChanges ? t('dashboard.stream.export.flagChanges') : null,
          entry.isStale ? t('dashboard.stream.export.flagBehind') : null,
        ].filter(Boolean);

        lines.push(`## ${index + 1}. ${entry.workspaceLabel}`);
        lines.push(`- ${t('dashboard.stream.export.workspace')}: ${entry.workspaceLabel}`);
        lines.push(`- ${t('dashboard.stream.export.status')}: ${getSessionStatusLabel(entry.runtimeStatus, t)}`);
        lines.push(`- ${t('dashboard.stream.export.source')}: ${getEntrySourceLabel(entry, t)}`);
        lines.push(`- ${t('dashboard.stream.export.branch')}: ${entry.branchName}`);
        lines.push(`- ${t('dashboard.stream.export.detail')}: ${getEntryBody(entry, t)}`);
        if (flags.length > 0) {
          lines.push(`- ${t('dashboard.stream.export.flags')}: ${flags.join(', ')}`);
        }
        lines.push(`- ${t('dashboard.stream.export.generatedAt')}: ${formatFullDateTime(entry.createdAt)}`);
        lines.push('');
      });
    }

    downloadTextFile(
      `zync-activity-stream-${sanitizeFileName(projectName)}-${Date.now()}.md`,
      lines.join('\n'),
      'text/markdown',
    );
  };

  const exportJson = () => {
    const payload = {
      projectId,
      projectName,
      projectPath,
      filterLabel,
      view: activeView,
      exportedAt: new Date().toISOString(),
      items:
        activeView === 'summary'
          ? summaryCards
          : activeView === 'semantic'
            ? semanticEntries
            : rawEntries,
    };

    downloadTextFile(
      `zync-activity-stream-${sanitizeFileName(projectName)}-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
  };

  const renderTimelineEntry = (
    entry: ProjectActivityStreamEntry,
    viewMode: 'raw' | 'semantic',
  ) => {
    const entryBody = getEntryBody(entry, t);
    const fullTime = formatFullDateTime(entry.createdAt);
    const relativeTime = formatRelativeTime(entry.createdAt, language);

    return (
      <button
        key={entry.id}
        type="button"
        onClick={() => {
          if (interactionDisabled || !onOpenWorkspace) {
            return;
          }

          onOpenWorkspace(entry.sessionId);
        }}
        className={`w-full rounded-lg border border-border-primary bg-bg-primary px-3 py-2.5 text-left transition-colors ${
          interactionDisabled || !onOpenWorkspace
            ? 'cursor-default'
            : 'hover:bg-surface-hover'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-xs font-medium text-text-primary">
                {entry.workspaceLabel}
              </span>
              <Badge variant={getStatusVariant(entry.runtimeStatus)} size="sm" className="px-1.5 py-0.5 text-[11px]">
                {getSessionStatusLabel(entry.runtimeStatus, t)}
              </Badge>
              {entry.hasUncommittedChanges ? (
                <Badge variant="warning" size="sm" className="px-1.5 py-0.5 text-[11px]">
                  {t('dashboard.stream.flags.changes')}
                </Badge>
              ) : null}
              {entry.isStale ? (
                <Badge variant="warning" size="sm" className="px-1.5 py-0.5 text-[11px]">
                  {t('dashboard.stream.flags.behind')}
                </Badge>
              ) : null}
              {viewMode === 'semantic' ? (
                <Badge variant="primary" size="sm" className="px-1.5 py-0.5 text-[11px]">
                  {t('dashboard.stream.summary.source.semantic')}
                </Badge>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary">
              <span>{entry.agentLabel || t('dashboard.stream.agent.default')}</span>
              <span>|</span>
              <span>{entry.branchName}</span>
            </div>

            <div className="mt-1.5 text-[13px] leading-5 text-text-secondary">
              {entryBody}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant={getSourceVariant(entry.source)} size="sm" className="px-1.5 py-0.5 text-[11px]">
              {getEntrySourceLabel(entry, t)}
            </Badge>
            <span className="text-[11px] text-text-tertiary" title={fullTime}>
              {relativeTime}
            </span>
            {!interactionDisabled && onOpenWorkspace ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-interactive">
                <ExternalLink className="h-3 w-3" />
                <span>{t('dashboard.stream.openWorkspace')}</span>
              </span>
            ) : null}
          </div>
        </div>
      </button>
    );
  };

  const renderSummaryCard = (card: ProjectActivitySummaryCard) => {
    const fullTime = card.updatedAt ? formatFullDateTime(card.updatedAt) : undefined;
    const relativeTime = card.updatedAt ? formatRelativeTime(card.updatedAt, language) : '';

    return (
      <button
        key={card.sessionId}
        type="button"
        onClick={() => {
          if (interactionDisabled || !onOpenWorkspace) {
            return;
          }

          onOpenWorkspace(card.sessionId);
        }}
        className={`w-full rounded-lg border border-border-primary bg-bg-primary px-3 py-3 text-left transition-colors ${
          interactionDisabled || !onOpenWorkspace
            ? 'cursor-default'
            : 'hover:bg-surface-hover'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-xs font-medium text-text-primary">
                {card.workspaceLabel}
              </span>
              <Badge variant={getStatusVariant(card.runtimeStatus)} size="sm" className="px-1.5 py-0.5 text-[11px]">
                {getSessionStatusLabel(card.runtimeStatus, t)}
              </Badge>
              {card.hasUncommittedChanges ? (
                <Badge variant="warning" size="sm" className="px-1.5 py-0.5 text-[11px]">
                  {t('dashboard.stream.flags.changes')}
                </Badge>
              ) : null}
              {card.isStale ? (
                <Badge variant="warning" size="sm" className="px-1.5 py-0.5 text-[11px]">
                  {t('dashboard.stream.flags.behind')}
                </Badge>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary">
              <span>{card.agentLabel || t('dashboard.stream.agent.default')}</span>
              <span>|</span>
              <span>{card.branchName}</span>
              <span>|</span>
              <span className="truncate">{card.pathLabel}</span>
            </div>

            <div className="mt-2 text-[13px] leading-5 text-text-secondary">
              {getSummaryBody(card, t)}
            </div>

            <div className="mt-2 text-[11px] leading-4 text-text-tertiary">
              {getSummarySupportText(card, t)}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant="primary" size="sm" className="px-1.5 py-0.5 text-[11px]">
              {getSummarySignalLabel(card, t)}
            </Badge>
            {card.updatedAt ? (
              <span className="text-[11px] text-text-tertiary" title={fullTime}>
                {relativeTime}
              </span>
            ) : null}
            {!interactionDisabled && onOpenWorkspace ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-interactive">
                <ExternalLink className="h-3 w-3" />
                <span>{t('dashboard.stream.openWorkspace')}</span>
              </span>
            ) : null}
          </div>
        </div>
      </button>
    );
  };

  const viewTabs: ProjectActivityStreamView[] = ['raw', 'semantic', 'summary'];

  const renderActiveView = () => {
    if (visibleWorkspaceRows.length === 0) {
      return (
        <div className="rounded-lg border border-border-primary bg-surface-secondary px-4 py-8 text-center text-sm text-text-tertiary">
          {workspaceRows.length === 0
            ? t('dashboard.stream.empty.noWorkspaces')
            : t('dashboard.stream.empty.noVisibleWorkspaces')}
        </div>
      );
    }

    if (activeView === 'summary') {
      if (summaryCards.length === 0) {
        return (
          <div className="rounded-lg border border-border-primary bg-surface-secondary px-4 py-8 text-center text-sm text-text-tertiary">
            {t('dashboard.stream.empty.summary')}
          </div>
        );
      }

      return <div className="space-y-2">{summaryCards.map(renderSummaryCard)}</div>;
    }

    const activeEntries = activeView === 'semantic' ? semanticEntries : rawEntries;

    if (activeEntries.length === 0) {
      return (
        <div className="rounded-lg border border-border-primary bg-surface-secondary px-4 py-8 text-center text-sm text-text-tertiary">
          {activeView === 'semantic'
            ? t('dashboard.stream.empty.semantic')
            : t('dashboard.stream.empty.raw')}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {activeEntries.map((entry) =>
          renderTimelineEntry(entry, activeView === 'semantic' ? 'semantic' : 'raw'),
        )}
      </div>
    );
  };

  return (
    <Card padding="sm" className="overflow-hidden px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-interactive/10 text-interactive">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-medium text-text-primary">{t('dashboard.stream.title')}</div>
              <div className="text-[11px] text-text-tertiary">
                {interpolateTranslation(t('dashboard.stream.subtitle'), {
                  filter: filterLabel,
                  count: visibleWorkspaceRows.length,
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="success" size="sm" pulse className="px-1.5 py-0.5 text-[11px]">
            {t('dashboard.stream.live')}
          </Badge>
          <Badge variant="default" size="sm" className="px-1.5 py-0.5 text-[11px]">
            {interpolateTranslation(t('dashboard.stream.entryCount'), {
              count: activeEntryCount,
            })}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            icon={<FileText className="h-4 w-4" />}
            onClick={exportMarkdown}
            disabled={activeEntryCount === 0}
            className="px-2 py-1 text-xs"
          >
            {t('dashboard.stream.export.markdown')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={exportJson}
            disabled={activeEntryCount === 0}
            className="px-2 py-1 text-xs"
          >
            {t('dashboard.stream.export.json')}
          </Button>
        </div>
      </div>

      <div className="mt-2 rounded-lg border border-dashed border-border-secondary bg-surface-secondary/80 px-3 py-2.5">
        <div className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
          {t('dashboard.stream.brief.label')}
        </div>
        <div className="mt-1 text-xs leading-5 text-text-secondary">{managerBrief}</div>
      </div>

      <div className="mt-2 rounded-lg border border-border-primary bg-surface-secondary/70 p-1">
        <div className="flex flex-wrap gap-1">
          {viewTabs.map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeView === view
                  ? 'bg-interactive text-text-on-interactive shadow-button'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              {getViewLabel(view, t)}
            </button>
          ))}
        </div>
        <div className="px-2 pb-1 pt-2 text-[11px] leading-4 text-text-tertiary">
          {getViewDescription(activeView, t)}
        </div>
      </div>

      {interactionDisabled ? (
        <div className="mt-2 rounded-lg border border-border-primary bg-surface-secondary/60 px-3 py-2 text-[11px] text-text-tertiary">
          {t('dashboard.stream.batchModeLocked')}
        </div>
      ) : null}

      <div className="mt-2">
        {renderActiveView()}
      </div>
    </Card>
  );
}
