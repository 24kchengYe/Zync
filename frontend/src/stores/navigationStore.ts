import { create } from 'zustand';

interface NavigationState {
  activeView: 'sessions' | 'project';
  activeProjectId: number | null;
  projectEntryPanel: 'dashboard' | null;
  dashboardFocusWorkspaceIdsByProject: Record<string, string[]>;
  
  // Actions
  setActiveView: (view: 'sessions' | 'project') => void;
  setActiveProjectId: (projectId: number | null) => void;
  navigateToProject: (projectId: number) => void;
  navigateToProjectDashboard: (projectId: number) => void;
  navigateToSessions: () => void;
  clearProjectEntryPanel: () => void;
  setDashboardFocusWorkspaceIds: (projectId: number, workspaceIds: string[]) => void;
  clearDashboardFocusWorkspaceIds: (projectId: number) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeView: 'sessions',
  activeProjectId: null,
  projectEntryPanel: null,
  dashboardFocusWorkspaceIdsByProject: {},
  
  setActiveView: (view) => set({ activeView: view }),
  
  setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),
  
  navigateToProject: (projectId) => set({ 
    activeView: 'project', 
    activeProjectId: projectId,
    projectEntryPanel: null,
  }),

  navigateToProjectDashboard: (projectId) => set({
    activeView: 'project',
    activeProjectId: projectId,
    projectEntryPanel: 'dashboard',
  }),
  
  navigateToSessions: () => set({ 
    activeView: 'sessions',
    activeProjectId: null,
    projectEntryPanel: null,
  }),

  clearProjectEntryPanel: () => set({
    projectEntryPanel: null,
  }),

  setDashboardFocusWorkspaceIds: (projectId, workspaceIds) => set((state) => ({
    dashboardFocusWorkspaceIdsByProject: {
      ...state.dashboardFocusWorkspaceIdsByProject,
      [String(projectId)]: Array.from(new Set(workspaceIds)),
    },
  })),

  clearDashboardFocusWorkspaceIds: (projectId) => set((state) => {
    const nextFocusState = { ...state.dashboardFocusWorkspaceIdsByProject };
    delete nextFocusState[String(projectId)];

    return {
      dashboardFocusWorkspaceIdsByProject: nextFocusState,
    };
  }),
}));
