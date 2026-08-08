import type { SessionBranchInfo } from '../../frontend/src/types/projectDashboard';
import type { Session } from '../../frontend/src/types/session';

export type WorkspaceDashboardRuntimeStatus = Session['status'] | 'unknown';
export type WorkspaceDetailType = 'main' | 'standard';
export type WorkspaceActivityItemEmphasis = 'primary' | 'default' | 'warning';

export interface WorkspaceDashboardRowLike
  extends Pick<
    SessionBranchInfo,
    | 'sessionId'
    | 'branchName'
    | 'worktreePath'
    | 'baseCommit'
    | 'baseBranch'
    | 'isStale'
    | 'staleSince'
    | 'hasUncommittedChanges'
    | 'pullRequest'
    | 'commitsAhead'
    | 'commitsBehind'
  > {
  workspaceLabel: string;
  runtimeStatus: WorkspaceDashboardRuntimeStatus;
  lastActivity?: string;
  createdAt?: string;
}

export interface ResolveSelectedWorkspaceIdInput {
  visibleWorkspaceIds: string[];
  previousSelectedWorkspaceId?: string | null;
  preferredWorkspaceIds?: string[];
}

export interface WorkspaceDetailModel {
  sessionId: string;
  workspaceLabel: string;
  workspaceType: WorkspaceDetailType;
  runtimeStatus: WorkspaceDashboardRuntimeStatus;
  worktreePath: string;
  branchName: string;
  baseBranch: string;
  baseCommit: string;
  shortBaseCommit: string;
  commitsAhead: number;
  commitsBehind: number;
  hasUncommittedChanges: boolean;
  isStale: boolean;
  staleSince?: string;
  pullRequest?: WorkspaceDashboardRowLike['pullRequest'];
  createdAt?: string;
  lastActivity?: string;
  statusMessage?: string;
  latestSummary: string | null;
  agentLabel: string;
  isMainRepo: boolean;
}

export interface WorkspaceActivityItem {
  id: 'summary' | 'runtime' | 'git' | 'lifecycle';
  emphasis: WorkspaceActivityItemEmphasis;
  title: string;
  body: string;
  meta?: string;
  timestamp?: string;
}

