import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus } from 'lucide-react';
import type { ToolPanel } from '../../../../shared/types/panels';
import { PanelContainer } from '../../components/panels/PanelContainer';
import { cn } from '../../utils/cn';
import type { PanelCreateOptions } from '../../types/panelComponents';
import type {
  WorkspaceLayoutFocusSlot,
  WorkspaceLayoutMode,
  WorkspaceLayoutSlot,
} from './workspaceLayoutState';
import { getWorkspaceLayoutVisibleSlots } from './workspaceLayoutState';
import { useI18n } from '../../I18nContext';
import {
  getWorkspaceLayoutGridCellClassName,
  getWorkspaceLayoutSlotFrameClassName,
} from './workspaceLayoutSurfaceClasses';
import {
  getLayoutSurfaceClasses,
  getPanelDisplayTitle,
  getSlotDefinitions,
} from './workspaceLayoutSurfaceModel';

interface WorkspaceLayoutSurfaceProps {
  layoutMode: WorkspaceLayoutMode;
  slotPanels: Partial<Record<WorkspaceLayoutSlot, ToolPanel>>;
  availablePanels: ToolPanel[];
  splitRatio: number;
  secondarySplitRatio: number;
  focusedSlot: WorkspaceLayoutFocusSlot;
  isMainRepo?: boolean;
  onSelectPanelForSlot: (slot: WorkspaceLayoutSlot, panelId: string) => void;
  onSplitRatioChange: (ratio: number) => void;
  onSecondarySplitRatioChange: (ratio: number) => void;
  onFocusSlotChange: (slot: WorkspaceLayoutFocusSlot) => void;
  onCreatePanel: (type: 'explorer' | 'diff', options?: PanelCreateOptions) => void;
}

function getSlotLabel(slot: WorkspaceLayoutSlot, t: ReturnType<typeof useI18n>['t']) {
  return t(`workspaceLayout.slot.${slot}`);
}

