import type { ToolPanel, ToolPanelType } from '../../shared/types/panels';

export type WorkspaceLayoutMode =
  | 'single'
  | 'columns'
  | 'rows'
  | 'topBottomGrid'
  | 'quad';

export type WorkspaceLayoutSlot = 'slot1' | 'slot2' | 'slot3' | 'slot4';
export type WorkspaceLayoutFocusSlot = WorkspaceLayoutSlot;

export const ALL_WORKSPACE_LAYOUT_SLOTS: WorkspaceLayoutSlot[] = [
  'slot1',
  'slot2',
  'slot3',
  'slot4',
];

export const MIN_WORKSPACE_LAYOUT_SPLIT_RATIO = 0.25;
export const MAX_WORKSPACE_LAYOUT_SPLIT_RATIO = 0.75;
export const DEFAULT_WORKSPACE_LAYOUT_SPLIT_RATIO = 0.5;

export interface WorkspaceLayoutDemoState {
  mode: WorkspaceLayoutMode;
  slotAssignments: Partial<Record<WorkspaceLayoutSlot, string>>;
  splitRatio: number;
  secondarySplitRatio?: number;
  focusSlot: WorkspaceLayoutFocusSlot;
  slotPanelHints?: Partial<Record<WorkspaceLayoutSlot, WorkspaceLayoutPanelHint>>;
}

export interface WorkspaceLayoutPanelHint {
  panelId: string;
  type: ToolPanelType;
  title: string;
}

export interface WorkspacePersistenceIdentity {
  sessionId: string;
  projectId?: number;
  workspaceName?: string;
  worktreePath?: string | null;
}

export interface LoadWorkspaceLayoutDemoStateOptions {
  legacyStorageKeys?: string[];
}

interface LegacyWorkspaceLayoutDemoState {
  mode: 'single' | 'columns' | 'rows';
  secondaryPanelId: string | null;
  splitRatio: number;
  focusSlot: 'main' | 'secondary';
}

const STORAGE_KEYS = [
  'zync-workspace-layout-demo-v2',
  'zync-workspace-layout-demo-v1',
] as const;

export const DEFAULT_WORKSPACE_LAYOUT_DEMO_STATE: WorkspaceLayoutDemoState = {
  mode: 'single',
  slotAssignments: {},
  splitRatio: DEFAULT_WORKSPACE_LAYOUT_SPLIT_RATIO,
  secondarySplitRatio: DEFAULT_WORKSPACE_LAYOUT_SPLIT_RATIO,
  focusSlot: 'slot1',
};

function normalizeWorkspacePath(path: string) {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function normalizeWorkspaceName(workspaceName: string) {
  return workspaceName.trim().toLowerCase();
}

function getPanelSemanticKey(type: ToolPanelType, title: string) {
  return `${type}::${title.trim().toLowerCase()}`;
}

export function getWorkspacePersistenceKey(
  identity: WorkspacePersistenceIdentity,
) {
  const normalizedWorktreePath =
    typeof identity.worktreePath === 'string' && identity.worktreePath.trim().length > 0
      ? normalizeWorkspacePath(identity.worktreePath.trim())
      : null;

  if (normalizedWorktreePath) {
    return `workspace:${normalizedWorktreePath}`;
  }

  if (
    typeof identity.projectId === 'number' &&
    typeof identity.workspaceName === 'string' &&
    identity.workspaceName.trim().length > 0
  ) {
    return `project:${identity.projectId}:workspace:${normalizeWorkspaceName(identity.workspaceName)}`;
  }

  return identity.sessionId;
}

function isWorkspaceLayoutMode(value: unknown): value is WorkspaceLayoutMode {
  return (
    value === 'single' ||
    value === 'columns' ||
    value === 'rows' ||
    value === 'topBottomGrid' ||
    value === 'quad'
  );
}

function isWorkspaceLayoutSlot(value: unknown): value is WorkspaceLayoutSlot {
  return (
    value === 'slot1' ||
    value === 'slot2' ||
    value === 'slot3' ||
    value === 'slot4'
  );
}

function clampSplitRatio(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_WORKSPACE_LAYOUT_SPLIT_RATIO;
  }

  return Math.min(
    MAX_WORKSPACE_LAYOUT_SPLIT_RATIO,
    Math.max(MIN_WORKSPACE_LAYOUT_SPLIT_RATIO, value),
  );
}

