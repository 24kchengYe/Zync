import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Project } from '../../types/project';
import type { Session } from '../../types/session';
import { useSessionStore } from '../../stores/sessionStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { API } from '../../utils/api';

export type StartupEntryMode = 'home' | 'default-project' | 'default-workspace';
export type ProjectFilter = 'all' | 'recent' | 'favorites' | 'bookmarks';

export interface ProjectEntryState {
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

const STORAGE_KEY = 'zync-project-entry-preview';
const LEGACY_STORAGE_KEYS = ['zync-project-entry-demo'];
const MAX_RECENT_PROJECTS = 6;

const DEFAULT_STATE: ProjectEntryState = {
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

function loadProjectEntryState(): ProjectEntryState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const saved = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
      .map((storageKey) => window.localStorage.getItem(storageKey))
      .find((value): value is string => Boolean(value));
    if (!saved) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(saved) as Partial<ProjectEntryState>;
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
    console.error('[ProjectEntryState] Failed to load state:', error);
    return DEFAULT_STATE;
  }
}

function saveProjectEntryState(state: ProjectEntryState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let projectEntryStateCache = loadProjectEntryState();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return projectEntryStateCache;
}

function updateStoredProjectEntryState(updater: (state: ProjectEntryState) => ProjectEntryState) {
  projectEntryStateCache = updater(projectEntryStateCache);
  saveProjectEntryState(projectEntryStateCache);
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

export function useProjectEntryData() {
  const sessions = useSessionStore((state) => state.sessions);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const navigateToProject = useNavigationStore((state) => state.navigateToProject);
  const navigateToProjectDashboard = useNavigationStore((state) => state.navigateToProjectDashboard);
  const navigateToSessions = useNavigationStore((state) => state.navigateToSessions);
  const projectEntryState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const patchProjectEntryState = useCallback((updater: (state: ProjectEntryState) => ProjectEntryState) => {
    updateStoredProjectEntryState(updater);
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
    if (!projectEntryState.defaultProjectId) {
      return [];
    }

    return workspaceSessionsByProject.get(projectEntryState.defaultProjectId) ?? [];
  }, [projectEntryState.defaultProjectId, workspaceSessionsByProject]);

  const recentProjects = useMemo(() => {
    return projectEntryState.recentProjectIds
      .map((projectId) => projects.find((project) => project.id === projectId))
      .filter((project): project is Project => Boolean(project));
  }, [projectEntryState.recentProjectIds, projects]);

  const favoriteProjects = useMemo(() => {
    return projects.filter((project) => projectEntryState.favoriteProjectIds.includes(project.id));
  }, [projects, projectEntryState.favoriteProjectIds]);

  const bookmarkedProjects = useMemo(() => {
    return projects.filter((project) => projectEntryState.bookmarkProjectIds.includes(project.id));
  }, [projects, projectEntryState.bookmarkProjectIds]);

  const markProjectOpened = useCallback((projectId: number) => {
    patchProjectEntryState((current) => ({
      ...current,
      recentProjectIds: moveToFront(current.recentProjectIds, projectId),
      lastOpenedProjectId: projectId,
    }));
  }, [patchProjectEntryState]);

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
    if (projectEntryState.restoreLastProject && projectEntryState.lastOpenedProjectId) {
      const lastProject = projects.find((project) => project.id === projectEntryState.lastOpenedProjectId);
      if (lastProject) {
        const workspaceId = projectEntryState.defaultWorkspaceByProjectId[lastProject.id];
        await openProject(lastProject, workspaceId);
        return;
      }
    }

    if (projectEntryState.startupEntryMode === 'home') {
      await setActiveSession(null);
      navigateToSessions();
      return;
    }

    const defaultProject = projects.find((project) => project.id === projectEntryState.defaultProjectId);
    if (!defaultProject) {
      return;
    }

    if (projectEntryState.startupEntryMode === 'default-workspace') {
      const workspaceId = projectEntryState.defaultWorkspaceByProjectId[defaultProject.id];
      await openProject(defaultProject, workspaceId);
      return;
    }

    await openProject(defaultProject);
  }, [projectEntryState, navigateToSessions, openProject, projects, setActiveSession]);

  return {
    activeProjectId,
    bookmarkedProjects,
    defaultProjectSessions,
    projectEntryState,
    favoriteProjects,
    isLoading,
    openProject,
    openProjectDashboard,
    patchProjectEntryState,
    previewStartupEntry,
    projects,
    recentProjects,
    workspaceSessionsByProject,
  };
}

export function useProjectEntryState() {
  const projectEntryState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const patchProjectEntryState = useCallback((updater: (state: ProjectEntryState) => ProjectEntryState) => {
    updateStoredProjectEntryState(updater);
  }, []);

  return {
    projectEntryState,
    patchProjectEntryState,
  };
}