function SlotFrame({
  slot,
  panel,
  availablePanels,
  pickerOpen,
  isFocused,
  isMainRepo,
  showSlotLabel,
  onOpenPicker,
  onClosePicker,
  onFocusSlot,
  onSelectPanel,
  onCreatePanel,
}: {
  slot: WorkspaceLayoutSlot;
  panel?: ToolPanel;
  availablePanels: ToolPanel[];
  pickerOpen: boolean;
  isFocused: boolean;
  isMainRepo: boolean;
  showSlotLabel: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onFocusSlot: () => void;
  onSelectPanel: (panelId: string) => void;
  onCreatePanel: (type: 'explorer' | 'diff') => void;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    transformOrigin: string;
  } | null>(null);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      const clickedTriggerArea = containerRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);

      if (!clickedTriggerArea && !clickedMenu) {
        onClosePicker();
      }
    };

    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClosePicker, pickerOpen]);

  useLayoutEffect(() => {
    if (!pickerOpen || !triggerRef.current || !menuRef.current) {
      return;
    }

    const viewportPadding = 12;
    const offset = 8;

    const updatePosition = () => {
      if (!triggerRef.current || !menuRef.current) {
        return;
      }

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();

      let left = triggerRect.right - menuRect.width;
      let top = triggerRect.bottom + offset;
      let transformOrigin = 'top right';

      if (left < viewportPadding) {
        left = viewportPadding;
      }

      if (left + menuRect.width > window.innerWidth - viewportPadding) {
        left = Math.max(
          viewportPadding,
          window.innerWidth - menuRect.width - viewportPadding,
        );
      }

      if (top + menuRect.height > window.innerHeight - viewportPadding) {
        top = Math.max(
          viewportPadding,
          triggerRect.top - menuRect.height - offset,
        );
        transformOrigin = 'bottom right';
      }

      setMenuPosition({ top, left, transformOrigin });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [pickerOpen]);

  return (
    <div
      ref={containerRef}
      className={cn(getWorkspaceLayoutSlotFrameClassName(isFocused))}
      onMouseDownCapture={onFocusSlot}
    >
      <div className="flex h-9 items-center justify-between border-b border-border-primary/70 px-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {showSlotLabel ? (
            <span
              className={cn(
                'inline-flex h-5 min-w-0 items-center rounded-full border px-2 text-[10px] font-semibold uppercase tracking-[0.16em]',
                isFocused
                  ? 'border-interactive/50 bg-interactive/10 text-text-primary'
                  : 'border-border-primary/80 text-text-secondary',
              )}
            >
              {getSlotLabel(slot, t)}
            </span>
          ) : null}
          <span className="truncate text-sm text-text-secondary">
            {panel
              ? getPanelDisplayTitle(panel, t)
              : t('workspaceLayout.slot.choose')}
          </span>
        </div>

        <div className="ml-3 flex flex-shrink-0 items-center gap-2">
          {panel ? (
            <div
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                isFocused ? 'bg-interactive' : 'bg-text-quaternary',
              )}
            />
          ) : null}
          <button
            ref={triggerRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFocusSlot();
              if (pickerOpen) {
                onClosePicker();
              } else {
                onOpenPicker();
              }
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-border-primary/80 px-2 py-1 text-xs font-medium text-text-secondary transition-colors',
              pickerOpen
                ? 'bg-surface-hover text-text-primary'
                : 'hover:bg-surface-hover hover:text-text-primary',
            )}
            title={t('workspaceLayout.slot.menuTitle')}
            aria-label={`${t('common.select')} ${getSlotLabel(slot, t)}`}
            aria-haspopup="menu"
            aria-expanded={pickerOpen}
          >
            <span>{t('common.select')}</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                pickerOpen && 'rotate-180',
              )}
            />
          </button>
        </div>
      </div>

      {pickerOpen ? (
        createPortal(
          <div
            ref={menuRef}
            className={cn(
              'fixed z-[10001] w-56 max-w-[calc(100vw-1rem)] rounded-lg border border-border-primary bg-surface-primary shadow-dropdown-elevated backdrop-blur-sm',
              menuPosition?.transformOrigin === 'bottom right'
                ? 'animate-dropdown-enter-up'
                : 'animate-dropdown-enter',
            )}
            style={
              menuPosition
                ? {
                    top: menuPosition.top,
                    left: menuPosition.left,
                    transformOrigin: menuPosition.transformOrigin,
                  }
                : {
                    top: 0,
                    left: 0,
                    visibility: 'hidden',
                  }
            }
            role="menu"
          >
            <div className="border-b border-border-primary px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
              {t('workspaceLayout.slot.menuTitle')}
            </div>

            <div className="max-h-56 overflow-y-auto p-1.5">
              {availablePanels.length > 0 ? (
                <div className="space-y-0.5">
                  {availablePanels.map((availablePanel) => {
                    const selected = availablePanel.id === panel?.id;
                    return (
                      <button
                        key={availablePanel.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectPanel(availablePanel.id);
                          onClosePicker();
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] leading-tight transition-colors',
                          selected
                            ? 'bg-interactive/10 text-text-primary'
                            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                        )}
                      >
                        <Check
                          className={cn(
                            'h-3.5 w-3.5 flex-shrink-0',
                            selected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="truncate">
                          {getPanelDisplayTitle(availablePanel, t)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border-primary px-2.5 py-3 text-xs text-text-tertiary">
                  {t('workspaceLayout.slot.noPanels')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 border-t border-border-primary px-1.5 py-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreatePanel('explorer');
                  onClosePicker();
                }}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border-primary/80 px-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <Plus className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{t('panelTabs.tool.explorer')}</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreatePanel('diff');
                  onClosePicker();
                }}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border-primary/80 px-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <Plus className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{t('panelTabs.tool.diff')}</span>
              </button>
            </div>
          </div>,
          document.body,
        )
      ) : null}

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {panel ? (
          <PanelContainer
            panel={panel}
            isActive={true}
            isMainRepo={isMainRepo}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center">
            <div className="max-w-xs">
              <div className="text-sm font-medium text-text-primary">
                {t('workspaceLayout.slot.emptyTitle')}
              </div>
              <div className="mt-1 text-sm text-text-secondary">
                {t('workspaceLayout.slot.emptyDescription')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SplitHandle({
  className,
  isDragging,
  onMouseDown,
  style,
  children,
}: {
  className: string;
  isDragging: boolean;
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'absolute z-10 rounded-full transition-colors',
        isDragging ? 'bg-surface-hover' : 'hover:bg-surface-hover/70',
        className,
      )}
      style={style}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}

export function WorkspaceLayoutSurface({
  layoutMode,
  slotPanels,
  availablePanels,
  splitRatio,
  secondarySplitRatio,
  focusedSlot,
  isMainRepo = false,
  onSelectPanelForSlot,
  onSplitRatioChange,
  onSecondarySplitRatioChange,
  onFocusSlotChange,
  onCreatePanel,
}: WorkspaceLayoutSurfaceProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pickerSlot, setPickerSlot] = useState<WorkspaceLayoutSlot | null>(null);
  const [dragAxis, setDragAxis] = useState<'x' | 'y' | null>(null);

  const visibleSlots = useMemo(
    () => getWorkspaceLayoutVisibleSlots(layoutMode),
    [layoutMode],
  );
  const slotDefinitions = useMemo(
    () => getSlotDefinitions(layoutMode),
    [layoutMode],
  );
  const showSlotLabel = visibleSlots.length > 1;

  useEffect(() => {
    if (!pickerSlot || visibleSlots.includes(pickerSlot)) {
      return;
    }

    setPickerSlot(null);
  }, [pickerSlot, visibleSlots]);

  const handleSplitDragStart = useCallback(
    (axis: 'x' | 'y') => (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutMode === 'single') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setDragAxis(axis);

      const updateSplitRatioFromPointer = (clientX: number, clientY: number) => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        const rect = container.getBoundingClientRect();
        const nextRatio =
          axis === 'x'
            ? (clientX - rect.left) / rect.width
            : (clientY - rect.top) / rect.height;

        if (axis === 'x') {
          onSecondarySplitRatioChange(nextRatio);
          return;
        }

        onSplitRatioChange(nextRatio);
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        updateSplitRatioFromPointer(moveEvent.clientX, moveEvent.clientY);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        updateSplitRatioFromPointer(upEvent.clientX, upEvent.clientY);
        setDragAxis(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      updateSplitRatioFromPointer(event.clientX, event.clientY);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [layoutMode, onSecondarySplitRatioChange, onSplitRatioChange],
  );

  if (availablePanels.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        <div className="p-8 text-center">
          <div className="mb-4 text-4xl">□</div>
          <h2 className="mb-2 text-xl font-semibold">
            {t('workspaceLayout.empty.title')}
          </h2>
          <p className="text-sm">{t('workspaceLayout.empty.description')}</p>
        </div>
      </div>
    );
  }

  const surfaceStyle =
    layoutMode === 'columns'
      ? { gridTemplateColumns: `${splitRatio}fr ${1 - splitRatio}fr` }
      : layoutMode === 'rows'
        ? { gridTemplateRows: `${splitRatio}fr ${1 - splitRatio}fr` }
        : layoutMode === 'topBottomGrid'
          ? {
              gridTemplateRows: `${splitRatio}fr ${1 - splitRatio}fr`,
              gridTemplateColumns: `${secondarySplitRatio}fr ${1 - secondarySplitRatio}fr`,
            }
          : layoutMode === 'quad'
            ? {
                gridTemplateRows: `${splitRatio}fr ${1 - splitRatio}fr`,
                gridTemplateColumns: `${secondarySplitRatio}fr ${1 - secondarySplitRatio}fr`,
              }
          : undefined;

  return (
    <div className="relative h-full min-h-0 overflow-hidden p-2">
      <div
        ref={containerRef}
        className={cn(
          'grid h-full min-h-0 gap-2',
          getLayoutSurfaceClasses(layoutMode),
        )}
        style={surfaceStyle}
      >
        {slotDefinitions.map(({ slot, className }) => (
          <div
            key={slot}
            className={cn(getWorkspaceLayoutGridCellClassName(), className)}
          >
            <SlotFrame
              slot={slot}
              panel={slotPanels[slot]}
              availablePanels={availablePanels}
              pickerOpen={pickerSlot === slot}
              isFocused={focusedSlot === slot}
              isMainRepo={isMainRepo}
              showSlotLabel={showSlotLabel}
              onOpenPicker={() => setPickerSlot(slot)}
              onClosePicker={() => setPickerSlot((current) => (current === slot ? null : current))}
              onFocusSlot={() => onFocusSlotChange(slot)}
              onSelectPanel={(panelId) => onSelectPanelForSlot(slot, panelId)}
              onCreatePanel={(type) => onCreatePanel(type)}
            />
          </div>
        ))}
      </div>

      {layoutMode === 'columns' || layoutMode === 'topBottomGrid' || layoutMode === 'quad' ? (
        <SplitHandle
          className="w-4 -translate-x-1/2 cursor-col-resize"
          isDragging={dragAxis === 'x'}
          onMouseDown={handleSplitDragStart('x')}
          style={
            layoutMode === 'columns'
              ? {
                  left: `calc(8px + (100% - 16px) * ${splitRatio})`,
                  top: '16px',
                  bottom: '16px',
                }
              : layoutMode === 'topBottomGrid'
                ? {
                    left: `calc(8px + (100% - 16px) * ${secondarySplitRatio})`,
                    top: `calc(8px + (100% - 16px) * ${splitRatio} + 8px)`,
                    bottom: '16px',
                  }
                : {
                    left: `calc(8px + (100% - 16px) * ${secondarySplitRatio})`,
                    top: '16px',
                    bottom: '16px',
                  }
          }
        >
          <div
            className="absolute bottom-2 left-1/2 top-2 w-[2px] -translate-x-1/2 rounded-full bg-border-primary"
            style={{ pointerEvents: 'none' }}
          />
        </SplitHandle>
      ) : null}

      {layoutMode === 'rows' || layoutMode === 'topBottomGrid' || layoutMode === 'quad' ? (
        <SplitHandle
          className="left-4 right-4 h-4 -translate-y-1/2 cursor-row-resize"
          isDragging={dragAxis === 'y'}
          onMouseDown={handleSplitDragStart('y')}
          style={{ top: `calc(8px + (100% - 16px) * ${splitRatio})` }}
        >
          <div
            className="absolute left-2 right-2 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-border-primary"
            style={{ pointerEvents: 'none' }}
          />
        </SplitHandle>
      ) : null}
    </div>
  );
}
