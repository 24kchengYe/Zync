import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ExternalLink, Filter, GitBranch, Loader2, RefreshCw } from 'lucide-react';
import {
  getSessionStatusLabel,
  interpolateTranslation,
  useI18n,
} from '../I18nContext';
import { resolveSelectedWorkspaceId } from '../features/project-dashboard/workspaceDashboardDetailState';
import {
  formatRelativeTime,
  getAgentChipClass,
  getAgentDotClass,
  getAttentionChipClass,
  getAttentionState,
  getSyncSummary,
  getWorkspaceLabel,
  type AttentionState,
  type RuntimeStatus,
} from '../features/project-dashboard/projectDashboardPresentation';
import { useNavigationStore } from '../stores/navigationStore';
import { useSessionStore } from '../stores/sessionStore';
import type { ProjectDashboardData, SessionBranchInfo } from '../types/projectDashboard';
import { dashboardCache } from '../utils/dashboardCache';
import { debounce } from '../utils/debounce';
import { formatFullDateTime } from '../utils/timestampUtils';
import { API } from '../utils/api';
import { BatchControlToolbar } from './dashboard/BatchControlToolbar';
import { MultiOriginStatus } from './dashboard/MultiOriginStatus';
import { ProjectActivityStreamCard } from './dashboard/ProjectActivityStreamCard';
import { StatusSummaryCards } from './dashboard/StatusSummaryCards';
import { WorkspaceDetailPanel } from './dashboard/WorkspaceDetailPanel';
import { ProjectDashboardSkeleton } from './ProjectDashboardSkeleton';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface ProjectDashboardProps {
  projectId: number;
  projectName: string;
}