function normalizeSummary(summary: string | null | undefined) {
  if (!summary) {
    return null;
  }

  const normalized = summary.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function formatShortCommit(commit: string) {
  const normalized = commit.trim();
  return normalized.length > 7 ? normalized.slice(0, 7) : normalized;
}

function isMainWorkspace(row: WorkspaceDashboardRowLike, session?: Session) {
  return session?.isMainRepo === true
    || row.branchName === 'main'
    || row.workspaceLabel.trim().toLowerCase() === 'main workspace';
}

function formatGitSummary(row: WorkspaceDashboardRowLike) {
  const parts: string[] = [];

  if (row.commitsAhead > 0) {
    parts.push(`${row.commitsAhead} ahead`);
  }

  if (row.commitsBehind > 0) {
    parts.push(`${row.commitsBehind} behind`);
  }

  if (row.hasUncommittedChanges) {
    parts.push('uncommitted changes');
  }

  if (parts.length === 0) {
    return 'Up to date';
  }

  return parts.join(', ');
}

function formatRuntimeBody(session: Session | undefined, row: WorkspaceDashboardRowLike) {
  const message = session?.statusMessage?.trim();
  if (message) {
    return message;
  }

  return row.runtimeStatus === 'unknown'
    ? 'No runtime status available yet.'
    : `Current runtime status is ${row.runtimeStatus}.`;
}

function buildLifecycleItem(row: WorkspaceDashboardRowLike): WorkspaceActivityItem {
  const timestamp = row.lastActivity ?? row.createdAt;
  const body = row.lastActivity
    ? 'Recent workspace activity is available in this session.'
    : row.createdAt
      ? 'Workspace has been created and is ready for inspection.'
      : 'No recent workspace activity yet.';

  return {
    id: 'lifecycle',
    emphasis: 'default',
    title: 'Recent activity',
    body,
    timestamp,
  };
}

export function resolveSelectedWorkspaceId(
  input: ResolveSelectedWorkspaceIdInput,
) {
  if (input.visibleWorkspaceIds.length === 0) {
    return null;
  }

  const visibleWorkspaceIdSet = new Set(input.visibleWorkspaceIds);

  for (const preferredWorkspaceId of input.preferredWorkspaceIds ?? []) {
    if (visibleWorkspaceIdSet.has(preferredWorkspaceId)) {
      return preferredWorkspaceId;
    }
  }

  if (
    input.previousSelectedWorkspaceId
    && visibleWorkspaceIdSet.has(input.previousSelectedWorkspaceId)
  ) {
    return input.previousSelectedWorkspaceId;
  }

  return input.visibleWorkspaceIds[0] ?? null;
}

export function getLatestSessionSummary(session: Session | undefined) {
  if (!session) {
    return null;
  }

  const latestSummaryMessage = [...(session.jsonMessages ?? [])]
    .reverse()
    .find((message) => typeof message.summary === 'string' && message.summary.trim().length > 0);

  const summary = normalizeSummary(latestSummaryMessage?.summary);
  if (summary) {
    return summary;
  }

  return normalizeSummary(session.statusMessage);
}

export function getActivityAgentLabel(session: Session | undefined) {
  if (session?.toolType === 'claude') {
    return 'Claude CLI';
  }

  if (session?.name?.toLowerCase().includes('codex')) {
    return 'Codex CLI';
  }

  return 'Agent CLI';
}

export function buildWorkspaceDetailModel(
  row: WorkspaceDashboardRowLike,
  session?: Session,
): WorkspaceDetailModel {
  const latestSummary = getLatestSessionSummary(session);
  const isMainRepo = isMainWorkspace(row, session);

  return {
    sessionId: row.sessionId,
    workspaceLabel: row.workspaceLabel,
    workspaceType: isMainRepo ? 'main' : 'standard',
    runtimeStatus: session?.status ?? row.runtimeStatus,
    worktreePath: row.worktreePath,
    branchName: row.branchName,
    baseBranch: row.baseBranch || session?.baseBranch || '',
    baseCommit: row.baseCommit,
    shortBaseCommit: formatShortCommit(row.baseCommit),
    commitsAhead: row.commitsAhead,
    commitsBehind: row.commitsBehind,
    hasUncommittedChanges: row.hasUncommittedChanges,
    isStale: row.isStale,
    staleSince: row.staleSince,
    pullRequest: row.pullRequest,
    createdAt: session?.createdAt ?? row.createdAt,
    lastActivity: session?.lastActivity ?? row.lastActivity,
    statusMessage: session?.statusMessage?.trim() || undefined,
    latestSummary,
    agentLabel: getActivityAgentLabel(session),
    isMainRepo,
  };
}

export function buildWorkspaceActivityItems(
  row: WorkspaceDashboardRowLike,
  session?: Session,
) {
  const detail = buildWorkspaceDetailModel(row, session);
  const items: WorkspaceActivityItem[] = [];

  if (detail.latestSummary) {
    items.push({
      id: 'summary',
      emphasis: 'primary',
      title: 'Latest summary',
      body: detail.latestSummary,
      meta: detail.agentLabel,
      timestamp: detail.lastActivity,
    });
  }

  items.push({
    id: 'runtime',
    emphasis: 'default',
    title: 'Runtime status',
    body: formatRuntimeBody(session, row),
    meta: detail.runtimeStatus,
    timestamp: detail.lastActivity ?? detail.createdAt,
  });

  items.push({
    id: 'git',
    emphasis:
      detail.hasUncommittedChanges || detail.commitsBehind > 0 || detail.isStale
        ? 'warning'
        : 'default',
    title: 'Git status',
    body: formatGitSummary(row),
    meta: detail.pullRequest ? `PR #${detail.pullRequest.number}` : undefined,
    timestamp: detail.staleSince,
  });

  if (!detail.latestSummary) {
    items.push(buildLifecycleItem(row));
  }

  return items;
}
