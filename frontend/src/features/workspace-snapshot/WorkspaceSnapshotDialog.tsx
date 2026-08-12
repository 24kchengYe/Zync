import { useMemo } from 'react';
import {
  Camera,
  Clock3,
  History,
  LayoutTemplate,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '../../components/ui/Modal';
import { cn } from '../../utils/cn';
import { interpolateTranslation, useI18n } from '../../I18nContext';
import type { WorkspaceLayoutState } from '../workspace-layout/workspaceLayoutState';
import type {
  WorkspaceSnapshotRecord,
  WorkspaceSnapshotRestorePreview,
  WorkspaceSnapshotSupportedPanelType,
} from './workspaceSnapshotState';

type WorkspaceSnapshotDialogMode = 'save' | 'restore';

interface WorkspaceSnapshotDialogProps {
  isOpen: boolean;
  mode: WorkspaceSnapshotDialogMode;
  workspaceName: string;
  currentPanels: Array<{
    id: string;
    title: string;
    type: WorkspaceSnapshotSupportedPanelType;
  }>;
  activePanelId: string | null;
  snapshots: WorkspaceSnapshotRecord[];
  selectedSnapshotId: string | null;
  snapshotName: string;
  currentLayout: WorkspaceLayoutState;
  restorePreview: WorkspaceSnapshotRestorePreview | null;
  onSnapshotNameChange: (value: string) => void;
  onSelectSnapshot: (snapshotId: string) => void;
  onSave: () => void;
  onRestore: (snapshot: WorkspaceSnapshotRecord) => void;
  onDelete: (snapshot: WorkspaceSnapshotRecord) => void;
  onClose: () => void;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-3">
      <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
        {label}
      </div>
      <div className="text-sm font-medium text-text-primary">{value}</div>
    </div>
  );
}

function SnapshotKindBadge({
  kind,
}: {
  kind: WorkspaceSnapshotRecord['kind'];
}) {
  const { t } = useI18n();

  return (
    <Badge size="sm" variant={kind === 'manual' ? 'primary' : 'info'}>
      {kind === 'manual'
        ? t('detailPanel.snapshots.kind.manual')
        : t('detailPanel.snapshots.kind.autoBeforeRestore')}
    </Badge>
  );
}

function SnapshotPanelPill({
  panel,
}: {
  panel: { title: string; type: WorkspaceSnapshotSupportedPanelType };
}) {
  const { t } = useI18n();
  const panelTypeLabel =
    panel.type === 'terminal'
      ? t('common.panel.terminal')
      : panel.type === 'explorer'
        ? t('common.panel.explorer')
        : t('common.panel.diff');

  return (
    <div className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-2">
      <div className="truncate text-sm font-medium text-text-primary">{panel.title}</div>
      <div className="mt-1 text-xs text-text-tertiary">{panelTypeLabel}</div>
    </div>
  );
}

function formatLayoutModeLabel(
  layoutMode: WorkspaceLayoutState['mode'],
  t: ReturnType<typeof useI18n>['t'],
) {
  if (layoutMode === 'columns') {
    return t('panelTabs.layout.mode.columns');
  }

  if (layoutMode === 'rows') {
    return t('panelTabs.layout.mode.rows');
  }

  if (layoutMode === 'topBottomGrid') {
    return t('panelTabs.layout.mode.topBottomGrid');
  }

  if (layoutMode === 'quad') {
    return t('panelTabs.layout.mode.quad');
  }

  return t('panelTabs.layout.mode.single');
}

function formatFocusSlotLabel(
  focusSlot: WorkspaceLayoutState['focusSlot'],
  t: ReturnType<typeof useI18n>['t'],
) {
  return t(`workspaceLayout.slot.${focusSlot}`);
}

function formatSplitRatioLabel(splitRatio: number) {
  const primaryPercentage = Math.round(splitRatio * 100);
  const secondaryPercentage = 100 - primaryPercentage;

  return `${primaryPercentage} / ${secondaryPercentage}`;
}

function formatLayoutSplitSummary(layout: WorkspaceLayoutState) {
  const primarySplit = formatSplitRatioLabel(layout.splitRatio);
  const secondarySplit = formatSplitRatioLabel(layout.secondarySplitRatio ?? 0.5);

  if (layout.mode === 'topBottomGrid' || layout.mode === 'quad') {
    return `↕ ${primarySplit} · ↔ ${secondarySplit}`;
  }

  return primarySplit;
}

