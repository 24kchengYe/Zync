import type { Session } from '../../frontend/src/types/session';
import {
  getActivityAgentLabel,
  getLatestSessionSummary,
} from './WorkspaceDashboardDetailState';
import type {
  ProjectActivityRuntimeStatus,
  ProjectActivityStreamEntry,
} from './ProjectActivityStreamDemoState';

export type ProjectActivityStreamView = 'raw' | 'semantic' | 'summary';
export type ProjectActivitySummarySignal = 'summary' | 'semantic' | 'raw' | 'none';

export interface ProjectActivityStreamWorkspaceRow {
  sessionId: string;
  workspaceLabel: string;
  pathLabel: string;
  branchName: string;
  runtimeStatus: ProjectActivityRuntimeStatus;
  hasUncommittedChanges: boolean;
  isStale: boolean;
  lastActivity?: string;
  createdAt?: string;
}

export interface ProjectActivitySummaryCard {
  sessionId: string;
  workspaceLabel: string;
  pathLabel: string;
  branchName: string;
  runtimeStatus: ProjectActivityRuntimeStatus;
  hasUncommittedChanges: boolean;
  isStale: boolean;
  latestSummary: string | null;
  latestRawEntry: ProjectActivityStreamEntry | null;
  latestSemanticEntry: ProjectActivityStreamEntry | null;
  latestSignal: ProjectActivitySummarySignal;
  updatedAt?: string;
  agentLabel: string;
}

export interface ProjectActivityStreamViews {
  rawEntries: ProjectActivityStreamEntry[];
  semanticEntries: ProjectActivityStreamEntry[];
  summaryCards: ProjectActivitySummaryCard[];
}

export interface DeriveProjectActivityStreamViewsInput {
  entries: ProjectActivityStreamEntry[];
  visibleWorkspaceRows: ProjectActivityStreamWorkspaceRow[];
  sessions: Session[];
}

function getLatestEntryForSession(
  entries: ProjectActivityStreamEntry[],
  sessionId: string,
  predicate?: (entry: ProjectActivityStreamEntry) => boolean,
) {
  return (
    entries.find((entry) => {
      if (entry.sessionId !== sessionId) {
        return false;
      }

      return predicate ? predicate(entry) : true;
    }) ?? null
  );
}

function getLatestSignal(
  latestSummary: string | null,
  latestSemanticEntry: ProjectActivityStreamEntry | null,
  latestRawEntry: ProjectActivityStreamEntry | null,
): ProjectActivitySummarySignal {
  if (latestSummary) {
    return 'summary';
  }

  if (latestSemanticEntry) {
    return 'semantic';
  }

  if (latestRawEntry) {
    return 'raw';
  }

  return 'none';
}

export function deriveProjectActivityStreamViews(
  input: DeriveProjectActivityStreamViewsInput,
): ProjectActivityStreamViews {
  const sessionMap = new Map(input.sessions.map((session) => [session.id, session]));
  const rawEntries = input.entries.slice();
  const semanticEntries = input.entries.filter((entry) => entry.source !== 'heartbeat');

  const summaryCards = input.visibleWorkspaceRows.map((workspace) => {
    const session = sessionMap.get(workspace.sessionId);
    const latestSummary = getLatestSessionSummary(session);
    const latestRawEntry = getLatestEntryForSession(rawEntries, workspace.sessionId);
    const latestSemanticEntry = getLatestEntryForSession(
      semanticEntries,
      workspace.sessionId,
    );

    return {
      sessionId: workspace.sessionId,
      workspaceLabel: workspace.workspaceLabel,
      pathLabel: workspace.pathLabel,
      branchName: workspace.branchName,
      runtimeStatus: workspace.runtimeStatus,
      hasUncommittedChanges: workspace.hasUncommittedChanges,
      isStale: workspace.isStale,
      latestSummary,
      latestRawEntry,
      latestSemanticEntry,
      latestSignal: getLatestSignal(
        latestSummary,
        latestSemanticEntry,
        latestRawEntry,
      ),
      updatedAt:
        latestSemanticEntry?.createdAt
        ?? latestRawEntry?.createdAt
        ?? workspace.lastActivity
        ?? workspace.createdAt,
      agentLabel:
        latestSemanticEntry?.agentLabel
        ?? latestRawEntry?.agentLabel
        ?? getActivityAgentLabel(session),
    };
  });

  return {
    rawEntries,
    semanticEntries,
    summaryCards,
  };
}
