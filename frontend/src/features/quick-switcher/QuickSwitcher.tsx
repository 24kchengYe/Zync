import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Clock,
  FileText,
  FolderOpen,
  GitBranch,
  Search,
  Star,
  Workflow,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Kbd } from '../../components/ui/Kbd';
import { useNavigationStore } from '../../stores/navigationStore';
import { useSessionHistoryStore } from '../../stores/sessionHistoryStore';
import { useSessionStore } from '../../stores/sessionStore';
import { API } from '../../utils/api';
import { cn } from '../../utils/cn';
import type { Project } from '../../types/project';
import type { Session } from '../../types/session';
import { getWorkspaceCountLabel, useI18n } from '../../I18nContext';
import {
  GROUP_ORDER,
  buildListRows,
  extractSessionSummary,
  formatRelativeTime,
  getBranchName,
  getMessageText,
  getSessionStatusLabel,
  getStatusTone,
  normalizeSearch,
  scoreFields,
  type ResultGroup,
  type ResultItem,
} from './quickSwitcherModel';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
}

function PreviewField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function PreviewBadge({
  label,
  variant = 'default',
}: {
  label: string;
  variant?: 'default' | 'favorite' | 'active';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        variant === 'favorite' && 'bg-amber-500/15 text-amber-300',
        variant === 'active' && 'bg-interactive/15 text-interactive',
        variant === 'default' && 'bg-surface-tertiary text-text-secondary',
      )}
    >
      {label}
    </span>
  );
}

