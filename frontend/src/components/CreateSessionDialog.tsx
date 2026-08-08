import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API } from '../utils/api';
import type { CreateSessionRequest, Session } from '../types/session';
import type { Project } from '../types/project';
import { useErrorStore } from '../stores/errorStore';
import { GitBranch, ChevronRight, ChevronDown, X, Search, Check, GitFork, ShieldOff, Shield, Plus } from 'lucide-react';
import { ToggleField } from './ui/Toggle';
import { CommitModeSettings } from './CommitModeSettings';
import ProjectSettings from './ProjectSettings';
import type { CommitModeSettings as CommitModeSettingsType } from '../../../shared/types';
import type { ToolPanel } from '../../../shared/types/panels';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { panelApi } from '../services/panelApi';
import { useSessionPreferencesStore, type SessionCreationPreferences } from '../stores/sessionPreferencesStore';
import { useSessionStore } from '../stores/sessionStore';
import { useNavigationStore } from '../stores/navigationStore';
import { dashboardCache } from '../utils/dashboardCache';
import { interpolateTranslation, useI18n } from '../../../UpdateWuruize/frontend/I18nContext';
import {
  buildProjectInitHooksPreview,
  loadProjectInitHooksDemoConfig,
  type InitHookPanelKey,
  type ProjectInitHooksPreview,
} from '../../../UpdateWuruize/frontend/ProjectInitHooksDemoState';

// Interface for branch information
interface BranchInfo {
  name: string;
  isCurrent: boolean;
  hasWorktree: boolean;
  isRemote: boolean;
}

interface WorkspaceEntry {
  id: string;
  name: string;
  userEdited: boolean;
}

interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  projectId?: number;
  initialSessionName?: string;
  initialBaseBranch?: string;
  initialFolderId?: string; // Folder to create the new session in
  // Callback called after session is successfully created (for "Discard and Retry" to archive old session)
  onSessionCreated?: () => void;
}

