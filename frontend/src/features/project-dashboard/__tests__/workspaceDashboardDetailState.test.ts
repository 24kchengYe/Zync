import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceActivityItems,
  buildWorkspaceDetailModel,
  getActivityAgentLabel,
  getLatestSessionSummary,
  resolveSelectedWorkspaceId,
  type WorkspaceDashboardRowLike,
} from '../workspaceDashboardDetailState';
import type { Session } from '../../../types/session';

function createWorkspaceRow(
  overrides: Partial<WorkspaceDashboardRowLike> & Pick<WorkspaceDashboardRowLike, 'sessionId' | 'workspaceLabel'>,
): WorkspaceDashboardRowLike {
  return {
    sessionId: overrides.sessionId,
    workspaceLabel: overrides.workspaceLabel,
    branchName: overrides.branchName ?? `feat/${overrides.workspaceLabel}`,
    worktreePath: overrides.worktreePath ?? `D:/VibeCoding/Zync/workspaces/${overrides.workspaceLabel}`,
    baseCommit: overrides.baseCommit ?? '1234567890abcdef',
    baseBranch: overrides.baseBranch ?? 'origin/main',
    runtimeStatus: overrides.runtimeStatus ?? 'running',
    lastActivity: overrides.lastActivity ?? '2026-04-21T08:00:00.000Z',
    createdAt: overrides.createdAt ?? '2026-04-21T07:00:00.000Z',
    hasUncommittedChanges: overrides.hasUncommittedChanges ?? false,
    commitsAhead: overrides.commitsAhead ?? 0,
    commitsBehind: overrides.commitsBehind ?? 0,
    isStale: overrides.isStale ?? false,
    staleSince: overrides.staleSince,
    pullRequest: overrides.pullRequest,
  };
}

function createSession(
  overrides: Partial<Session> & Pick<Session, 'id' | 'name'>,
): Session {
  return {
    id: overrides.id,
    name: overrides.name,
    worktreePath: overrides.worktreePath ?? `D:/VibeCoding/Zync/workspaces/${overrides.name}`,
    prompt: overrides.prompt ?? '',
    status: overrides.status ?? 'running',
    statusMessage: overrides.statusMessage,
    pid: overrides.pid,
    createdAt: overrides.createdAt ?? '2026-04-21T07:00:00.000Z',
    lastActivity: overrides.lastActivity ?? '2026-04-21T08:00:00.000Z',
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
    toolType: overrides.toolType,
    archived: overrides.archived,
    gitStatus: overrides.gitStatus,
    baseCommit: overrides.baseCommit,
    baseBranch: overrides.baseBranch,
    commitMode: overrides.commitMode,
    commitModeSettings: overrides.commitModeSettings,
  };
}

describe('resolveSelectedWorkspaceId', () => {
  const rows = [
    createWorkspaceRow({ sessionId: 'workspace-main', workspaceLabel: 'Main workspace' }),
    createWorkspaceRow({ sessionId: 'workspace-a', workspaceLabel: 'planner-a' }),
    createWorkspaceRow({ sessionId: 'workspace-b', workspaceLabel: 'planner-b' }),
  ];

  it('defaults to the first visible workspace when there is no existing selection', () => {
    expect(
      resolveSelectedWorkspaceId({
        visibleWorkspaceIds: rows.map((row) => row.sessionId),
        previousSelectedWorkspaceId: null,
      }),
    ).toBe('workspace-main');
  });

  it('preserves the previous selection when it is still visible', () => {
    expect(
      resolveSelectedWorkspaceId({
        visibleWorkspaceIds: rows.map((row) => row.sessionId),
        previousSelectedWorkspaceId: 'workspace-a',
      }),
    ).toBe('workspace-a');
  });

  it('falls back to the first filtered workspace when the previous selection is hidden', () => {
    expect(
      resolveSelectedWorkspaceId({
        visibleWorkspaceIds: ['workspace-b'],
        previousSelectedWorkspaceId: 'workspace-a',
      }),
    ).toBe('workspace-b');
  });

  it('prefers newly created workspace ids when they are visible', () => {
    expect(
      resolveSelectedWorkspaceId({
        visibleWorkspaceIds: rows.map((row) => row.sessionId),
        previousSelectedWorkspaceId: 'workspace-main',
        preferredWorkspaceIds: ['workspace-b', 'workspace-a'],
      }),
    ).toBe('workspace-b');
  });

  it('returns null when there are no visible workspaces', () => {
    expect(
      resolveSelectedWorkspaceId({
        visibleWorkspaceIds: [],
        previousSelectedWorkspaceId: 'workspace-main',
      }),
    ).toBeNull();
  });
});

