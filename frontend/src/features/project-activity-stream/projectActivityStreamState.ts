export type ProjectActivityRuntimeStatus =
  | 'initializing'
  | 'ready'
  | 'running'
  | 'waiting'
  | 'stopped'
  | 'completed_unviewed'
  | 'error'
  | 'unknown';

export type ProjectActivityEntrySource = 'status' | 'summary' | 'heartbeat';

export type ProjectActivityEntryEvent =
  | 'workspace_bootstrapped'
  | 'runtime_status_changed'
  | 'git_state_changed'
  | 'summary_captured'
  | 'workspace_heartbeat';

export interface ProjectActivityWorkspaceState {
  sessionId: string;
  workspaceLabel: string;
  branchName: string;
  runtimeStatus: ProjectActivityRuntimeStatus;
  hasUncommittedChanges: boolean;
  isStale: boolean;
  lastActivityAt?: string;
  latestSummary?: string | null;
  agentLabel?: string | null;
}

export interface ProjectActivityStreamEntry {
  id: string;
  sessionId: string;
  workspaceLabel: string;
  branchName: string;
  runtimeStatus: ProjectActivityRuntimeStatus;
  hasUncommittedChanges: boolean;
  isStale: boolean;
  createdAt: string;
  source: ProjectActivityEntrySource;
  event: ProjectActivityEntryEvent;
  summaryText?: string | null;
  agentLabel?: string | null;
}

export interface ProjectActivityWorkspaceCursor {
  signature: string;
  summaryFingerprint: string | null;
  lastHeartbeatAt: string | null;
}

export interface ProjectActivityStreamState {
  version: 1;
  projectKey: string;
  entries: ProjectActivityStreamEntry[];
  workspaceCursors: Record<string, ProjectActivityWorkspaceCursor>;
}

export interface ReduceProjectActivityStreamInput {
  currentState: ProjectActivityStreamState | null;
  projectKey: string;
  workspaceStates: ProjectActivityWorkspaceState[];
  now: string;
  heartbeatSessionId?: string | null;
}

export interface SyncProjectActivityStreamInput
  extends Omit<ReduceProjectActivityStreamInput, 'currentState' | 'projectKey'> {
  storageKey: string;
}

const STORAGE_KEY_PREFIX = 'zync-project-activity-stream-preview-v1';
const LEGACY_STORAGE_KEY_PREFIXES = ['zync-project-activity-stream-demo-v1'];
const MAX_PROJECT_ACTIVITY_ENTRIES = 120;
export const HEARTBEAT_INTERVAL_MS = 12_000;

function getLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

