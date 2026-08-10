import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Clock3,
  FolderOpen,
  Pin,
  Search,
  Sparkles,
  Star,
  Workflow,
} from 'lucide-react';
import type { Project } from './types/project';
import { useSessionStore } from './stores/sessionStore';
import { useNavigationStore } from './stores/navigationStore';
import { API } from './utils/api';
import { Button } from './components/ui/Button';
import {
  getWorkspaceCountLabel,
  useI18n,
} from './I18nContext';
import type { TranslationKey } from './i18n';

type StartupEntryMode = 'home' | 'default-project' | 'default-workspace';
type ProjectFilter = 'all' | 'recent' | 'favorites' | 'bookmarks';

interface DemoState {
  favoriteProjectIds: number[];
  bookmarkProjectIds: number[];
  recentProjectIds: number[];
  defaultProjectId: number | null;
  defaultWorkspaceByProjectId: Record<number, string>;
  startupEntryMode: StartupEntryMode;
  restoreLastProject: boolean;
  lastOpenedProjectId: number | null;
}

const STORAGE_KEY = 'zync-project-entry-demo';
const MAX_RECENT_PROJECTS = 6;

const DEFAULT_STATE: DemoState = {
  favoriteProjectIds: [],
  bookmarkProjectIds: [],
  recentProjectIds: [],
  defaultProjectId: null,
  defaultWorkspaceByProjectId: {},
  startupEntryMode: 'default-project',
  restoreLastProject: true,
  lastOpenedProjectId: null,
};

function loadDemoState(): DemoState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(saved) as Partial<DemoState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      favoriteProjectIds: parsed.favoriteProjectIds ?? DEFAULT_STATE.favoriteProjectIds,
      bookmarkProjectIds: parsed.bookmarkProjectIds ?? DEFAULT_STATE.bookmarkProjectIds,
      recentProjectIds: parsed.recentProjectIds ?? DEFAULT_STATE.recentProjectIds,
      defaultWorkspaceByProjectId: parsed.defaultWorkspaceByProjectId ?? DEFAULT_STATE.defaultWorkspaceByProjectId,
    };
  } catch (error) {
    console.error('[ProjectEntryDemo] Failed to load demo state:', error);
    return DEFAULT_STATE;
  }
}

