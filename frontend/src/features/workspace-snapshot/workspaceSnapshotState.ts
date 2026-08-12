import type { ToolPanel, ToolPanelType } from '../../../../shared/types/panels';
import {
  DEFAULT_WORKSPACE_LAYOUT_STATE,
  getWorkspacePersistenceKey,
  normalizeWorkspaceLayoutState,
  type WorkspaceLayoutState,
  type WorkspaceLayoutSlot,
} from '../workspace-layout/workspaceLayoutState';

export { getWorkspacePersistenceKey } from '../workspace-layout/workspaceLayoutState';

export type WorkspaceSnapshotKind = 'manual' | 'auto_before_restore';
export type WorkspaceSnapshotSupportedPanelType = 'terminal' | 'explorer' | 'diff';

export type WorkspaceSnapshotLayoutRecord = WorkspaceLayoutState;

export interface WorkspaceSnapshotPanelRecord {
  panelId: string;
  title: string;
  type: WorkspaceSnapshotSupportedPanelType;
  orderIndex: number;
  position: number;
}

export interface WorkspaceSnapshotRecord {
  id: string;
  sessionId: string;
  workspaceStorageKey?: string;
  projectId?: number;
  projectName?: string;
  workspaceName: string;
  worktreePath?: string;
  name: string;
  kind: WorkspaceSnapshotKind;
  createdAt: string;
  activePanelId: string | null;
  activePanelTitle: string | null;
  panelCount: number;
  layout: WorkspaceSnapshotLayoutRecord;
  panels: WorkspaceSnapshotPanelRecord[];
}

export interface CreateWorkspaceSnapshotInput {
  sessionId: string;
  workspaceStorageKey?: string;
  projectId?: number;
  projectName?: string;
  workspaceName: string;
  worktreePath?: string;
  name: string;
  kind: WorkspaceSnapshotKind;
  panels: ToolPanel[];
  activePanelId?: string | null;
  layout: WorkspaceSnapshotLayoutRecord;
}

export interface WorkspaceSnapshotRestorePreview {
  targetPanels: ToolPanel[];
  targetActivePanelId: string | null;
  targetLayoutState: WorkspaceSnapshotLayoutRecord;
  matchedPanels: WorkspaceSnapshotPanelRecord[];
  missingPanels: WorkspaceSnapshotPanelRecord[];
  extraPanels: WorkspaceSnapshotPanelRecord[];
  unsupportedPanels: ToolPanel[];
}

export interface WorkspaceSnapshotRestoreOptions {
  restoredPanelsBySnapshotId?: Map<string, ToolPanel>;
}

export interface LoadWorkspaceSnapshotsOptions {
  legacyStorageKeys?: string[];
  projectId?: number;
  projectName?: string;
  workspaceName?: string;
  worktreePath?: string;
}

const STORAGE_KEYS = [
  'zync-workspace-snapshots-v1',
  'zync-workspace-snapshots-preview-v1',
  'zync-workspace-snapshots-demo-v1',
] as const;
const MAX_SNAPSHOTS_PER_SESSION = 20;
const SUPPORTED_PANEL_TYPES: WorkspaceSnapshotSupportedPanelType[] = ['terminal', 'explorer', 'diff'];

