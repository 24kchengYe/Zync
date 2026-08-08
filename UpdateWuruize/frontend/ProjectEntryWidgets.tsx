import { useMemo } from 'react';
import { ArrowRight, LayoutDashboard, Search, Workflow } from 'lucide-react';
import type { Project } from '../../frontend/src/types/project';
import { Button } from '../../frontend/src/components/ui/Button';
import { Dropdown } from '../../frontend/src/components/ui/Dropdown';
import { interpolateTranslation, useI18n } from './I18nContext';
import type { TranslationKey } from './i18n';
import { useProjectEntryDemoData, useProjectEntryDemoState } from './ProjectEntryState';

interface LaunchOption {
  id: string;
  label: string;
  project: Project;
}

const MAX_LAUNCH_OPTIONS = 4;

function getPreferredProject(
  projects: Project[],
  lastOpenedProjectId: number | null,
  defaultProjectId: number | null,
) {
  if (lastOpenedProjectId) {
    const lastOpenedProject = projects.find((project) => project.id === lastOpenedProjectId);
    if (lastOpenedProject) {
      return {
        project: lastOpenedProject,
        source: 'last-opened' as const,
      };
    }
  }

  if (defaultProjectId) {
    const configuredDefaultProject = projects.find((project) => project.id === defaultProjectId);
    if (configuredDefaultProject) {
      return {
        project: configuredDefaultProject,
        source: 'configured' as const,
      };
    }
  }

  const activeProject = projects.find((project) => project.active);
  if (activeProject) {
    return {
      project: activeProject,
      source: 'configured' as const,
    };
  }

  if (projects[0]) {
    return {
      project: projects[0],
      source: 'fallback' as const,
    };
  }

  return null;
}

function buildLaunchOptions(
  projects: Project[],
  lastOpenedProjectId: number | null,
  defaultProjectId: number | null,
  recentProjectIds: number[],
  t: (key: TranslationKey) => string,
): LaunchOption[] {
  const options: LaunchOption[] = [];
  const addedProjectIds = new Set<number>();
  const preferredProject = getPreferredProject(projects, lastOpenedProjectId, defaultProjectId);

  if (preferredProject) {
    const primaryLabel =
      preferredProject.source === 'last-opened'
        ? interpolateTranslation(t('home.projectEntryDemo.startup.option.lastOpened'), {
            name: preferredProject.project.name,
          })
        : `${t('home.projectEntryDemo.actions.openProject')}: ${preferredProject.project.name}`;

    options.push({
      id: 'last-opened',
      label: primaryLabel,
      project: preferredProject.project,
    });
    addedProjectIds.add(preferredProject.project.id);
  }

  recentProjectIds
    .map((projectId) => projects.find((project) => project.id === projectId))
    .filter((project): project is Project => Boolean(project))
    .filter((project) => !addedProjectIds.has(project.id))
    .slice(0, 3)
    .forEach((project) => {
      options.push({
        id: `project:${project.id}`,
        label: interpolateTranslation(t('home.projectEntryDemo.startup.option.recent'), {
          name: project.name,
        }),
        project,
      });
      addedProjectIds.add(project.id);
    });

  projects
    .filter((project) => !addedProjectIds.has(project.id))
    .slice(0, Math.max(0, MAX_LAUNCH_OPTIONS - options.length))
    .forEach((project) => {
      options.push({
        id: `project:${project.id}`,
        label: `${t('home.projectEntryDemo.actions.openProject')}: ${project.name}`,
        project,
      });
      addedProjectIds.add(project.id);
    });

  return options;
}

export function StartupEntryCard() {
  const { t } = useI18n();
  const { demoState, patchDemoState } = useProjectEntryDemoState();
  const { openProject, openProjectDashboard, projects } = useProjectEntryDemoData();

  const launchOptions = useMemo(() => {
    return buildLaunchOptions(
      projects,
      demoState.lastOpenedProjectId,
      demoState.defaultProjectId,
      demoState.recentProjectIds,
      t,
    );
  }, [demoState.defaultProjectId, demoState.lastOpenedProjectId, demoState.recentProjectIds, projects, t]);

  const selectedOption = useMemo(() => {
    return launchOptions.find((option) => option.id === demoState.startupQuickTarget) ?? launchOptions[0] ?? null;
  }, [demoState.startupQuickTarget, launchOptions]);

  const handleJump = async () => {
    if (!selectedOption) {
      return;
    }

    await openProject(
      selectedOption.project,
      demoState.defaultWorkspaceByProjectId[selectedOption.project.id],
    );
  };

  const handleOpenStatusPanel = async () => {
    if (!selectedOption) {
      return;
    }

    await openProjectDashboard(selectedOption.project);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-secondary p-4">
      <div className="flex min-w-0 items-center gap-2">
        <Workflow className="h-4 w-4 text-text-secondary" />
        <span className="truncate text-text-primary">{t('home.projectEntryDemo.startup.title')}</span>
      </div>

      <div className="flex items-center gap-2">
        <Dropdown
          trigger={
            <button
              type="button"
              disabled={launchOptions.length === 0}
              className="min-w-[260px] max-w-[360px] truncate rounded-md border border-border-secondary bg-surface-tertiary px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-interactive"
            >
              <span className="truncate">
                {selectedOption?.label ?? t('home.projectEntryDemo.startup.emptyCompact')}
              </span>
            </button>
          }
          items={launchOptions.map((option) => ({
            id: option.id,
            label: option.label,
            onClick: () => {
              patchDemoState((current) => ({
                ...current,
                startupQuickTarget: option.id,
              }));
            },
          }))}
          selectedId={selectedOption?.id}
          position="bottom-right"
          width="md"
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleOpenStatusPanel}
          disabled={!selectedOption}
          icon={<LayoutDashboard className="h-3.5 w-3.5" />}
        >
          {t('home.projectEntryDemo.startup.statusButton')}
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleJump}
          disabled={!selectedOption}
          icon={<ArrowRight className="h-3.5 w-3.5" />}
        >
          {t('home.projectEntryDemo.startup.jumpButton')}
        </Button>
      </div>
    </div>
  );
}

export function SidebarProjectSearchPanel() {
  const { t } = useI18n();
  const { demoState, patchDemoState } = useProjectEntryDemoState();

  return (
    <div className="px-3 pb-3">
      <div className="rounded-lg border border-border-primary bg-surface-secondary p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Search className="h-4 w-4 flex-shrink-0 text-interactive" />
            <span className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              {t('home.projectEntryDemo.search.title')}
            </span>
          </div>
          <span className="rounded-full border border-interactive/30 bg-interactive/10 px-2 py-0.5 text-[10px] font-medium text-interactive">
            {t('home.projectEntryDemo.demoBadge')}
          </span>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={demoState.sidebarSearchQuery}
            onChange={(event) => {
              const nextQuery = event.target.value;
              patchDemoState((current) => ({
                ...current,
                sidebarSearchQuery: nextQuery,
              }));
            }}
            placeholder={t('home.projectEntryDemo.search.placeholder')}
            className="w-full rounded-lg border border-border-secondary bg-surface-primary py-2 pl-10 pr-3 text-sm text-text-primary outline-none transition-colors focus:border-interactive"
          />
        </div>

        <p className="mt-2 text-xs leading-5 text-text-tertiary">
          {t('home.projectEntryDemo.search.hint')}
        </p>
      </div>
    </div>
  );
}
