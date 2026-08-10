import { afterEach, describe, expect, it } from 'vitest';
import type { ToolPanel } from '../../../../shared/types/panels';
import {
  getWorkspacePersistenceKey,
  loadWorkspaceLayoutDemoState,
  getWorkspaceLayoutFocusSlots,
  normalizeWorkspaceLayoutDemoState,
  saveWorkspaceLayoutDemoState,
  type WorkspaceLayoutDemoState,
} from '../../../../frontend/src/WorkspaceLayoutDemoState';

function createPanel(
  overrides: Partial<ToolPanel> & Pick<ToolPanel, 'id' | 'sessionId' | 'type' | 'title'>,
): ToolPanel {
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

describe('normalizeWorkspaceLayoutDemoState', () => {
  it('normalizes slot assignments for grid layouts and keeps the focused slot when it is visible', () => {
    const panels: ToolPanel[] = [
      createPanel({
        id: 'panel-a',
        sessionId: 'session-1',
        type: 'explorer',
        title: 'Explorer',
      }),
      createPanel({
        id: 'panel-b',
        sessionId: 'session-1',
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
        id: 'panel-c',
        sessionId: 'session-1',
        type: 'dashboard',
        title: 'Status Panel',
        metadata: {
          createdAt: '2026-04-18T00:00:00.000Z',
          lastActiveAt: '2026-04-18T00:00:00.000Z',
          position: 2,
        },
      }),
    ];

    const normalized = normalizeWorkspaceLayoutDemoState(
      {
        mode: 'topBottomGrid',
        slotAssignments: {
          slot1: 'missing-panel',
          slot2: 'panel-b',
          slot3: 'panel-b',
          slot4: 'panel-c',
        },
        splitRatio: 0.92,
        focusSlot: 'slot3',
      },
      'panel-a',
      panels,
    );

    expect(normalized.slotAssignments).toEqual({
      slot1: 'panel-a',
      slot2: 'panel-b',
      slot3: 'panel-c',
    });
    expect(normalized.splitRatio).toBe(0.75);
    expect(normalized.secondarySplitRatio).toBe(0.5);
    expect(normalized.focusSlot).toBe('slot3');
  });

  it('falls back to slot1 focus when the current focus slot is not visible in the active mode', () => {
    const panels: ToolPanel[] = [
      createPanel({
        id: 'panel-a',
        sessionId: 'session-2',
        type: 'explorer',
        title: 'Explorer',
      }),
    ];

    const normalized = normalizeWorkspaceLayoutDemoState(
      {
        mode: 'single',
        slotAssignments: {
          slot1: 'panel-a',
          slot2: 'panel-b',
        },
        splitRatio: 0.1,
        focusSlot: 'slot4',
      },
      'panel-a',
      panels,
    );

    expect(normalized.slotAssignments).toEqual({
      slot1: 'panel-a',
    });
    expect(normalized.splitRatio).toBe(0.25);
    expect(normalized.secondarySplitRatio).toBe(0.5);
    expect(normalized.focusSlot).toBe('slot1');
  });

  it('clamps both row and column split ratios for grid layouts', () => {
    const panels: ToolPanel[] = [
      createPanel({
        id: 'panel-a',
        sessionId: 'session-3',
        type: 'explorer',
        title: 'Explorer',
      }),
      createPanel({
        id: 'panel-b',
        sessionId: 'session-3',
        type: 'diff',
        title: 'Diff',
      }),
      createPanel({
        id: 'panel-c',
        sessionId: 'session-3',
        type: 'terminal',
        title: 'Terminal',
      }),
      createPanel({
        id: 'panel-d',
        sessionId: 'session-3',
        type: 'dashboard',
        title: 'Status Panel',
      }),
    ];

    const normalized = normalizeWorkspaceLayoutDemoState(
      {
        mode: 'quad',
        slotAssignments: {
          slot1: 'panel-a',
          slot2: 'panel-b',
          slot3: 'panel-c',
          slot4: 'panel-d',
        },
        splitRatio: 0.9,
        secondarySplitRatio: 0.1,
        focusSlot: 'slot4',
      },
      'panel-a',
      panels,
    );

    expect(normalized.splitRatio).toBe(0.75);
    expect(normalized.secondarySplitRatio).toBe(0.25);
  });
});

describe('getWorkspaceLayoutFocusSlots', () => {
  it('returns the visible slot order for quad layouts', () => {
    expect(
      getWorkspaceLayoutFocusSlots({
        mode: 'quad',
        slotAssignments: {
          slot1: 'panel-a',
          slot2: 'panel-b',
          slot3: 'panel-c',
          slot4: 'panel-d',
        },
        splitRatio: 0.58,
        secondarySplitRatio: 0.47,
        focusSlot: 'slot1',
      }),
    ).toEqual(['slot1', 'slot2', 'slot3', 'slot4']);
  });
});

describe('workspace layout persistence', () => {
  it('loads a saved layout by a stable workspace key instead of only the transient session id', () => {
    const workspaceKey = getWorkspacePersistenceKey({
      sessionId: 'session-new',
      projectId: 3,
      workspaceName: 'main',
      worktreePath: 'D:\\D\\worktrees\\main',
    });

    localStorageMock.setItem(
      'zync-workspace-layout-demo-v2',
      JSON.stringify({
        [workspaceKey]: {
          mode: 'topBottomGrid',
          slotAssignments: {
            slot1: 'panel-a',
            slot2: 'panel-b',
            slot3: 'panel-c',
          },
          splitRatio: 0.6,
          secondarySplitRatio: 0.4,
          focusSlot: 'slot2',
        },
      }),
    );

    expect(
      loadWorkspaceLayoutDemoState(workspaceKey),
    ).toEqual({
      mode: 'topBottomGrid',
      slotAssignments: {
        slot1: 'panel-a',
        slot2: 'panel-b',
        slot3: 'panel-c',
      },
      splitRatio: 0.6,
      secondarySplitRatio: 0.4,
      focusSlot: 'slot2',
    });
  });

  it('migrates a legacy session-bound layout to the stable workspace key on first load', () => {
    const workspaceKey = getWorkspacePersistenceKey({
      sessionId: 'session-new',
      projectId: 3,
      workspaceName: 'main',
      worktreePath: 'D:\\D\\worktrees\\main',
    });

    localStorageMock.setItem(
      'zync-workspace-layout-demo-v2',
      JSON.stringify({
        'session-old': {
          mode: 'columns',
          slotAssignments: {
            slot1: 'panel-a',
            slot2: 'panel-b',
          },
          splitRatio: 0.55,
          secondarySplitRatio: 0.45,
          focusSlot: 'slot2',
        },
      }),
    );

    const loaded = loadWorkspaceLayoutDemoState(workspaceKey, {
      legacyStorageKeys: ['session-old'],
    });

    expect(loaded).toEqual({
      mode: 'columns',
      slotAssignments: {
        slot1: 'panel-a',
        slot2: 'panel-b',
      },
      splitRatio: 0.55,
      secondarySplitRatio: 0.45,
      focusSlot: 'slot2',
    });

    const stored = loadWorkspaceLayoutDemoState(workspaceKey);
    expect(stored).toEqual(loaded);
  });

  it('keeps layout assignments when panel ids change but panel type and title stay the same', () => {
    const panels: ToolPanel[] = [
      createPanel({
        id: 'panel-explorer-new',
        sessionId: 'session-layout',
        type: 'explorer',
        title: 'Explorer',
      }),
      createPanel({
        id: 'panel-diff-new',
        sessionId: 'session-layout',
        type: 'diff',
        title: 'Diff',
      }),
      createPanel({
        id: 'panel-terminal-new',
        sessionId: 'session-layout',
        type: 'terminal',
        title: 'Terminal',
      }),
    ];

    saveWorkspaceLayoutDemoState(
      'workspace:D:/D/worktrees/main',
      {
        mode: 'topBottomGrid',
        slotAssignments: {
          slot1: 'panel-explorer-old',
          slot2: 'panel-diff-old',
          slot3: 'panel-terminal-old',
        },
        splitRatio: 0.58,
        secondarySplitRatio: 0.43,
        focusSlot: 'slot2',
      },
      [
        createPanel({
          id: 'panel-explorer-old',
          sessionId: 'session-layout-old',
          type: 'explorer',
          title: 'Explorer',
        }),
        createPanel({
          id: 'panel-diff-old',
          sessionId: 'session-layout-old',
          type: 'diff',
          title: 'Diff',
        }),
        createPanel({
          id: 'panel-terminal-old',
          sessionId: 'session-layout-old',
          type: 'terminal',
          title: 'Terminal',
        }),
      ],
    );

    const normalized = normalizeWorkspaceLayoutDemoState(
      loadWorkspaceLayoutDemoState('workspace:D:/D/worktrees/main'),
      'panel-terminal-new',
      panels,
    );

    expect(normalized.slotAssignments).toEqual({
      slot1: 'panel-explorer-new',
      slot2: 'panel-diff-new',
      slot3: 'panel-terminal-new',
    });
    expect(normalized.secondarySplitRatio).toBe(0.43);
  });
});