function normalizeWorkspacePath(path: string) {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function normalizeWorkspaceName(workspaceName: string) {
  return workspaceName.trim().toLowerCase();
}

function getPanelSemanticKey(type: WorkspaceSnapshotSupportedPanelType, title: string) {
  return `${type}::${title.trim().toLowerCase()}`;
}

function getSnapshotWorkspaceStorageKey(
  snapshot: Pick<
    WorkspaceSnapshotRecord,
    'sessionId' | 'projectId' | 'workspaceName' | 'worktreePath' | 'workspaceStorageKey'
  >,
) {
  return (
    snapshot.workspaceStorageKey ??
    getWorkspacePersistenceKey({
      sessionId: snapshot.sessionId,
      projectId: snapshot.projectId,
      workspaceName: snapshot.workspaceName,
      worktreePath: snapshot.worktreePath,
    })
  );
}

function matchesSnapshotWorkspace(
  snapshot: WorkspaceSnapshotRecord,
  options: LoadWorkspaceSnapshotsOptions | undefined,
) {
  if (!options) {
    return false;
  }

  const targetWorktreePath =
    typeof options.worktreePath === 'string' && options.worktreePath.trim().length > 0
      ? normalizeWorkspacePath(options.worktreePath.trim())
      : null;
  const snapshotWorktreePath =
    typeof snapshot.worktreePath === 'string' && snapshot.worktreePath.trim().length > 0
      ? normalizeWorkspacePath(snapshot.worktreePath.trim())
      : null;

  if (targetWorktreePath && snapshotWorktreePath) {
    return targetWorktreePath === snapshotWorktreePath;
  }

  if (
    typeof options.projectId === 'number' &&
    typeof options.workspaceName === 'string' &&
    options.workspaceName.trim().length > 0
  ) {
    return (
      snapshot.projectId === options.projectId &&
      normalizeWorkspaceName(snapshot.workspaceName) ===
        normalizeWorkspaceName(options.workspaceName)
    );
  }

  if (typeof options.workspaceName === 'string' && options.workspaceName.trim().length > 0) {
    return (
      normalizeWorkspaceName(snapshot.workspaceName) ===
        normalizeWorkspaceName(options.workspaceName)
    );
  }

  return false;
}

function findMatchingCurrentPanel(
  snapshotPanel: WorkspaceSnapshotPanelRecord,
  currentPanels: ToolPanel[],
  usedPanelIds: Set<string>,
) {
  const semanticKey = getPanelSemanticKey(snapshotPanel.type, snapshotPanel.title);
  return (
    currentPanels.find(
      (panel) =>
        !usedPanelIds.has(panel.id) &&
        isWorkspaceSnapshotSupportedPanelType(panel.type) &&
        getPanelSemanticKey(panel.type, panel.title) === semanticKey,
    ) ?? null
  );
}

function createSnapshotId() {
  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clonePanel(panel: ToolPanel): ToolPanel {
  return {
    ...panel,
    state: {
      ...panel.state,
      customState:
        panel.state.customState && typeof panel.state.customState === 'object'
          ? { ...panel.state.customState }
          : panel.state.customState,
    },
    metadata: {
      ...panel.metadata,
    },
  };
}

function normalizePosition(panel: ToolPanel, fallbackPosition: number) {
  return typeof panel.metadata?.position === 'number' ? panel.metadata.position : fallbackPosition;
}

function createPanelStubFromSnapshotRecord(
  sessionId: string,
  panel: WorkspaceSnapshotPanelRecord,
): ToolPanel {
  return {
    id: panel.panelId,
    sessionId,
    type: panel.type,
    title: panel.title,
    state: {
      isActive: false,
      hasBeenViewed: true,
      customState: {},
    },
    metadata: {
      createdAt: '',
      lastActiveAt: '',
      position: panel.position,
    },
  };
}

function toPanelRecord(panel: ToolPanel, orderIndex: number): WorkspaceSnapshotPanelRecord {
  if (!isWorkspaceSnapshotSupportedPanelType(panel.type)) {
    throw new Error(`Unsupported snapshot panel type: ${panel.type}`);
  }

  return {
    panelId: panel.id,
    title: panel.title,
    type: panel.type,
    orderIndex,
    position: normalizePosition(panel, orderIndex),
  };
}

function normalizeSnapshotLayout(
  layout: Partial<WorkspaceSnapshotLayoutRecord> | undefined,
  activePanelId: string | null,
  panels: ToolPanel[],
) {
  const normalizedLayout = normalizeWorkspaceLayoutState(
    {
      ...DEFAULT_WORKSPACE_LAYOUT_STATE,
      ...layout,
    },
    activePanelId,
    panels,
  );

  return {
    mode: normalizedLayout.mode,
    slotAssignments: normalizedLayout.slotAssignments,
    splitRatio: normalizedLayout.splitRatio,
    secondarySplitRatio: normalizedLayout.secondarySplitRatio,
    focusSlot: normalizedLayout.focusSlot,
  };
}

function normalizeWorkspaceSnapshotRecord(snapshot: WorkspaceSnapshotRecord): WorkspaceSnapshotRecord {
  const snapshotPanels = Array.isArray(snapshot.panels)
    ? snapshot.panels.map((panel) => createPanelStubFromSnapshotRecord(snapshot.sessionId, panel))
    : [];
  const fallbackPrimaryPanelId =
    snapshotPanels.find((panel) => panel.type !== 'terminal')?.id ?? null;
  const activePanelId =
    typeof snapshot.activePanelId === 'string' && snapshot.activePanelId.length > 0
      ? snapshot.activePanelId
      : fallbackPrimaryPanelId;

  return {
    ...snapshot,
    workspaceStorageKey: getSnapshotWorkspaceStorageKey(snapshot),
    layout: normalizeSnapshotLayout(snapshot.layout, activePanelId, snapshotPanels),
  };
}

function loadAllWorkspaceSnapshots(): Record<string, WorkspaceSnapshotRecord[]> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = STORAGE_KEYS
      .map((storageKey) => window.localStorage.getItem(storageKey))
      .find((value): value is string => Boolean(value));
    if (!rawValue) return {};

    const parsed = JSON.parse(rawValue) as Record<string, WorkspaceSnapshotRecord[]>;
    return Object.fromEntries(
      Object.entries(parsed).map(([sessionId, snapshots]) => [
        sessionId,
        Array.isArray(snapshots) ? snapshots.map(normalizeWorkspaceSnapshotRecord) : [],
      ]),
    );
  } catch (error) {
    console.error('[WorkspaceSnapshotState] Failed to load snapshots:', error);
    return {};
  }
}

