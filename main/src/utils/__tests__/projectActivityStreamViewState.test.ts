import { describe, expect, it } from 'vitest';
import type { Session } from '../../../../frontend/src/types/session';
import type { ProjectActivityStreamEntry } from '../../../../UpdateWuruize/frontend/ProjectActivityStreamDemoState';
import { deriveProjectActivityStreamViews } from '../../../../UpdateWuruize/frontend/ProjectActivityStreamViewState';

function createSession(overrides: Partial<Session> & Pick<Session, 'id' | 'name'>): Session {
  return {
    id: overrides.id,
    name: overrides.name,
    worktreePath: overrides.worktreePath ?? `D:/workspaces/${overrides.id}`,
    prompt: overrides.prompt ?? 'Implement feature',
    status: overrides.status ?? 'running',
    statusMessage: overrides.statusMessage,
    pid: overrides.pid,
    createdAt: overrides.createdAt ?? '2026-04-22T08:00:00.000Z',
    lastActivity: overrides.lastActivity ?? '2026-04-22T08:05:00.000Z',
    output: overrides.output ?? [],
    jsonMessages: overrides.jsonMessages ?? [],
    error: overrides.error,
    isRunning: overrides.isRunning,
    lastViewedAt: overrides.lastViewedAt,
    projectId: overrides.projectId,
    folderId: overrides.folderId,
    permissionMode: overrides.permissionMode,
    runStartedAt: overrides.runStartedAt,
    isMainRepo: overrides.isMainRepo,
    displayOrder: overrides.displayOrder,
    isFavorite: overrides.isFavorite,
    autoCommit: overrides.autoCommit,
    toolType: overrides.toolType ?? 'claude',
    archived: overrides.archived,
    gitStatus: overrides.gitStatus,
    baseCommit: overrides.baseCommit,
    baseBranch: overrides.baseBranch,
    commitMode: overrides.commitMode,
    commitModeSettings: overrides.commitModeSettings,
  };
}

function createEntry(
  overrides: Partial<ProjectActivityStreamEntry> & Pick<ProjectActivityStreamEntry, 'id' | 'sessionId' | 'workspaceLabel'>,
): ProjectActivityStreamEntry {
  return {
    id: overrides.id,
    sessionId: overrides.sessionId,
    workspaceLabel: overrides.workspaceLabel,
    branchName: overrides.branchName ?? 'feat/stream',
    runtimeStatus: overrides.runtimeStatus ?? 'running',
    hasUncommittedChanges: overrides.hasUncommittedChanges ?? false,
    isStale: overrides.isStale ?? false,
    createdAt: overrides.createdAt ?? '2026-04-22T08:10:00.000Z',
    source: overrides.source ?? 'status',
    event: overrides.event ?? 'runtime_status_changed',
    summaryText: overrides.summaryText ?? null,
    agentLabel: overrides.agentLabel ?? 'Claude CLI',
  };
}

describe('deriveProjectActivityStreamViews', () => {
  it('keeps heartbeats in raw stream but removes them from semantic stream', () => {
    const rawEntry = createEntry({
      id: 'entry-status',
      sessionId: 'workspace-a',
      workspaceLabel: 'impl-api',
      source: 'status',
      event: 'runtime_status_changed',
    });

    const heartbeatEntry = createEntry({
      id: 'entry-heartbeat',
      sessionId: 'workspace-a',
      workspaceLabel: 'impl-api',
      source: 'heartbeat',
      event: 'workspace_heartbeat',
      createdAt: '2026-04-22T08:11:00.000Z',
    });

    const views = deriveProjectActivityStreamViews({
      entries: [heartbeatEntry, rawEntry],
      visibleWorkspaceRows: [
        {
          sessionId: 'workspace-a',
          workspaceLabel: 'impl-api',
          pathLabel: 'D:/workspaces/impl-api',
          branchName: 'feat/stream',
          runtimeStatus: 'running',
          hasUncommittedChanges: false,
          isStale: false,
        },
      ],
      sessions: [createSession({ id: 'workspace-a', name: 'impl-api' })],
    });

    expect(views.rawEntries).toHaveLength(2);
    expect(views.semanticEntries).toHaveLength(1);
    expect(views.semanticEntries[0]?.source).toBe('status');
  });

  it('builds summary cards for every visible workspace and prefers structured summaries', () => {
    const views = deriveProjectActivityStreamViews({
      entries: [
        createEntry({
          id: 'entry-heartbeat',
          sessionId: 'workspace-a',
          workspaceLabel: 'impl-api',
          source: 'heartbeat',
          event: 'workspace_heartbeat',
          createdAt: '2026-04-22T08:12:00.000Z',
        }),
        createEntry({
          id: 'entry-status',
          sessionId: 'workspace-a',
          workspaceLabel: 'impl-api',
          source: 'status',
          event: 'git_state_changed',
          hasUncommittedChanges: true,
          createdAt: '2026-04-22T08:10:00.000Z',
        }),
      ],
      visibleWorkspaceRows: [
        {
          sessionId: 'workspace-a',
          workspaceLabel: 'impl-api',
          pathLabel: 'D:/workspaces/impl-api',
          branchName: 'feat/stream',
          runtimeStatus: 'running',
          hasUncommittedChanges: true,
          isStale: false,
          lastActivity: '2026-04-22T08:12:00.000Z',
        },
        {
          sessionId: 'workspace-b',
          workspaceLabel: 'review-ui',
          pathLabel: 'D:/workspaces/review-ui',
          branchName: 'feat/review',
          runtimeStatus: 'waiting',
          hasUncommittedChanges: false,
          isStale: false,
          createdAt: '2026-04-22T08:01:00.000Z',
        },
      ],
      sessions: [
        createSession({
          id: 'workspace-a',
          name: 'impl-api',
          jsonMessages: [
            {
              type: 'assistant',
              timestamp: '2026-04-22T08:11:30.000Z',
              summary: 'Finished the first API pass and is ready for review.',
            },
          ],
        }),
        createSession({
          id: 'workspace-b',
          name: 'review-ui',
          status: 'waiting',
        }),
      ],
    });

    expect(views.summaryCards).toHaveLength(2);
    expect(views.summaryCards[0]).toMatchObject({
      sessionId: 'workspace-a',
      latestSignal: 'summary',
      latestSummary: 'Finished the first API pass and is ready for review.',
    });
    expect(views.summaryCards[0]?.latestSemanticEntry?.id).toBe('entry-status');
    expect(views.summaryCards[1]).toMatchObject({
      sessionId: 'workspace-b',
      latestSignal: 'none',
      latestSummary: null,
    });
  });
});
