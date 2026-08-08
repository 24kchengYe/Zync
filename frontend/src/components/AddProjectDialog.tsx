import { useState } from 'react';
import { FolderPlus, GitBranch } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import { Button } from './ui/Button';
import { EnhancedInput } from './ui/EnhancedInput';
import { FieldWithTooltip } from './ui/FieldWithTooltip';
import { Card } from './ui/Card';
import { API } from '../utils/api';
import { useNavigationStore } from '../stores/navigationStore';
import type { CreateProjectRequest } from '../types/project';
import { useI18n } from '../../../UpdateWuruize/frontend/I18nContext';

interface AddProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddProjectDialog({ isOpen, onClose }: AddProjectDialogProps) {
  const { t } = useI18n();
  const [newProject, setNewProject] = useState<CreateProjectRequest>({ name: '', path: '', buildScript: '', runScript: '' });
  const [detectedBranch, setDetectedBranch] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const navigateToProject = useNavigationStore(s => s.navigateToProject);

  const detectCurrentBranch = async (path: string) => {
    if (!path) { setDetectedBranch(null); return; }
    try {
      const response = await API.projects.detectBranch(path);
      if (response.success && response.data) {
        setDetectedBranch(response.data);
      }
    } catch {
      setDetectedBranch(null);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.path) {
      setShowValidationErrors(true);
      return;
    }
    try {
      const projectToCreate = {
        ...newProject,
        active: false,
      };

      const response = await API.projects.create(projectToCreate);
      if (!response.success || !response.data) {
        console.error('Failed to create project:', response.error);
        return;
      }

      const newProjectId = response.data.id;

      // Reset form state and close
      resetAndClose();

      // Dispatch event for ProjectSessionList to refresh
      window.dispatchEvent(new Event('project-changed'));

      // Navigate to the new project
      navigateToProject(newProjectId);
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const resetAndClose = () => {
    setNewProject({ name: '', path: '', buildScript: '', runScript: '' });
    setDetectedBranch(null);
    setShowValidationErrors(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      size="lg"
    >
      <ModalHeader title={t('sidebar.newRepository')} icon={<FolderPlus className="w-5 h-5" />} />
      <ModalBody>
        <div className="space-y-6">
          <FieldWithTooltip
            label={t('projectSelector.projectName.label')}
            tooltip={t('projectSelector.projectName.tooltip')}
          >
            <EnhancedInput
              type="text"
              value={newProject.name}
              onChange={(e) => {
                setNewProject({ ...newProject, name: e.target.value });
                if (showValidationErrors) setShowValidationErrors(false);
              }}
              placeholder={t('projectSelector.projectName.placeholder')}
              size="lg"
              fullWidth
              required
              showRequiredIndicator={showValidationErrors}
            />
          </FieldWithTooltip>

          <FieldWithTooltip
            label={t('projectSelector.repositoryPath.label')}
            tooltip={t('projectSelector.repositoryPath.tooltip')}
          >
            <div className="space-y-2">
              <EnhancedInput
                type="text"
                value={newProject.path}
                onChange={(e) => {
                  setNewProject({ ...newProject, path: e.target.value });
                  detectCurrentBranch(e.target.value);
                  if (showValidationErrors) setShowValidationErrors(false);
                }}
                placeholder={t('projectSelector.repositoryPath.placeholder')}
                size="lg"
                fullWidth
                required
                showRequiredIndicator={showValidationErrors}
              />
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    const result = await window.electron?.invoke('dialog:open-directory') as { success: boolean; data?: string } | undefined;
                    if (result?.success && result.data) {
                      setNewProject({ ...newProject, path: result.data });
                      detectCurrentBranch(result.data);
                    }
                  }}
                  variant="secondary"
                  size="sm"
                >
                  {t('common.browse')}
                </Button>
              </div>
            </div>
          </FieldWithTooltip>

          {newProject.path && (
            <FieldWithTooltip
              label={t('projectSelector.mainBranch.label')}
              tooltip={t('projectSelector.mainBranch.tooltip')}
            >
              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <GitBranch className="w-4 h-4" />
                  <span className="font-mono">
                    {detectedBranch || t('projectSelector.mainBranch.detecting')}
                  </span>
                </div>
              </Card>
            </FieldWithTooltip>
          )}

        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          onClick={resetAndClose}
          variant="ghost"
          size="md"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleCreateProject}
          disabled={!newProject.name || !newProject.path}
          variant="primary"
          size="md"
        >
          {t('projectSelector.createProject')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