export function CreateSessionDialog({
  isOpen,
  onClose,
  projectName,
  projectId,
  initialSessionName,
  initialBaseBranch,
  initialFolderId,
  onSessionCreated
}: CreateSessionDialogProps) {
  const workspaceIdRef = useRef(0);
  const [formData, setFormData] = useState<CreateSessionRequest>({
    prompt: '',
    permissionMode: 'ignore',
    baseBranch: initialBaseBranch
  });
  const [workspaceEntries, setWorkspaceEntries] = useState<WorkspaceEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [commitModeSettings, setCommitModeSettings] = useState<CommitModeSettingsType>({
    mode: 'disabled',
    checkpointPrefix: 'checkpoint: '
  });
  const [useWorktree, setUseWorktree] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectInitHooksPreview, setProjectInitHooksPreview] = useState<ProjectInitHooksPreview>(() => buildProjectInitHooksPreview(null));
  const [useProjectInitHooks, setUseProjectInitHooks] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [highlightedBranchIndex, setHighlightedBranchIndex] = useState(0);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const branchInputRef = useRef<HTMLInputElement>(null);
  const branchListRef = useRef<HTMLDivElement>(null);
  const { showError } = useErrorStore();
  const { preferences, loadPreferences, updatePreferences } = useSessionPreferencesStore();
  const existingSessions = useSessionStore(state => state.sessions);
  const navigateToProjectDashboard = useNavigationStore(state => state.navigateToProjectDashboard);
  const setDashboardFocusWorkspaceIds = useNavigationStore(state => state.setDashboardFocusWorkspaceIds);
  const { t } = useI18n();
  const dialogTitle = projectName
    ? interpolateTranslation(t('createSession.title.withProject'), { projectName })
    : t('createSession.title.default');

  const createWorkspaceEntry = useCallback((name: string, userEdited = false): WorkspaceEntry => {
    workspaceIdRef.current += 1;
    return {
      id: `workspace-${workspaceIdRef.current}`,
      name,
      userEdited
    };
  }, []);

  const getSuggestionBaseName = useCallback((branchName?: string) => {
    const trimmedBranchName = branchName?.trim();
    if (!trimmedBranchName) {
      return 'workspace';
    }

    const baseName = trimmedBranchName.replace(/^[^/]+\//, '').trim();
    return baseName || 'workspace';
  }, []);

  const getUniqueWorkspaceName = useCallback((baseName: string, reservedNames: Set<string>) => {
    const normalizedBaseName = baseName.trim() || 'workspace';

    if (!reservedNames.has(normalizedBaseName.toLowerCase())) {
      return normalizedBaseName;
    }

    let suffix = 2;
    while (reservedNames.has(`${normalizedBaseName}-${suffix}`.toLowerCase())) {
      suffix += 1;
    }

    return `${normalizedBaseName}-${suffix}`;
  }, []);

  const applySuggestedNamesToUneditedEntries = useCallback((entries: WorkspaceEntry[], branchName?: string) => {
    const reservedNames = new Set(existingSessions.map(session => session.name.trim().toLowerCase()).filter(Boolean));
    const baseName = getSuggestionBaseName(branchName);

    return entries.map(entry => {
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
        name: suggestedName
      };
    });
  }, [existingSessions, getSuggestionBaseName, getUniqueWorkspaceName]);

  // Load session creation preferences when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadPreferences();
      workspaceIdRef.current = 0;
      const initialEntries = [createWorkspaceEntry(initialSessionName || '', !!initialSessionName)];
      setWorkspaceEntries(
        initialBaseBranch && !initialSessionName
          ? applySuggestedNamesToUneditedEntries(initialEntries, initialBaseBranch)
          : initialEntries
      );
      setFormData(prev => ({ ...prev, baseBranch: initialBaseBranch }));
    }
  }, [
    applySuggestedNamesToUneditedEntries,
    createWorkspaceEntry,
    initialBaseBranch,
    initialSessionName,
    isOpen,
    loadPreferences
  ]);

  const loadProjectInitHooksState = useCallback(async (preserveManualChoice = false) => {
    if (!projectId) {
      setCurrentProject(null);
      const emptyPreview = buildProjectInitHooksPreview(null);
      setProjectInitHooksPreview(emptyPreview);
      setUseProjectInitHooks(false);
      return;
    }

    try {
      const projectsResponse = await API.projects.getAll();
      if (!projectsResponse.success || !projectsResponse.data) {
        throw new Error('Failed to fetch projects');
      }

      const project = projectsResponse.data.find((item: Project) => item.id === projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      setCurrentProject(project);
      const config = loadProjectInitHooksDemoConfig(projectId);
      const preview = buildProjectInitHooksPreview(project, config);
      setProjectInitHooksPreview(preview);
      setUseProjectInitHooks((previousValue) => {
        if (!preview.hasAnyConfiguredHooks) {
          return false;
        }

        if (preserveManualChoice && projectInitHooksPreview.hasAnyConfiguredHooks) {
          return previousValue;
        }

        return config.enabledByDefault;
      });
    } catch (error) {
      console.error('Failed to load init hooks preview:', error);
      setCurrentProject(null);
      const emptyPreview = buildProjectInitHooksPreview(null);
      setProjectInitHooksPreview(emptyPreview);
      setUseProjectInitHooks(false);
    }
  }, [projectId, projectInitHooksPreview.hasAnyConfiguredHooks]);

  useEffect(() => {
    if (!isOpen) {
      setShowProjectSettings(false);
      setCurrentProject(null);
      const emptyPreview = buildProjectInitHooksPreview(null);
      setProjectInitHooksPreview(emptyPreview);
      setUseProjectInitHooks(false);
      return;
    }

    void loadProjectInitHooksState();
  }, [isOpen, loadProjectInitHooksState]);

  // Apply loaded preferences to state
  useEffect(() => {
    if (preferences) {
      setShowAdvanced(preferences.showAdvanced);
      setCommitModeSettings(preferences.commitModeSettings);
    }
  }, [preferences]);

  // Save preferences when certain settings change
  const savePreferences = useCallback(async (updates: Partial<SessionCreationPreferences>) => {
    await updatePreferences(updates);
  }, [updatePreferences]);

  useEffect(() => {
    if (isOpen) {
      // Fetch branches if projectId is provided
      if (projectId) {
        setIsLoadingBranches(true);
        // First get the project to get its path
        API.projects.getAll().then(projectsResponse => {
          if (!projectsResponse.success || !projectsResponse.data) {
            throw new Error('Failed to fetch projects');
          }
          const project = projectsResponse.data.find((p: Project) => p.id === projectId);
          if (!project) {
            throw new Error('Project not found');
          }

          return Promise.all([
            API.projects.listBranches(projectId.toString()),
            // Get the main branch for this project using its path
            API.projects.detectBranch(project.path)
          ]);
        }).then(([branchesResponse, mainBranchResponse]) => {
          if (branchesResponse.success && branchesResponse.data) {
            setBranches(branchesResponse.data);
            // Default to remote main branch (origin/main or origin/master) for proper tracking
            // Fall back to current local branch if no remote main found
            if (!formData.baseBranch) {
              const remoteMain = branchesResponse.data.find((b: BranchInfo) =>
                b.isRemote && (b.name === 'origin/main' || b.name === 'origin/master')
              );
              const currentBranch = branchesResponse.data.find((b: BranchInfo) => b.isCurrent);
              const defaultBranch = remoteMain || currentBranch;
              if (defaultBranch) {
                setFormData(prev => ({ ...prev, baseBranch: defaultBranch.name }));
                if (!initialSessionName) {
                  setWorkspaceEntries(prev => applySuggestedNamesToUneditedEntries(prev, defaultBranch.name));
                }
              }
            }
          }

          if (mainBranchResponse.success && mainBranchResponse.data) {
            // Main branch detected but not currently used in UI
          }
        }).catch((err: Error) => {
          console.error('Failed to fetch branches:', err);
        }).finally(() => {
          setIsLoadingBranches(false);
        });
      }
    }
  }, [
    applySuggestedNamesToUneditedEntries,
    formData.baseBranch,
    initialSessionName,
    isOpen,
    projectId
  ]);

  // Filtered branches based on search term
  const filteredBranches = useMemo(() => {
    if (!branchSearch.trim()) return branches;
    const search = branchSearch.toLowerCase();
    return branches.filter(b => b.name.toLowerCase().includes(search));
  }, [branches, branchSearch]);

  // Flat list of filtered branches for keyboard navigation (remote first, then local)
  const flatFilteredBranches = useMemo(() => {
    const remote = filteredBranches.filter(b => b.isRemote);
    const local = filteredBranches.filter(b => !b.isRemote);
    return [...remote, ...local];
  }, [filteredBranches]);

  // Click outside handler for branch dropdown
  useEffect(() => {
    if (!isBranchDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setIsBranchDropdownOpen(false);
        setBranchSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBranchDropdownOpen]);

  // Reset branch search state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsBranchDropdownOpen(false);
      setBranchSearch('');
      setHighlightedBranchIndex(0);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isBranchDropdownOpen || !branchListRef.current) return;
    const items = branchListRef.current.querySelectorAll('[data-branch-item]');
    const highlighted = items[highlightedBranchIndex];
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedBranchIndex, isBranchDropdownOpen]);

  const selectBranch = useCallback((branchName: string) => {
    setFormData(prev => ({ ...prev, baseBranch: branchName }));
    savePreferences({ baseBranch: branchName });
    setIsBranchDropdownOpen(false);
    setBranchSearch('');
    setHighlightedBranchIndex(0);
    setWorkspaceEntries(prev => applySuggestedNamesToUneditedEntries(prev, branchName));
  }, [applySuggestedNamesToUneditedEntries, savePreferences]);

  const handleBranchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isBranchDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsBranchDropdownOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedBranchIndex(prev =>
          prev < flatFilteredBranches.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedBranchIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatFilteredBranches[highlightedBranchIndex]) {
          selectBranch(flatFilteredBranches[highlightedBranchIndex].name);
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setIsBranchDropdownOpen(false);
        setBranchSearch('');
        setHighlightedBranchIndex(0);
        break;
    }
  }, [isBranchDropdownOpen, flatFilteredBranches, highlightedBranchIndex, selectBranch]);

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('create-session-form') as HTMLFormElement;
        if (form) {
          const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
          form.dispatchEvent(submitEvent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto-focus name input on dialog open (always available immediately)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const input = document.getElementById('worktreeTemplate') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validateWorktreeName = useCallback((name: string): string | null => {
    if (!name) return null; // Empty is allowed

    // Spaces are now allowed in session names
    // They will be converted to hyphens for the actual worktree name

    // Check for invalid git characters (excluding spaces which are now allowed)
    const invalidCharacters = ['~', '^', ':', '?', '*', '[', ']', '\\'];
    if (invalidCharacters.some((character) => name.includes(character))) {
      return t('createSession.errors.invalidChars');
    }

    // Check if it starts or ends with dot
    if (name.startsWith('.') || name.endsWith('.')) {
      return t('createSession.errors.leadingTrailingDot');
    }

    // Check if it starts or ends with slash
    if (name.startsWith('/') || name.endsWith('/')) {
      return t('createSession.errors.leadingTrailingSlash');
    }

    // Check for consecutive dots
    if (name.includes('..')) {
      return t('createSession.errors.consecutiveDots');
    }

    return null;
  }, [t]);

  const workspaceErrors = useMemo(() => {
    const counts = new Map<string, number>();

    workspaceEntries.forEach(entry => {
      const normalizedName = entry.name.trim().toLowerCase();
      if (!normalizedName) {
        return;
      }

      counts.set(normalizedName, (counts.get(normalizedName) || 0) + 1);
    });

    return new Map(
      workspaceEntries.map(entry => {
        const trimmedName = entry.name.trim();
        const normalizedName = trimmedName.toLowerCase();

        if (!trimmedName) {
          return [entry.id, t('createSession.errors.nameRequiredMessage')] as const;
        }

        const validationError = validateWorktreeName(trimmedName);
        if (validationError) {
          return [entry.id, validationError] as const;
        }

        if ((counts.get(normalizedName) || 0) > 1) {
          return [entry.id, t('createSession.errors.duplicateWorkspaceName')] as const;
        }

        return [entry.id, null] as const;
      })
    );
  }, [t, validateWorktreeName, workspaceEntries]);

  const hasWorkspaceErrors = useMemo(
    () => workspaceEntries.some(entry => Boolean(workspaceErrors.get(entry.id))),
    [workspaceEntries, workspaceErrors]
  );

  const initHooksPanelSummary = useMemo(() => {
    return projectInitHooksPreview.defaultPanels.length > 0
      ? projectInitHooksPreview.defaultPanels.map((panel) => t(`common.panel.${panel}`)).join(' · ')
      : t('initHooks.emptyValue');
  }, [projectInitHooksPreview.defaultPanels, t]);

  const formatHookSummary = useCallback((values: string[]) => {
    return values.length > 0 ? values.join(' · ') : t('initHooks.emptyValue');
  }, [t]);

  const updateWorkspaceEntry = useCallback((id: string, name: string) => {
    setWorkspaceEntries(prev => prev.map(entry => (
      entry.id === id
        ? {
            ...entry,
            name,
            userEdited: true
          }
        : entry
    )));
  }, []);

  const addWorkspaceEntry = useCallback(() => {
    if (!useWorktree) {
      return;
    }

    setWorkspaceEntries(prev => {
      const reservedNames = new Set(existingSessions.map(session => session.name.trim().toLowerCase()).filter(Boolean));
      prev.forEach(entry => {
        const normalizedName = entry.name.trim().toLowerCase();
        if (normalizedName) {
          reservedNames.add(normalizedName);
        }
      });

      const suggestedName = getUniqueWorkspaceName(getSuggestionBaseName(formData.baseBranch), reservedNames);
      return [...prev, createWorkspaceEntry(suggestedName)];
    });
  }, [
    createWorkspaceEntry,
    existingSessions,
    formData.baseBranch,
    getSuggestionBaseName,
    getUniqueWorkspaceName,
    useWorktree
  ]);

  const removeWorkspaceEntry = useCallback((id: string) => {
    setWorkspaceEntries(prev => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter(entry => entry.id !== id);
    });
  }, []);

  const preferredInitHookActivePanel = useMemo(() => {
    const activationOrder: InitHookPanelKey[] = ['explorer', 'diff', 'terminal'];
    return activationOrder.find((panelType) => projectInitHooksPreview.defaultPanels.includes(panelType)) || null;
  }, [projectInitHooksPreview.defaultPanels]);

  const initHooksState = useMemo(() => {
    if (!projectInitHooksPreview.hasAnyConfiguredHooks) {
      return {
        label: t('createSession.initHooks.status.notConfigured'),
        badgeVariant: 'default' as const,
        cardClassName: 'border-border-primary bg-surface-primary/40',
        contentClassName: 'opacity-60',
      };
    }

    if (useProjectInitHooks) {
      return {
        label: t('createSession.initHooks.status.enabled'),
        badgeVariant: 'success' as const,
        cardClassName: 'border-status-success/30 bg-status-success/5',
        contentClassName: 'opacity-100',
      };
    }

    return {
      label: t('createSession.initHooks.status.preview'),
      badgeVariant: 'default' as const,
      cardClassName: 'border-border-primary bg-surface-primary/70',
      contentClassName: 'opacity-75',
    };
  }, [projectInitHooksPreview.hasAnyConfiguredHooks, t, useProjectInitHooks]);

  const initHooksSettingsActionLabel = projectInitHooksPreview.hasAnyConfiguredHooks
    ? t('createSession.initHooks.editConfig')
    : t('createSession.initHooks.configure');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block submission while branches are still loading
    if (isLoadingBranches) return;

    const plannedWorkspaces = workspaceEntries.map(entry => ({
      id: entry.id,
      name: entry.name.trim()
    }));

    const firstInvalidWorkspace = plannedWorkspaces.find(workspace => {
      const error = workspaceErrors.get(workspace.id);
      return Boolean(error);
    });

    if (firstInvalidWorkspace) {
      showError({
        title: t('createSession.errors.invalidNameTitle'),
        error: workspaceErrors.get(firstInvalidWorkspace.id) || t('createSession.errors.nameRequiredMessage')
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const existingSessionIds = new Set(existingSessions.map(session => session.id));
      const shouldApplyDefaultPanels = useProjectInitHooks && projectInitHooksPreview.defaultPanels.length > 0;

      // Determine if we need to create a folder
      // Create folder when: multiple workspaces are created together
      // But NOT if we already have an initialFolderId (from "Discard and Retry")
      const shouldCreateFolder = !initialFolderId && useWorktree && plannedWorkspaces.length > 1;

      // Use initialFolderId if provided, otherwise create folder if needed
      let folderId: string | undefined = initialFolderId;
      if (shouldCreateFolder && projectId) {
        try {
          const folderName = plannedWorkspaces[0]?.name || getSuggestionBaseName(formData.baseBranch);
          const folderResponse = await API.folders.create(folderName, projectId);
          if (folderResponse.success && folderResponse.data) {
            folderId = folderResponse.data.id;
            // Wait a bit to ensure the folder is created in the UI
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error('[CreateSessionDialog] Failed to create folder:', error);
          // Continue without folder - sessions will be created at project level
        }
      }
      let createdWorkspaceCount = 0;

      for (const workspace of plannedWorkspaces) {
        const response = await API.sessions.create({
          prompt: '',
          worktreeTemplate: workspace.name,
          count: 1,
          toolType: 'none',
          permissionMode: formData.permissionMode || 'ignore',
          projectId,
          folderId,
          isMainRepo: !useWorktree,
          commitMode: commitModeSettings.mode,
          commitModeSettings: JSON.stringify(commitModeSettings),
          baseBranch: formData.baseBranch
        });

        if (!response.success) {
          const partialCreateMessage = createdWorkspaceCount > 0
            ? interpolateTranslation(t('createSession.errors.partialCreateMessage'), { count: createdWorkspaceCount })
            : undefined;

          showError({
            title: t('createSession.errors.createFailedTitle'),
            error: interpolateTranslation(t('createSession.errors.workspaceFailedMessage'), { name: workspace.name }),
            details: [response.error, response.details, partialCreateMessage].filter(Boolean).join('\n\n'),
            command: response.command
          });
          return;
        }

        createdWorkspaceCount += 1;
      }

      // Call onSessionCreated callback (e.g., to archive old session in "Discard and Retry")
      if (onSessionCreated) {
        onSessionCreated();
      }

      onClose();

      if (projectId) {
        dashboardCache.invalidate(projectId);
        navigateToProjectDashboard(projectId);
      }

      const createdWorkspaceNames = plannedWorkspaces.map(workspace => workspace.name);
      const targetProjectId = projectId;
      const targetFolderId = folderId;
      const defaultPanels = [...projectInitHooksPreview.defaultPanels];
      const preferredPanelType = preferredInitHookActivePanel;

      void (async () => {
        const deadline = Date.now() + 20000;
        const matchedSessionsById = new Map<string, Session>();
        const targetWorkspaceNames = new Set(createdWorkspaceNames);

        while (Date.now() < deadline && matchedSessionsById.size < targetWorkspaceNames.size) {
          const response = await API.sessions.getAll();
          if (response.success && response.data) {
            for (const session of response.data as Session[]) {
              if (existingSessionIds.has(session.id)) {
                continue;
              }
              if (targetProjectId !== undefined && session.projectId !== targetProjectId) {
                continue;
              }
              if (targetFolderId !== undefined && session.folderId !== targetFolderId) {
                continue;
              }
              if (!targetWorkspaceNames.has(session.name)) {
                continue;
              }

              matchedSessionsById.set(session.id, session);
            }
          }

          if (matchedSessionsById.size >= targetWorkspaceNames.size) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        const matchedSessions = Array.from(matchedSessionsById.values());
        const matchedSessionsByName = new Map(matchedSessions.map(session => [session.name, session] as const));
        const orderedMatchedSessions = createdWorkspaceNames
          .map((workspaceName) => matchedSessionsByName.get(workspaceName))
          .filter((session): session is Session => Boolean(session));

        if (targetProjectId !== undefined && orderedMatchedSessions.length > 0) {
          const matchedSessionIds = orderedMatchedSessions.map(session => session.id);
          setDashboardFocusWorkspaceIds(targetProjectId, matchedSessionIds);
          dashboardCache.invalidate(targetProjectId);
          navigateToProjectDashboard(targetProjectId);
        }

        if (!shouldApplyDefaultPanels) {
          return;
        }

        for (const session of orderedMatchedSessions) {
          const existingPanelsForSession: ToolPanel[] = await panelApi.loadPanelsForSession(session.id).catch(() => []);
          const existingPanelTypes = new Set(existingPanelsForSession.map((panel) => panel.type));

          for (const panelType of defaultPanels) {
            if (existingPanelTypes.has(panelType)) {
              continue;
            }

            const newPanel = await panelApi.createPanel({
              sessionId: session.id,
              type: panelType,
            });

            existingPanelsForSession.push(newPanel);
            existingPanelTypes.add(newPanel.type);
          }

          if (preferredPanelType) {
            const targetPanel = existingPanelsForSession.find((panel) => panel.type === preferredPanelType);
            if (targetPanel) {
              await panelApi.setActivePanel(session.id, targetPanel.id);
            }
          }
        }
      })().catch((error) => {
        console.error('[CreateSessionDialog] Failed to finalize created workspaces:', error);
      });
    } catch (error: unknown) {
      console.error('Error creating session:', error);
      const errorMessage = error instanceof Error ? error.message : t('createSession.errors.createFailedMessage');
      const errorDetails = error instanceof Error ? (error.stack || error.toString()) : String(error);
      showError({
        title: t('createSession.errors.createFailedTitle'),
        error: errorMessage,
        details: errorDetails
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
      size="lg"
      closeOnOverlayClick={false}
    >
      <ModalHeader>{dialogTitle}</ModalHeader>

      <ModalBody className="p-0">
        <div className="flex-1 overflow-y-auto">
          <form id="create-session-form" onSubmit={handleSubmit}>
            {/* 1. Base Branch (select first, auto-populates session name) */}
            {isLoadingBranches && branches.length === 0 ? (
              <div className="p-6 border-b border-border-primary animate-pulse">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-surface-tertiary rounded" />
                  <div className="w-24 h-4 bg-surface-tertiary rounded" />
                </div>
                <div className="w-full h-9 bg-surface-tertiary rounded-md" />
                <div className="w-64 h-3 bg-surface-tertiary rounded mt-1" />
              </div>
            ) : branches.length > 0 ? (
              <div className="p-6 border-b border-border-primary">
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="w-4 h-4 text-text-tertiary" />
                  <label htmlFor="baseBranch" className="text-sm font-medium text-text-primary">
                    {t('createSession.baseBranch.label')}
                  </label>
                </div>
                <p className="text-xs text-text-tertiary mb-1">{t('createSession.baseBranch.description')}</p>
                <p className="text-xs text-text-tertiary mb-1">{t('createSession.baseBranch.helper')}</p>
                <div ref={branchDropdownRef} className="relative">
                  <div
                    className={`flex items-center w-full border rounded-md bg-surface-secondary ${
                      isBranchDropdownOpen
                        ? 'border-interactive ring-2 ring-interactive'
                        : 'border-border-primary'
                    } ${isLoadingBranches ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Search className="w-4 h-4 text-text-tertiary ml-3 shrink-0" />
                    <input
                      ref={branchInputRef}
                      id="baseBranch"
                      type="text"
                      value={isBranchDropdownOpen ? branchSearch : (formData.baseBranch || '')}
                      onChange={(e) => {
                        setBranchSearch(e.target.value);
                        setHighlightedBranchIndex(0);
                        if (!isBranchDropdownOpen) {
                          setIsBranchDropdownOpen(true);
                        }
                      }}
                      onFocus={() => {
                        setIsBranchDropdownOpen(true);
                        setBranchSearch('');
                        setHighlightedBranchIndex(0);
                      }}
                      onKeyDown={handleBranchKeyDown}
                      placeholder={isBranchDropdownOpen ? t('createSession.baseBranch.searchPlaceholder') : t('createSession.baseBranch.selectPlaceholder')}
                      className="w-full px-2 py-2 bg-transparent text-text-primary text-sm focus:outline-none"
                      autoComplete="off"
                      disabled={isLoadingBranches}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        setIsBranchDropdownOpen(!isBranchDropdownOpen);
                        if (!isBranchDropdownOpen) {
                          setBranchSearch('');
                          setHighlightedBranchIndex(0);
                          branchInputRef.current?.focus();
                        }
                      }}
                      className="px-2 py-2 text-text-tertiary hover:text-text-primary shrink-0"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isBranchDropdownOpen && (
                    <div
                      ref={branchListRef}
                      className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border-primary bg-surface-secondary shadow-lg"
                    >
                      {flatFilteredBranches.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-text-tertiary">
                          {interpolateTranslation(t('createSession.baseBranch.noMatch'), { query: branchSearch })}
                        </div>
                      ) : (
                        <>
                          {/* Remote branches group */}
                          {filteredBranches.some(b => b.isRemote) && (
                            <>
                              <div className="px-3 py-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider bg-surface-primary sticky top-0">
                                {t('createSession.baseBranch.remoteGroup')}
                              </div>
                              {filteredBranches.filter(b => b.isRemote).map(branch => {
                                const flatIndex = flatFilteredBranches.indexOf(branch);
                                return (
                                  <div
                                    key={branch.name}
                                    data-branch-item
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${
                                      flatIndex === highlightedBranchIndex
                                        ? 'bg-interactive/10 text-text-primary'
                                        : 'text-text-secondary hover:bg-surface-hover'
                                    }`}
                                    onMouseEnter={() => setHighlightedBranchIndex(flatIndex)}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectBranch(branch.name);
                                    }}
                                  >
                                    <GitBranch className="w-3.5 h-3.5 shrink-0 text-text-tertiary" />
                                    <span className="truncate flex-1">{branch.name}</span>
                                    {formData.baseBranch === branch.name && (
                                      <Check className="w-3.5 h-3.5 shrink-0 text-interactive" />
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {/* Local branches group */}
                          {filteredBranches.some(b => !b.isRemote) && (
                            <>
                              <div className="px-3 py-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider bg-surface-primary sticky top-0">
                                {t('createSession.baseBranch.localGroup')}
                              </div>
                              {filteredBranches.filter(b => !b.isRemote).map(branch => {
                                const flatIndex = flatFilteredBranches.indexOf(branch);
                                return (
                                  <div
                                    key={branch.name}
                                    data-branch-item
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${
                                      flatIndex === highlightedBranchIndex
                                        ? 'bg-interactive/10 text-text-primary'
                                        : 'text-text-secondary hover:bg-surface-hover'
                                    }`}
                                    onMouseEnter={() => setHighlightedBranchIndex(flatIndex)}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectBranch(branch.name);
                                    }}
                                  >
                                    <GitBranch className="w-3.5 h-3.5 shrink-0 text-text-tertiary" />
                                    <span className="truncate flex-1">
                                      {branch.name}
                                      {branch.isCurrent && (
                                        <span className="ml-1.5 text-xs text-text-tertiary">({t('createSession.baseBranch.currentBadge')})</span>
                                      )}
                                      {branch.hasWorktree && (
                                        <span className="ml-1.5 text-xs text-text-tertiary">({t('createSession.baseBranch.hasWorktreeBadge')})</span>
                                      )}
                                    </span>
                                    {formData.baseBranch === branch.name && (
                                      <Check className="w-3.5 h-3.5 shrink-0 text-interactive" />
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {t('createSession.baseBranch.remoteHint')}
                </p>
              </div>
            ) : null}

            {/* 2. Workspace Names */}
            <div className="p-6 border-b border-border-primary">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {useWorktree ? t('createSession.workspaceList.label') : t('createSession.name.label')}
                  </label>
                  <p className="text-xs text-text-tertiary">
                    {useWorktree ? t('createSession.workspaceList.description') : t('createSession.name.helper')}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {t('createSession.workspaceList.branchHint')}
                  </p>
                </div>
                {useWorktree && (
                  <div className="text-xs font-medium text-text-tertiary">
                    {interpolateTranslation(t('createSession.workspaceList.summary'), { count: workspaceEntries.length })}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {workspaceEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border-primary bg-surface-secondary/40 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor={index === 0 ? 'worktreeTemplate' : `worktreeTemplate-${entry.id}`}
                        className="text-xs font-medium uppercase tracking-wide text-text-tertiary"
                      >
                        {interpolateTranslation(t('createSession.workspaceList.rowLabel'), { index: index + 1 })}
                      </label>
                      {useWorktree && workspaceEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWorkspaceEntry(entry.id)}
                          className="h-7 px-2 text-text-tertiary hover:text-text-primary"
                          title={t('createSession.workspaceList.remove')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <Input
                      id={index === 0 ? 'worktreeTemplate' : `worktreeTemplate-${entry.id}`}
                      type="text"
                      value={entry.name}
                      onChange={(e) => updateWorkspaceEntry(entry.id, e.target.value)}
                      error={workspaceErrors.get(entry.id) || undefined}
                      placeholder={t('createSession.name.placeholder')}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>

              {useWorktree ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-tertiary">
                    {t('createSession.workspaceList.helper')}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addWorkspaceEntry}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t('createSession.workspaceList.add')}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-text-tertiary mt-4">
                  {t('createSession.workspaceList.mainRepoHint')}
                </p>
              )}
            </div>

            {/* 3. Advanced Options Toggle */}
            <div className="px-6 py-4">
              <Button
                type="button"
                onClick={() => {
                  const newShowAdvanced = !showAdvanced;
                  setShowAdvanced(newShowAdvanced);
                  savePreferences({ showAdvanced: newShowAdvanced });
                }}
                variant="ghost"
                size="sm"
                className="text-text-secondary hover:text-text-primary"
              >
                {showAdvanced ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                {t('createSession.advanced')}
              </Button>
            </div>

            {/* Advanced Options - Collapsible */}
            {showAdvanced && (
              <div className="px-6 pb-6 space-y-4 border-t border-border-primary pt-4">
                {/* Worktree Toggle */}
                <div className="flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-text-tertiary" />
                  <ToggleField
                    label={t('createSession.useWorktree.label')}
                    description={t('createSession.useWorktree.description')}
                    checked={useWorktree}
                    onChange={(checked) => {
                      setUseWorktree(checked);
                      if (!checked) {
                        setWorkspaceEntries(prev => prev.length > 0 ? [prev[0]] : [createWorkspaceEntry('')]);
                      }
                    }}
                    size="sm"
                  />
                </div>

                {/* Number of Panes — only available with worktree isolation */}
                {useWorktree && (
                  <div className="rounded-lg border border-border-primary bg-surface-secondary/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-text-secondary">
                        {interpolateTranslation(t('createSession.workspaceList.summary'), { count: workspaceEntries.length })}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addWorkspaceEntry}
                        className="shrink-0"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t('createSession.workspaceList.add')}
                      </Button>
                    </div>
                    <p className="text-xs text-text-tertiary mt-2">
                      {t('createSession.workspaceList.advancedHint')}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-border-primary bg-surface-secondary/30 p-3">
                  <ToggleField
                    label={t('createSession.initHooks.toggleLabel')}
                    checked={useProjectInitHooks}
                    onChange={setUseProjectInitHooks}
                    disabled={!projectInitHooksPreview.hasAnyConfiguredHooks}
                    size="sm"
                  />

                  <div className={`mt-3 rounded-lg border p-3 transition-colors ${initHooksState.cardClassName}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">{t('createSession.initHooks.title')}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowProjectSettings(true)}
                          disabled={!currentProject}
                          className="px-2 py-1 text-xs"
                        >
                          {initHooksSettingsActionLabel}
                        </Button>
                        <Badge variant={initHooksState.badgeVariant} size="sm">
                          {initHooksState.label}
                        </Badge>
                      </div>
                    </div>

                    <div className={`mt-3 space-y-2 text-xs transition-opacity ${initHooksState.contentClassName}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-text-tertiary">{t('initHooks.category.setup')}</span>
                        <span className="text-right text-text-secondary break-words">{formatHookSummary(projectInitHooksPreview.setupCommands)}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-text-tertiary">{t('initHooks.category.startup')}</span>
                        <span className="text-right text-text-secondary break-words">{formatHookSummary(projectInitHooksPreview.startupCommands)}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-text-tertiary">{t('initHooks.category.ide')}</span>
                        <span className="text-right text-text-secondary break-words">{projectInitHooksPreview.autoOpenIdeCommand || t('initHooks.emptyValue')}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-text-tertiary">{t('initHooks.category.defaultPanels')}</span>
                        <span className="text-right text-text-secondary break-words">{initHooksPanelSummary}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permission Mode */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-2 block">{t('createSession.securityMode.label')}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, permissionMode: 'ignore' }))}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                        formData.permissionMode === 'ignore'
                          ? 'border-interactive bg-interactive/10 text-interactive'
                          : 'border-border-secondary text-text-secondary hover:bg-surface-hover'
                      }`}
                    >
                      <ShieldOff className="w-4 h-4" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{t('settings.ai.security.fast.title')}</div>
                        <div className="text-xs opacity-70">{t('createSession.securityMode.fastDescription')}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, permissionMode: 'approve' }))}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                        formData.permissionMode === 'approve'
                          ? 'border-status-success bg-status-success/10 text-status-success'
                          : 'border-border-secondary text-text-secondary hover:bg-surface-hover'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{t('settings.ai.security.secure.title')}</div>
                        <div className="text-xs opacity-70">{t('createSession.securityMode.secureDescription')}</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Commit Mode Settings */}
                <CommitModeSettings
                  projectId={projectId}
                  mode={commitModeSettings.mode}
                  settings={commitModeSettings}
                  onChange={(_mode, settings) => {
                    setCommitModeSettings(settings);
                    savePreferences({ commitModeSettings: settings });
                  }}
                />
              </div>
            )}
          </form>
        </div>
      </ModalBody>

      <ModalFooter className="flex items-center justify-between">
        <div className="text-xs text-text-tertiary">
          <span className="font-medium">{t('createSession.tip.label')}</span>{' '}
          {interpolateTranslation(t('createSession.tip.message'), {
            shortcut: `${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter`
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="create-session-form"
            disabled={isSubmitting || isLoadingBranches || hasWorkspaceErrors || workspaceEntries.length === 0}
            loading={isSubmitting}
            title={
              isSubmitting
                ? (
                  workspaceEntries.length > 1
                    ? interpolateTranslation(t('createSession.actions.creatingMultipleTitle'), { count: workspaceEntries.length })
                    : t('createSession.actions.creatingTitle')
                )
                : hasWorkspaceErrors
                  ? t('createSession.actions.fixNameError')
                  : workspaceEntries.length === 0
                    ? t('createSession.actions.enterName')
                    : undefined
            }
          >
            {isSubmitting ? (
              workspaceEntries.length > 1
                ? interpolateTranslation(t('createSession.actions.creatingMultiple'), { count: workspaceEntries.length })
                : t('createSession.actions.creating')
            ) : (
              <>
                {workspaceEntries.length > 1
                  ? interpolateTranslation(t('createSession.actions.createMultiple'), { count: workspaceEntries.length })
                  : t('createSession.actions.create')}
                <span className="opacity-60">↵</span>
              </>
            )}
          </Button>
        </div>
      </ModalFooter>

      {currentProject && (
        <ProjectSettings
          project={currentProject}
          isOpen={showProjectSettings}
          onClose={() => setShowProjectSettings(false)}
          onUpdate={() => {
            void loadProjectInitHooksState(true);
          }}
          onDelete={() => {
            setShowProjectSettings(false);
            setCurrentProject(null);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
