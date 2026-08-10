import { afterEach, describe, expect, it } from 'vitest';
import type { ToolPanel } from '../../../../shared/types/panels';
import {
  buildWorkspaceSnapshotRestorePreview,
  createWorkspaceSnapshotRecord,
  createAndStoreWorkspaceSnapshot,
  getWorkspacePersistenceKey,
  loadWorkspaceSnapshots,
  type CreateWorkspaceSnapshotInput,
  type WorkspaceSnapshotRecord,
} from '../../../../frontend/src/WorkspaceSnapshotDemoState';

function createPanel(overrides: Partial<ToolPanel> & Pick<ToolPanel, 'id' | 'sessionId' | 'type' | 'title'>): ToolPanel {
  return {
    id: overrides.id,
    sessionId: overrides.sessionId,
    type: overrides.type,
    title: overrides.title,
    state: overrides.state ?? {
      isActive: false,
      hasBeenViewed: true,
      customState: {},
    },
    metadata: overrides.metadata ?? {
      createdAt: '2026-04-18T00:00:00.000Z',
      lastActiveAt: '2026-04-18T00:00:00.000Z',
      position: 0,
    },
  };
}

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

describe('buildWorkspaceSnapshotRestorePreview', () => {
  it('stores layout state when a workspace view snapshot is created', () => {
    const sessionId = 'session-layout';
    const input = {
      sessionId,
      workspaceName: 'wrz',
      name: 'Workspace View Snapshot Layout',
      kind: 'manual',
      panels: [
        createPanel({
          id: 'layout-terminal',
          sessionId,
          type: 'terminal',
          title: 'Terminal',
        }),
        createPanel({
          id: 'layout-diff',
          sessionId,
          type: 'diff',
          title: 'Diff',
          metadata: {
            createdAt: '2026-04-18T00:00:00.000Z',
            lastActiveAt: '2026-04-18T00:00:00.000Z',
            position: 1,
            permanent: true,
          },
        }),
        createPanel({
          id: 'layout-explorer',
          sessionId,
          type: 'explorer',
          title: 'Explorer',
          metadata: {
            createdAt: '2026-04-18T00:00:00.000Z',
            lastActiveAt: '2026-04-18T00:00:00.000Z',
            position: 2,
          },
        }),
      ],
      activePanelId: 'layout-diff',
      layout: {
        mode: 'quad',
        slotAssignments: {
          slot1: 'layout-diff',
          slot2: 'layout-explorer',
          slot3: 'layout-terminal',
          slot4: 'missing-slot',
        },
        splitRatio: 0.62,
        secondarySplitRatio: 0.41,
        focusSlot: 'slot2',
      },
    } as CreateWorkspaceSnapshotInput;

    const snapshot = createWorkspaceSnapshotRecord(input);

    expect(snapshot.layout).toEqual({
      mode: 'quad',
      slotAssignments: {
        slot1: 'layout-diff',
        slot2: 'layout-explorer',
        slot3: 'layout-terminal',
      },
      splitRatio: 0.62,
      secondarySplitRatio: 0.41,
      focusSlot: 'slot2',
    });
  });

  it('uses restored panel overrides for panels that were closed after the snapshot was saved', () => {
    const sessionId = 'session-1';
    const snapshot: WorkspaceSnapshotRecord = {
      id: 'snapshot-1',
      sessionId,
      workspaceName: 'wrz',
      name: 'Workspace View Snapshot 1',
      kind: 'manual',
      createdAt: '2026-04-18T00:00:00.000Z',
      activePanelId: 'snapshot-diff',
      activePanelTitle: 'Diff',
      panelCount: 3,
      layout: {
        mode: 'topBottomGrid',
        slotAssignments: {
          slot1: 'snapshot-diff',
          slot2: 'snapshot-explorer',
          slot3: 'snapshot-terminal',
        },
        splitRatio: 0.6,
        secondarySplitRatio: 0.46,
        focusSlot: 'slot2',
      },
      panels: [
        {
          panelId: 'snapshot-terminal',
          title: 'Terminal 2',
          type: 'terminal',
          orderIndex: 0,
          position: 0,
        },
        {
          panelId: 'snapshot-explorer',
          title: 'Explorer 2',
          type: 'explorer',
          orderIndex: 1,
          position: 1,
        },
        {
          panelId: 'snapshot-diff',
          title: 'Diff',
          type: 'diff',
          orderIndex: 2,
          position: 2,
        },
      ],
    };

    const currentPanels: ToolPanel[] = [
      createPanel({
        id: 'snapshot-diff',
        sessionId,
        type: 'diff',
        title: 'Diff',
        metadata: {
          createdAt: '2026-04-18T00:00:00.000Z',
          lastActiveAt: '2026-04-18T00:00:00.000Z',
          position: 0,
          permanent: true,
        },
      }),
      createPanel({
        id: 'logs-panel',
        sessionId,
        type: 'logs',
        title: 'Logs',
        metadata: {
          createdAt: '2026-04-18T00:00:00.000Z',
          lastActiveAt: '2026-04-18T00:00:00.000Z',
          position: 1,
        },
      }),
    ];

    const restoredPanelsBySnapshotId = new Map<string, ToolPanel>([
      [
        'snapshot-terminal',
        createPanel({
          id: 'restored-terminal',
          sessionId,
          type: 'terminal',
          title: 'Terminal 2',
          metadata: {
            createdAt: '2026-04-18T00:00:00.000Z',
            lastActiveAt: '2026-04-18T00:00:00.000Z',
            position: 3,
          },
        }),
      ],
      [
        'snapshot-explorer',
        createPanel({
          id: 'restored-explorer',
          sessionId,
          type: 'explorer',
          title: 'Explorer 2',
          metadata: {
            createdAt: '2026-04-18T00:00:00.000Z',
            lastActiveAt: '2026-04-18T00:00:00.000Z',
            position: 4,
          },
        }),
      ],
    ]);

    const preview = buildWorkspaceSnapshotRestorePreview(snapshot, currentPanels, {
      restoredPanelsBySnapshotId,
    });

    expect(preview.missingPanels).toHaveLength(0);
    expect(preview.targetPanels.map((panel) => panel.id)).toEqual([
      'restored-terminal',
      'restored-explorer',
      'snapshot-diff',
      'logs-panel',
    ]);
    expect(preview.targetActivePanelId).toBe('snapshot-diff');
    expect(preview.targetLayoutState).toEqual({
      mode: 'topBottomGrid',
      slotAssignments: {
        slot1: 'snapshot-diff',
        slot2: 'restored-explorer',
        slot3: 'restored-terminal',
      },
      splitRatio: 0.6,
      secondarySplitRatio: 0.46,
      focusSlot: 'slot2',
    });
  });

  it('restores snapshot panels by semantic match when current panel ids have changed', () => {
    const snapshot: WorkspaceSnapshotRecord = {
      id: 'snapshot-semantic',
      sessionId: 'session-old',
      workspaceName: 'main',
      name: 'Workspace View Snapshot Semantic',
      kind: 'manual',
      createdAt: '2026-04-18T00:00:00.000Z',
      activePanelId: 'old-diff',
      activePanelTitle: 'Diff',
      panelCount: 3,
      layout: {
        mode: 'topBottomGrid',
        slotAssignments: {
          slot1: 'old-explorer',
          slot2: 'old-diff',
          slot3: 'old-terminal',
        },
        splitRatio: 0.57,
        secondarySplitRatio: 0.38,
        focusSlot: 'slot2',
      },
      panels: [
        {
          panelId: 'old-explorer',
          title: 'Explorer',
          type: 'explorer',
          orderIndex: 0,
          position: 0,
        },
        {
          panelId: 'old-diff',
          title: 'Diff',
          type: 'diff',
          orderIndex: 1,
          position: 1,
        },
        {
          panelId: 'old-terminal',
          title: 'Terminal',
          type: 'terminal',
          orderIndex: 2,
          position: 2,
        },
      ],
    };

    const currentPanels: ToolPanel[] = [
      createPanel({
        id: 'new-explorer',
        sessionId: 'session-new',
        type: 'explorer',
        title: 'Explorer',
      }),
      createPanel({
        id: 'new-diff',
        sessionId: 'session-new',
        type: 'diff',
        title: 'Diff',
      }),
      createPanel({
        id: 'new-terminal',
        sessionId: 'session-new',
        type: 'terminal',
        title: 'Terminal',
      }),
    ];

    const preview = buildWorkspaceSnapshotRestorePreview(snapshot, currentPanels);

    expect(preview.missingPanels).toHaveLength(0);
    expect(preview.targetActivePanelId).toBe('new-diff');
    expect(preview.targetLayoutState).toEqual({
      mode: 'topBottomGrid',
      slotAssignments: {
        slot1: 'new-explorer',
        slot2: 'new-diff',
        slot3: 'new-terminal',
      },
      splitRatio: 0.57,
      secondarySplitRatio: 0.38,
      focusSlot: 'slot2',
    });
  });
});