function saveAllWorkspaceSnapshots(snapshotsBySession: Record<string, WorkspaceSnapshotRecord[]>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(snapshotsBySession));
}

export function isWorkspaceSnapshotSupportedPanelType(
  panelType: ToolPanelType,
): panelType is WorkspaceSnapshotSupportedPanelType {
  return SUPPORTED_PANEL_TYPES.includes(panelType as WorkspaceSnapshotSupportedPanelType);
}

export function getWorkspaceSnapshotPanelRecords(panels: ToolPanel[]) {
  return panels
    .filter((panel) => isWorkspaceSnapshotSupportedPanelType(panel.type))
    .map((panel, index) => toPanelRecord(panel, index));
}

export function createWorkspaceSnapshotRecord(
  input: CreateWorkspaceSnapshotInput,
): WorkspaceSnapshotRecord {
  const panels = getWorkspaceSnapshotPanelRecords(input.panels);
  const fallbackActivePanel = panels[0] ?? null;
  const activePanel =
    (input.activePanelId && panels.find((panel) => panel.panelId === input.activePanelId)) ||
    fallbackActivePanel;

  return {
    id: createSnapshotId(),
    sessionId: input.sessionId,
    workspaceStorageKey:
      input.workspaceStorageKey ??
      getWorkspacePersistenceKey({
        sessionId: input.sessionId,
        projectId: input.projectId,
        workspaceName: input.workspaceName,
        worktreePath: input.worktreePath,
      }),
    projectId: input.projectId,
    projectName: input.projectName,
    workspaceName: input.workspaceName,
    worktreePath: input.worktreePath,
    name: input.name,
    kind: input.kind,
    createdAt: new Date().toISOString(),
    activePanelId: activePanel?.panelId ?? null,
    activePanelTitle: activePanel?.title ?? null,
    panelCount: panels.length,
    layout: normalizeSnapshotLayout(input.layout, activePanel?.panelId ?? null, input.panels),
    panels,
  };
}

export function saveWorkspaceSnapshot(snapshot: WorkspaceSnapshotRecord) {
  const snapshotsBySession = loadAllWorkspaceSnapshots();
  const workspaceStorageKey = getSnapshotWorkspaceStorageKey(snapshot);
  const existingSnapshots = snapshotsBySession[workspaceStorageKey] ?? [];

  snapshotsBySession[workspaceStorageKey] = [snapshot, ...existingSnapshots]
    .slice(0, MAX_SNAPSHOTS_PER_SESSION)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  saveAllWorkspaceSnapshots(snapshotsBySession);
}

export function createAndStoreWorkspaceSnapshot(input: CreateWorkspaceSnapshotInput) {
  const snapshot = createWorkspaceSnapshotRecord(input);
  saveWorkspaceSnapshot(snapshot);
  return snapshot;
}

