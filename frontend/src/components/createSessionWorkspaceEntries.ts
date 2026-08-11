import type { Session } from '../types/session';

export interface WorkspaceEntry {
  id: string;
  name: string;
  userEdited: boolean;
}

export function createWorkspaceEntry(id: number, name: string, userEdited = false): WorkspaceEntry {
  return {
    id: `workspace-${id}`,
    name,
    userEdited,
  };
}

export function getSuggestionBaseName(branchName?: string) {
  const trimmedBranchName = branchName?.trim();
  if (!trimmedBranchName) {
    return 'workspace';
  }

  const baseName = trimmedBranchName.replace(/^[^/]+\//, '').trim();
  return baseName || 'workspace';
}

export function getUniqueWorkspaceName(baseName: string, reservedNames: Set<string>) {
  const normalizedBaseName = baseName.trim() || 'workspace';

  if (!reservedNames.has(normalizedBaseName.toLowerCase())) {
    return normalizedBaseName;
  }

  let suffix = 2;
  while (reservedNames.has(`${normalizedBaseName}-${suffix}`.toLowerCase())) {
    suffix += 1;
  }

  return `${normalizedBaseName}-${suffix}`;
}

export function applySuggestedNamesToUneditedEntries(
  entries: WorkspaceEntry[],
  branchName: string | undefined,
  existingSessions: Session[],
) {
  const reservedNames = new Set(
    existingSessions.map((session) => session.name.trim().toLowerCase()).filter(Boolean),
  );
  const baseName = getSuggestionBaseName(branchName);

  return entries.map((entry) => {
    if (entry.userEdited) {
      const trimmedName = entry.name.trim().toLowerCase();
      if (trimmedName) {
        reservedNames.add(trimmedName);
      }
      return entry;
    }

    const suggestedName = getUniqueWorkspaceName(baseName, reservedNames);
    reservedNames.add(suggestedName.toLowerCase());
    return {
      ...entry,
      name: suggestedName,
    };
  });
}