export function QuickSwitcher({
  isOpen,
  onClose,
  projects,
}: QuickSwitcherProps) {
  const { language, t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeProjectId = useNavigationStore((state) => state.activeProjectId);
  const navigateToProject = useNavigationStore((state) => state.navigateToProject);
  const navigateToSessions = useNavigationStore((state) => state.navigateToSessions);
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const history = useSessionHistoryStore((state) => state.history);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const normalizedQuery = normalizeSearch(searchTerm);

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]));
  }, [projects]);

  const activeProject = useMemo(() => {
    if (activeProjectId) {
      return projectById.get(activeProjectId) ?? null;
    }

    return projects.find((project) => project.active) ?? null;
  }, [activeProjectId, projectById, projects]);

  const visibleSessions = useMemo(() => {
    return sessions.filter((session) => !session.archived);
  }, [sessions]);

  const recentSessions = useMemo(() => {
    const sessionById = new Map(visibleSessions.map((session) => [session.id, session]));
    const seenIds = new Set<string>();
    const deduped: Session[] = [];

    [...history]
      .sort((left, right) => right.timestamp - left.timestamp)
      .forEach((entry) => {
        if (seenIds.has(entry.sessionId)) {
          return;
        }

        const session = sessionById.get(entry.sessionId);
        if (session) {
          seenIds.add(entry.sessionId);
          deduped.push(session);
        }
      });

    return deduped;
  }, [history, visibleSessions]);

  const favoriteSessions = useMemo(() => {
    return visibleSessions.filter((session) => session.isFavorite);
  }, [visibleSessions]);

  const groupedResults = useMemo(() => {
    const favoriteIds = new Set(favoriteSessions.map((session) => session.id));
    const recentIds = new Set(
      recentSessions
        .filter((session) => !favoriteIds.has(session.id))
        .map((session) => session.id),
    );

    const recentItems = recentSessions
      .filter((session) => !favoriteIds.has(session.id))
      .map((session, index) => {
        const project = session.projectId != null ? projectById.get(session.projectId) : undefined;
        const score = scoreFields(
          [session.name, project?.name ?? '', project?.path ?? '', getBranchName(session)],
          normalizedQuery,
          Math.max(0, 50 - index * 3),
        );
        const badges: ResultItem['badges'] = ['recent'];
        if (session.id === activeSessionId) {
          badges.push('active-workspace');
        }

        const item: ResultItem = {
          id: `recent:${session.id}`,
          type: 'workspace',
          group: 'recent',
          score,
          title: session.name || t('common.untitled'),
          subtitle: project?.name ?? '',
          description: getBranchName(session),
          project,
          session,
          badges,
        };
        return item;
      })
      .filter((item) => item.score >= 0);

    const favoriteItems = favoriteSessions
      .map((session, index) => {
        const project = session.projectId != null ? projectById.get(session.projectId) : undefined;
        const score = scoreFields(
          [session.name, project?.name ?? '', project?.path ?? '', getBranchName(session)],
          normalizedQuery,
          Math.max(0, 56 - index * 3),
        );
        const badges: ResultItem['badges'] = ['favorite'];
        if (session.id === activeSessionId) {
          badges.push('active-workspace');
        }

        const item: ResultItem = {
          id: `favorite:${session.id}`,
          type: 'workspace',
          group: 'favorites',
          score,
          title: session.name || t('common.untitled'),
          subtitle: project?.name ?? '',
          description: getBranchName(session),
          project,
          session,
          badges,
        };
        return item;
      })
      .filter((item) => item.score >= 0);

    const projectItems = projects
      .map((project, index) => {
        const workspaceCount = visibleSessions.filter((session) => session.projectId === project.id).length;
        const score = scoreFields(
          [project.name, project.path],
          normalizedQuery,
          (project.id === activeProject?.id ? 24 : 0) + Math.max(0, 18 - index),
        );
        const badges: ResultItem['badges'] = [];
        if (project.id === activeProject?.id) {
          badges.push('active-project');
        }

        const item: ResultItem = {
          id: `project:${project.id}`,
          type: 'project',
          group: 'projects',
          score,
          title: project.name,
          subtitle: project.path,
          description: getWorkspaceCountLabel(workspaceCount, t),
          project,
          badges,
        };
        return item;
      })
      .filter((item) => item.score >= 0);

    const workspaceItems = visibleSessions
      .filter((session) => !favoriteIds.has(session.id) && !recentIds.has(session.id))
      .map((session, index) => {
        const project = session.projectId != null ? projectById.get(session.projectId) : undefined;
        const latestMessage = [...session.jsonMessages].reverse().map(getMessageText).find(Boolean);
        const summary = latestMessage ?? extractSessionSummary(session) ?? undefined;
        const score = scoreFields(
          [
            session.name,
            project?.name ?? '',
            project?.path ?? '',
            getBranchName(session),
            summary ?? '',
          ],
          normalizedQuery,
          (session.id === activeSessionId ? 22 : 0) + Math.max(0, 16 - index),
        );
        const badges: ResultItem['badges'] = [];
        if (session.id === activeSessionId) {
          badges.push('active-workspace');
        }

        const item: ResultItem = {
          id: `workspace:${session.id}`,
          type: 'workspace',
          group: 'workspaces',
          score,
          title: session.name || t('common.untitled'),
          subtitle: project?.name ?? '',
          description: getBranchName(session),
          project,
          session,
          badges,
        };
        return item;
      })
      .filter((item) => item.score >= 0);

    const limit = normalizedQuery ? 8 : 5;

    return GROUP_ORDER.map((group) => {
      const items =
        group === 'recent'
          ? recentItems
          : group === 'favorites'
            ? favoriteItems
            : group === 'projects'
              ? projectItems
              : workspaceItems;

      return {
        group,
        items: items.sort((left, right) => right.score - left.score).slice(0, limit),
      };
    }).filter((group) => group.items.length > 0);
  }, [
    activeProject?.id,
    activeSessionId,
    favoriteSessions,
    normalizedQuery,
    projectById,
    projects,
    recentSessions,
    t,
    visibleSessions,
  ]);

  const { rows, resultCount } = useMemo(() => buildListRows(groupedResults), [groupedResults]);

  const flatResults = useMemo(() => {
    return rows.flatMap((row) => (row.type === 'item' ? [row.item] : []));
  }, [rows]);

  const selectedItem = flatResults[selectedIndex] ?? null;

  const openResult = useCallback(
    async (item: ResultItem | null) => {
      if (!item) {
        return;
      }

      onClose();

      if (item.type === 'project' && item.project) {
        try {
          await API.projects.activate(String(item.project.id));
        } catch (error) {
          console.error('[QuickSwitcher] Failed to activate project:', error);
        }
        window.dispatchEvent(new Event('project-changed'));
        navigateToProject(item.project.id);
        return;
      }

      if (item.session) {
        if (item.session.projectId != null) {
          try {
            await API.projects.activate(String(item.session.projectId));
          } catch (error) {
            console.error('[QuickSwitcher] Failed to activate workspace project:', error);
          }
          window.dispatchEvent(new Event('project-changed'));
        }

        navigateToSessions();
        await setActiveSession(item.session.id);
      }
    },
    [navigateToProject, navigateToSessions, onClose, setActiveSession],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchTerm('');
    setSelectedIndex(0);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (selectedIndex >= resultCount) {
      setSelectedIndex(Math.max(0, resultCount - 1));
    }
  }, [resultCount, selectedIndex]);

  useEffect(() => {
    const selectedElement = listRef.current?.querySelector('[data-selected="true"]');
    if (selectedElement instanceof HTMLElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (resultCount === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % resultCount);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + resultCount) % resultCount);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      void openResult(selectedItem);
    }
  };

  const groupLabels: Record<ResultGroup, string> = {
    recent: t('quickSwitcher.group.recent'),
    favorites: t('quickSwitcher.group.favorites'),
    projects: t('quickSwitcher.group.projects'),
    workspaces: t('quickSwitcher.group.workspaces'),
  };

  const badgeLabels = {
    recent: t('quickSwitcher.badge.recent'),
    favorite: t('quickSwitcher.badge.favorite'),
    activeProject: t('quickSwitcher.badge.activeProject'),
    activeWorkspace: t('quickSwitcher.badge.activeWorkspace'),
  };

  const previewProjectSessions = useMemo(() => {
    if (!selectedItem?.project) {
      return [];
    }

    return visibleSessions
      .filter((session) => session.projectId === selectedItem.project?.id)
      .sort((left, right) => {
        const leftTime = new Date(left.lastActivity ?? left.createdAt).getTime();
        const rightTime = new Date(right.lastActivity ?? right.createdAt).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 3);
  }, [selectedItem?.project, visibleSessions]);

  const renderWorkspacePreview = (item: ResultItem) => {
    if (!item.session) {
      return null;
    }

    const { session } = item;
    const project = item.project;
    const summary = extractSessionSummary(session);
    const gitStatus = session.gitStatus;
    const changeParts: string[] = [];

    if (gitStatus?.filesChanged) {
      changeParts.push(`${gitStatus.filesChanged} files`);
    }
    if ((gitStatus?.additions ?? 0) > 0) {
      changeParts.push(`+${gitStatus?.additions}`);
    }
    if ((gitStatus?.deletions ?? 0) > 0) {
      changeParts.push(`-${gitStatus?.deletions}`);
    }
    if (gitStatus?.hasUntrackedFiles) {
      changeParts.push('untracked');
    }

    const changesLabel =
      changeParts.length > 0 ? changeParts.join(' / ') : t('quickSwitcher.preview.clean');

    return (
      <>
        <div className="space-y-3 border-b border-border-primary px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-text-primary">
                {session.name || t('common.untitled')}
              </p>
              <p className="mt-1 truncate text-sm text-text-secondary">
                {project?.path ?? session.worktreePath}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                void openResult(item);
              }}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              {t('quickSwitcher.preview.openWorkspace')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {item.badges.includes('recent') && <PreviewBadge label={badgeLabels.recent} />}
            {item.badges.includes('favorite') && (
              <PreviewBadge label={badgeLabels.favorite} variant="favorite" />
            )}
            {item.badges.includes('active-workspace') && (
              <PreviewBadge label={badgeLabels.activeWorkspace} variant="active" />
            )}
            <PreviewBadge
              label={getSessionStatusLabel(session, language)}
              variant={getStatusTone(session) === 'neutral' ? 'default' : 'active'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-4">
          <PreviewField
            icon={<FolderOpen className="h-3.5 w-3.5" />}
            label={t('quickSwitcher.preview.project')}
            value={project?.name ?? '--'}
          />
          <PreviewField
            icon={<GitBranch className="h-3.5 w-3.5" />}
            label={t('quickSwitcher.preview.branch')}
            value={getBranchName(session) || '--'}
          />
          <PreviewField
            icon={<Activity className="h-3.5 w-3.5" />}
            label={t('quickSwitcher.preview.status')}
            value={getSessionStatusLabel(session, language)}
          />
          <PreviewField
            icon={<FileText className="h-3.5 w-3.5" />}
            label={t('quickSwitcher.preview.changes')}
            value={changesLabel}
          />
          <PreviewField
            icon={<Clock className="h-3.5 w-3.5" />}
            label={t('quickSwitcher.preview.lastActivity')}
            value={formatRelativeTime(session.lastActivity ?? session.createdAt)}
          />
        </div>

        <div className="border-t border-border-primary px-5 py-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
            <FileText className="h-3.5 w-3.5" />
            <span>{t('quickSwitcher.preview.lastOutput')}</span>
          </div>
          <p className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-3 text-sm leading-6 text-text-secondary">
            {summary ?? t('quickSwitcher.preview.noOutput')}
          </p>
        </div>
      </>
    );
  };

  const renderProjectPreview = (item: ResultItem) => {
    if (!item.project) {
      return null;
    }

    const projectWorkspaceCount = visibleSessions.filter(
      (session) => session.projectId === item.project?.id,
    ).length;
    const runningCount = visibleSessions.filter(
      (session) =>
        session.projectId === item.project?.id &&
        (session.status === 'running' || session.status === 'waiting' || session.status === 'initializing'),
    ).length;

    return (
      <>
        <div className="space-y-3 border-b border-border-primary px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-text-primary">{item.project.name}</p>
              <p className="mt-1 truncate text-sm text-text-secondary">{item.project.path}</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                void openResult(item);
              }}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              {t('quickSwitcher.preview.openProject')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {item.badges.includes('active-project') && (
              <PreviewBadge label={badgeLabels.activeProject} variant="active" />
            )}
            <PreviewBadge label={getWorkspaceCountLabel(projectWorkspaceCount, t)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-4">
          <PreviewField
            icon={<FolderOpen className="h-3.5 w-3.5" />}
            label={t('quickSwitcher.preview.path')}
            value={item.project.path}
          />
          <PreviewField
            icon={<Workflow className="h-3.5 w-3.5" />}
            label={t('quickSwitcher.preview.workspaceCount')}
            value={getWorkspaceCountLabel(projectWorkspaceCount, t)}
          />
          <PreviewField
            icon={<Activity className="h-3.5 w-3.5" />}
            label={t('quickSwitcher.preview.runningCount')}
            value={`${runningCount}`}
          />
        </div>

        <div className="border-t border-border-primary px-5 py-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
            <Clock className="h-3.5 w-3.5" />
            <span>{t('quickSwitcher.preview.recentWorkspaces')}</span>
          </div>

          {previewProjectSessions.length === 0 ? (
            <p className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-3 text-sm text-text-secondary">
              {t('quickSwitcher.preview.noProjectWorkspaces')}
            </p>
          ) : (
            <div className="space-y-2">
              {previewProjectSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    const sessionItem = flatResults.find((result) => result.session?.id === session.id);
                    if (sessionItem) {
                      void openResult(sessionItem);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-left transition-colors hover:bg-surface-hover"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {session.name || t('common.untitled')}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {getBranchName(session) || '--'}
                    </p>
                  </div>
                  <span className="ml-3 text-xs text-text-secondary">
                    {getSessionStatusLabel(session, language)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      className="!max-w-6xl !overflow-hidden"
    >
      <div className="border-b border-border-primary px-5 py-4">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-text-primary">{t('quickSwitcher.title')}</h2>
          <p className="text-sm text-text-secondary">{t('quickSwitcher.subtitle')}</p>
        </div>

        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('quickSwitcher.placeholder')}
          fullWidth
          icon={<Search className="h-4 w-4" />}
          className="border-border-primary bg-surface-secondary"
        />
      </div>

      <div className="grid min-h-[560px] grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="border-b border-border-primary md:border-b-0 md:border-r">
          <div ref={listRef} className="max-h-[560px] overflow-y-auto py-2">
            {resultCount === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-text-tertiary">
                {t('quickSwitcher.empty')}
              </div>
            ) : (
              rows.map((row) => {
                if (row.type === 'header') {
                  return (
                    <div
                      key={`header:${row.group}`}
                      className="px-5 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary"
                    >
                      {groupLabels[row.group]}
                    </div>
                  );
                }

                const isSelected = row.flatIndex === selectedIndex;
                const icon =
                  row.item.type === 'project' ? (
                    <FolderOpen className="h-4 w-4" />
                  ) : row.item.group === 'favorites' ? (
                    <Star className="h-4 w-4" />
                  ) : (
                    <Workflow className="h-4 w-4" />
                  );

                return (
                  <button
                    key={row.item.id}
                    type="button"
                    data-selected={isSelected}
                    onMouseEnter={() => setSelectedIndex(row.flatIndex)}
                    onClick={() => {
                      void openResult(row.item);
                    }}
                    className={cn(
                      'mx-2 flex w-[calc(100%-16px)] items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                      isSelected
                        ? 'bg-interactive/10 text-text-primary'
                        : 'text-text-secondary hover:bg-surface-hover',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 rounded-lg p-2',
                        isSelected ? 'bg-interactive/15 text-interactive' : 'bg-surface-secondary text-text-tertiary',
                      )}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{row.item.title}</p>
                        {row.item.badges.includes('favorite') && (
                          <PreviewBadge label={badgeLabels.favorite} variant="favorite" />
                        )}
                        {row.item.badges.includes('recent') && <PreviewBadge label={badgeLabels.recent} />}
                        {row.item.badges.includes('active-project') && (
                          <PreviewBadge label={badgeLabels.activeProject} variant="active" />
                        )}
                        {row.item.badges.includes('active-workspace') && (
                          <PreviewBadge label={badgeLabels.activeWorkspace} variant="active" />
                        )}
                      </div>
                      <p className="truncate text-xs text-text-tertiary">{row.item.subtitle || '--'}</p>
                      {row.item.description && (
                        <p className="mt-1 truncate text-xs text-text-secondary">{row.item.description}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-surface-primary">
          {selectedItem ? (
            selectedItem.type === 'project'
              ? renderProjectPreview(selectedItem)
              : renderWorkspacePreview(selectedItem)
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-tertiary">
              {t('quickSwitcher.empty')}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-border-primary px-5 py-3 text-xs text-text-muted">
        <span>
          <Kbd size="xs">Up/Down</Kbd> {t('quickSwitcher.footer.navigate')}
        </span>
        <span>
          <Kbd size="xs">Enter</Kbd> {t('quickSwitcher.footer.open')}
        </span>
        <span>
          <Kbd size="xs">Esc</Kbd> {t('quickSwitcher.footer.close')}
        </span>
      </div>
    </Modal>
  );
}
