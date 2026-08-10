import { afterEach, describe, expect, it } from 'vitest';
import {
  HEARTBEAT_INTERVAL_MS,
  reduceProjectActivityStreamState,
  type ProjectActivityStreamEntry,
  type ProjectActivityStreamState,
  type ProjectActivityWorkspaceState,
} from '../../../../frontend/src/ProjectActivityStreamDemoState';

const localStorageMock = (() => {
  let store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store = new Map<string, string>();
    },
  };
})();

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  configurable: true,
});

afterEach(() => {
  localStorageMock.clear();
});

function createWorkspaceState(
  overrides: Partial<ProjectActivityWorkspaceState> & Pick<ProjectActivityWorkspaceState, 'sessionId' | 'workspaceLabel'>,
): ProjectActivityWorkspaceState {
  return {
    sessionId: overrides.sessionId,
    workspaceLabel: overrides.workspaceLabel,
    branchName: overrides.branchName ?? 'feat/activity-stream',
    runtimeStatus: overrides.runtimeStatus ?? 'running',
    hasUncommittedChanges: overrides.hasUncommittedChanges ?? false,
    isStale: overrides.isStale ?? false,
    lastActivityAt: overrides.lastActivityAt ?? '2026-04-20T12:00:00.000Z',
    latestSummary: overrides.latestSummary ?? null,
    agentLabel: overrides.agentLabel ?? 'Agent CLI',
  };
}

function getLatestEntry(state: ProjectActivityStreamState): ProjectActivityStreamEntry {
  const latestEntry = state.entries[0];

  if (!latestEntry) {
    throw new Error('Expected at least one activity entry');
  }

  return latestEntry;
}

describe('reduceProjectActivityStreamState', () => {
  it('creates bootstrap entries for newly observed workspaces', () => {
    const nextState = reduceProjectActivityStreamState({
      currentState: null,
      projectKey: 'project::demo',
      now: '2026-04-20T12:00:00.000Z',
      workspaceStates: [
        createWorkspaceState({
          sessionId: 'workspace-a',
          workspaceLabel: 'impl-api',
          runtimeStatus: 'running',
        }),
      ],
    });

    expect(nextState.projectKey).toBe('project::demo');
    expect(nextState.entries).toHaveLength(1);
    expect(getLatestEntry(nextState)).toMatchObject({
      sessionId: 'workspace-a',
      workspaceLabel: 'impl-api',
      source: 'status',
      event: 'workspace_bootstrapped',
      runtimeStatus: 'running',
    });
  });

  it('prefers new real summaries over generic state-change entries when a summary arrives', () => {
    const initialState = reduceProjectActivityStreamState({
      currentState: null,
      projectKey: 'project::demo',
      now: '2026-04-20T12:00:00.000Z',
      workspaceStates: [
        createWorkspaceState({
          sessionId: 'workspace-b',
          workspaceLabel: 'tests-watch',
          runtimeStatus: 'running',
        }),
      ],
    });

    const nextState = reduceProjectActivityStreamState({
      currentState: initialState,
      projectKey: 'project::demo',
      now: '2026-04-20T12:01:00.000Z',
      workspaceStates: [
        createWorkspaceState({
          sessionId: 'workspace-b',
          workspaceLabel: 'tests-watch',
          runtimeStatus: 'waiting',
          latestSummary: 'Finished the last verification pass and is waiting for the next instruction.',
        }),
      ],
    });

    expect(nextState.entries).toHaveLength(2);
    expect(getLatestEntry(nextState)).toMatchObject({
      sessionId: 'workspace-b',
      source: 'summary',
      event: 'summary_captured',
      runtimeStatus: 'waiting',
      summaryText: 'Finished the last verification pass and is waiting for the next instruction.',
    });
  });

  it('adds heartbeat entries only after the configured cooldown has elapsed', () => {
    const initialState = reduceProjectActivityStreamState({
      currentState: null,
      projectKey: 'project::demo',
      now: '2026-04-20T12:00:00.000Z',
      workspaceStates: [
        createWorkspaceState({
          sessionId: 'workspace-c',
          workspaceLabel: 'review-ui',
          runtimeStatus: 'running',
        }),
      ],
    });

    const earlyHeartbeatState = reduceProjectActivityStreamState({
      currentState: initialState,
      projectKey: 'project::demo',
      now: '2026-04-20T12:00:03.000Z',
      heartbeatSessionId: 'workspace-c',
      workspaceStates: [
        createWorkspaceState({
          sessionId: 'workspace-c',
          workspaceLabel: 'review-ui',
          runtimeStatus: 'running',
        }),
      ],
    });

    expect(earlyHeartbeatState.entries).toHaveLength(1);

    const heartbeatState = reduceProjectActivityStreamState({
      currentState: earlyHeartbeatState,
      projectKey: 'project::demo',
      now: new Date(Date.parse('2026-04-20T12:00:00.000Z') + HEARTBEAT_INTERVAL_MS + 1000).toISOString(),
      heartbeatSessionId: 'workspace-c',
      workspaceStates: [
        createWorkspaceState({
          sessionId: 'workspace-c',
          workspaceLabel: 'review-ui',
          runtimeStatus: 'running',
        }),
      ],
    });

    expect(heartbeatState.entries).toHaveLength(2);
    expect(getLatestEntry(heartbeatState)).toMatchObject({
      sessionId: 'workspace-c',
      source: 'heartbeat',
      event: 'workspace_heartbeat',
      hasUncommittedChanges: false,
    });
  });
});
