import { ToolPanel, ToolPanelType } from '../../../shared/types/panels';
import type { WorkspaceLayoutMode } from '../../../UpdateWuruize/frontend/WorkspaceLayoutDemoState';

export type PanelContext = 'project' | 'worktree';

export interface PanelCreateOptions {
  initialCommand?: string;  // Command to run on terminal init
  title?: string;           // Custom panel title
}

export interface PanelTabBarProps {
  panels: ToolPanel[];
  activePanel?: ToolPanel;
  onPanelSelect: (panel: ToolPanel) => void;
  onPanelClose: (panel: ToolPanel) => void;
  onPanelCreate: (type: ToolPanelType, options?: PanelCreateOptions) => void;
  context?: PanelContext;  // Optional context to filter available panels
  onToggleDetailPanel?: () => void;
  detailPanelVisible?: boolean;
  layoutMode?: WorkspaceLayoutMode;
  onLayoutModeChange?: (mode: WorkspaceLayoutMode) => void;
}

export interface PanelContainerProps {
  panel: ToolPanel;
  isActive: boolean;
  isMainRepo?: boolean;
}

export interface TerminalPanelProps {
  panel: ToolPanel;
  isActive: boolean;
}