function normalizeSlotAssignments(
  value: unknown,
): Partial<Record<WorkspaceLayoutSlot, string>> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const entries = Object.entries(value).flatMap(([slot, panelId]) => {
    if (
      !isWorkspaceLayoutSlot(slot) ||
      typeof panelId !== 'string' ||
      panelId.length === 0
    ) {
      return [];
    }

    return [[slot, panelId] as const];
  });

  return Object.fromEntries(entries);
}

function normalizeSlotPanelHints(
  value: unknown,
): Partial<Record<WorkspaceLayoutSlot, WorkspaceLayoutPanelHint>> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const entries = Object.entries(value).flatMap(([slot, panelHint]) => {
    if (!isWorkspaceLayoutSlot(slot) || !panelHint || typeof panelHint !== 'object') {
      return [];
    }

    const typedPanelHint = panelHint as Partial<WorkspaceLayoutPanelHint>;
    if (
      typeof typedPanelHint.panelId !== 'string' ||
      typedPanelHint.panelId.length === 0 ||
      typeof typedPanelHint.type !== 'string' ||
      typeof typedPanelHint.title !== 'string'
    ) {
      return [];
    }

    return [
      [
        slot,
        {
          panelId: typedPanelHint.panelId,
          type: typedPanelHint.type as ToolPanelType,
          title: typedPanelHint.title,
        },
      ] as const,
    ];
  });

  return Object.fromEntries(entries);
}

function buildSlotPanelHints(
  slotAssignments: Partial<Record<WorkspaceLayoutSlot, string>>,
  panels: ToolPanel[],
) {
  const panelsById = new Map(panels.map((panel) => [panel.id, panel]));

  return Object.fromEntries(
    Object.entries(slotAssignments).flatMap(([slot, panelId]) => {
      if (typeof panelId !== 'string' || panelId.length === 0) {
        return [];
      }

      const panel = panelsById.get(panelId);
      if (!panel || !isWorkspaceLayoutSlot(slot)) {
        return [];
      }

      return [
        [
          slot,
          {
            panelId: panel.id,
            type: panel.type,
            title: panel.title,
          },
        ] as const,
      ];
    }),
  ) as Partial<Record<WorkspaceLayoutSlot, WorkspaceLayoutPanelHint>>;
}

function findPanelBySemanticHint(
  panelHint: WorkspaceLayoutPanelHint | undefined,
  eligiblePanels: ToolPanel[],
  usedPanelIds: Set<string>,
) {
  if (!panelHint) {
    return null;
  }

  const semanticKey = getPanelSemanticKey(panelHint.type, panelHint.title);

  return (
    eligiblePanels.find(
      (panel) =>
        !usedPanelIds.has(panel.id) &&
        getPanelSemanticKey(panel.type, panel.title) === semanticKey,
    ) ?? null
  );
}

function resolvePanelAssignment(
  slot: WorkspaceLayoutSlot,
  state: WorkspaceLayoutDemoState,
  eligiblePanels: ToolPanel[],
  eligiblePanelIds: Set<string>,
  usedPanelIds: Set<string>,
) {
  const assignedPanelId = state.slotAssignments[slot];
  if (
    typeof assignedPanelId === 'string' &&
    assignedPanelId.length > 0 &&
    eligiblePanelIds.has(assignedPanelId) &&
    !usedPanelIds.has(assignedPanelId)
  ) {
    return assignedPanelId;
  }

  const semanticallyMatchedPanel = findPanelBySemanticHint(
    state.slotPanelHints?.[slot],
    eligiblePanels,
    usedPanelIds,
  );

  return semanticallyMatchedPanel?.id ?? null;
}