describe('workspace snapshot persistence', () => {
  it('stores snapshots under a stable workspace key so they survive session recreation', () => {
    const workspaceKey = getWorkspacePersistenceKey({
      sessionId: 'session-new',
      projectId: 3,
      workspaceName: 'main',
      worktreePath: 'D:\\D\\worktrees\\main',
    });

    createAndStoreWorkspaceSnapshot({
      workspaceStorageKey: workspaceKey,
      sessionId: 'session-old',
      projectId: 3,
      projectName: 'wrz',
      workspaceName: 'main',
      worktreePath: 'D:\\D\\worktrees\\main',
      name: 'Workspace View Snapshot 1',
      kind: 'manual',
      panels: [
        createPanel({
          id: 'panel-terminal',
          sessionId: 'session-old',
          type: 'terminal',
          title: 'Terminal',
        }),
      ],
      activePanelId: 'panel-terminal',
      layout: {
        mode: 'single',
        slotAssignments: {
          slot1: 'panel-terminal',
        },
        splitRatio: 0.5,
        secondarySplitRatio: 0.5,
        focusSlot: 'slot1',
      },
    });

    const loaded = loadWorkspaceSnapshots(workspaceKey, {
      legacyStorageKeys: ['session-old'],
      projectId: 3,
      workspaceName: 'main',
      worktreePath: 'D:\\D\\worktrees\\main',
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.name).toBe('Workspace View Snapshot 1');
  });

  it('can migrate legacy session-bound snapshots to the stable workspace key by workspace metadata', () => {
    const workspaceKey = getWorkspacePersistenceKey({
      sessionId: 'session-new',
      projectId: 3,
      workspaceName: 'main',
      worktreePath: 'D:\\D\\worktrees\\main',
    });

    localStorageMock.setItem(
      'zync-workspace-snapshots-demo-v1',
      JSON.stringify({
        'session-old': [
          {
            id: 'snapshot-legacy',
            sessionId: 'session-old',
            projectId: 3,
            projectName: 'wrz',
            workspaceName: 'main',
            name: 'Legacy Snapshot',
            kind: 'manual',
            createdAt: '2026-04-18T00:00:00.000Z',
            activePanelId: 'old-terminal',
            activePanelTitle: 'Terminal',
            panelCount: 1,
            layout: {
              mode: 'single',
              slotAssignments: {
                slot1: 'old-terminal',
              },
              splitRatio: 0.5,
              secondarySplitRatio: 0.5,
              focusSlot: 'slot1',
            },
            panels: [
              {
                panelId: 'old-terminal',
                title: 'Terminal',
                type: 'terminal',
                orderIndex: 0,
                position: 0,
              },
            ],
          },
        ],
      }),
    );

    const loaded = loadWorkspaceSnapshots(workspaceKey, {
      legacyStorageKeys: ['session-old'],
      projectId: 3,
      projectName: 'wrz',
      workspaceName: 'main',
      worktreePath: 'D:\\D\\worktrees\\main',
    });

    expect(loaded.map((snapshot) => snapshot.name)).toEqual(['Legacy Snapshot']);
  });
});
