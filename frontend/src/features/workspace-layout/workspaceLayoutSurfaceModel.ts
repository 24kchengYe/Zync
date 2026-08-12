import type { ToolPanel } from '../../../../shared/types/panels';
import type { TranslationKey } from '../../i18n';
import type { WorkspaceLayoutMode, WorkspaceLayoutSlot } from './workspaceLayoutState';

export interface SlotDefinition {
  slot: WorkspaceLayoutSlot;
  className: string;
}

export function getPanelDisplayTitle(panel: ToolPanel, t: (key: TranslationKey) => string) {
  if (panel.type === 'diff' && panel.title === 'Diff') {
    return t('panelTabs.tool.diff');
  }

  if (panel.type === 'terminal' && panel.title === 'Terminal') {
    return t('panelTabs.tool.terminal');
  }

  if (panel.type === 'explorer' && panel.title === 'Explorer') {
    return t('panelTabs.tool.explorer');
  }

  if (panel.type === 'dashboard' && panel.title === 'Status Panel') {
    return t('panelTabs.tool.dashboard');
  }

  if (panel.type === 'logs' && panel.title === 'Logs') {
    return t('panelTabs.tool.logs');
  }

  if (panel.type === 'setup-tasks' && panel.title === 'Setup Tasks') {
    return t('panelTabs.tool.setupTasks');
  }

  return panel.title;
}

export function getLayoutSurfaceClasses(layoutMode: WorkspaceLayoutMode) {
  if (layoutMode === 'columns') {
    return 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)] grid-rows-1';
  }

  if (layoutMode === 'rows') {
    return 'grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]';
  }

  if (layoutMode === 'topBottomGrid') {
    return 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_minmax(0,1fr)]';
  }

  if (layoutMode === 'quad') {
    return 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_minmax(0,1fr)]';
  }

  return 'grid-cols-1 grid-rows-1';
}

export function getSlotDefinitions(layoutMode: WorkspaceLayoutMode): SlotDefinition[] {
  if (layoutMode === 'columns') {
    return [
      { slot: 'slot1', className: 'col-start-1 row-start-1' },
      { slot: 'slot2', className: 'col-start-2 row-start-1' },
    ];
  }

  if (layoutMode === 'rows') {
    return [
      { slot: 'slot1', className: 'col-start-1 row-start-1' },
      { slot: 'slot2', className: 'col-start-1 row-start-2' },
    ];
  }

  if (layoutMode === 'topBottomGrid') {
    return [
      { slot: 'slot1', className: 'col-span-2 col-start-1 row-start-1' },
      { slot: 'slot2', className: 'col-start-1 row-start-2' },
      { slot: 'slot3', className: 'col-start-2 row-start-2' },
    ];
  }

  if (layoutMode === 'quad') {
    return [
      { slot: 'slot1', className: 'col-start-1 row-start-1' },
      { slot: 'slot2', className: 'col-start-2 row-start-1' },
      { slot: 'slot3', className: 'col-start-1 row-start-2' },
      { slot: 'slot4', className: 'col-start-2 row-start-2' },
    ];
  }

  return [{ slot: 'slot1', className: 'col-start-1 row-start-1' }];
}