function normalizeStoredWorkspaceLayoutState(
  state: Partial<WorkspaceLayoutDemoState | LegacyWorkspaceLayoutDemoState>,
): WorkspaceLayoutDemoState {
  const slotAssignments =
    'slotAssignments' in state && state.slotAssignments
      ? normalizeSlotAssignments(state.slotAssignments)
      : {
          slot2:
            'secondaryPanelId' in state &&
            typeof state.secondaryPanelId === 'string' &&
            state.secondaryPanelId.length > 0
              ? state.secondaryPanelId
              : undefined,
        };

  return {
    mode: isWorkspaceLayoutMode(state.mode) ? state.mode : 'single',
    slotAssignments: Object.fromEntries(
      Object.entries(slotAssignments).filter(
        (entry): entry is [WorkspaceLayoutSlot, string] =>
          typeof entry[1] === 'string' && entry[1].length > 0,
      ),
    ),
    splitRatio: clampSplitRatio(state.splitRatio),
    secondarySplitRatio: clampSplitRatio(
      'secondarySplitRatio' in state ? state.secondarySplitRatio : undefined,
    ),
    focusSlot:
      isWorkspaceLayoutSlot(state.focusSlot)
        ? state.focusSlot
        : state.focusSlot === 'secondary'
          ? 'slot2'
          : 'slot1',
    slotPanelHints:
      'slotPanelHints' in state
        ? normalizeSlotPanelHints(state.slotPanelHints)
        : undefined,
  };
}

function loadAllWorkspaceLayoutStates(): Record<string, WorkspaceLayoutDemoState> {
  if (typeof window === 'undefined') {
    return {};
  }

  for (const storageKey of STORAGE_KEYS) {
    try {
      const rawValue = window.localStorage.getItem(storageKey);
      if (!rawValue) {
        continue;
      }

      const parsed = JSON.parse(rawValue) as Record<
        string,
        Partial<WorkspaceLayoutDemoState | LegacyWorkspaceLayoutDemoState>
      >;

      return Object.fromEntries(
        Object.entries(parsed).map(([sessionId, state]) => [
          sessionId,
          normalizeStoredWorkspaceLayoutState(state),
        ]),
      );
    } catch (error) {
      console.error('[WorkspaceLayoutDemoState] Failed to load state:', error);
    }
  }

  return {};
}

function saveAllWorkspaceLayoutStates(
  statesBySession: Record<string, WorkspaceLayoutDemoState>,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(statesBySession));
}

export function loadWorkspaceLayoutDemoState(
  workspaceStorageKey: string,
  options?: LoadWorkspaceLayoutDemoStateOptions,
): WorkspaceLayoutDemoState {
  const statesBySession = loadAllWorkspaceLayoutStates();
  const existingState = statesBySession[workspaceStorageKey];
  if (existingState) {
    return existingState;
  }

  const legacyStorageKey = options?.legacyStorageKeys?.find(
    (candidateKey) => statesBySession[candidateKey],
  );

  if (legacyStorageKey) {
    const migratedState = statesBySession[legacyStorageKey];
    if (migratedState) {
      statesBySession[workspaceStorageKey] = migratedState;
      saveAllWorkspaceLayoutStates(statesBySession);
      return migratedState;
    }
  }

  return DEFAULT_WORKSPACE_LAYOUT_DEMO_STATE;
}

export function saveWorkspaceLayoutDemoState(
  workspaceStorageKey: string,
  state: WorkspaceLayoutDemoState,
  panels?: ToolPanel[],
) {
  const statesBySession = loadAllWorkspaceLayoutStates();
  const normalizedState = normalizeStoredWorkspaceLayoutState(state);
  const nextSlotPanelHints =
    panels && panels.length > 0
      ? buildSlotPanelHints(normalizedState.slotAssignments, panels)
      : normalizedState.slotPanelHints;

  statesBySession[workspaceStorageKey] = {
    ...normalizedState,
    slotPanelHints: nextSlotPanelHints,
  };
  saveAllWorkspaceLayoutStates(statesBySession);
}

export function getWorkspaceLayoutEligiblePanels(panels: ToolPanel[]) {
  return panels;
}

export function getWorkspaceLayoutVisibleSlots(
  mode: WorkspaceLayoutMode,
): WorkspaceLayoutSlot[] {
  if (mode === 'quad') {
    return ['slot1', 'slot2', 'slot3', 'slot4'];
  }

  if (mode === 'topBottomGrid') {
    return ['slot1', 'slot2', 'slot3'];
  }

  if (mode === 'columns' || mode === 'rows') {
    return ['slot1', 'slot2'];
  }

  return ['slot1'];
}