function normalizeProjectPath(projectPath: string) {
  return projectPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function createEntryId() {
  return `project-activity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSummary(summary: string | null | undefined) {
  if (!summary) {
    return null;
  }

  const normalized = summary.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function createWorkspaceSignature(workspaceState: ProjectActivityWorkspaceState) {
  return [
    workspaceState.runtimeStatus,
    workspaceState.hasUncommittedChanges ? 'changes' : 'clean',
    workspaceState.isStale ? 'stale' : 'current',
    workspaceState.branchName.trim().toLowerCase(),
  ].join('|');
}

function createProjectActivityEntry(
  workspaceState: ProjectActivityWorkspaceState,
  now: string,
  source: ProjectActivityEntrySource,
  event: ProjectActivityEntryEvent,
): ProjectActivityStreamEntry {
  return {
    id: createEntryId(),
    sessionId: workspaceState.sessionId,
    workspaceLabel: workspaceState.workspaceLabel,
    branchName: workspaceState.branchName,
    runtimeStatus: workspaceState.runtimeStatus,
    hasUncommittedChanges: workspaceState.hasUncommittedChanges,
    isStale: workspaceState.isStale,
    createdAt: now,
    source,
    event,
    summaryText: normalizeSummary(workspaceState.latestSummary),
    agentLabel: workspaceState.agentLabel ?? null,
  };
}

function shouldAppendHeartbeat(
  previousCursor: ProjectActivityWorkspaceCursor | undefined,
  now: string,
) {
  if (!previousCursor?.lastHeartbeatAt) {
    return true;
  }

  const nowTime = Date.parse(now);
  const lastHeartbeatTime = Date.parse(previousCursor.lastHeartbeatAt);

  if (Number.isNaN(nowTime) || Number.isNaN(lastHeartbeatTime)) {
    return true;
  }

  return nowTime - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS;
}

function createInitialState(projectKey: string): ProjectActivityStreamState {
  return {
    version: 1,
    projectKey,
    entries: [],
    workspaceCursors: {},
  };
}

function normalizeState(
  state: ProjectActivityStreamState | null,
  projectKey: string,
): ProjectActivityStreamState {
  if (!state || state.version !== 1 || state.projectKey !== projectKey) {
    return createInitialState(projectKey);
  }

  return {
    version: 1,
    projectKey,
    entries: Array.isArray(state.entries) ? state.entries.slice(0, MAX_PROJECT_ACTIVITY_ENTRIES) : [],
    workspaceCursors:
      state.workspaceCursors && typeof state.workspaceCursors === 'object'
        ? { ...state.workspaceCursors }
        : {},
  };
}

export function getProjectActivityStreamStorageKey(input: {
  projectId?: number | null;
  projectPath?: string | null;
}) {
  if (typeof input.projectPath === 'string' && input.projectPath.trim().length > 0) {
    return `${STORAGE_KEY_PREFIX}::path::${normalizeProjectPath(input.projectPath.trim())}`;
  }

  if (typeof input.projectId === 'number' && Number.isFinite(input.projectId)) {
    return `${STORAGE_KEY_PREFIX}::project::${input.projectId}`;
  }

  return `${STORAGE_KEY_PREFIX}::fallback`;
}

export function loadProjectActivityStreamState(storageKey: string) {
  const localStorage = getLocalStorage();
  if (!localStorage) {
    return null;
  }

  const candidateKeys = [
    storageKey,
    ...LEGACY_STORAGE_KEY_PREFIXES.map((prefix) => storageKey.replace(STORAGE_KEY_PREFIX, prefix)),
  ];
  const raw = candidateKeys
    .map((candidateKey) => localStorage.getItem(candidateKey))
    .find((value): value is string => Boolean(value));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ProjectActivityStreamState;
    return {
      ...parsed,
      projectKey: storageKey,
    };
  } catch {
    return null;
  }
}

export function saveProjectActivityStreamState(
  storageKey: string,
  state: ProjectActivityStreamState,
) {
  const localStorage = getLocalStorage();
  if (!localStorage) {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function reduceProjectActivityStreamState(
  input: ReduceProjectActivityStreamInput,
): ProjectActivityStreamState {
  const normalizedState = normalizeState(input.currentState, input.projectKey);
  const nextEntries = [...normalizedState.entries];
  const nextCursors: Record<string, ProjectActivityWorkspaceCursor> = {};

  for (const workspaceState of input.workspaceStates) {
    const previousCursor = normalizedState.workspaceCursors[workspaceState.sessionId];
    const signature = createWorkspaceSignature(workspaceState);
    const summaryFingerprint = normalizeSummary(workspaceState.latestSummary);
    let lastHeartbeatAt = previousCursor?.lastHeartbeatAt ?? null;
    let hasCreatedEntry = false;

    if (!previousCursor) {
      nextEntries.unshift(
        createProjectActivityEntry(
          workspaceState,
          input.now,
          'status',
          'workspace_bootstrapped',
        ),
      );
      hasCreatedEntry = true;
      lastHeartbeatAt = input.now;
    } else if (
      summaryFingerprint &&
      summaryFingerprint !== previousCursor.summaryFingerprint
    ) {
      nextEntries.unshift(
        createProjectActivityEntry(
          workspaceState,
          input.now,
          'summary',
          'summary_captured',
        ),
      );
      hasCreatedEntry = true;
      lastHeartbeatAt = input.now;
    } else if (signature !== previousCursor.signature) {
      nextEntries.unshift(
        createProjectActivityEntry(
          workspaceState,
          input.now,
          'status',
          previousCursor.signature.split('|', 1)[0] !== workspaceState.runtimeStatus
            ? 'runtime_status_changed'
            : 'git_state_changed',
        ),
      );
      hasCreatedEntry = true;
      lastHeartbeatAt = input.now;
    }

    if (
      !hasCreatedEntry &&
      input.heartbeatSessionId === workspaceState.sessionId &&
      shouldAppendHeartbeat(previousCursor, input.now)
    ) {
      nextEntries.unshift(
        createProjectActivityEntry(
          workspaceState,
          input.now,
          'heartbeat',
          'workspace_heartbeat',
        ),
      );
      hasCreatedEntry = true;
      lastHeartbeatAt = input.now;
    }

    nextCursors[workspaceState.sessionId] = {
      signature,
      summaryFingerprint,
      lastHeartbeatAt,
    };
  }

  return {
    version: 1,
    projectKey: input.projectKey,
    entries: nextEntries.slice(0, MAX_PROJECT_ACTIVITY_ENTRIES),
    workspaceCursors: nextCursors,
  };
}

export function syncProjectActivityStreamState(
  input: SyncProjectActivityStreamInput,
) {
  const currentState = loadProjectActivityStreamState(input.storageKey);
  const nextState = reduceProjectActivityStreamState({
    currentState,
    projectKey: input.storageKey,
    workspaceStates: input.workspaceStates,
    now: input.now,
    heartbeatSessionId: input.heartbeatSessionId,
  });

  saveProjectActivityStreamState(input.storageKey, nextState);
  return nextState;
}
