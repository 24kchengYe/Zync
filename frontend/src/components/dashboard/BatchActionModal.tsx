import { useMemo } from 'react';
import { GitBranch, Play, Save, Square } from 'lucide-react';
import {
  getSessionStatusLabel,
  interpolateTranslation,
  useI18n,
} from '../../../../UpdateWuruize/frontend/I18nContext';
import type { BatchActionType } from '../../types/projectDashboard';
import type { Session } from '../../types/session';
import { Button } from '../ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../ui/Modal';

type RuntimeStatus = Session['status'] | 'unknown';

export interface BatchActionWorkspaceSummary {
  sessionId: string;
  workspaceLabel: string;
  runtimeStatus: RuntimeStatus;
  hasUncommittedChanges: boolean;
}

interface BatchActionModalProps {
  isOpen: boolean;
  action: BatchActionType | null;
  workspaces: BatchActionWorkspaceSummary[];
  testCommand: string;
  snapshotNote: string;
  onChangeTestCommand: (value: string) => void;
  onChangeSnapshotNote: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function getActionIcon(action: BatchActionType | null) {
  switch (action) {
    case 'stop':
      return <Square className="h-5 w-5 fill-current" />;
    case 'git-status':
      return <GitBranch className="h-5 w-5" />;
    case 'run-tests':
      return <Play className="h-5 w-5" />;
    case 'save-snapshot':
      return <Save className="h-5 w-5" />;
    default:
      return null;
  }
}

export function BatchActionModal({
  isOpen,
  action,
  workspaces,
  testCommand,
  snapshotNote,
  onChangeTestCommand,
  onChangeSnapshotNote,
  onClose,
  onConfirm,
}: BatchActionModalProps) {
  const { t } = useI18n();

  const actionText = useMemo(() => {
    switch (action) {
      case 'stop':
        return {
          title: t('dashboard.batch.modal.stop.title'),
          body: t('dashboard.batch.modal.stop.body'),
          confirm: t('dashboard.batch.action.stop'),
          variant: 'warning' as const,
        };
      case 'git-status':
        return {
          title: t('dashboard.batch.modal.gitStatus.title'),
          body: t('dashboard.batch.modal.gitStatus.body'),
          confirm: t('dashboard.batch.action.gitStatus'),
          variant: 'primary' as const,
        };
      case 'run-tests':
        return {
          title: t('dashboard.batch.modal.runTests.title'),
          body: t('dashboard.batch.modal.runTests.body'),
          confirm: t('dashboard.batch.action.runTests'),
          variant: 'primary' as const,
        };
      case 'save-snapshot':
        return {
          title: t('dashboard.batch.modal.saveSnapshot.title'),
          body: t('dashboard.batch.modal.saveSnapshot.body'),
          confirm: t('dashboard.batch.action.saveSnapshot'),
          variant: 'primary' as const,
        };
      default:
        return {
          title: '',
          body: '',
          confirm: '',
          variant: 'primary' as const,
        };
    }
  }, [action, t]);

  const isConfirmDisabled = useMemo(() => {
    if (!action || workspaces.length === 0) {
      return true;
    }

    if (action === 'run-tests') {
      return testCommand.trim().length === 0;
    }

    if (action === 'save-snapshot') {
      return snapshotNote.trim().length === 0;
    }

    return false;
  }, [action, snapshotNote, testCommand, workspaces.length]);

  return (
    <Modal isOpen={isOpen && !!action} onClose={onClose} size="lg">
      <ModalHeader title={actionText.title} icon={getActionIcon(action)} />
      <ModalBody className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm leading-6 text-text-secondary">{actionText.body}</p>
          <div className="rounded-lg border border-dashed border-border-secondary bg-surface-secondary/80 px-3 py-2 text-xs text-text-secondary">
            {t('dashboard.batch.modal.prototypeNote')}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-text-primary">
            {interpolateTranslation(t('dashboard.batch.modal.targetCount'), { count: workspaces.length })}
          </div>
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border-primary bg-surface-primary p-3">
            {workspaces.map((workspace) => (
              <div
                key={workspace.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-primary bg-bg-primary px-3 py-2"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium text-text-primary">{workspace.workspaceLabel}</div>
                  <div className="text-xs text-text-secondary">
                    {getSessionStatusLabel(workspace.runtimeStatus, t)}
                    {workspace.hasUncommittedChanges && (
                      <span className="ml-2 rounded-full bg-status-warning/10 px-2 py-0.5 text-status-warning">
                        {t('dashboard.workspace.code.uncommitted')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-surface-secondary px-2 py-1 text-xs text-text-tertiary">
                  {interpolateTranslation(t('dashboard.batch.modal.targetWorkspace'), {
                    workspace: workspace.workspaceLabel,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {action === 'run-tests' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary" htmlFor="batch-run-tests-input">
              {t('dashboard.batch.modal.runTests.label')}
            </label>
            <input
              id="batch-run-tests-input"
              value={testCommand}
              onChange={(event) => onChangeTestCommand(event.target.value)}
              placeholder={t('dashboard.batch.modal.runTests.placeholder')}
              className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-interactive focus:ring-2 focus:ring-interactive"
            />
          </div>
        )}

        {action === 'save-snapshot' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary" htmlFor="batch-save-snapshot-input">
              {t('dashboard.batch.modal.saveSnapshot.label')}
            </label>
            <input
              id="batch-save-snapshot-input"
              value={snapshotNote}
              onChange={(event) => onChangeSnapshotNote(event.target.value)}
              placeholder={t('dashboard.batch.modal.saveSnapshot.placeholder')}
              className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-interactive focus:ring-2 focus:ring-interactive"
            />
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          {t('dashboard.batch.modal.cancel')}
        </Button>
        <Button variant={actionText.variant} onClick={onConfirm} disabled={isConfirmDisabled}>
          {actionText.confirm}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
