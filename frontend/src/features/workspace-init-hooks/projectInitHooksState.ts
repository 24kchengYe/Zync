import type { Project } from '../../types/project';

export type InitHookPanelKey = 'terminal' | 'explorer' | 'diff';

export interface ProjectInitHooksConfig {
  enabledByDefault: boolean;
  defaultPanels: InitHookPanelKey[];
}

export interface ProjectInitHooksPreview {
  setupCommands: string[];
  startupCommands: string[];
  autoOpenIdeCommand: string | null;
  defaultPanels: InitHookPanelKey[];
  hasAnyConfiguredHooks: boolean;
}

type ProjectInitHookSource = Pick<Project, 'build_script' | 'run_script' | 'open_ide_command'>;

const STORAGE_KEY = 'zync-project-init-hooks-preview-v1';
const LEGACY_STORAGE_KEYS = ['zync-project-init-hooks-demo-v1'];
const ALLOWED_PANEL_KEYS: InitHookPanelKey[] = ['terminal', 'explorer', 'diff'];

export const DEFAULT_PROJECT_INIT_HOOKS_CONFIG: ProjectInitHooksConfig = {
  enabledByDefault: false,
  defaultPanels: [],
};

function isInitHookPanelKey(value: string): value is InitHookPanelKey {
  return ALLOWED_PANEL_KEYS.includes(value as InitHookPanelKey);
}

function splitCommands(value?: string | null): string[] {
  return (value || '')
    .split('\n')
    .map(command => command.trim())
    .filter(Boolean);
}

function normalizeConfig(config?: Partial<ProjectInitHooksConfig>): ProjectInitHooksConfig {
  const defaultPanels = Array.from(new Set((config?.defaultPanels || []).filter(isInitHookPanelKey)));

  return {
    enabledByDefault: config?.enabledByDefault ?? DEFAULT_PROJECT_INIT_HOOKS_CONFIG.enabledByDefault,
    defaultPanels,
  };
}

function loadStoredConfigs(): Record<string, ProjectInitHooksConfig> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
      .map((storageKey) => window.localStorage.getItem(storageKey))
      .find((value): value is string => Boolean(value));
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as Record<string, Partial<ProjectInitHooksConfig>>;
    return Object.fromEntries(
      Object.entries(parsed).map(([projectId, config]) => [projectId, normalizeConfig(config)]),
    );
  } catch (error) {
    console.error('[ProjectInitHooksState] Failed to load config:', error);
    return {};
  }
}

function saveStoredConfigs(configs: Record<string, ProjectInitHooksConfig>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function loadProjectInitHooksConfig(projectId?: number | null): ProjectInitHooksConfig {
  if (!projectId) {
    return DEFAULT_PROJECT_INIT_HOOKS_CONFIG;
  }

  const configs = loadStoredConfigs();
  return configs[String(projectId)] || DEFAULT_PROJECT_INIT_HOOKS_CONFIG;
}

export function saveProjectInitHooksConfig(projectId: number, config: ProjectInitHooksConfig) {
  const configs = loadStoredConfigs();
  configs[String(projectId)] = normalizeConfig(config);
  saveStoredConfigs(configs);
}

export function buildProjectInitHooksPreview(
  project: ProjectInitHookSource | null | undefined,
  config: ProjectInitHooksConfig = DEFAULT_PROJECT_INIT_HOOKS_CONFIG,
): ProjectInitHooksPreview {
  const setupCommands = splitCommands(project?.build_script);
  const startupCommands = splitCommands(project?.run_script);
  const autoOpenIdeCommand = project?.open_ide_command?.trim() || null;
  const defaultPanels = normalizeConfig(config).defaultPanels;
  const hasAnyConfiguredHooks =
    setupCommands.length > 0 ||
    startupCommands.length > 0 ||
    Boolean(autoOpenIdeCommand) ||
    defaultPanels.length > 0;

  return {
    setupCommands,
    startupCommands,
    autoOpenIdeCommand,
    defaultPanels,
    hasAnyConfiguredHooks,
  };
}