type WorkspaceFilter = 'all' | 'running' | 'waiting' | 'changes' | 'failed' | 'behind';
type DashboardMainTab = 'batch' | 'activity';
interface WorkspaceStatusRow extends SessionBranchInfo {
  runtimeStatus: RuntimeStatus;
  lastActivity?: string;
  createdAt?: string;
  workspaceLabel: string;
  pathLabel: string;
  attentionState: AttentionState;
  isMainWorkspace: boolean;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = React.memo(({ projectId, projectName }) => {
  const { t, language } = useI18n();
  const sessions = useSessionStore(state => state.sessions);
  const dashboardFocusWorkspaceIdsByProject = useNavigationStore(
    state => state.dashboardFocusWorkspaceIdsByProject,
  );
  const clearDashboardFocusWorkspaceIds = useNavigationStore(
    state => state.clearDashboardFocusWorkspaceIds,
  );
  const [dashboardData, setDashboardData] = useState<ProjectDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<DashboardMainTab>('batch');
  const [filterType, setFilterType] = useState<WorkspaceFilter>('all');
  const [isBatchMode, setIsBatchMode] = useState(true);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [isProgressive] = useState(true);
  const dashboardDataRef = useRef<ProjectDashboardData | null>(null);
  const pendingSessionUpdatesRef = useRef<Map<string, SessionBranchInfo>>(new Map());
  const batchModeFilterRef = useRef<WorkspaceFilter>('all');
  const [didAutoResetBatchFilter, setDidAutoResetBatchFilter] = useState(false);

  useEffect(() => {
    dashboardDataRef.current = dashboardData;
  }, [dashboardData]);

  const applyPendingSessionUpdates = useMemo(
    () =>
      debounce(() => {
        const updates = Array.from(pendingSessionUpdatesRef.current.values());
        if (updates.length === 0) return;

        setDashboardData(prevData => {
          if (!prevData) return null;

          const sessionMap = new Map(prevData.sessionBranches.map(session => [session.sessionId, session]));

          updates.forEach(update => {
            sessionMap.set(update.sessionId, update);
          });

          pendingSessionUpdatesRef.current.clear();

          return {
            ...prevData,
            sessionBranches: Array.from(sessionMap.values()),
          };
        });
      }, 100),
    [],
  );

  const fetchDashboardData = useCallback(
    async (useCache: boolean = true, useProgressive: boolean = true) => {
      const currentDashboardData = dashboardDataRef.current;

      if (useCache) {
        const cachedData = dashboardCache.get(projectId);
        if (cachedData) {
          setDashboardData(cachedData);
          setLastRefreshTime(new Date(Date.now() - 30000));
          return;
        }
      }

      setIsLoading(!currentDashboardData);
      setIsRefreshing(!!currentDashboardData);
      setError(null);

      try {
        const response = useProgressive && isProgressive
          ? await API.dashboard.getProjectStatusProgressive(projectId)
          : await API.dashboard.getProjectStatus(projectId);

        if (response.success && response.data) {
          setDashboardData(response.data);
          setLastRefreshTime(new Date());
          dashboardCache.set(projectId, response.data);
        } else {
          setError(response.error || t('dashboard.errorTitle'));
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : t('dashboard.errorTitle'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isProgressive, projectId, t],
  );

  const debouncedRefresh = useMemo(
    () =>
      debounce(() => {
        dashboardCache.invalidate(projectId);
        fetchDashboardData(false, true);
      }, 500),
    [fetchDashboardData, projectId],
  );

  useEffect(() => {
    if (!isProgressive) return;

    const cleanupFns: Array<() => void> = [];

    const unsubscribeUpdate = API.dashboard.onUpdate(event => {
      if (event.projectId === projectId) {
        setDashboardData(prevData => {
          if (!prevData && event.data) {
            return event.data as ProjectDashboardData;
          }

          if (prevData && event.data && event.isPartial) {
            return { ...prevData, ...event.data };
          }

          if (event.data) {
            const data = event.data as ProjectDashboardData;
            if (data.projectId && data.projectName && data.sessionBranches) {
              dashboardCache.set(projectId, data);
            }
            return data;
          }

          return prevData;
        });

        if (!event.isPartial) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    });
    cleanupFns.push(unsubscribeUpdate);

    const unsubscribeSession = API.dashboard.onSessionUpdate(event => {
      if (event.projectId === projectId && event.data && event.sessionId) {
        const sessionData = event.data as SessionBranchInfo;
        pendingSessionUpdatesRef.current.set(event.sessionId, sessionData);
        applyPendingSessionUpdates();
      }
    });
    cleanupFns.push(unsubscribeSession);

    return () => {
      cleanupFns.forEach(cleanup => cleanup());
      applyPendingSessionUpdates.cancel();
    };
  }, [applyPendingSessionUpdates, isProgressive, projectId]);

  useEffect(() => {
    setDashboardData(null);
    setError(null);
    setActiveMainTab('batch');
    setIsBatchMode(true);
    setSelectedWorkspaceId(null);
    setSelectedWorkspaceIds([]);
    setDidAutoResetBatchFilter(false);
    fetchDashboardData();
  }, [fetchDashboardData, projectId]);

  const sessionMap = useMemo(
    () => new Map(sessions.map(session => [session.id, session])),
    [sessions],
  );

  const pendingFocusedWorkspaceIds = useMemo(
    () => dashboardFocusWorkspaceIdsByProject[String(projectId)] ?? [],
    [dashboardFocusWorkspaceIdsByProject, projectId],
  );

  const workspaceRows = useMemo<WorkspaceStatusRow[]>(() => {
    if (!dashboardData) {
      return [];
    }

    return dashboardData.sessionBranches
      .map(branch => {
        const matchedSession = sessionMap.get(branch.sessionId);
        const runtimeStatus: RuntimeStatus = matchedSession?.status ?? 'unknown';

        return {
          ...branch,
          runtimeStatus,
          lastActivity: matchedSession?.lastActivity,
          createdAt: matchedSession?.createdAt,
          workspaceLabel: matchedSession?.name || branch.sessionName || getWorkspaceLabel(branch.worktreePath),
          pathLabel: branch.worktreePath,
          attentionState: getAttentionState(runtimeStatus, branch.isStale),
          isMainWorkspace: matchedSession?.isMainRepo === true,
        };
      })
      .sort((left, right) => {
        const priorityRank = {
          failed: 0,
          waiting: 1,
          behind: 2,
          completed: 3,
          initializing: 4,
          healthy: 5,
          ready: 6,
          stopped: 7,
          unknown: 8,
        } satisfies Record<AttentionState, number>;

        const priorityDifference = priorityRank[left.attentionState] - priorityRank[right.attentionState];
        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return left.workspaceLabel.localeCompare(right.workspaceLabel);
      });
  }, [dashboardData, sessionMap]);

  const summaryCounts = useMemo(() => {
    return workspaceRows.reduce(
      (summary, row) => {
        if (row.runtimeStatus === 'running') {
          summary.running += 1;
        }

        if (row.runtimeStatus === 'waiting') {
          summary.waiting += 1;
        }

        if (row.hasUncommittedChanges) {
          summary.changes += 1;
        }

        if (row.runtimeStatus === 'error') {
          summary.failed += 1;
        }

        return summary;
      },
      { running: 0, waiting: 0, changes: 0, failed: 0 },
    );
  }, [workspaceRows]);

  const filteredWorkspaceRows = useMemo(() => {
    switch (filterType) {
      case 'running':
        return workspaceRows.filter(row => row.runtimeStatus === 'running');
      case 'waiting':
        return workspaceRows.filter(row => row.runtimeStatus === 'waiting');
      case 'changes':
        return workspaceRows.filter(row => row.hasUncommittedChanges);
      case 'failed':
        return workspaceRows.filter(row => row.runtimeStatus === 'error');
      case 'behind':
        return workspaceRows.filter(row => row.isStale);
      case 'all':
      default:
        return workspaceRows;
    }
  }, [filterType, workspaceRows]);

  const selectedWorkspaceRows = useMemo(() => {
    if (selectedWorkspaceIds.length === 0) {
      return [];
    }

    const selectedIdSet = new Set(selectedWorkspaceIds);
    return workspaceRows.filter(row => selectedIdSet.has(row.sessionId));
  }, [selectedWorkspaceIds, workspaceRows]);

  const visibleWorkspaceIds = useMemo(
    () => filteredWorkspaceRows.map(row => row.sessionId),
    [filteredWorkspaceRows],
  );

  const areAllVisibleWorkspacesSelected = useMemo(
    () =>
      visibleWorkspaceIds.length > 0
      && visibleWorkspaceIds.every(sessionId => selectedWorkspaceIds.includes(sessionId)),
    [selectedWorkspaceIds, visibleWorkspaceIds],
  );

  useEffect(() => {
    setSelectedWorkspaceIds(prevSelection => {
      const validIds = new Set(workspaceRows.map(row => row.sessionId));
      const nextSelection = prevSelection.filter(id => validIds.has(id));
      return nextSelection.length === prevSelection.length ? prevSelection : nextSelection;
    });
  }, [workspaceRows]);

  useEffect(() => {
    const nextSelectedWorkspaceId = resolveSelectedWorkspaceId({
      visibleWorkspaceIds,
      previousSelectedWorkspaceId: selectedWorkspaceId,
      preferredWorkspaceIds: pendingFocusedWorkspaceIds,
    });

    if (nextSelectedWorkspaceId !== selectedWorkspaceId) {
      setSelectedWorkspaceId(nextSelectedWorkspaceId);
    }

    if (
      pendingFocusedWorkspaceIds.length > 0
      && nextSelectedWorkspaceId
      && pendingFocusedWorkspaceIds.includes(nextSelectedWorkspaceId)
    ) {
      clearDashboardFocusWorkspaceIds(projectId);
    }
  }, [
    clearDashboardFocusWorkspaceIds,
    pendingFocusedWorkspaceIds,
    projectId,
    selectedWorkspaceId,
    visibleWorkspaceIds,
  ]);

  const filterOptions = useMemo(
    () => [
      { id: 'all', label: t('dashboard.filter.all') },
      { id: 'running', label: t('dashboard.filter.running') },
      { id: 'waiting', label: t('dashboard.filter.waiting') },
      { id: 'changes', label: t('dashboard.filter.changes') },
      { id: 'failed', label: t('dashboard.filter.failed') },
      { id: 'behind', label: t('dashboard.filter.behind') },
    ] satisfies Array<{ id: WorkspaceFilter; label: string }>,
    [t],
  );

  const selectedWorkspaceRow = useMemo(
    () => filteredWorkspaceRows.find(row => row.sessionId === selectedWorkspaceId) ?? null,
    [filteredWorkspaceRows, selectedWorkspaceId],
  );

  const selectedWorkspaceSession = useMemo(
    () => (selectedWorkspaceId ? sessionMap.get(selectedWorkspaceId) : undefined),
    [selectedWorkspaceId, sessionMap],
  );

  const projectSubtitle = interpolateTranslation(t('dashboard.subtitle'), {
    project: dashboardData?.projectName || projectName,
  });

  const syncSummary = getSyncSummary(dashboardData?.mainBranchStatus);

  const lastRefreshLabel = useMemo(() => {
    if (!lastRefreshTime) {
      return null;
    }

    return interpolateTranslation(t('dashboard.updated'), {
      time: formatRelativeTime(lastRefreshTime, language),
    });
  }, [language, lastRefreshTime, t]);

  const getAttentionLabel = useCallback(
    (attentionState: AttentionState) => {
      switch (attentionState) {
        case 'healthy':
          return t('dashboard.workspace.attention.healthy');
        case 'waiting':
          return t('dashboard.workspace.attention.waiting');
        case 'failed':
          return t('dashboard.workspace.attention.failed');
        case 'behind':
          return t('dashboard.workspace.attention.behind');
        case 'completed':
          return t('dashboard.workspace.attention.completed');
        case 'initializing':
          return t('dashboard.workspace.attention.initializing');
        case 'ready':
          return t('dashboard.workspace.attention.ready');
        case 'stopped':
          return t('dashboard.workspace.attention.stopped');
        case 'unknown':
        default:
          return t('dashboard.workspace.attention.unknown');
      }
    },
    [t],
  );

  const replaceWorkspaceSelection = useCallback((sessionIds: string[]) => {
    setSelectedWorkspaceIds(Array.from(new Set(sessionIds)));
  }, []);

  const enterBatchMode = useCallback(() => {
    batchModeFilterRef.current = filterType;
    setIsBatchMode(true);
    setSelectedWorkspaceIds([]);

    if (workspaceRows.length > 0 && filteredWorkspaceRows.length === 0 && filterType !== 'all') {
      setFilterType('all');
      setDidAutoResetBatchFilter(true);
      return;
    }

    setDidAutoResetBatchFilter(false);
  }, [filterType, filteredWorkspaceRows.length, workspaceRows.length]);

  const exitBatchMode = useCallback(() => {
    setIsBatchMode(false);
    setSelectedWorkspaceIds([]);
    if (didAutoResetBatchFilter) {
      setFilterType(batchModeFilterRef.current);
    }
    setDidAutoResetBatchFilter(false);
  }, [didAutoResetBatchFilter]);

  const selectBatchTab = useCallback(() => {
    if (activeMainTab === 'batch') {
      return;
    }

    setActiveMainTab('batch');
    enterBatchMode();
  }, [activeMainTab, enterBatchMode]);

  const selectActivityTab = useCallback(() => {
    if (activeMainTab === 'activity') {
      return;
    }

    setActiveMainTab('activity');
    exitBatchMode();
  }, [activeMainTab, exitBatchMode]);

  const toggleWorkspaceSelection = useCallback((sessionId: string) => {
    setSelectedWorkspaceIds(prevSelection =>
      prevSelection.includes(sessionId)
        ? prevSelection.filter(id => id !== sessionId)
        : [...prevSelection, sessionId],
    );
  }, []);

  const toggleVisibleWorkspaceSelection = useCallback(() => {
    if (visibleWorkspaceIds.length === 0) {
      return;
    }

    if (areAllVisibleWorkspacesSelected) {
      const visibleWorkspaceIdSet = new Set(visibleWorkspaceIds);
      setSelectedWorkspaceIds(prevSelection => prevSelection.filter(id => !visibleWorkspaceIdSet.has(id)));
      return;
    }

    setSelectedWorkspaceIds(prevSelection => Array.from(new Set([...prevSelection, ...visibleWorkspaceIds])));
  }, [areAllVisibleWorkspacesSelected, visibleWorkspaceIds]);

  const selectFilteredWorkspaces = useCallback(() => {
    replaceWorkspaceSelection(filteredWorkspaceRows.map(row => row.sessionId));
  }, [filteredWorkspaceRows, replaceWorkspaceSelection]);

  const selectRunningWorkspaces = useCallback(() => {
    replaceWorkspaceSelection(
      workspaceRows
        .filter(row => row.runtimeStatus === 'running')
        .map(row => row.sessionId),
    );
  }, [replaceWorkspaceSelection, workspaceRows]);

  const selectWaitingWorkspaces = useCallback(() => {
    replaceWorkspaceSelection(
      workspaceRows
        .filter(row => row.runtimeStatus === 'waiting')
        .map(row => row.sessionId),
    );
  }, [replaceWorkspaceSelection, workspaceRows]);

  const selectChangedWorkspaces = useCallback(() => {
    replaceWorkspaceSelection(
      workspaceRows
        .filter(row => row.hasUncommittedChanges)
        .map(row => row.sessionId),
    );
  }, [replaceWorkspaceSelection, workspaceRows]);

  const selectFailedWorkspaces = useCallback(() => {
    replaceWorkspaceSelection(
      workspaceRows
        .filter(row => row.runtimeStatus === 'error')
        .map(row => row.sessionId),
    );
  }, [replaceWorkspaceSelection, workspaceRows]);

  const openWorkspaceFromDashboard = useCallback(async (sessionId: string) => {
    try {
      await useSessionStore.getState().setActiveSession(sessionId);
      useNavigationStore.getState().navigateToSessions();
    } catch (sessionError) {
      console.error('[ProjectDashboard] Failed to open workspace from dashboard:', sessionError);
    }
  }, []);

  const renderWorkspaceRow = useCallback(
    (workspace: WorkspaceStatusRow) => {
      const relativeLastActivity = workspace.lastActivity
        ? formatRelativeTime(workspace.lastActivity, language)
        : workspace.createdAt
          ? formatRelativeTime(workspace.createdAt, language)
          : '';

      const syncText = workspace.isStale
        ? workspace.staleSince
          ? interpolateTranslation(t('dashboard.workspace.sync.behindSince'), {
              time: formatRelativeTime(workspace.staleSince, language),
            })
          : t('dashboard.workspace.sync.behindMain')
          : t('dashboard.workspace.sync.current');

      const isBatchSelected = selectedWorkspaceIds.includes(workspace.sessionId);
      const isDetailFocused = selectedWorkspaceId === workspace.sessionId;
      const cellPaddingClass = isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2';

      const handleSessionClick = () => {
        setSelectedWorkspaceId(workspace.sessionId);
      };

      return (
        <tr
          key={workspace.sessionId}
          className={`cursor-pointer transition-colors hover:bg-surface-hover ${
            isDetailFocused ? 'bg-interactive/10' : ''
          } ${
            !isDetailFocused && isBatchSelected ? 'bg-interactive/5' : ''
          } ${
            workspace.attentionState === 'failed' && !isDetailFocused ? 'bg-status-error/5' : ''
          }`}
          onClick={handleSessionClick}
        >
          {isBatchMode && (
            <td className={`${cellPaddingClass} align-top`}>
              <input
                type="checkbox"
                checked={isBatchSelected}
                onChange={() => toggleWorkspaceSelection(workspace.sessionId)}
                onClick={event => event.stopPropagation()}
                className={`${isBatchMode ? 'mt-0.5' : 'mt-1'} h-4 w-4 rounded border-border-primary text-interactive focus:ring-interactive`}
                aria-label={interpolateTranslation(t('dashboard.batch.table.selectWorkspace'), {
                  workspace: workspace.workspaceLabel,
                })}
              />
            </td>
          )}
          <td className={`${cellPaddingClass} align-top text-xs`}>
            <div className={`flex ${isBatchMode ? 'items-center gap-2' : 'items-start gap-2.5'}`}>
              <div className={`${isBatchMode ? 'mt-0.5' : 'mt-1'} h-2 w-2 rounded-full ${getAgentDotClass(workspace.runtimeStatus)}`}></div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="truncate text-xs font-medium text-text-primary">{workspace.workspaceLabel}</div>
                  {workspace.isMainWorkspace ? (
                    <Badge variant="primary" size="sm" className="px-1.5 py-0.5 text-[10px]">
                      {t('dashboard.detail.badge.main')}
                    </Badge>
                  ) : null}
                  {isDetailFocused ? (
                    <Badge variant="default" size="sm" className="px-1.5 py-0.5 text-[10px]">
                      {t('dashboard.detail.focused')}
                    </Badge>
                  ) : null}
                </div>
                <div className="truncate text-[11px] text-text-tertiary">{workspace.pathLabel}</div>
              </div>
            </div>
          </td>
          <td className={`${cellPaddingClass} align-top text-xs`}>
            <div className={isBatchMode ? 'space-y-1' : 'space-y-1.5'}>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAgentChipClass(workspace.runtimeStatus)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getAgentDotClass(workspace.runtimeStatus)}`}></span>
                <span>{getSessionStatusLabel(workspace.runtimeStatus, t)}</span>
              </span>
            </div>
          </td>
          <td className={`${cellPaddingClass} align-top text-xs text-text-secondary`}>
            {isBatchMode ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-text-primary">
                  <GitBranch className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="truncate text-xs font-medium">{workspace.branchName}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {workspace.commitsAhead > 0 && (
                    <span className="rounded-full bg-interactive/10 px-2 py-0.5 text-interactive">
                      +{workspace.commitsAhead}
                    </span>
                  )}
                  {workspace.commitsBehind > 0 && (
                    <span className="rounded-full bg-status-warning/10 px-2 py-0.5 text-status-warning">
                      -{workspace.commitsBehind}
                    </span>
                  )}
                  {workspace.commitsAhead === 0 && workspace.commitsBehind === 0 && (
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-text-tertiary">
                      {t('dashboard.sync.status.upToDate')}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-text-primary">
                  <GitBranch className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="text-xs font-medium">{workspace.branchName}</span>
                </div>
                <div className="text-[11px] text-text-tertiary">
                  {interpolateTranslation(t('dashboard.workspace.baseBranch'), { branch: workspace.baseBranch })}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {workspace.commitsAhead > 0 && (
                    <span className="rounded-full bg-interactive/10 px-2 py-0.5 text-interactive">
                      +{workspace.commitsAhead}
                    </span>
                  )}
                  {workspace.commitsBehind > 0 && (
                    <span className="rounded-full bg-status-warning/10 px-2 py-0.5 text-status-warning">
                      -{workspace.commitsBehind}
                    </span>
                  )}
                  {workspace.commitsAhead === 0 && workspace.commitsBehind === 0 && (
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-text-tertiary">
                      {t('dashboard.sync.status.upToDate')}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] ${workspace.isStale ? 'text-status-warning' : 'text-text-tertiary'}`}>
                  {syncText}
                </div>
              </div>
            )}
          </td>
          <td className={`${cellPaddingClass} align-top text-xs`}>
            <div className={isBatchMode ? 'space-y-1' : 'space-y-1.5'}>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  workspace.hasUncommittedChanges
                    ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
                    : 'border-border-primary bg-surface-secondary text-text-secondary'
                }`}
              >
                <span>{workspace.hasUncommittedChanges ? t('dashboard.workspace.code.uncommitted') : t('dashboard.workspace.code.clean')}</span>
              </span>
              {!isBatchMode && workspace.pullRequest && (
                <a
                  href={workspace.pullRequest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={event => event.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] text-interactive hover:text-interactive-hover"
                >
                  <span>{interpolateTranslation(t('dashboard.workspace.code.pullRequest'), { number: workspace.pullRequest.number })}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </td>
          <td className={`${cellPaddingClass} align-top text-xs`}>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAttentionChipClass(workspace.attentionState)}`}>
              {getAttentionLabel(workspace.attentionState)}
            </span>
          </td>
          <td className={`${cellPaddingClass} align-top text-xs`}>
            {relativeLastActivity ? (
              <div className={isBatchMode ? 'space-y-0.5' : 'space-y-1'}>
                <div className="text-xs text-text-primary">{relativeLastActivity}</div>
                {!isBatchMode && (
                  <div className="text-[11px] text-text-tertiary">
                    {formatFullDateTime(workspace.lastActivity || workspace.createdAt || new Date())}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-text-tertiary">{t('dashboard.workspace.lastActivity.never')}</span>
            )}
          </td>
          <td className={`${cellPaddingClass} align-top text-right text-xs`}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                void openWorkspaceFromDashboard(workspace.sessionId);
              }}
              className="h-7 px-2 text-[11px]"
            >
              {t('dashboard.detail.action.openWorkspace')}
            </Button>
          </td>
        </tr>
      );
    },
    [
      getAttentionLabel,
      isBatchMode,
      language,
      openWorkspaceFromDashboard,
      selectedWorkspaceId,
      selectedWorkspaceIds,
      setSelectedWorkspaceId,
      t,
      toggleWorkspaceSelection,
    ],
  );