function saveDemoState(state: DemoState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toggleNumberInList(list: number[], value: number): number[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function moveToFront(list: number[], value: number): number[] {
  return [value, ...list.filter((item) => item !== value)].slice(0, MAX_RECENT_PROJECTS);
}

function ProjectPill({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-border-secondary bg-surface-primary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
    >
      {label}
    </button>
  );
}

export function ProjectEntryDemo() {
  const { t } = useI18n();
  const sessions = useSessionStore((state) => state.sessions);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const navigateToProject = useNavigationStore((state) => state.navigateToProject);
  const navigateToSessions = useNavigationStore((state) => state.navigateToSessions);

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [demoState, setDemoState] = useState<DemoState>(() => loadDemoState());

  useEffect(() => {
    saveDemoState(demoState);
  }, [demoState]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!window.electronAPI?.projects?.getAll) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await API.projects.getAll();
        if (response.success && response.data) {
          setProjects(response.data);
        }
      } catch (error) {
        console.error('[ProjectEntryDemo] Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();

    const handleProjectChanged = () => {
      fetchProjects();
    };

    window.addEventListener('project-changed', handleProjectChanged);
    window.addEventListener('project-sessions-refresh', handleProjectChanged);

    return () => {
      window.removeEventListener('project-changed', handleProjectChanged);
      window.removeEventListener('project-sessions-refresh', handleProjectChanged);
    };
  }, []);

  const workspaceSessionsByProject = useMemo(() => {
    const map = new Map<number, typeof sessions>();

    sessions
      .filter((session) => session.projectId && !session.archived && !session.isMainRepo)
      .forEach((session) => {
        const projectId = session.projectId!;
        const current = map.get(projectId) ?? [];
        current.push(session);
        map.set(projectId, current);
      });

    return map;
  }, [sessions]);

  const recentOrder = useMemo(() => {
    const order = new Map<number, number>();
    demoState.recentProjectIds.forEach((projectId, index) => {
      order.set(projectId, index);
    });
    return order;
  }, [demoState.recentProjectIds]);

  const activeProjectId = useMemo(() => {
    return projects.find((project) => project.active)?.id ?? null;
  }, [projects]);

  const defaultProjectSessions = useMemo(() => {
    if (!demoState.defaultProjectId) {
      return [];
    }

    return workspaceSessionsByProject.get(demoState.defaultProjectId) ?? [];
  }, [demoState.defaultProjectId, workspaceSessionsByProject]);

  const recentProjects = useMemo(() => {
    return demoState.recentProjectIds
      .map((projectId) => projects.find((project) => project.id === projectId))
      .filter((project): project is Project => Boolean(project));
  }, [demoState.recentProjectIds, projects]);

  const favoriteProjects = useMemo(() => {
    return projects.filter((project) => demoState.favoriteProjectIds.includes(project.id));
  }, [projects, demoState.favoriteProjectIds]);

  const bookmarkedProjects = useMemo(() => {
    return projects.filter((project) => demoState.bookmarkProjectIds.includes(project.id));
  }, [projects, demoState.bookmarkProjectIds]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...projects]
      .filter((project) => {
        if (filter === 'recent' && !demoState.recentProjectIds.includes(project.id)) {
          return false;
        }
        if (filter === 'favorites' && !demoState.favoriteProjectIds.includes(project.id)) {
          return false;
        }
        if (filter === 'bookmarks' && !demoState.bookmarkProjectIds.includes(project.id)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return (
          project.name.toLowerCase().includes(normalizedQuery) ||
          project.path.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((left, right) => {
        const leftRecentIndex = recentOrder.get(left.id);
        const rightRecentIndex = recentOrder.get(right.id);
        const leftScore =
          (left.id === demoState.defaultProjectId ? 100 : 0) +
          (demoState.favoriteProjectIds.includes(left.id) ? 40 : 0) +
          (demoState.bookmarkProjectIds.includes(left.id) ? 20 : 0) +
          (leftRecentIndex !== undefined ? Math.max(0, 10 - leftRecentIndex) : 0);
        const rightScore =
          (right.id === demoState.defaultProjectId ? 100 : 0) +
          (demoState.favoriteProjectIds.includes(right.id) ? 40 : 0) +
          (demoState.bookmarkProjectIds.includes(right.id) ? 20 : 0) +
          (rightRecentIndex !== undefined ? Math.max(0, 10 - rightRecentIndex) : 0);

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return left.name.localeCompare(right.name);
      });
  }, [
    projects,
    query,
    filter,
    demoState.defaultProjectId,
    demoState.favoriteProjectIds,
    demoState.bookmarkProjectIds,
    demoState.recentProjectIds,
    recentOrder,
  ]);

  const startupSummary = useMemo(() => {
    const lastOpenedProject = projects.find((project) => project.id === demoState.lastOpenedProjectId) ?? null;
    const defaultProject = projects.find((project) => project.id === demoState.defaultProjectId) ?? null;
    const defaultWorkspaceId = defaultProject ? demoState.defaultWorkspaceByProjectId[defaultProject.id] : undefined;
    const defaultWorkspace = defaultProjectSessions.find((session) => session.id === defaultWorkspaceId) ?? null;

    if (demoState.restoreLastProject && lastOpenedProject) {
      return t('home.projectEntryDemo.summary.lastProject').replace('{name}', lastOpenedProject.name);
    }

    if (demoState.startupEntryMode === 'home') {
      return t('home.projectEntryDemo.summary.home');
    }

    if (demoState.startupEntryMode === 'default-workspace') {
      if (defaultProject && defaultWorkspace) {
        return t('home.projectEntryDemo.summary.defaultWorkspace')
          .replace('{project}', defaultProject.name)
          .replace('{workspace}', defaultWorkspace.name);
      }

      if (defaultProject) {
        return t('home.projectEntryDemo.summary.defaultProjectFallback').replace('{name}', defaultProject.name);
      }
    }

    if (defaultProject) {
      return t('home.projectEntryDemo.summary.defaultProject').replace('{name}', defaultProject.name);
    }

    return t('home.projectEntryDemo.summary.notConfigured');
  }, [demoState, projects, defaultProjectSessions, t]);

  const patchDemoState = (updater: (state: DemoState) => DemoState) => {
    setDemoState((current) => updater(current));
  };

  const markProjectOpened = (projectId: number) => {
    patchDemoState((current) => ({
      ...current,
      recentProjectIds: moveToFront(current.recentProjectIds, projectId),
      lastOpenedProjectId: projectId,
    }));
  };

  const activateProject = async (project: Project) => {
    try {
      await API.projects.activate(project.id.toString());
      setProjects((current) =>
        current.map((item) => ({
          ...item,
          active: item.id === project.id,
        })),
      );
      window.dispatchEvent(new Event('project-changed'));
    } catch (error) {
      console.error('[ProjectEntryDemo] Failed to activate project:', error);
    }
  };

  const openProject = async (project: Project, workspaceId?: string) => {
    await activateProject(project);
    markProjectOpened(project.id);

    if (workspaceId) {
      await setActiveSession(workspaceId);
      navigateToSessions();
      return;
    }

    navigateToProject(project.id);
  };

  const previewStartupEntry = async () => {
    if (demoState.restoreLastProject && demoState.lastOpenedProjectId) {
      const lastProject = projects.find((project) => project.id === demoState.lastOpenedProjectId);
      if (lastProject) {
        const workspaceId = demoState.defaultWorkspaceByProjectId[lastProject.id];
        await openProject(lastProject, workspaceId);
        return;
      }
    }

    if (demoState.startupEntryMode === 'home') {
      await setActiveSession(null);
      navigateToSessions();
      return;
    }

    const defaultProject = projects.find((project) => project.id === demoState.defaultProjectId);
    if (!defaultProject) {
      return;
    }

    if (demoState.startupEntryMode === 'default-workspace') {
      const workspaceId = demoState.defaultWorkspaceByProjectId[defaultProject.id];
      await openProject(defaultProject, workspaceId);
      return;
    }

    await openProject(defaultProject);
  };

  const renderQuickAccessSection = (
    titleKey: TranslationKey,
    projectsForSection: Project[],
    emptyKey: TranslationKey,
    icon: React.ReactNode,
  ) => {
    return (
      <div className="rounded-xl border border-border-primary bg-surface-secondary p-4">
        <div className="mb-3 flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-text-primary">{t(titleKey)}</h3>
        </div>
        {projectsForSection.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {projectsForSection.map((project) => (
              <ProjectPill
                key={project.id}
                label={project.name}
                onClick={() => openProject(project, demoState.defaultWorkspaceByProjectId[project.id])}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">{t(emptyKey)}</p>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-interactive" />
            <h2 className="text-lg font-semibold text-text-primary">{t('home.projectEntryDemo.title')}</h2>
            <span className="rounded-full border border-interactive/30 bg-interactive/10 px-2 py-0.5 text-[11px] font-medium text-interactive">
              {t('home.projectEntryDemo.demoBadge')}
            </span>
          </div>
          <p className="text-sm text-text-tertiary">{t('home.projectEntryDemo.subtitle')}</p>
        </div>
        <p className="max-w-sm text-right text-xs text-text-tertiary">
          {t('home.projectEntryDemo.demoNote')}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-xl border border-border-primary bg-surface-secondary p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-interactive" />
            <h3 className="text-sm font-semibold text-text-primary">{t('home.projectEntryDemo.startup.title')}</h3>
          </div>
          <p className="text-xs leading-5 text-text-tertiary">{t('home.projectEntryDemo.startup.description')}</p>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-text-secondary">{t('home.projectEntryDemo.startup.entryLabel')}</span>
              <select
                value={demoState.startupEntryMode}
                onChange={(event) => {
                  const nextMode = event.target.value as StartupEntryMode;
                  patchDemoState((current) => ({
                    ...current,
                    startupEntryMode: nextMode,
                  }));
                }}
                className="w-full rounded-lg border border-border-secondary bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-interactive"
              >
                <option value="home">{t('home.projectEntryDemo.startup.entry.home')}</option>
                <option value="default-project">{t('home.projectEntryDemo.startup.entry.defaultProject')}</option>
                <option value="default-workspace">{t('home.projectEntryDemo.startup.entry.defaultWorkspace')}</option>
              </select>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border-secondary bg-surface-primary px-3 py-3">
              <input
                type="checkbox"
                checked={demoState.restoreLastProject}
                onChange={(event) => {
                  const checked = event.target.checked;
                  patchDemoState((current) => ({
                    ...current,
                    restoreLastProject: checked,
                  }));
                }}
                className="mt-0.5 rounded border-border-primary text-interactive focus:ring-interactive"
              />
              <div className="space-y-1">
                <span className="text-sm font-medium text-text-primary">{t('home.projectEntryDemo.startup.restoreLastProject')}</span>
                <p className="text-xs text-text-tertiary">{t('home.projectEntryDemo.startup.restoreLastProjectHint')}</p>
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-text-secondary">{t('home.projectEntryDemo.startup.defaultProject')}</span>
              <select
                value={demoState.defaultProjectId ?? ''}
                onChange={(event) => {
                  const nextProjectId = event.target.value ? Number(event.target.value) : null;
                  patchDemoState((current) => ({
                    ...current,
                    defaultProjectId: nextProjectId,
                  }));
                }}
                className="w-full rounded-lg border border-border-secondary bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-interactive"
              >
                <option value="">{t('home.projectEntryDemo.startup.defaultProjectPlaceholder')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-text-secondary">{t('home.projectEntryDemo.startup.defaultWorkspace')}</span>
              <select
                value={
                  demoState.defaultProjectId
                    ? demoState.defaultWorkspaceByProjectId[demoState.defaultProjectId] ?? ''
                    : ''
                }
                onChange={(event) => {
                  const defaultProjectId = demoState.defaultProjectId;
                  if (!defaultProjectId) {
                    return;
                  }

                  const workspaceId = event.target.value;
                  patchDemoState((current) => ({
                    ...current,
                    defaultWorkspaceByProjectId: {
                      ...current.defaultWorkspaceByProjectId,
                      [defaultProjectId]: workspaceId,
                    },
                  }));
                }}
                disabled={!demoState.defaultProjectId}
                className="w-full rounded-lg border border-border-secondary bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-interactive disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t('home.projectEntryDemo.startup.defaultWorkspacePlaceholder')}</option>
                {defaultProjectSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-border-secondary bg-surface-primary p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-text-tertiary">
              <Pin className="h-3.5 w-3.5" />
              {t('home.projectEntryDemo.startup.summaryLabel')}
            </div>
            <p className="text-sm leading-6 text-text-primary">{startupSummary}</p>
          </div>

          <Button variant="primary" size="sm" onClick={previewStartupEntry} fullWidth>
            {t('home.projectEntryDemo.startup.previewButton')}
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border border-border-primary bg-surface-secondary p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-interactive" />
            <h3 className="text-sm font-semibold text-text-primary">{t('home.projectEntryDemo.search.title')}</h3>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('home.projectEntryDemo.search.placeholder')}
                className="w-full rounded-lg border border-border-secondary bg-surface-primary py-2 pl-10 pr-3 text-sm text-text-primary outline-none transition-colors focus:border-interactive"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ['all', 'home.projectEntryDemo.search.filter.all'],
                ['recent', 'home.projectEntryDemo.search.filter.recent'],
                ['favorites', 'home.projectEntryDemo.search.filter.favorites'],
                ['bookmarks', 'home.projectEntryDemo.search.filter.bookmarks'],
              ] as Array<[ProjectFilter, TranslationKey]>).map(([value, labelKey]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === value
                      ? 'bg-interactive text-text-on-interactive'
                      : 'border border-border-secondary bg-surface-primary text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border-secondary bg-surface-primary px-4 py-8 text-center text-sm text-text-tertiary">
              {t('home.projectEntryDemo.loading')}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-secondary bg-surface-primary px-4 py-8 text-center text-sm text-text-tertiary">
              {t('home.projectEntryDemo.empty')}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-secondary bg-surface-primary px-4 py-8 text-center text-sm text-text-tertiary">
              {t('home.projectEntryDemo.search.emptyResults')}
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredProjects.map((project) => {
                const workspaceCount = workspaceSessionsByProject.get(project.id)?.length ?? 0;
                const defaultWorkspaceId = demoState.defaultWorkspaceByProjectId[project.id];
                const defaultWorkspace = (workspaceSessionsByProject.get(project.id) ?? []).find((session) => session.id === defaultWorkspaceId);
                const isFavorite = demoState.favoriteProjectIds.includes(project.id);
                const isBookmarked = demoState.bookmarkProjectIds.includes(project.id);
                const isDefaultProject = demoState.defaultProjectId === project.id;
                const isLastOpened = demoState.lastOpenedProjectId === project.id;
                const isActiveProject = activeProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-border-secondary bg-surface-primary p-4 transition-colors hover:border-interactive/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 flex-shrink-0 text-interactive" />
                          <h4 className="truncate text-sm font-semibold text-text-primary">{project.name}</h4>
                        </div>
                        <p className="truncate text-xs text-text-tertiary">{project.path}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            patchDemoState((current) => ({
                              ...current,
                              favoriteProjectIds: toggleNumberInList(current.favoriteProjectIds, project.id),
                            }));
                          }}
                          className={`rounded-md p-1.5 transition-colors ${
                            isFavorite
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'text-text-tertiary hover:bg-surface-hover hover:text-text-primary'
                          }`}
                          title={isFavorite ? t('home.projectEntryDemo.actions.removeFavorite') : t('home.projectEntryDemo.actions.addFavorite')}
                        >
                          <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            patchDemoState((current) => ({
                              ...current,
                              bookmarkProjectIds: toggleNumberInList(current.bookmarkProjectIds, project.id),
                            }));
                          }}
                          className={`rounded-md p-1.5 transition-colors ${
                            isBookmarked
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'text-text-tertiary hover:bg-surface-hover hover:text-text-primary'
                          }`}
                          title={isBookmarked ? t('home.projectEntryDemo.actions.removeBookmark') : t('home.projectEntryDemo.actions.addBookmark')}
                        >
                          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] text-text-secondary">
                        {getWorkspaceCountLabel(workspaceCount, t)}
                      </span>
                      {isActiveProject && (
                        <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-[11px] text-green-400">
                          {t('home.projectEntryDemo.badges.active')}
                        </span>
                      )}
                      {isDefaultProject && (
                        <span className="rounded-full bg-interactive/15 px-2.5 py-1 text-[11px] text-interactive">
                          {t('home.projectEntryDemo.badges.defaultProject')}
                        </span>
                      )}
                      {isLastOpened && (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-400">
                          {t('home.projectEntryDemo.badges.lastOpened')}
                        </span>
                      )}
                      {defaultWorkspace && (
                        <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-[11px] text-purple-300">
                          {t('home.projectEntryDemo.badges.defaultWorkspace').replace('{name}', defaultWorkspace.name)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={isDefaultProject ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          patchDemoState((current) => ({
                            ...current,
                            defaultProjectId: current.defaultProjectId === project.id ? null : project.id,
                          }));
                        }}
                      >
                        {isDefaultProject ? t('home.projectEntryDemo.actions.unsetDefault') : t('home.projectEntryDemo.actions.setDefault')}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => openProject(project, demoState.defaultWorkspaceByProjectId[project.id])}
                      >
                        {t('home.projectEntryDemo.actions.openProject')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {renderQuickAccessSection(
          'home.projectEntryDemo.quickAccess.recent',
          recentProjects,
          'home.projectEntryDemo.quickAccess.emptyRecent',
          <Clock3 className="h-4 w-4 text-text-tertiary" />,
        )}
        {renderQuickAccessSection(
          'home.projectEntryDemo.quickAccess.favorites',
          favoriteProjects,
          'home.projectEntryDemo.quickAccess.emptyFavorites',
          <Star className="h-4 w-4 text-amber-400" />,
        )}
        {renderQuickAccessSection(
          'home.projectEntryDemo.quickAccess.bookmarks',
          bookmarkedProjects,
          'home.projectEntryDemo.quickAccess.emptyBookmarks',
          <Bookmark className="h-4 w-4 text-blue-400" />,
        )}
      </div>
    </section>
  );
}
