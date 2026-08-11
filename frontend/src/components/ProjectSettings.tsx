import { useState, useEffect, useMemo } from 'react';
import { Save, Trash2, FolderIcon, GitBranch, Settings, Code2, BrainCircuit } from 'lucide-react';
import { API } from '../utils/api';
import type { Project } from '../types/project';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import { Checkbox, Input, Textarea } from './ui/Input';
import { Button } from './ui/Button';
import { EnhancedInput } from './ui/EnhancedInput';
import { FieldWithTooltip } from './ui/FieldWithTooltip';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { ToggleField } from './ui/Toggle';
import { useI18n } from '../I18nContext';
import {
  buildProjectInitHooksPreview,
  DEFAULT_PROJECT_INIT_HOOKS_CONFIG,
  loadProjectInitHooksConfig,
  saveProjectInitHooksConfig,
  type InitHookPanelKey,
  type ProjectInitHooksConfig,
} from '../features/workspace-init-hooks/projectInitHooksState';

interface ProjectSettingsProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function ProjectSettings({ project, isOpen, onClose, onUpdate, onDelete }: ProjectSettingsProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [runScript, setRunScript] = useState('');
  const [buildScript, setBuildScript] = useState('');
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [openIdeCommand, setOpenIdeCommand] = useState('');
  const [worktreeFolder, setWorktreeFolder] = useState('');
  const [initHooksConfig, setInitHooksConfig] = useState<ProjectInitHooksConfig>(DEFAULT_PROJECT_INIT_HOOKS_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const initHooksPreview = useMemo(() => buildProjectInitHooksPreview({
    build_script: buildScript,
    run_script: runScript,
    open_ide_command: openIdeCommand,
  }, initHooksConfig), [buildScript, initHooksConfig, openIdeCommand, runScript]);

  const defaultPanelOptions: InitHookPanelKey[] = ['terminal', 'explorer', 'diff'];

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name);
      setPath(project.path);
      setSystemPrompt(project.system_prompt || '');
      setRunScript(project.run_script || '');
      setBuildScript(project.build_script || '');
      // Fetch the current branch when dialog opens — with timeout to prevent freeze
      setCurrentBranch(null); // Reset to loading state
      if (project.path) {
        const timeoutId = setTimeout(() => {
          setCurrentBranch(null);
        }, 5000);
        window.electronAPI.git.detectBranch(project.path).then((result) => {
          clearTimeout(timeoutId);
          if (result.success && result.data) {
            setCurrentBranch(result.data);
          } else {
            setCurrentBranch(null);
          }
        }).catch(() => {
          clearTimeout(timeoutId);
          setCurrentBranch(null);
        });
      }
      setOpenIdeCommand(project.open_ide_command || '');
      setWorktreeFolder(project.worktree_folder || '');
      setInitHooksConfig(loadProjectInitHooksConfig(project.id));
      setError(null);
    }
  }, [isOpen, project]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const updates: Partial<Project> = {
        name,
        path,
        system_prompt: systemPrompt || null,
        run_script: runScript || null,
        build_script: buildScript || null,
        open_ide_command: openIdeCommand || null,
        worktree_folder: worktreeFolder || null
      };
      
      const response = await API.projects.update(project.id.toString(), updates);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update project');
      }

      saveProjectInitHooksConfig(project.id, initHooksConfig);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await API.projects.delete(project.id.toString());

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete project');
      }

      onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projectSettings.deleteError'));
      setShowDeleteConfirm(false);
    }
  };

  const toggleDefaultPanel = (panel: InitHookPanelKey, checked: boolean) => {
    setInitHooksConfig((current) => ({
      ...current,
      defaultPanels: checked
        ? Array.from(new Set([...current.defaultPanels, panel]))
        : current.defaultPanels.filter((item) => item !== panel),
    }));
  };

  const getPanelLabel = (panel: InitHookPanelKey) => t(`common.panel.${panel}`);

  const formatPreviewValue = (values: string[]) => {
    return values.length > 0 ? values.join(' · ') : t('initHooks.emptyValue');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" showCloseButton={false}>
      <ModalHeader 
        title={t('projectSettings.title')} 
        icon={<Settings className="w-5 h-5" />}
        onClose={onClose}
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !name || !path}
            variant="primary"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            loading={isSaving}
            loadingText={t('common.loading')}
          >
            {t('common.saveChanges')}
          </Button>
        </div>
      </ModalHeader>

      <ModalBody>
        {error && (
          <div className="mb-6 p-4 bg-status-error/10 border border-status-error/30 rounded-lg text-status-error">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Project Overview */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-border-primary">
              <FolderIcon className="w-5 h-5 text-interactive" />
              <div>
                <h3 className="text-heading-3 font-semibold text-text-primary">{t('projectSettings.projectOverview.title')}</h3>
                <p className="text-sm text-text-tertiary">{t('projectSettings.projectOverview.description')}</p>
              </div>
            </div>
            
            <FieldWithTooltip
              label={t('projectSettings.projectName.label')}
              tooltip={t('projectSettings.projectName.tooltip')}
            >
              <EnhancedInput
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('projectSettings.projectName.placeholder')}
                size="lg"
                fullWidth
              />
            </FieldWithTooltip>

            <FieldWithTooltip
              label={t('projectSettings.repositoryPath.label')}
              tooltip={t('projectSettings.repositoryPath.tooltip')}
            >
              <div className="space-y-3">
                <EnhancedInput
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder={t('projectSettings.repositoryPath.placeholder')}
                  size="lg"
                  fullWidth
                />
                {project.wsl_enabled && project.wsl_distribution && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                    <span className="font-semibold">WSL</span>
                    <span className="text-blue-300/70">|</span>
                    <span>{project.wsl_distribution}</span>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const result = await API.dialog.openDirectory({
                        title: t('projectSettings.selectRepositoryDirectory'),
                        buttonLabel: t('common.select'),
                      });
                      if (result.success && result.data) {
                        setPath(result.data);
                      }
                    }}
                  >
                    {t('common.browse')}
                  </Button>
                </div>
              </div>
            </FieldWithTooltip>

            <FieldWithTooltip
              label={t('projectSettings.currentBranch.label')}
              tooltip={t('projectSettings.currentBranch.tooltip')}
            >
              <Card variant="bordered" padding="md" className="bg-surface-secondary">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-text-tertiary" />
                  <span className="font-mono text-text-primary">
                    {currentBranch || t('projectSettings.currentBranch.detecting')}
                  </span>
                  <span className="ml-auto px-2 py-1 text-xs bg-surface-tertiary text-text-tertiary rounded">
                    {t('projectSettings.currentBranch.autoDetected')}
                  </span>
                </div>
              </Card>
            </FieldWithTooltip>
          </div>

          {/* Worktree Configuration */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-border-primary">
              <GitBranch className="w-5 h-5 text-interactive" />
              <div>
                <h3 className="text-heading-3 font-semibold text-text-primary">{t('projectSettings.worktreeConfiguration.title')}</h3>
                <p className="text-sm text-text-tertiary">{t('projectSettings.worktreeConfiguration.description')}</p>
              </div>
            </div>

            <FieldWithTooltip
              label={t('projectSettings.worktreeFolder.label')}
              tooltip={t('projectSettings.worktreeFolder.tooltip')}
            >
              <div className="space-y-3">
                <EnhancedInput
                  type="text"
                  value={worktreeFolder}
                  onChange={(e) => setWorktreeFolder(e.target.value)}
                  placeholder={t('projectSettings.worktreeFolder.placeholder')}
                  size="lg"
                  fullWidth
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-surface-tertiary text-text-tertiary rounded">
                      {t('projectSettings.worktreeFolder.defaultBadge')}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const result = await API.dialog.openDirectory({
                        title: t('projectSettings.selectWorktreeDirectory'),
                        buttonLabel: t('common.select'),
                      });
                      if (result.success && result.data) {
                        setWorktreeFolder(result.data);
                      }
                    }}
                  >
                    {t('common.browse')}
                  </Button>
                </div>
              </div>
            </FieldWithTooltip>
          </div>

          {/* Session Behavior */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-border-primary">
              <Code2 className="w-5 h-5 text-interactive" />
              <div>
                <h3 className="text-heading-3 font-semibold text-text-primary">{t('projectSettings.paneBehavior.title')}</h3>
                <p className="text-sm text-text-tertiary">{t('projectSettings.paneBehavior.description')}</p>
              </div>
            </div>

            <Card variant="bordered" padding="md" className="border-interactive/20 bg-interactive/5">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-semibold text-text-primary">{t('projectSettings.initHooks.title')}</h4>
                <Badge variant="primary" size="sm">
                  {t('projectSettings.initHooks.previewBadge')}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border-primary bg-surface-primary/70 p-3">
                  <p className="text-sm font-medium text-text-primary">{t('initHooks.category.setup')}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{t('initHooks.source.buildScript')}</p>
                  <p className="mt-2 text-xs text-text-secondary break-words">{formatPreviewValue(initHooksPreview.setupCommands)}</p>
                </div>

                <div className="rounded-lg border border-border-primary bg-surface-primary/70 p-3">
                  <p className="text-sm font-medium text-text-primary">{t('initHooks.category.startup')}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{t('initHooks.source.runCommands')}</p>
                  <p className="mt-2 text-xs text-text-secondary break-words">{formatPreviewValue(initHooksPreview.startupCommands)}</p>
                </div>

                <div className="rounded-lg border border-border-primary bg-surface-primary/70 p-3">
                  <p className="text-sm font-medium text-text-primary">{t('initHooks.category.ide')}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{t('initHooks.source.openIdeCommand')}</p>
                  <p className="mt-2 text-xs text-text-secondary break-words">{initHooksPreview.autoOpenIdeCommand || t('initHooks.emptyValue')}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border-primary bg-surface-primary/70 p-4">
                <ToggleField
                  label={t('projectSettings.initHooks.enableDefault.label')}
                  checked={initHooksConfig.enabledByDefault}
                  onChange={(checked) => setInitHooksConfig((current) => ({ ...current, enabledByDefault: checked }))}
                  size="sm"
                />
              </div>

              <div className="mt-4 rounded-lg border border-border-primary bg-surface-primary/70 p-4">
                <p className="text-sm font-medium text-text-primary">{t('projectSettings.initHooks.defaultPanels.label')}</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {defaultPanelOptions.map((panel) => (
                    <Checkbox
                      key={panel}
                      checked={initHooksConfig.defaultPanels.includes(panel)}
                      onChange={(event) => toggleDefaultPanel(panel, event.target.checked)}
                      label={getPanelLabel(panel)}
                    />
                  ))}
                </div>
              </div>
            </Card>

            <FieldWithTooltip
              label={t('projectSettings.openIdeCommand.label')}
              tooltip={t('projectSettings.openIdeCommand.tooltip')}
            >
              <Input
                value={openIdeCommand}
                onChange={(e) => setOpenIdeCommand(e.target.value)}
                placeholder={t('projectSettings.openIdeCommand.placeholder')}
                className="font-mono text-sm"
              />
              <>
                <p className="mt-1 text-xs text-text-tertiary">
                  <span className="text-text-secondary font-semibold">{t('projectSettings.openIdeCommand.examples')}</span>
                  <br />
                  <span className="font-mono text-text-secondary">- code . </span><span className="text-text-tertiary">{t('projectSettings.openIdeCommand.exampleVsCode')}</span>
                  <br />
                  <span className="font-mono text-text-secondary">- cursor . </span><span className="text-text-tertiary">{t('projectSettings.openIdeCommand.exampleCursor')}</span>
                  <br />
                  <span className="font-mono text-text-secondary">- subl . </span><span className="text-text-tertiary">{t('projectSettings.openIdeCommand.exampleSublime')}</span>
                  <br />
                  <span className="font-mono text-text-secondary">- idea . </span><span className="text-text-tertiary">{t('projectSettings.openIdeCommand.exampleIdea')}</span>
                  <br />
                  <span className="font-mono text-text-secondary">- open -a "PyCharm" . </span><span className="text-text-tertiary">{t('projectSettings.openIdeCommand.examplePyCharmMac')}</span>
                  <br />
                  <br />
                  <span className="text-text-secondary font-semibold">{t('projectSettings.openIdeCommand.troubleshooting')}</span>
                  <br />
                  <span className="text-text-tertiary">- {t('projectSettings.openIdeCommand.commandNotFound')}</span>
                  <br />
                  <span className="text-text-tertiary">- {t('projectSettings.openIdeCommand.installShellCommand')}</span>
                  <br />
                  <span className="text-text-tertiary ml-2">-&gt; {t('projectSettings.openIdeCommand.installVscode')}</span>
                  <br />
                  <span className="text-text-tertiary ml-2">-&gt; {t('projectSettings.openIdeCommand.installCursor')}</span>
                  <br />
                  <span className="text-text-tertiary">- {t('projectSettings.openIdeCommand.inheritsPath')}</span>
                </p>
              </>
            </FieldWithTooltip>

            <FieldWithTooltip
              label={t('projectSettings.buildScript.label')}
              tooltip={t('projectSettings.buildScript.tooltip')}
            >
              <Card variant="bordered" padding="sm" className="bg-surface-secondary/50">
                <Textarea
                  value={buildScript}
                  onChange={(e) => setBuildScript(e.target.value)}
                  rows={4}
                  placeholder={t('projectSettings.buildScript.placeholder')}
                  className="font-mono text-sm bg-transparent border-0 p-3 focus:ring-0 resize-none"
                  fullWidth
                />
              </Card>
            </FieldWithTooltip>

            <FieldWithTooltip
              label={t('projectSettings.runCommands.label')}
              tooltip={t('projectSettings.runCommands.tooltip')}
            >
              <Card variant="bordered" padding="sm" className="bg-surface-secondary/50">
                <Textarea
                  value={runScript}
                  onChange={(e) => setRunScript(e.target.value)}
                  rows={4}
                  placeholder={t('projectSettings.runCommands.placeholder')}
                  className="font-mono text-sm bg-transparent border-0 p-3 focus:ring-0 resize-none"
                  fullWidth
                />
              </Card>
            </FieldWithTooltip>

          </div>

          {/* AI Prompt Customization */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-border-primary">
              <BrainCircuit className="w-5 h-5 text-interactive" />
              <div>
                <h3 className="text-heading-3 font-semibold text-text-primary">{t('projectSettings.aiPrompt.title')}</h3>
                <p className="text-sm text-text-tertiary">{t('projectSettings.aiPrompt.description')}</p>
              </div>
            </div>

            <FieldWithTooltip
              label={t('projectSettings.projectSystemPrompt.label')}
              tooltip={t('projectSettings.projectSystemPrompt.tooltip')}
            >
              <Card variant="bordered" padding="sm" className="bg-surface-secondary/50">
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  placeholder={t('projectSettings.projectSystemPrompt.placeholder')}
                  className="font-mono text-sm bg-transparent border-0 p-3 focus:ring-0 resize-none"
                  fullWidth
                />
              </Card>
            </FieldWithTooltip>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-status-error/20 pt-6">
            <div className="flex items-center gap-2 pb-3 border-b border-status-error/20">
              <Trash2 className="w-5 h-5 text-status-error" />
              <div>
                <h3 className="text-heading-3 font-semibold text-status-error">{t('projectSettings.dangerZone.title')}</h3>
                <p className="text-sm text-text-tertiary">{t('projectSettings.dangerZone.description')}</p>
              </div>
            </div>
            
            <div className="mt-4">
              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="danger"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  {t('projectSettings.deleteProject')}
                </Button>
              ) : (
                <div className="space-y-4">
                  <Card variant="bordered" padding="md" className="bg-status-error/5 border-status-error/20">
                    <p className="text-sm text-text-secondary mb-3">
                      {t('projectSettings.deleteConfirm.body')}
                    </p>
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleDelete}
                        variant="danger"
                        size="sm"
                      >
                        {t('projectSettings.deleteConfirm.confirm')}
                      </Button>
                      <Button
                        onClick={() => setShowDeleteConfirm(false)}
                        variant="secondary"
                        size="sm"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          onClick={onClose}
          variant="ghost"
          size="md"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !name || !path}
          variant="primary"
          size="md"
          icon={<Save className="w-4 h-4" />}
          loading={isSaving}
          loadingText={t('common.loading')}
        >
          {t('common.saveChanges')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