  const workspaceTableContent = (
    <>
      {workspaceRows.length === 0 ? (
        <div className="flex min-h-[14rem] items-center justify-center rounded-lg bg-surface-secondary text-center text-sm text-text-tertiary">
          <div className="space-y-1.5 px-6 py-8">
            <div className="text-sm font-medium text-text-secondary">{t('dashboard.workspaceSection.empty')}</div>
            <div className="text-xs">{t(syncSummary.syncCaptionKey)}</div>
          </div>
        </div>
      ) : filteredWorkspaceRows.length === 0 ? (
        <div className="flex min-h-[14rem] items-center justify-center rounded-lg bg-surface-secondary text-center text-sm text-text-tertiary">
          {isBatchMode ? (
            <div className="space-y-2 px-6 py-8">
              <div className="text-xs">{t('dashboard.batch.emptyFiltered')}</div>
              <Button variant="secondary" size="sm" onClick={() => setFilterType('all')}>
                {t('dashboard.batch.showAll')}
              </Button>
            </div>
          ) : (
            t('dashboard.workspaceSection.emptyFiltered')
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-primary">
          <table className="min-w-full divide-y divide-border-primary">
            <thead className="bg-surface-secondary">
              <tr>
                {isBatchMode && (
                  <th className={`${isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2'} sticky top-0 z-10 bg-surface-secondary text-left text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={areAllVisibleWorkspacesSelected}
                        onChange={toggleVisibleWorkspaceSelection}
                        className="h-4 w-4 rounded border-border-primary text-interactive focus:ring-interactive"
                        aria-label={t('dashboard.batch.table.selectVisible')}
                      />
                      <span>{t('dashboard.batch.table.select')}</span>
                    </div>
                  </th>
                )}
                <th className={`${isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2'} sticky top-0 z-10 bg-surface-secondary text-left text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
                  {t('dashboard.table.workspace')}
                </th>
                <th className={`${isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2'} sticky top-0 z-10 bg-surface-secondary text-left text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
                  {t('dashboard.table.agent')}
                </th>
                <th className={`${isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2'} sticky top-0 z-10 bg-surface-secondary text-left text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
                  {t('dashboard.table.branch')}
                </th>
                <th className={`${isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2'} sticky top-0 z-10 bg-surface-secondary text-left text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
                  {t('dashboard.table.code')}
                </th>
                <th className={`${isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2'} sticky top-0 z-10 bg-surface-secondary text-left text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
                  {t('dashboard.table.attention')}
                </th>
                <th className={`${isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2'} sticky top-0 z-10 bg-surface-secondary text-left text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
                  {t('dashboard.table.lastActivity')}
                </th>
                <th className={`${isBatchMode ? 'px-2.5 py-1.5' : 'px-3 py-2'} sticky top-0 z-10 bg-surface-secondary text-right text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
                  {t('dashboard.table.action')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary bg-bg-primary">
              {filteredWorkspaceRows.map(renderWorkspaceRow)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  if (error) {
    return (
      <div className="rounded-lg bg-status-error/10 p-6">
        <div className="flex items-center gap-2 text-status-error">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{t('dashboard.errorTitle')}</span>
        </div>
        <p className="mt-1 text-sm text-status-error/80">{error}</p>
        <button
          onClick={() => fetchDashboardData(false)}
          className="mt-3 rounded bg-status-error px-3 py-1 text-sm text-white hover:bg-status-error-hover"
        >
          {t('dashboard.retry')}
        </button>
      </div>
    );
  }

  if (isLoading && !dashboardData) {
    return <ProjectDashboardSkeleton />;
  }

  return (
    <Card padding="none" className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border-primary px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{t('dashboard.title')}</h2>
            <p className="text-xs text-text-secondary">{projectSubtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshLabel && (
              <span className="text-[11px] text-text-tertiary">{lastRefreshLabel}</span>
            )}
            <Button
              onClick={debouncedRefresh}
              disabled={isLoading || isRefreshing}
              variant="secondary"
              size="sm"
              icon={(isLoading || isRefreshing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            >
              {t('dashboard.refresh')}
            </Button>
          </div>
        </div>
      </div>

      {dashboardData ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
          <div className="flex-shrink-0 space-y-3">
            <StatusSummaryCards
              totalWorkspaces={workspaceRows.length}
              runningCount={summaryCounts.running}
              waitingCount={summaryCounts.waiting}
              changedCount={summaryCounts.changes}
              failedCount={summaryCounts.failed}
              mainBranchStatus={dashboardData.mainBranchStatus}
            />

            <Card padding="sm" className="border border-dashed border-border-secondary bg-surface-secondary/80 px-3 py-2.5">
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-text-primary">{t('dashboard.testingNote.title')}</div>
                <div className="text-[11px] leading-4 text-text-secondary">{t('dashboard.testingNote.body')}</div>
              </div>
            </Card>

            {dashboardData.mainBranchStatus && (
              <MultiOriginStatus
                mainBranch={dashboardData.mainBranch}
                mainBranchStatus={dashboardData.mainBranchStatus}
                remotes={dashboardData.remotes}
                onReviewUpdates={() => setFilterType('behind')}
              />
            )}
          </div>

          <div className="min-h-0 flex flex-1 flex-col overflow-hidden rounded-lg border border-border-primary bg-surface-primary">
            <div className="border-b border-border-primary px-2.5 py-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 rounded-lg bg-surface-secondary p-0.5">
                    <button
                      type="button"
                      onClick={selectBatchTab}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        activeMainTab === 'batch'
                          ? 'bg-interactive text-text-on-interactive shadow-button'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}
                    >
                      {t('dashboard.primaryTabs.batch')}
                    </button>
                    <button
                      type="button"
                      onClick={selectActivityTab}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        activeMainTab === 'activity'
                          ? 'bg-interactive text-text-on-interactive shadow-button'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}
                    >
                      {t('dashboard.primaryTabs.activity')}
                    </button>
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    {interpolateTranslation(t('dashboard.workspaceSection.count'), {
                      visible: filteredWorkspaceRows.length,
                      total: workspaceRows.length,
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-text-tertiary" />
                  <select
                    value={filterType}
                    onChange={event => setFilterType(event.target.value as WorkspaceFilter)}
                    className="rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary focus:border-interactive focus:outline-none focus:ring-2 focus:ring-interactive"
                  >
                    {filterOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
              <div className="space-y-2">
                {activeMainTab === 'activity' ? (
                  <ProjectActivityStreamCard
                    projectId={projectId}
                    projectName={projectName}
                    projectPath={dashboardData.projectPath}
                    workspaceRows={workspaceRows}
                    visibleWorkspaceRows={filteredWorkspaceRows}
                    sessions={sessions}
                    filterLabel={filterOptions.find((option) => option.id === filterType)?.label ?? t('dashboard.filter.all')}
                    onOpenWorkspace={openWorkspaceFromDashboard}
                  />
                ) : (
                  <BatchControlToolbar
                    isBatchMode={isBatchMode}
                    selectedCount={selectedWorkspaceRows.length}
                    didAutoResetFilter={didAutoResetBatchFilter}
                    onSelectFiltered={selectFilteredWorkspaces}
                    onSelectRunning={selectRunningWorkspaces}
                    onSelectWaiting={selectWaitingWorkspaces}
                    onSelectChanges={selectChangedWorkspaces}
                    onSelectFailed={selectFailedWorkspaces}
                    onClearSelection={() => setSelectedWorkspaceIds([])}
                  />
                )}

                {workspaceTableContent}

                <WorkspaceDetailPanel
                  workspace={selectedWorkspaceRow}
                  session={selectedWorkspaceSession}
                  onOpenWorkspace={openWorkspaceFromDashboard}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </Card>
  );
});