describe('workspace detail helpers', () => {
  it('reads the latest real summary before falling back to the status message', () => {
    const withSummary = createSession({
      id: 'workspace-a',
      name: 'planner-a',
      statusMessage: 'Still running verification',
      jsonMessages: [
        {
          type: 'assistant',
          timestamp: '2026-04-21T08:00:00.000Z',
          summary: 'Compared two implementation branches and recommended route B.',
        },
      ],
    });

    const withoutSummary = createSession({
      id: 'workspace-b',
      name: 'planner-b',
      statusMessage: 'Waiting for next prompt',
    });

    expect(getLatestSessionSummary(withSummary)).toBe(
      'Compared two implementation branches and recommended route B.',
    );
    expect(getLatestSessionSummary(withoutSummary)).toBe('Waiting for next prompt');
  });

  it('derives a stable agent label from the session metadata', () => {
    expect(
      getActivityAgentLabel(
        createSession({
          id: 'claude-1',
          name: 'planner-a',
          toolType: 'claude',
        }),
      ),
    ).toBe('Claude CLI');

    expect(
      getActivityAgentLabel(
        createSession({
          id: 'codex-1',
          name: 'codex-reviewer',
        }),
      ),
    ).toBe('Codex CLI');

    expect(
      getActivityAgentLabel(
        createSession({
          id: 'agent-1',
          name: 'generic-agent',
        }),
      ),
    ).toBe('Agent CLI');
  });

  it('builds a detail model that keeps main workspace semantics and merged metadata', () => {
    const row = createWorkspaceRow({
      sessionId: 'workspace-main',
      workspaceLabel: 'Main workspace',
      branchName: 'main',
      worktreePath: 'D:/VibeCoding/Zync',
      baseBranch: 'origin/main',
      runtimeStatus: 'ready',
      commitsAhead: 2,
      hasUncommittedChanges: true,
    });

    const session = createSession({
      id: 'workspace-main',
      name: 'Main workspace',
      isMainRepo: true,
      status: 'ready',
      statusMessage: 'Supervisor is monitoring this repo.',
      lastActivity: '2026-04-21T08:30:00.000Z',
      createdAt: '2026-04-21T07:00:00.000Z',
      jsonMessages: [
        {
          type: 'assistant',
          timestamp: '2026-04-21T08:20:00.000Z',
          summary: 'Summarized recent repo status and queued follow-up review.',
        },
      ],
    });

    const detail = buildWorkspaceDetailModel(row, session);

    expect(detail).toMatchObject({
      sessionId: 'workspace-main',
      workspaceLabel: 'Main workspace',
      workspaceType: 'main',
      worktreePath: 'D:/VibeCoding/Zync',
      branchName: 'main',
      baseBranch: 'origin/main',
      runtimeStatus: 'ready',
      hasUncommittedChanges: true,
      latestSummary: 'Summarized recent repo status and queued follow-up review.',
      statusMessage: 'Supervisor is monitoring this repo.',
      lastActivity: '2026-04-21T08:30:00.000Z',
    });
  });

  it('builds workspace activity items with summary, runtime, and git signals', () => {
    const row = createWorkspaceRow({
      sessionId: 'workspace-a',
      workspaceLabel: 'planner-a',
      runtimeStatus: 'waiting',
      commitsAhead: 3,
      commitsBehind: 1,
      hasUncommittedChanges: true,
      isStale: true,
      staleSince: '2026-04-21T06:30:00.000Z',
      pullRequest: {
        number: 42,
        title: 'Refine workspace dashboard',
        state: 'open',
        url: 'https://example.com/pr/42',
      },
    });

    const session = createSession({
      id: 'workspace-a',
      name: 'planner-a',
      status: 'waiting',
      statusMessage: 'Waiting for review feedback.',
      jsonMessages: [
        {
          type: 'assistant',
          timestamp: '2026-04-21T08:10:00.000Z',
          summary: 'Prepared the workspace detail panel and waiting for product review.',
        },
      ],
    });

    const items = buildWorkspaceActivityItems(row, session);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      id: 'summary',
      emphasis: 'primary',
      title: 'Latest summary',
      body: 'Prepared the workspace detail panel and waiting for product review.',
    });
    expect(items[1]).toMatchObject({
      id: 'runtime',
      emphasis: 'default',
      title: 'Runtime status',
      body: 'Waiting for review feedback.',
      meta: 'waiting',
    });
    expect(items[2]).toMatchObject({
      id: 'git',
      emphasis: 'warning',
      title: 'Git status',
      body: '3 ahead, 1 behind, uncommitted changes',
      meta: 'PR #42',
    });
  });
});
