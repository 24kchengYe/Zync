import React from 'react';
import { Check, Edit, CircleArrowDown, AlertTriangle, HelpCircle, GitMerge, Loader2 } from 'lucide-react';
import type { GitStatus } from '../types/session';
import { useI18n } from '../../../UpdateWuruize/frontend/I18nContext';

interface GitStatusIndicatorProps {
  gitStatus?: GitStatus;
  size?: 'small' | 'medium' | 'large';
  sessionId?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

interface GitStatusConfig {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface GitStatusCopy {
  loading: string;
  clickToViewDiff: string;
  branchCommitCount: (count: number) => string;
  aheadOfMain: (count: number) => string;
  behindMain: (count: number) => string;
  divergedFromMain: (ahead: number, behind: number) => string;
  filesChanged: (count: number, additions: number, deletions: number) => string;
  uncommittedHeader: string;
  modifiedFiles: (count: number, additions: number, deletions: number) => string;
  branchUpToDate: string;
  noUncommittedChanges: string;
  plusUntrackedFiles: string;
  actionReadyToMerge: string;
  actionMostlyBehind: string;
  actionConflictRisk: string;
  actionResolveConflicts: string;
  actionCommitBeforeMerge: string;
  actionConsiderUpdating: string;
  actionSafeToRemove: string;
  labelReadyToMerge: string;
  descriptionReadyToMerge: (count: number) => string;
  labelMostlyBehind: string;
  descriptionMostlyBehind: (behind: number, ahead: number) => string;
  labelConflictRisk: string;
  descriptionConflictRisk: (ahead: number, behind: number) => string;
  labelConflicts: string;
  descriptionConflicts: string;
  labelUncommitted: string;
  descriptionAheadWithUncommitted: (ahead: number) => string;
  descriptionUntrackedFiles: string;
  descriptionUncommittedFiles: (count: number) => string;
  descriptionUncommittedChanges: string;
  labelBehindOnly: string;
  descriptionBehindOnly: (count: number) => string;
  labelUpToDate: string;
  descriptionUpToDate: string;
  labelUnknown: string;
  descriptionUnknown: string;
  ariaCommitsInBranch: (count: number) => string;
  ariaFilesChanged: (count: number) => string;
  ariaAheadBy: (count: number) => string;
  ariaBehindBy: (count: number) => string;
  overflowCount: string;
}

function getGitStatusCopy(language: 'en' | 'zh'): GitStatusCopy {
  if (language === 'zh') {
    return {
      loading: '正在检查 Git 状态...',
      clickToViewDiff: '点击查看 Diff 详情',
      branchCommitCount: (count) => `当前分支有 ${count} 个提交`,
      aheadOfMain: (count) => `领先 main ${count} 个提交`,
      behindMain: (count) => `落后 main ${count} 个提交`,
      divergedFromMain: (ahead, behind) => `领先 ${ahead} 个、落后 ${behind} 个（相对 main）`,
      filesChanged: (count, additions, deletions) => `${count} 个文件变更 (+${additions}/-${deletions})`,
      uncommittedHeader: '未提交更改：',
      modifiedFiles: (count, additions, deletions) =>
        `${count} 个文件已修改${additions || deletions ? ` (+${additions}/-${deletions})` : ''}`,
      branchUpToDate: '分支已与 main 同步',
      noUncommittedChanges: '没有未提交更改',
      plusUntrackedFiles: '+ 包含未跟踪文件',
      actionReadyToMerge: '可直接合并，预计不会产生冲突',
      actionMostlyBehind: '主要是落后于 main，独有改动较少，建议 rebase 或清理',
      actionConflictRisk: '合并前请先从 main rebase，避免冲突',
      actionResolveConflicts: '请先解决合并冲突，再继续后续操作',
      actionCommitBeforeMerge: '合并前请先提交当前改动',
      actionConsiderUpdating: '没有独有改动，建议更新或移除该工作区',
      actionSafeToRemove: '没有独有改动，可以安全移除',
      labelReadyToMerge: '可合并',
      descriptionReadyToMerge: (count) => `${count} 个提交可直接合并`,
      labelMostlyBehind: '主要落后',
      descriptionMostlyBehind: (behind, ahead) => `落后 ${behind} 个、领先 ${ahead} 个，建议先 rebase`,
      labelConflictRisk: '冲突风险',
      descriptionConflictRisk: (ahead, behind) => `领先 ${ahead} 个、落后 ${behind} 个，存在潜在冲突`,
      labelConflicts: '有冲突',
      descriptionConflicts: '当前存在合并冲突，需先解决',
      labelUncommitted: '未提交',
      descriptionAheadWithUncommitted: (ahead) => `${ahead} 个提交 + 未提交改动`,
      descriptionUntrackedFiles: '存在未跟踪文件',
      descriptionUncommittedFiles: (count) => `${count} 个未提交文件`,
      descriptionUncommittedChanges: '存在未提交改动',
      labelBehindOnly: '仅落后',
      descriptionBehindOnly: (count) => `落后 main ${count} 个提交`,
      labelUpToDate: '已同步',
      descriptionUpToDate: '没有改动，可安全移除',
      labelUnknown: '未知',
      descriptionUnknown: '暂时无法判断 Git 状态',
      ariaCommitsInBranch: (count) => `分支中有 ${count} 个提交`,
      ariaFilesChanged: (count) => `${count} 个文件发生变更`,
      ariaAheadBy: (count) => `领先 ${count} 个提交`,
      ariaBehindBy: (count) => `落后 ${count} 个提交`,
      overflowCount: '9+',
    };
  }

  return {
    loading: 'Checking git status...',
    clickToViewDiff: 'Click to view diff details',
    branchCommitCount: (count) => `${count} commit${count !== 1 ? 's' : ''} in branch`,
    aheadOfMain: (count) => `${count} commit${count !== 1 ? 's' : ''} ahead of main`,
    behindMain: (count) => `${count} commit${count !== 1 ? 's' : ''} behind main`,
    divergedFromMain: (ahead, behind) => `${ahead} ahead, ${behind} behind main`,
    filesChanged: (count, additions, deletions) => `${count} files changed (+${additions}/-${deletions})`,
    uncommittedHeader: 'Uncommitted changes:',
    modifiedFiles: (count, additions, deletions) =>
      `${count} file${count !== 1 ? 's' : ''} modified${additions || deletions ? ` (+${additions}/-${deletions})` : ''}`,
    branchUpToDate: 'Branch is up to date with main',
    noUncommittedChanges: 'No uncommitted changes',
    plusUntrackedFiles: '+ untracked files',
    actionReadyToMerge: 'Ready to merge with no expected conflicts',
    actionMostlyBehind: 'Mostly behind main with minimal unique changes, consider rebasing or removing',
    actionConflictRisk: 'Rebase from main before merging to avoid conflicts',
    actionResolveConflicts: 'Resolve merge conflicts before continuing',
    actionCommitBeforeMerge: 'Commit changes before merging',
    actionConsiderUpdating: 'Consider updating or removing, no unique changes',
    actionSafeToRemove: 'Safe to remove, no unique changes',
    labelReadyToMerge: 'Ready to Merge',
    descriptionReadyToMerge: (count) => `${count} commit${count !== 1 ? 's' : ''} ready to merge`,
    labelMostlyBehind: 'Mostly Behind',
    descriptionMostlyBehind: (behind, ahead) => `${behind} behind, ${ahead} ahead - consider rebasing`,
    labelConflictRisk: 'Conflict Risk',
    descriptionConflictRisk: (ahead, behind) => `${ahead} ahead, ${behind} behind - potential conflicts`,
    labelConflicts: 'Conflicts',
    descriptionConflicts: 'Has merge conflicts - resolve before continuing',
    labelUncommitted: 'Uncommitted',
    descriptionAheadWithUncommitted: (ahead) => `${ahead} commit${ahead !== 1 ? 's' : ''} + uncommitted changes`,
    descriptionUntrackedFiles: 'Untracked files',
    descriptionUncommittedFiles: (count) => `${count} uncommitted file${count !== 1 ? 's' : ''}`,
    descriptionUncommittedChanges: 'Uncommitted changes',
    labelBehindOnly: 'Behind Only',
    descriptionBehindOnly: (count) => `${count} commit${count !== 1 ? 's' : ''} behind main`,
    labelUpToDate: 'Up to Date',
    descriptionUpToDate: 'No changes - safe to remove',
    labelUnknown: 'Unknown',
    descriptionUnknown: 'Unable to determine git status',
    ariaCommitsInBranch: (count) => `${count} commit${count !== 1 ? 's' : ''} in branch`,
    ariaFilesChanged: (count) => `${count} file${count !== 1 ? 's' : ''} changed`,
    ariaAheadBy: (count) => `Ahead by ${count} commit${count !== 1 ? 's' : ''}`,
    ariaBehindBy: (count) => `Behind by ${count} commit${count !== 1 ? 's' : ''}`,
    overflowCount: '9+',
  };
}

function isGitStatusFullySynced(gitStatus: GitStatus): boolean {
  return (!gitStatus.ahead || gitStatus.ahead === 0)
    && (!gitStatus.behind || gitStatus.behind === 0)
    && (!gitStatus.hasUncommittedChanges)
    && (!gitStatus.hasUntrackedFiles);
}

function buildTooltipContent(gitStatus: GitStatus, config: GitStatusConfig, copy: GitStatusCopy): string {
  let tooltipContent = '';

  if (gitStatus.totalCommits && gitStatus.totalCommits > 0) {
    tooltipContent = copy.branchCommitCount(gitStatus.totalCommits);

    if (gitStatus.ahead && gitStatus.ahead > 0) {
      tooltipContent += ` (${copy.aheadOfMain(gitStatus.ahead)})`;
    } else if (gitStatus.behind && gitStatus.behind > 0) {
      tooltipContent += ` (${copy.behindMain(gitStatus.behind)})`;
    } else if (gitStatus.state === 'diverged') {
      tooltipContent += ` (${copy.divergedFromMain(gitStatus.ahead || 0, gitStatus.behind || 0)})`;
    }

    if (gitStatus.commitFilesChanged) {
      tooltipContent += `\n${copy.filesChanged(gitStatus.commitFilesChanged, gitStatus.commitAdditions || 0, gitStatus.commitDeletions || 0)}`;
    }
  } else if (gitStatus.ahead && gitStatus.ahead > 0) {
    tooltipContent = copy.aheadOfMain(gitStatus.ahead);
    if (gitStatus.commitFilesChanged) {
      tooltipContent += `\n${copy.filesChanged(gitStatus.commitFilesChanged, gitStatus.commitAdditions || 0, gitStatus.commitDeletions || 0)}`;
    }
  } else if (gitStatus.behind && gitStatus.behind > 0) {
    tooltipContent = copy.behindMain(gitStatus.behind);
  } else if (gitStatus.state === 'diverged') {
    tooltipContent = copy.divergedFromMain(gitStatus.ahead || 0, gitStatus.behind || 0);
  }

  if (gitStatus.hasUncommittedChanges && gitStatus.filesChanged) {
    if (tooltipContent) tooltipContent += '\n\n';
    tooltipContent += `${copy.uncommittedHeader}\n${copy.modifiedFiles(gitStatus.filesChanged, gitStatus.additions || 0, gitStatus.deletions || 0)}`;
  }

  if (!tooltipContent) {
    if (gitStatus.state === 'clean') {
      tooltipContent = `${copy.branchUpToDate}\n${copy.noUncommittedChanges}`;
    } else if (gitStatus.state === 'modified' && gitStatus.filesChanged) {
      tooltipContent = copy.modifiedFiles(gitStatus.filesChanged, gitStatus.additions || 0, gitStatus.deletions || 0);
    } else {
      tooltipContent = config.description;
    }
  }

  if (gitStatus.hasUntrackedFiles) {
    tooltipContent += `\n${copy.plusUntrackedFiles}`;
  }

  const isFullySynced = isGitStatusFullySynced(gitStatus);
  const hasCommitsToMerge = Boolean(
    gitStatus.ahead
    && gitStatus.ahead > 0
    && !gitStatus.hasUncommittedChanges
    && !gitStatus.hasUntrackedFiles
    && (!gitStatus.behind || gitStatus.behind === 0),
  );
  const hasConflictRisk = Boolean(gitStatus.ahead && gitStatus.ahead > 0 && gitStatus.behind && gitStatus.behind > 0);
  const isMostlyBehind = Boolean(
    hasConflictRisk
    && gitStatus.behind
    && gitStatus.ahead
    && gitStatus.behind >= 5 * gitStatus.ahead
    && gitStatus.ahead <= 2,
  );

  let actionableInfo = '';
  if (hasCommitsToMerge || gitStatus.isReadyToMerge) {
    actionableInfo = copy.actionReadyToMerge;
  } else if (isMostlyBehind) {
    actionableInfo = copy.actionMostlyBehind;
  } else if (hasConflictRisk) {
    actionableInfo = copy.actionConflictRisk;
  } else if (gitStatus.state === 'conflict') {
    actionableInfo = copy.actionResolveConflicts;
  } else if (gitStatus.hasUncommittedChanges || gitStatus.hasUntrackedFiles) {
    actionableInfo = copy.actionCommitBeforeMerge;
  } else if (gitStatus.behind && gitStatus.behind > 0 && (!gitStatus.ahead || gitStatus.ahead === 0)) {
    actionableInfo = copy.actionConsiderUpdating;
  } else if (isFullySynced) {
    actionableInfo = copy.actionSafeToRemove;
  }

  if (actionableInfo) {
    tooltipContent += `\n\n${actionableInfo}`;
  }

  tooltipContent += `\n\n${copy.clickToViewDiff}`;
  return tooltipContent;
}

function getGitStatusConfig(gitStatus: GitStatus, copy: GitStatusCopy): GitStatusConfig {
  const iconProps = { size: 14, strokeWidth: 2 };

  if (
    gitStatus.isReadyToMerge
    || (gitStatus.ahead && gitStatus.ahead > 0 && !gitStatus.hasUncommittedChanges && !gitStatus.hasUntrackedFiles && (!gitStatus.behind || gitStatus.behind === 0))
  ) {
    const commitCount = gitStatus.totalCommits || gitStatus.ahead || 0;
    return {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: <GitMerge {...iconProps} />,
      label: copy.labelReadyToMerge,
      description: copy.descriptionReadyToMerge(commitCount),
    };
  }

  if (gitStatus.ahead && gitStatus.ahead > 0 && gitStatus.behind && gitStatus.behind > 0) {
    const mostlyBehind = gitStatus.behind >= 5 * gitStatus.ahead && gitStatus.ahead <= 2;

    if (mostlyBehind) {
      return {
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800/30',
        icon: <CircleArrowDown {...iconProps} />,
        label: copy.labelMostlyBehind,
        description: copy.descriptionMostlyBehind(gitStatus.behind, gitStatus.ahead),
      };
    }

    return {
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      icon: <AlertTriangle {...iconProps} />,
      label: copy.labelConflictRisk,
      description: copy.descriptionConflictRisk(gitStatus.ahead, gitStatus.behind),
    };
  }

  if (gitStatus.state === 'conflict') {
    return {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: <AlertTriangle {...iconProps} />,
      label: copy.labelConflicts,
      description: copy.descriptionConflicts,
    };
  }

  if (gitStatus.hasUncommittedChanges || gitStatus.hasUntrackedFiles || gitStatus.state === 'modified' || gitStatus.state === 'untracked') {
    const ahead = gitStatus.ahead || 0;
    const filesChanged = gitStatus.filesChanged || 0;
    const hasFiles = filesChanged > 0 || gitStatus.hasUntrackedFiles;

    let description = '';
    if (ahead > 0 && hasFiles) {
      description = copy.descriptionAheadWithUncommitted(ahead);
    } else if (hasFiles) {
      description = gitStatus.hasUntrackedFiles ? copy.descriptionUntrackedFiles : copy.descriptionUncommittedFiles(filesChanged);
    } else {
      description = copy.descriptionUncommittedChanges;
    }

    return {
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      icon: <Edit {...iconProps} />,
      label: copy.labelUncommitted,
      description,
    };
  }

  if (gitStatus.behind && gitStatus.behind > 0 && (!gitStatus.ahead || gitStatus.ahead === 0)) {
    return {
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800/30',
      icon: <CircleArrowDown {...iconProps} />,
      label: copy.labelBehindOnly,
      description: copy.descriptionBehindOnly(gitStatus.behind),
    };
  }

  if (isGitStatusFullySynced(gitStatus)) {
    return {
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800/30',
      icon: <Check {...iconProps} />,
      label: copy.labelUpToDate,
      description: copy.descriptionUpToDate,
    };
  }

  return {
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/30',
    icon: <HelpCircle {...iconProps} />,
    label: copy.labelUnknown,
    description: copy.descriptionUnknown,
  };
}

const GitStatusIndicator: React.FC<GitStatusIndicatorProps> = React.memo(({
  gitStatus,
  size = 'small',
  sessionId,
  onClick,
  isLoading,
}) => {
  const { language } = useI18n();
  const copy = getGitStatusCopy(language);

  const sizeConfig = {
    small: {
      padding: 'px-1.5 py-0.5',
      text: 'text-xs',
      loader: 'w-3 h-3',
    },
    medium: {
      padding: 'px-2 py-1',
      text: 'text-sm',
      loader: 'w-4 h-4',
    },
    large: {
      padding: 'px-3 py-1.5',
      text: 'text-base',
      loader: 'w-5 h-5',
    },
  }[size];

  if (isLoading === true) {
    return (
      <span
        className={`inline-flex items-center justify-center w-[5.5ch] ${sizeConfig.padding} ${sizeConfig.text} rounded-md border bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600`}
        title={copy.loading}
        data-testid={sessionId ? `session-${sessionId}-git-status` : 'git-status'}
        data-git-loading="true"
      >
        <Loader2 className={`${sizeConfig.loader} animate-spin`} />
      </span>
    );
  }

  if (!gitStatus) {
    return null;
  }

  const config = getGitStatusConfig(gitStatus, copy);
  const tooltipContent = buildTooltipContent(gitStatus, config, copy);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (sessionId) {
      const selectEvent = new CustomEvent('select-session-and-view-diff', {
        detail: { sessionId },
      });
      window.dispatchEvent(selectEvent);
    }
  };

  let primaryCount = 0;
  let ariaLabel = config.label;

  if (gitStatus.totalCommits && gitStatus.totalCommits > 0) {
    primaryCount = gitStatus.totalCommits;
    ariaLabel = copy.ariaCommitsInBranch(primaryCount);
  } else if (gitStatus.filesChanged && gitStatus.filesChanged > 0) {
    primaryCount = gitStatus.filesChanged;
    ariaLabel = copy.ariaFilesChanged(primaryCount);
  } else if (gitStatus.ahead && gitStatus.ahead > 0) {
    primaryCount = gitStatus.ahead;
    ariaLabel = copy.ariaAheadBy(primaryCount);
  } else if (gitStatus.behind && gitStatus.behind > 0) {
    primaryCount = gitStatus.behind;
    ariaLabel = copy.ariaBehindBy(primaryCount);
  }

  return (
    <span
      className={`inline-flex items-center ${primaryCount > 0 ? 'justify-center gap-0.5' : 'justify-center'} w-[5.5ch] ${sizeConfig.padding} ${sizeConfig.text} rounded-md border ${config.bgColor} ${config.color} border-gray-300 dark:border-gray-600 ${(onClick || sessionId) ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      title={tooltipContent}
      onClick={handleClick}
      aria-label={ariaLabel}
      data-testid={sessionId ? `session-${sessionId}-git-status` : 'git-status'}
      data-git-state={gitStatus.state}
      data-git-ahead={gitStatus.ahead}
      data-git-behind={gitStatus.behind}
    >
      <span className="flex-shrink-0">
        {config.icon}
      </span>
      {primaryCount > 0 && (
        <span className="font-bold">
          {primaryCount > 9 ? copy.overflowCount : primaryCount}
        </span>
      )}
    </span>
  );
});

GitStatusIndicator.displayName = 'GitStatusIndicator';

export { GitStatusIndicator };
