import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import {
  GitBranch,
  AlertTriangle,
  Code2,
  Settings,
  Link,
  TerminalSquare,
  Camera,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Tooltip } from './ui/Tooltip';
import { Dropdown, DropdownMenuItem } from './ui/Dropdown';
import { GitHistoryGraph } from './GitHistoryGraph';
import { panelApi } from '../services/panelApi';
import { usePanelStore } from '../stores/panelStore';
import { interpolateTranslation, useI18n } from '../../../UpdateWuruize/frontend/I18nContext';
import {
  DEFAULT_WORKSPACE_LAYOUT_DEMO_STATE,
  getWorkspacePersistenceKey,
  type WorkspaceLayoutDemoState,
} from '../../../UpdateWuruize/frontend/WorkspaceLayoutDemoState';
import { WorkspaceSnapshotDialog } from '../../../UpdateWuruize/frontend/WorkspaceSnapshotDialog';
import {
  buildWorkspaceSnapshotRestorePreview,
  createAndStoreWorkspaceSnapshot,
  deleteWorkspaceSnapshot,
  isWorkspaceSnapshotSupportedPanelType,
  loadWorkspaceSnapshots,
  type WorkspaceSnapshotRecord,
} from '../../../UpdateWuruize/frontend/WorkspaceSnapshotDemoState';

interface DetailPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  width: number;
  onResize: (e: React.MouseEvent) => void;
  mergeError?: string | null;
  workspaceLayoutState?: WorkspaceLayoutDemoState;
  onRestoreWorkspaceLayoutState?: (state: WorkspaceLayoutDemoState) => void;
  projectGitActions?: {
    onPull?: () => void;
    onPush?: () => void;
    isMerging?: boolean;
  };
}

/** Consistent compact button class for sidebar actions */
const sidebarBtn = 'w-full justify-start text-sm !px-2';

type Translator = ReturnType<typeof useI18n>['t'];

function formatTimeAgo(iso: string, t: Translator): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('detailPanel.time.justNow');
  if (mins < 60) return interpolateTranslation(t('detailPanel.time.minutesAgo'), { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return interpolateTranslation(t('detailPanel.time.hoursAgo'), { count: hrs });
  const days = Math.floor(hrs / 24);
  return interpolateTranslation(t('detailPanel.time.daysAgo'), { count: days });
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs uppercase text-text-tertiary font-medium mb-2 px-1">{children}</h3>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 py-2 border-b border-border-primary">
      <SectionHeader>{title}</SectionHeader>
      {children}
    </div>
  );
}