export function loadWorkspaceSnapshots(
  workspaceStorageKey: string,
  options?: LoadWorkspaceSnapshotsOptions,
) {
  const snapshotsBySession = loadAllWorkspaceSnapshots();
  const existingSnapshots = snapshotsBySession[workspaceStorageKey];
  if (existingSnapshots) {
    return [...existingSnapshots].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  const legacyStorageKey = options?.legacyStorageKeys?.find(
    (candidateKey) => snapshotsBySession[candidateKey]?.length,
  );

  if (legacyStorageKey) {
    const migratedSnapshots = [...(snapshotsBySession[legacyStorageKey] ?? [])].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
    if (migratedSnapshots.length > 0) {
      snapshotsBySession[workspaceStorageKey] = migratedSnapshots;
      saveAllWorkspaceSnapshots(snapshotsBySession);
      return migratedSnapshots;
    }
  }

  const matchedSnapshots = Object.values(snapshotsBySession)
    .flatMap((snapshotList) => snapshotList)
    .filter((snapshot) => matchesSnapshotWorkspace(snapshot, options))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (matchedSnapshots.length > 0) {
    snapshotsBySession[workspaceStorageKey] = matchedSnapshots.slice(0, MAX_SNAPSHOTS_PER_SESSION);
    saveAllWorkspaceSnapshots(snapshotsBySession);
    return snapshotsBySession[workspaceStorageKey];
  }

  return [];
}

export function deleteWorkspaceSnapshot(workspaceStorageKey: string, snapshotId: string) {
  const snapshotsBySession = loadAllWorkspaceSnapshots();
  const existingSnapshots = snapshotsBySession[workspaceStorageKey] ?? [];
  const nextSnapshots = existingSnapshots.filter((snapshot) => snapshot.id !== snapshotId);

  if (nextSnapshots.length === existingSnapshots.length) {
    return false;
  }

  if (nextSnapshots.length > 0) {
    snapshotsBySession[workspaceStorageKey] = nextSnapshots.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  } else {
    delete snapshotsBySession[workspaceStorageKey];
  }

  saveAllWorkspaceSnapshots(snapshotsBySession);
  return true;
}

export function buildWorkspaceSnapshotRestorePreview(
  snapshot: WorkspaceSnapshotRecord,
  currentPanels: ToolPanel[],
  options?: WorkspaceSnapshotRestoreOptions,
): WorkspaceSnapshotRestorePreview {
  const currentSupportedPanels = currentPanels.filter((panel) =>
    isWorkspaceSnapshotSupportedPanelType(panel.type),
  );
  const currentUnsupportedPanels = currentPanels
    .filter((panel) => !isWorkspaceSnapshotSupportedPanelType(panel.type))
    .map((panel) => clonePanel(panel));

  const currentPanelsById = new Map(currentSupportedPanels.map((panel) => [panel.id, panel]));
  const matchedPanels: WorkspaceSnapshotPanelRecord[] = [];
  const missingPanels: WorkspaceSnapshotPanelRecord[] = [];
  const usedCurrentPanelIds = new Set<string>();
  const resolvedPanelIdsBySnapshotId = new Map<string, string>();

  const restoredSupportedPanels: ToolPanel[] = snapshot.panels.flatMap((snapshotPanel, index) => {
    const existingPanel =
      options?.restoredPanelsBySnapshotId?.get(snapshotPanel.panelId) ??
      currentPanelsById.get(snapshotPanel.panelId) ??
      findMatchingCurrentPanel(snapshotPanel, currentSupportedPanels, usedCurrentPanelIds);
    if (!existingPanel) {
      missingPanels.push(snapshotPanel);
      return [];
    }

    usedCurrentPanelIds.add(existingPanel.id);
    resolvedPanelIdsBySnapshotId.set(snapshotPanel.panelId, existingPanel.id);
    matchedPanels.push(snapshotPanel);

    return [
      {
        ...clonePanel(existingPanel),
        title: snapshotPanel.title,
        metadata: {
          ...existingPanel.metadata,
          position: index,
        },
      },
    ];
  });

  const extraPanels = currentSupportedPanels
    .filter((panel) => !usedCurrentPanelIds.has(panel.id))
    .map((panel, index) => {
      const record = toPanelRecord(panel, snapshot.panels.length + index);
      return record;
    });

  const preservedExtraPanels = currentSupportedPanels
    .filter((panel) => !usedCurrentPanelIds.has(panel.id))
    .map((panel, index) => ({
      ...clonePanel(panel),
      metadata: {
        ...panel.metadata,
        position: restoredSupportedPanels.length + index,
      },
    }));

  const normalizedUnsupportedPanels = currentUnsupportedPanels.map((panel, index) => ({
    ...panel,
    metadata: {
      ...panel.metadata,
      position: restoredSupportedPanels.length + preservedExtraPanels.length + index,
    },
  }));

  const targetPanels = [
    ...restoredSupportedPanels,
    ...preservedExtraPanels,
    ...normalizedUnsupportedPanels,
  ];

  const targetActivePanelId =
    (snapshot.activePanelId && resolvedPanelIdsBySnapshotId.get(snapshot.activePanelId)) ||
    restoredSupportedPanels[0]?.id ||
    preservedExtraPanels[0]?.id ||
    normalizedUnsupportedPanels[0]?.id ||
    null;

  const remappedSlotAssignments = Object.fromEntries(
    Object.entries(snapshot.layout.slotAssignments ?? {}).flatMap(([slot, panelId]) => {
      if (typeof panelId !== 'string' || panelId.length === 0) {
        return [];
      }

      const remappedPanelId =
        resolvedPanelIdsBySnapshotId.get(panelId) ??
        options?.restoredPanelsBySnapshotId?.get(panelId)?.id ??
        targetPanels.find((panel) => panel.id === panelId)?.id;

      if (!remappedPanelId) {
        return [];
      }

      return [[slot as WorkspaceLayoutSlot, remappedPanelId] as const];
    }),
  );

  const targetLayoutState = normalizeSnapshotLayout(
    {
      ...snapshot.layout,
      slotAssignments: remappedSlotAssignments,
    },
    targetActivePanelId,
    targetPanels,
  );

  return {
    targetPanels,
    targetActivePanelId,
    targetLayoutState,
    matchedPanels,
    missingPanels,
    extraPanels,
    unsupportedPanels: normalizedUnsupportedPanels,
  };
}
