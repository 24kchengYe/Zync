import { FolderOpen, GitBranch, Layers3 } from 'lucide-react';
import { useI18n } from './I18nContext';
import type { TranslationKey } from './i18n';

interface ProjectContextBannerProps {
  projectName: string;
  projectPath: string;
  workspaceName?: string;
  workspacePath?: string;
  branchName?: string;
  mode: 'workspace' | 'project';
}

export function ProjectContextBanner({
  projectName,
  projectPath,
  workspaceName,
  workspacePath,
  branchName,
  mode,
}: ProjectContextBannerProps) {
  const { t } = useI18n();
  const translate = (key: TranslationKey) => t(key);
  const primaryPath = mode === 'workspace' ? workspacePath || projectPath : projectPath;
  const showProjectPathSupplement = mode === 'workspace' && workspacePath && workspacePath !== projectPath;

  return (
    <div className="border-b border-border-primary bg-surface-primary px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>{translate('common.currentProject')}</span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-3">
            <div className="shrink-0 text-sm font-semibold text-text-primary">{projectName}</div>
            <div className="min-w-0 truncate text-xs text-text-tertiary">{primaryPath}</div>
          </div>
          {showProjectPathSupplement ? (
            <div className="mt-1 truncate text-[11px] text-text-muted">
              {translate('common.currentProject')}: {projectPath}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'project' ? (
            <span className="rounded-full bg-interactive/10 px-2.5 py-1 text-[11px] font-medium text-interactive">
              {translate('common.projectView')}
            </span>
          ) : (
            workspaceName && (
              <span className="rounded-full bg-interactive/10 px-2.5 py-1 text-[11px] font-medium text-interactive">
                <span className="mr-1 text-text-tertiary">{translate('common.workspaceLabel')}</span>
                {workspaceName}
              </span>
            )
          )}

          {branchName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] text-text-secondary">
              <GitBranch className="h-3 w-3" />
              <span>{branchName}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] text-text-secondary">
            <Layers3 className="h-3 w-3" />
            <span>{projectName}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
