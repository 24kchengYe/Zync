import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Project } from '../../frontend/src/types/project';
import type { Session } from '../../frontend/src/types/session';
import { useSessionStore } from '../../frontend/src/stores/sessionStore';
import { useNavigationStore } from '../../frontend/src/stores/navigationStore';
import { API } from '../../frontend/src/utils/api';

export type StartupEntryMode = 'home' | 'default-project' | 'default-workspace';
export type ProjectFilter = 'all' | 'recent' | 'favorites' | 'bookmarks';

export interface DemoState {
  favoriteProjectIds: number[];
  bookmarkProjectIds: number[];
  recentProjectIds: number[];
  defaultProjectId: number | null;
  defaultWorkspaceByProjectId: Record<number, string>;
  startupEntryMode: StartupEntryMode;
  startupQuickTarget: string;
  restoreLastProject: boolean;
  lastOpenedProjectId: number | null;
  sidebarSearchQuery: string;
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
  startupQuickTarget: 'last-opened',
  restoreLastProject: true,
  lastOpenedProjectId: null,
  sidebarSearchQuery: '',
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
      startupQuickTarget: parsed.startupQuickTarget ?? DEFAULT_STATE.startupQuickTarget,
      sidebarSearchQuery: parsed.sidebarSearchQuery ?? DEFAULT_STATE.sidebarSearchQuery,
    };
  } catch (error) {
    console.error('[ProjectEntryState] Failed to load demo state:', error);
    return DEFAULT_STATE;
  }
}

function saveDemoState(state: DemoState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let demoStateCache = loadDemoState();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return demoStateCache;
}

function updateStoredDemoState(updater: (state: DemoState) => DemoState) {
  demoStateCache = updater(demoStateCache);
  saveDemoState(demoStateCache);
  listeners.forEach((listener) => listener());
}

export function toggleNumberInList(list: number[], value: number): number[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function moveToFront(list: number[], value: number): number[] {
  return [value, ...list.filter((item) => item !== value)].slice(0, MAX_RECENT_PROJECTS);
}

function groupSessionsByProject(sessions: Session[]) {
  const map = new Map<number, Session[]>();

  sessions
    .filter((session) => session.projectId && !session.archived && !session.isMainRepo)
    .forEach((session) => {
      const projectId = session.projectId!;
      const current = map.get(projectId) ?? [];
      current.push(session);
      map.set(projectId, current);
    });

  return map;
}

export function useProjectEntryDemoData() {
  const sessions = useSessionStore((state) => state.sessions);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const navigateToProject = useNavigationStore((state) => state.navigateToProject);
  const navigateToProjectDashboard = useNavigationStore((state) => state.navigateToProjectDashboard);
  const navigateToSessions = useNavigationStore((state) => state.navigateToSessions);
  const demoState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const patchDemoState = useCallback((updater: (state: DemoState) => DemoState) => {
    updateStoredDemoState(updater);
  }, []);

  const loadProjects = useCallback(async () => {
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
      console.error('[ProjectEntryState] Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();

    const handleProjectChanged = () => {
      loadProjects();
    };

    window.addEventListener('project-changed', handleProjectChanged);
    window.addEventListener('project-sessions-refresh', handleProjectChanged);

    return () => {
      window.removeEventListener('project-changed', handleProjectChanged);
      window.removeEventListener('project-sessions-refresh', handleProjectChanged);
    };
  }, [loadProjects]);

  const workspaceSessionsByProject = useMemo(() => groupSessionsByProject(sessions), [sessions]);

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

  const markProjectOpened = useCallback((projectId: number) => {
    patchDemoState((current) => ({
      ...current,
      recentProjectIds: moveToFront(current.recentProjectIds, projectId),
      lastOpenedProjectId: projectId,
    }));
  }, [patchDemoState]);

  const activateProject = useCallback(async (project: Project) => {
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
      console.error('[ProjectEntryState] Failed to activate project:', error);
    }
  }, []);

  const openProject = useCallback(async (project: Project, workspaceId?: string) => {
    await activateProject(project);
    markProjectOpened(project.id);

    if (workspaceId) {
      await setActiveSession(workspaceId);
      navigateToSessions();
      return;
    }

    navigateToProject(project.id);
  }, [activateProject, markProjectOpened, navigateToProject, navigateToSessions, setActiveSession]);

  const openProjectDashboard = useCallback(async (project: Project) => {
    await activateProject(project);
    markProjectOpened(project.id);
    navigateToProjectDashboard(project.id);
  }, [activateProject, markProjectOpened, navigateToProjectDashboard]);

  const previewStartupEntry = useCallback(async () => {
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
  }, [demoState, navigateToSessions, openProject, projects, setActiveSession]);

  return {
    activeProjectId,
    bookmarkedProjects,
    defaultProjectSessions,
    demoState,
    favoriteProjects,
    isLoading,
    openProject,
    openProjectDashboard,
    patchDemoState,
    previewStartupEntry,
    projects,
    recentProjects,
    workspaceSessionsByProject,
  };
}

export function useProjectEntryDemoState() {
  const demoState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const patchDemoState = useCallback((updater: (state: DemoState) => DemoState) => {
    updateStoredDemoState(updater);
  }, []);

  return {
    demoState,
    patchDemoState,
  };
}