export function DetailPanel({
  isVisible,
  width,
  onResize,
  mergeError,
  workspaceLayoutState = DEFAULT_WORKSPACE_LAYOUT_DEMO_STATE,
  onRestoreWorkspaceLayoutState = () => {},
  projectGitActions,
}: DetailPanelProps) {
  const sessionContext = useSession();
  const { t } = useI18n();
  const sessionId = sessionContext?.session.id ?? '';
  const { panels, activePanels, setPanels, setActivePanel: setActivePanelInStore } = usePanelStore();
  const [snapshotDialogMode, setSnapshotDialogMode] = useState<'save' | 'restore' | null>(null);
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshotRecord[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const workspaceStorageKey = useMemo(
    () =>
      getWorkspacePersistenceKey({
        sessionId: sessionContext?.session.id ?? '',
        projectId: sessionContext?.session.projectId,
        workspaceName: sessionContext?.session.name,
        worktreePath: sessionContext?.session.worktreePath,
      }),
    [
      sessionContext?.session.id,
      sessionContext?.session.name,
      sessionContext?.session.projectId,
      sessionContext?.session.worktreePath,
    ],
  );

  const sessionPanels = useMemo(() => panels[sessionId] ?? [], [panels, sessionId]);
  const activePanelId = activePanels[sessionId] ?? null;
  const supportedSnapshotPanels = useMemo(
    () =>
      sessionPanels.filter(
        (
          panel,
        ): panel is typeof panel & { type: 'terminal' | 'explorer' | 'diff' } =>
          isWorkspaceSnapshotSupportedPanelType(panel.type),
      ),
    [sessionPanels],
  );

  const syncSnapshots = useCallback((preferredSnapshotId?: string | null) => {
    if (!sessionId || !workspaceStorageKey) {
      setSnapshots([]);
      setSelectedSnapshotId(null);
      return;
    }

    const nextSnapshots = loadWorkspaceSnapshots(workspaceStorageKey, {
      legacyStorageKeys: [sessionId],
      projectId: sessionContext?.session.projectId,
      projectName: sessionContext?.projectName,
      workspaceName: sessionContext?.session.name,
      worktreePath: sessionContext?.session.worktreePath,
    });
    setSnapshots(nextSnapshots);
    setSelectedSnapshotId((currentSelectedSnapshotId) => {
      const nextSelectedSnapshotId =
        preferredSnapshotId !== undefined ? preferredSnapshotId : currentSelectedSnapshotId;

      if (
        nextSelectedSnapshotId &&
        nextSnapshots.some((snapshot) => snapshot.id === nextSelectedSnapshotId)
      ) {
        return nextSelectedSnapshotId;
      }

      return nextSnapshots[0]?.id ?? null;
    });
  }, [
    sessionContext?.projectName,
    sessionContext?.session.name,
    sessionContext?.session.projectId,
    sessionContext?.session.worktreePath,
    sessionId,
    workspaceStorageKey,
  ]);

  useEffect(() => {
    syncSnapshots();
  }, [syncSnapshots]);

  // Build IDE dropdown items, sending safe IDE keys (resolved to commands server-side)
  const ideItems = useMemo(() => {
    if (!sessionContext?.onOpenIDEWithCommand) return [];
    const handler = sessionContext.onOpenIDEWithCommand;
    const configured = sessionContext.configuredIDECommand?.trim();
    const knownCommands = ['code .', 'cursor .'];
    const isCustom = configured && !knownCommands.includes(configured);
    const items = isCustom
      ? [{ id: 'configured', label: configured, description: t('detailPanel.ide.projectDefault'), icon: TerminalSquare, onClick: () => handler() }]
      : [];
    return [
      ...items,
      { id: 'vscode', label: t('detailPanel.ide.vscode'), description: 'code .', icon: Code2, onClick: () => handler('vscode') },
      { id: 'cursor', label: t('detailPanel.ide.cursor'), description: 'cursor .', icon: Code2, onClick: () => handler('cursor') },
    ];
  }, [sessionContext?.onOpenIDEWithCommand, sessionContext?.configuredIDECommand, t]);

  if (!isVisible || !sessionContext) return null;

  const { session, gitBranchActions, isMerging, gitCommands, onOpenIDEWithCommand, onConfigureIDE, onSetTracking, trackingBranch } = sessionContext;
  const gitStatus = session.gitStatus;
  const isProject = !!session.isMainRepo;
  const latestSnapshot = snapshots[0] ?? null;
  const defaultSnapshotName = interpolateTranslation(t('detailPanel.snapshots.defaultName'), {
    count: snapshots.length + 1,
  });
  const selectedSnapshot =
    (selectedSnapshotId && snapshots.find((snapshot) => snapshot.id === selectedSnapshotId)) ?? null;
  const restorePreview = selectedSnapshot
    ? buildWorkspaceSnapshotRestorePreview(selectedSnapshot, sessionPanels)
    : null;
  // Treat git as unavailable only when status has loaded but indicates failure.
  // gitStatus is undefined while still loading — don't hide UI in that window.
  // state === 'unknown' means the git status fetch completed but git commands failed;
  // if it's a transient failure, the next poll cycle will recover and update the state.
  const gitUnavailable = isProject && gitStatus?.state === 'unknown';

  const openSaveSnapshotDialog = () => {
    setSnapshotName(defaultSnapshotName);
    setSnapshotDialogMode('save');
  };

  const openRestoreSnapshotDialog = () => {
    setSelectedSnapshotId(snapshots[0]?.id ?? null);
    setSnapshotDialogMode('restore');
  };

  const handleSaveSnapshot = () => {
    if (supportedSnapshotPanels.length === 0) {
      return;
    }

    const createdSnapshot = createAndStoreWorkspaceSnapshot({
      sessionId: session.id,
      workspaceStorageKey,
      projectId: session.projectId,
      projectName: sessionContext.projectName,
      workspaceName: session.name,
      worktreePath: session.worktreePath,
      name: snapshotName.trim() || defaultSnapshotName,
      kind: 'manual',
      panels: supportedSnapshotPanels,
      activePanelId,
      layout: workspaceLayoutState,
    });

    syncSnapshots(createdSnapshot.id);
    setSnapshotDialogMode(null);
  };

  const handleRestoreSnapshot = async (snapshot: WorkspaceSnapshotRecord) => {
    if (supportedSnapshotPanels.length > 0) {
      createAndStoreWorkspaceSnapshot({
        sessionId: session.id,
        workspaceStorageKey,
        projectId: session.projectId,
        projectName: sessionContext.projectName,
        workspaceName: session.name,
        worktreePath: session.worktreePath,
        name: interpolateTranslation(t('detailPanel.snapshots.beforeRestoreName'), {
          name: snapshot.name,
        }),
        kind: 'auto_before_restore',
        panels: supportedSnapshotPanels,
        activePanelId,
        layout: workspaceLayoutState,
      });
    }

    const initialRestorePreview = buildWorkspaceSnapshotRestorePreview(snapshot, sessionPanels);
    const restoredPanelsBySnapshotId = new Map<string, (typeof sessionPanels)[number]>();

    for (const missingPanel of initialRestorePreview.missingPanels) {
      const restoredPanel = await panelApi.createPanel({
        sessionId: session.id,
        type: missingPanel.type,
        title: missingPanel.title,
      });
      restoredPanelsBySnapshotId.set(missingPanel.panelId, restoredPanel);
    }

    const nextRestorePreview = buildWorkspaceSnapshotRestorePreview(snapshot, sessionPanels, {
      restoredPanelsBySnapshotId,
    });

    await Promise.all(
      nextRestorePreview.targetPanels.map((panel, index) =>
        panelApi.updatePanel(panel.id, {
          title: panel.title,
          metadata: {
            ...panel.metadata,
            position: index,
          },
        }),
      ),
    );

    if (nextRestorePreview.targetActivePanelId) {
      await panelApi.setActivePanel(session.id, nextRestorePreview.targetActivePanelId);
    }

    const syncedPanels = await panelApi.loadPanelsForSession(session.id);
    const orderedPanels = [...syncedPanels].sort(
      (left, right) => (left.metadata?.position ?? 0) - (right.metadata?.position ?? 0),
    );

    setPanels(session.id, orderedPanels);

    if (nextRestorePreview.targetActivePanelId) {
      setActivePanelInStore(session.id, nextRestorePreview.targetActivePanelId);
    }

    onRestoreWorkspaceLayoutState(nextRestorePreview.targetLayoutState);
    syncSnapshots(snapshot.id);
    setSnapshotDialogMode(null);
  };

  const handleDeleteSnapshot = (snapshot: WorkspaceSnapshotRecord) => {
    const confirmed = window.confirm(
      interpolateTranslation(t('detailPanel.snapshots.deleteConfirm'), {
        name: snapshot.name,
      }),
    );

    if (!confirmed) {
      return;
    }

    const deleted = deleteWorkspaceSnapshot(workspaceStorageKey, snapshot.id);

    if (!deleted) {
      return;
    }

    const preferredSnapshotId =
      selectedSnapshotId === snapshot.id ? null : undefined;

    syncSnapshots(preferredSnapshotId);
  };

  return (
    <div
      className="flex-shrink-0 min-w-0 border-l border-border-primary bg-surface-primary flex flex-col overflow-hidden relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 w-1 h-full cursor-col-resize group z-10"
        onMouseDown={onResize}
      >
        <div className="absolute inset-0 group-hover:bg-interactive transition-colors" />
      </div>

      {/* Fixed top sections — never scroll */}
      <div className="flex-shrink-0 overflow-hidden">
        {/* Branch name — standalone header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-primary min-w-0">
          <GitBranch className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-sm text-text-primary font-medium truncate">
              {(gitCommands?.currentBranch?.trim()) || session.baseBranch?.replace(/^origin\//, '') || t('detailPanel.branch.unknown')}
            </span>
            {session.baseBranch && gitCommands?.currentBranch &&
             gitCommands.currentBranch !== session.baseBranch.replace(/^origin\//, '') && (
              <span className="text-xs text-text-tertiary truncate">
                {interpolateTranslation(t('detailPanel.branch.from'), {
                  branch: session.baseBranch.replace(/^origin\//, ''),
                })}
              </span>
            )}
          </span>
        </div>

        {/* Changes — worktree sessions only */}
        {!isProject && gitStatus && (
          <DetailSection title={t('detailPanel.section.changes')}>
            <div className="space-y-1 text-sm px-1">
              {gitStatus.ahead != null && gitStatus.ahead > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>{t('detailPanel.changes.commitsAhead')}</span>
                  <span className="text-status-success font-medium">{gitStatus.ahead}</span>
                </div>
              )}
              {gitStatus.behind != null && gitStatus.behind > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>{t('detailPanel.changes.commitsBehind')}</span>
                  <span className="text-status-warning font-medium">{gitStatus.behind}</span>
                </div>
              )}
              {gitStatus.hasUncommittedChanges && gitStatus.filesChanged != null && gitStatus.filesChanged > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>{t('detailPanel.changes.uncommittedFiles')}</span>
                  <span className="text-status-info font-medium">{gitStatus.filesChanged}</span>
                </div>
              )}
              {(!gitStatus.ahead || gitStatus.ahead === 0) &&
               (!gitStatus.behind || gitStatus.behind === 0) &&
               !gitStatus.hasUncommittedChanges && (
                <div className="text-text-tertiary text-xs">{t('detailPanel.changes.none')}</div>
              )}
            </div>
          </DetailSection>
        )}

        {/* Branch actions */}
        {((!isProject && (onSetTracking || onOpenIDEWithCommand)) || (isProject && onOpenIDEWithCommand)) && (
          <DetailSection title={t('detailPanel.section.branch')}>
            <div className="space-y-0.5">
              {!gitUnavailable && onSetTracking && (
                <Tooltip content={t('detailPanel.actions.setTrackingTooltip')} side="left">
                  <Button variant="ghost" size="sm" className={sidebarBtn} onClick={onSetTracking} disabled={isMerging}>
                    <Link className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="flex flex-col items-start leading-tight min-w-0">
                      <span>{t('detailPanel.actions.setTracking')}</span>
                      {trackingBranch && (
                        <span className="text-xs text-text-tertiary truncate max-w-full">
                          {trackingBranch}
                        </span>
                      )}
                    </span>
                  </Button>
                </Tooltip>
              )}
              {onOpenIDEWithCommand && (
                <Dropdown
                  trigger={
                    <Button variant="ghost" size="sm" className={sidebarBtn}>
                      <Code2 className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{t('detailPanel.actions.openInIde')}</span>
                    </Button>
                  }
                  items={ideItems}
                  footer={
                    <DropdownMenuItem
                      icon={Settings}
                      label={t('detailPanel.actions.configure')}
                      onClick={onConfigureIDE}
                    />
                  }
                  position="auto"
                  width="sm"
                />
              )}
            </div>
          </DetailSection>
        )}

        {/* Merge error */}
        {mergeError && (
          <div className="px-2 py-2 border-b border-border-primary">
            <div className="p-2 bg-status-error/10 border border-status-error/30 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0 mt-0.5" />
                <p className="text-xs text-status-error">{mergeError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Git actions */}
        {gitUnavailable ? (
          <div className="px-3 py-4 border-b border-border-primary">
            <p className="text-xs text-text-tertiary">
              {t('detailPanel.gitUnavailable')}
            </p>
          </div>
        ) : (
        <DetailSection title={t('detailPanel.section.actions')}>
          <div className="space-y-0.5">
            {/* Worktree actions — ordered by workflow */}
            {!isProject && (() => {
              const byId = (id: string) => gitBranchActions?.find(a => a.id === id);
              const behindCount = gitStatus?.behind ?? 0;
              const aheadCount = gitStatus?.ahead ?? 0;
              const fetchedAgo = gitStatus?.lastChecked ? formatTimeAgo(gitStatus.lastChecked, t) : null;

              // Paired buttons rendered side-by-side
              const pairedIds = new Set(['pull', 'push', 'stash', 'stash-pop', 'rebase-from-main', 'rebase-to-main', 'fetch', 'commit']);

              // Layout: each entry is either a single action or a paired row
              type Row = { type: 'single'; action: NonNullable<typeof gitBranchActions>[number] }
                       | { type: 'pair'; left: NonNullable<typeof gitBranchActions>[number]; right: NonNullable<typeof gitBranchActions>[number] };
              const rows: Row[] = [];

              if (gitBranchActions) {
                for (let i = 0; i < gitBranchActions.length; i++) {
                  const action = gitBranchActions[i];
                  if (pairedIds.has(action.id)) {
                    // Fetch + Commit pair
                    if (action.id === 'fetch') {
                      const commit = byId('commit');
                      if (commit) { rows.push({ type: 'pair', left: action, right: commit }); continue; }
                    }
                    // Stash + Pop pair
                    if (action.id === 'stash') {
                      const pop = byId('stash-pop');
                      if (pop) { rows.push({ type: 'pair', left: action, right: pop }); continue; }
                    }
                    // Pull + Push pair
                    if (action.id === 'pull') {
                      const push = byId('push');
                      if (push) { rows.push({ type: 'pair', left: action, right: push }); continue; }
                    }
                    // Rebase + Merge pair
                    if (action.id === 'rebase-from-main') {
                      const merge = byId('rebase-to-main');
                      if (merge) { rows.push({ type: 'pair', left: action, right: merge }); continue; }
                    }
                    // Skip partners (they were already included in the pair above)
                    if (action.id === 'commit' || action.id === 'stash-pop' || action.id === 'push' || action.id === 'rebase-to-main') continue;
                  }
                  rows.push({ type: 'single', action });
                }
              }

              return rows.map(row => {
                if (row.type === 'pair') {
                  const { left, right } = row;
                  // Badge for pull/push
                  const leftBadge = left.id === 'pull' && behindCount > 0
                    ? <span className="text-[10px] text-status-warning font-medium ml-1">&darr;{behindCount}</span> : null;
                  const rightBadge = right.id === 'push' && aheadCount > 0
                    ? <span className="text-[10px] text-status-success font-medium ml-1">&uarr;{aheadCount}</span> : null;

                  const isRebaseMerge = left.id === 'rebase-from-main';
                  const mainBranchRaw = gitCommands?.mainBranch || 'main';
                  const mainBranch = mainBranchRaw.length > 6 ? mainBranchRaw.slice(0, 6) + '…' : mainBranchRaw;

                  const pairBtnClass = isRebaseMerge
                    ? 'flex-1 justify-start text-xs !px-2'
                    : 'flex-1 justify-start text-sm !px-2';
                  const pairIconClass = isRebaseMerge
                    ? 'w-3.5 h-3.5 mr-1 flex-shrink-0'
                    : 'w-4 h-4 mr-2 flex-shrink-0';

                  return (
                    <div key={`${left.id}-${right.id}`} className="flex gap-0.5 [&>*]:min-w-[90px]">
                      <Tooltip content={left.description} side="left">
                        <Button variant="ghost" size="sm" className={pairBtnClass} onClick={left.onClick} disabled={left.disabled || isMerging}>
                          <left.icon className={pairIconClass} />
                          {isRebaseMerge ? (
                            <span className="flex flex-col items-start leading-tight">
                              <span>{t('detailPanel.actions.rebase')}</span>
                              <span className="text-[10px] text-text-tertiary">
                                {interpolateTranslation(t('detailPanel.actions.fromShort'), { branch: mainBranch })}
                              </span>
                            </span>
                          ) : left.id === 'fetch' && fetchedAgo ? (
                            <span className="flex flex-col items-start leading-tight min-w-0">
                              <span>{left.label}</span>
                              <span className="text-[10px] text-text-tertiary">{fetchedAgo}</span>
                            </span>
                          ) : (
                            <>
                              <span>{left.label}</span>
                              {leftBadge}
                            </>
                          )}
                        </Button>
                      </Tooltip>
                      <Tooltip content={right.description} side="left">
                        <Button variant="ghost" size="sm" className={pairBtnClass} onClick={right.onClick} disabled={right.disabled || isMerging}>
                          <right.icon className={pairIconClass} />
                          {isRebaseMerge ? (
                            <span className="flex flex-col items-start leading-tight">
                              <span>{t('detailPanel.actions.merge')}</span>
                              <span className="text-[10px] text-text-tertiary">
                                {interpolateTranslation(t('detailPanel.actions.toShort'), { branch: mainBranch })}
                              </span>
                            </span>
                          ) : right.id === 'commit' ? (
                            <span className="flex flex-col items-start leading-tight min-w-0">
                              <span>{right.label}</span>
                              <span className="text-[10px] text-text-tertiary truncate max-w-full">
                                {gitStatus?.filesChanged && gitStatus.filesChanged > 0
                                  ? interpolateTranslation(t('detailPanel.actions.fileCount'), {
                                      count: gitStatus.filesChanged,
                                      label: gitStatus.filesChanged === 1
                                        ? t('detailPanel.actions.fileLabel.one')
                                        : t('detailPanel.actions.fileLabel.other'),
                                    })
                                  : interpolateTranslation(t('detailPanel.actions.toShort'), {
                                      branch: (() => {
                                        const b = gitCommands?.currentBranch?.trim() || 'branch';
                                        return b.length > 6 ? `${b.slice(0, 6)}...` : b;
                                      })(),
                                    })}
                              </span>
                            </span>
                          ) : (
                            <>
                              <span>{right.label}</span>
                              {rightBadge}
                            </>
                          )}
                        </Button>
                      </Tooltip>
                    </div>
                  );
                }

                const { action } = row;
                const isFetch = action.id === 'fetch';

                return (
                  <Tooltip key={action.id} content={action.description} side="left">
                    <Button variant="ghost" size="sm" className={sidebarBtn} onClick={action.onClick} disabled={action.disabled || isMerging}>
                      <action.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                      {isFetch && fetchedAgo ? (
                        <span className="flex flex-col items-start leading-tight min-w-0">
                          <span>{action.label}</span>
                          <span className="text-xs text-text-tertiary">{fetchedAgo}</span>
                        </span>
                      ) : (
                        <span className="truncate">{action.label}</span>
                      )}
                    </Button>
                  </Tooltip>
                );
              });
            })()}

            {/* Project: Pull/Push */}
            {isProject && projectGitActions && (
              <>
                {projectGitActions.onPull && (
                  <Button variant="ghost" size="sm" className={sidebarBtn} onClick={projectGitActions.onPull} disabled={projectGitActions.isMerging}>
                    {t('sessionView.branchAction.pull')}
                  </Button>
                )}
                {projectGitActions.onPush && (
                  <Button variant="ghost" size="sm" className={sidebarBtn} onClick={projectGitActions.onPush} disabled={projectGitActions.isMerging}>
                    {t('sessionView.branchAction.push')}
                  </Button>
                )}
              </>
            )}
          </div>
        </DetailSection>
        )}
      </div>

      {!isProject && (
        <DetailSection title={t('detailPanel.section.snapshots')}>
          <div className="space-y-2">
            <div
              className={
                latestSnapshot ? 'grid grid-cols-3 gap-1' : 'grid grid-cols-2 gap-1'
              }
            >
              <Button
                variant="ghost"
                size="sm"
                className={sidebarBtn}
                onClick={openSaveSnapshotDialog}
                disabled={supportedSnapshotPanels.length === 0}
              >
                <Camera className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{t('detailPanel.snapshots.save')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={sidebarBtn}
                onClick={openRestoreSnapshotDialog}
                disabled={snapshots.length === 0}
              >
                <RotateCcw className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{t('detailPanel.snapshots.restore')}</span>
              </Button>
              {latestSnapshot ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${sidebarBtn} text-status-error hover:text-status-error`}
                  onClick={() => handleDeleteSnapshot(latestSnapshot)}
                >
                  <Trash2 className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{t('detailPanel.snapshots.delete')}</span>
                </Button>
              ) : null}
            </div>

            {latestSnapshot ? (
              <div className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text-primary">
                      {latestSnapshot.name}
                    </div>
                    <div className="mt-1 text-xs text-text-tertiary">
                      {formatTimeAgo(latestSnapshot.createdAt, t)}
                    </div>
                  </div>
                  <Badge
                    size="sm"
                    variant={latestSnapshot.kind === 'manual' ? 'primary' : 'info'}
                  >
                    {latestSnapshot.kind === 'manual'
                      ? t('detailPanel.snapshots.kind.manual')
                      : t('detailPanel.snapshots.kind.autoBeforeRestore')}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-secondary">
                  <span>
                    {interpolateTranslation(t('detailPanel.snapshots.panelCount'), {
                      count: latestSnapshot.panelCount,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{t('detailPanel.snapshots.latest')}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="!px-2 text-status-error hover:text-status-error"
                      onClick={() => handleDeleteSnapshot(latestSnapshot)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5 flex-shrink-0" />
                      <span>{t('detailPanel.snapshots.delete')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-1 text-xs text-text-tertiary">
                {t('detailPanel.snapshots.empty')}
              </div>
            )}
          </div>
        </DetailSection>
      )}

      {/* History — fills remaining space, only this section scrolls */}
      {!gitUnavailable && session.worktreePath && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="px-2 pt-2 flex-shrink-0">
            <SectionHeader>{t('detailPanel.section.history')}</SectionHeader>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
            <GitHistoryGraph
              sessionId={session.id}
              baseBranch={session.baseBranch || 'main'}
            />
          </div>
        </div>
      )}

      <WorkspaceSnapshotDialog
        isOpen={snapshotDialogMode !== null}
        mode={snapshotDialogMode ?? 'save'}
        workspaceName={session.name}
        currentPanels={supportedSnapshotPanels}
        activePanelId={activePanelId}
        snapshots={snapshots}
        selectedSnapshotId={selectedSnapshotId}
        snapshotName={snapshotName}
        currentLayout={workspaceLayoutState}
        restorePreview={restorePreview}
        onSnapshotNameChange={setSnapshotName}
        onSelectSnapshot={setSelectedSnapshotId}
        onSave={handleSaveSnapshot}
        onRestore={handleRestoreSnapshot}
        onDelete={handleDeleteSnapshot}
        onClose={() => setSnapshotDialogMode(null)}
      />
    </div>
  );
}