export function WorkspaceSnapshotDialog({
  isOpen,
  mode,
  workspaceName,
  currentPanels,
  activePanelId,
  snapshots,
  selectedSnapshotId,
  snapshotName,
  currentLayout,
  restorePreview,
  onSnapshotNameChange,
  onSelectSnapshot,
  onSave,
  onRestore,
  onDelete,
  onClose,
}: WorkspaceSnapshotDialogProps) {
  const { t } = useI18n();

  const selectedSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? null,
    [selectedSnapshotId, snapshots],
  );

  const activeCurrentPanel = useMemo(
    () =>
      (activePanelId
        ? currentPanels.find((panel) => panel.id === activePanelId) ?? null
        : null) ??
      currentPanels[0] ??
      null,
    [activePanelId, currentPanels],
  );

  const savePanelCountLabel = interpolateTranslation(
    t('detailPanel.snapshots.panelCount'),
    { count: String(currentPanels.length) },
  );

  const selectedSnapshotPanelCountLabel = selectedSnapshot
    ? interpolateTranslation(t('detailPanel.snapshots.panelCount'), {
        count: String(selectedSnapshot.panelCount),
      })
    : t('detailPanel.snapshots.preview.none');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={mode === 'save' ? 'lg' : 'xl'}
      showCloseButton={false}
      className={mode === 'restore' ? '!max-w-5xl !overflow-hidden' : undefined}
    >
      <ModalHeader
        title={
          mode === 'save'
            ? t('detailPanel.snapshots.modal.saveTitle')
            : t('detailPanel.snapshots.modal.restoreTitle')
        }
        icon={
          mode === 'save' ? (
            <Camera className="h-5 w-5" />
          ) : (
            <RotateCcw className="h-5 w-5" />
          )
        }
        onClose={onClose}
      />

      {mode === 'save' ? (
        <>
          <ModalBody className="space-y-5">
            <div className="rounded-xl border border-border-primary bg-surface-secondary p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
                <LayoutTemplate className="h-4 w-4 text-text-secondary" />
                <span>{workspaceName}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SummaryCard
                  label={t('detailPanel.snapshots.preview.inSnapshot')}
                  value={savePanelCountLabel}
                />
                <SummaryCard
                  label={t('detailPanel.snapshots.preview.activePanel')}
                  value={activeCurrentPanel?.title ?? t('detailPanel.snapshots.preview.none')}
                />
                <SummaryCard
                  label={t('detailPanel.snapshots.preview.layout')}
                  value={formatLayoutModeLabel(currentLayout.mode, t)}
                />
                <SummaryCard
                  label={t('detailPanel.snapshots.preview.splitRatio')}
                  value={formatLayoutSplitSummary(currentLayout)}
                />
              </div>
            </div>

            <Input
              label={t('detailPanel.snapshots.nameLabel')}
              value={snapshotName}
              onChange={(event) => onSnapshotNameChange(event.target.value)}
              placeholder={t('detailPanel.snapshots.namePlaceholder')}
              fullWidth
              autoFocus
            />

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                {t('detailPanel.snapshots.preview.panels')}
              </div>
              {currentPanels.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border-primary px-3 py-4 text-sm text-text-tertiary">
                  {t('detailPanel.snapshots.preview.none')}
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {currentPanels.map((panel) => (
                    <SnapshotPanelPill
                      key={panel.id}
                      panel={{
                        title: panel.title,
                        type: panel.type,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={onSave}>
              {t('detailPanel.snapshots.save')}
            </Button>
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalBody className="p-0">
            {snapshots.length === 0 ? (
              <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-text-tertiary">
                {t('detailPanel.snapshots.noSnapshots')}
              </div>
            ) : (
              <div className="grid min-h-[480px] grid-cols-1 md:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
                <div className="border-b border-border-primary md:border-b-0 md:border-r">
                  <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    {t('detailPanel.snapshots.latest')}
                  </div>
                  <div className="max-h-[480px] space-y-2 overflow-y-auto px-3 pb-3">
                    {snapshots.map((snapshot) => {
                      const isSelected = snapshot.id === selectedSnapshot?.id;
                      return (
                        <div
                          key={snapshot.id}
                          className={cn(
                            'rounded-xl border px-3 py-3 transition-colors',
                            isSelected
                              ? 'border-interactive bg-interactive/10'
                              : 'border-border-primary bg-surface-secondary hover:bg-surface-hover',
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectSnapshot(snapshot.id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-text-primary">
                                    {snapshot.name}
                                  </div>
                                  <div className="mt-1 truncate text-xs text-text-tertiary">
                                    {snapshot.workspaceName}
                                  </div>
                                </div>
                                <SnapshotKindBadge kind={snapshot.kind} />
                              </div>

                              <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                                <Clock3 className="h-3.5 w-3.5" />
                                <span>{formatDateTime(snapshot.createdAt)}</span>
                              </div>
                            </button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-0.5 !px-2 text-status-error hover:bg-status-error/10 hover:text-status-error"
                              icon={<Trash2 className="h-4 w-4" />}
                              onClick={() => onDelete(snapshot)}
                            >
                              {t('detailPanel.snapshots.delete')}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-surface-primary">
                  {selectedSnapshot ? (
                    <>
                      <div className="border-b border-border-primary px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-lg font-semibold text-text-primary">
                              {selectedSnapshot.name}
                            </div>
                            <div className="mt-1 truncate text-sm text-text-secondary">
                              {selectedSnapshot.workspaceName}
                            </div>
                          </div>
                          <SnapshotKindBadge kind={selectedSnapshot.kind} />
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
                          <History className="h-3.5 w-3.5" />
                          <span>{formatDateTime(selectedSnapshot.createdAt)}</span>
                        </div>
                      </div>

                      <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
                        <SummaryCard
                          label={t('detailPanel.snapshots.preview.inSnapshot')}
                          value={selectedSnapshotPanelCountLabel}
                        />
                        <SummaryCard
                          label={t('detailPanel.snapshots.preview.activePanel')}
                          value={
                            selectedSnapshot.activePanelTitle ??
                            t('detailPanel.snapshots.preview.none')
                          }
                        />
                        <SummaryCard
                          label={t('detailPanel.snapshots.preview.availableNow')}
                          value={String(restorePreview?.matchedPanels.length ?? 0)}
                        />
                        <SummaryCard
                          label={t('detailPanel.snapshots.preview.missingNow')}
                          value={String(restorePreview?.missingPanels.length ?? 0)}
                        />
                        <SummaryCard
                          label={t('detailPanel.snapshots.preview.layout')}
                          value={formatLayoutModeLabel(selectedSnapshot.layout.mode, t)}
                        />
                        <SummaryCard
                          label={t('detailPanel.snapshots.preview.splitRatio')}
                          value={formatLayoutSplitSummary(selectedSnapshot.layout)}
                        />
                        <SummaryCard
                          label={t('detailPanel.snapshots.preview.focusedPane')}
                          value={formatFocusSlotLabel(selectedSnapshot.layout.focusSlot, t)}
                        />
                      </div>

                      <div className="space-y-4 border-t border-border-primary px-5 py-4">
                        <div>
                          <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                            {t('detailPanel.snapshots.preview.panels')}
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            {selectedSnapshot.panels.map((panel) => (
                              <SnapshotPanelPill key={panel.panelId} panel={panel} />
                            ))}
                          </div>
                        </div>

                        {restorePreview && restorePreview.missingPanels.length > 0 && (
                          <div>
                            <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                              {t('detailPanel.snapshots.preview.missingNow')}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {restorePreview.missingPanels.map((panel) => (
                                <Badge key={panel.panelId} size="sm" variant="warning">
                                  {panel.title}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {restorePreview && restorePreview.extraPanels.length > 0 && (
                          <div>
                            <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                              {t('detailPanel.snapshots.preview.extraCurrent')}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {restorePreview.extraPanels.map((panel) => (
                                <Badge key={panel.panelId} size="sm" variant="default">
                                  {panel.title}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {restorePreview && restorePreview.unsupportedPanels.length > 0 && (
                          <div>
                            <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                              {t('detailPanel.snapshots.preview.untouchedCurrent')}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {restorePreview.unsupportedPanels.map((panel) => (
                                <Badge key={panel.id} size="sm" variant="info">
                                  {panel.title}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-tertiary">
                      {t('detailPanel.snapshots.noSelection')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (selectedSnapshot) {
                  onDelete(selectedSnapshot);
                }
              }}
              disabled={!selectedSnapshot}
              icon={<Trash2 className="h-4 w-4" />}
            >
              {t('detailPanel.snapshots.delete')}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (selectedSnapshot) {
                  onRestore(selectedSnapshot);
                }
              }}
              disabled={!selectedSnapshot}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              {t('detailPanel.snapshots.restore')}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