export function getWorkspaceLayoutFocusSlots(state: WorkspaceLayoutDemoState) {
  return getWorkspaceLayoutVisibleSlots(state.mode);
}

export function getNextWorkspaceLayoutFocusSlot(
  state: WorkspaceLayoutDemoState,
  direction: 'next' | 'prev' = 'next',
): WorkspaceLayoutFocusSlot {
  const focusSlots = getWorkspaceLayoutFocusSlots(state);
  const currentIndex = focusSlots.indexOf(state.focusSlot);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex =
    direction === 'next'
      ? (safeIndex + 1) % focusSlots.length
      : (safeIndex - 1 + focusSlots.length) % focusSlots.length;

  return focusSlots[nextIndex];
}

export function normalizeWorkspaceLayoutDemoState(
  state: WorkspaceLayoutDemoState,
  activePanelId: string | null,
  panels: ToolPanel[],
): WorkspaceLayoutDemoState {
  const eligiblePanels = getWorkspaceLayoutEligiblePanels(panels);
  const eligiblePanelIds = new Set(eligiblePanels.map((panel) => panel.id));
  const visibleSlots = getWorkspaceLayoutVisibleSlots(state.mode);
  const visibleAssignments: Partial<Record<WorkspaceLayoutSlot, string>> = {};
  const hiddenAssignments: Partial<Record<WorkspaceLayoutSlot, string>> = {};
  const usedPanelIds = new Set<string>();
  for (const slot of visibleSlots) {
    const resolvedPanelId = resolvePanelAssignment(
      slot,
      state,
      eligiblePanels,
      eligiblePanelIds,
      usedPanelIds,
    );
    if (!resolvedPanelId) {
      continue;
    }

    visibleAssignments[slot] = resolvedPanelId;
    usedPanelIds.add(resolvedPanelId);
  }

  if (activePanelId && eligiblePanelIds.has(activePanelId)) {
    const activePanelVisible = visibleSlots.some(
      (slot) => visibleAssignments[slot] === activePanelId,
    );

    if (!activePanelVisible) {
      for (const slot of ALL_WORKSPACE_LAYOUT_SLOTS) {
        if (visibleAssignments[slot] === activePanelId) {
          delete visibleAssignments[slot];
        }

        if (hiddenAssignments[slot] === activePanelId) {
          delete hiddenAssignments[slot];
        }
      }
      visibleAssignments.slot1 = activePanelId;
      usedPanelIds.add(activePanelId);
    }
  }

  const remainingPanels = eligiblePanels.filter(
    (panel) => !usedPanelIds.has(panel.id),
  );

  for (const slot of visibleSlots) {
    if (visibleAssignments[slot]) {
      continue;
    }

    const nextPanel = remainingPanels.shift();
    if (!nextPanel) {
      break;
    }

    visibleAssignments[slot] = nextPanel.id;
    usedPanelIds.add(nextPanel.id);
  }

  for (const slot of ALL_WORKSPACE_LAYOUT_SLOTS.filter((item) => !visibleSlots.includes(item))) {
    const resolvedPanelId = resolvePanelAssignment(
      slot,
      state,
      eligiblePanels,
      eligiblePanelIds,
      usedPanelIds,
    );
    if (!resolvedPanelId) {
      continue;
    }

    hiddenAssignments[slot] = resolvedPanelId;
    usedPanelIds.add(resolvedPanelId);
  }

  const nextHiddenAssignments = Object.fromEntries(
    Object.entries(hiddenAssignments).filter(
      (entry): entry is [WorkspaceLayoutSlot, string] =>
        typeof entry[1] === 'string' &&
        !Object.values(visibleAssignments).includes(entry[1]),
    ),
  ) as Partial<Record<WorkspaceLayoutSlot, string>>;

  return {
    mode: state.mode,
    slotAssignments: {
      ...nextHiddenAssignments,
      ...visibleAssignments,
    },
    splitRatio: clampSplitRatio(state.splitRatio),
    secondarySplitRatio: clampSplitRatio(state.secondarySplitRatio),
    focusSlot: visibleSlots.includes(state.focusSlot) ? state.focusSlot : 'slot1',
    slotPanelHints: buildSlotPanelHints(
      {
        ...nextHiddenAssignments,
        ...visibleAssignments,
      },
      eligiblePanels,
    ),
  };
}
