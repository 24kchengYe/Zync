import React, { useMemo, useState } from 'react';
import {
  Activity,
  ExternalLink,
  FolderTree,
  GitBranch,
  History,
  Sparkles,
} from 'lucide-react';
import {
  buildWorkspaceActivityItems,
  buildWorkspaceDetailModel,
  type WorkspaceDashboardRowLike,
} from '../../../../UpdateWuruize/frontend/WorkspaceDashboardDetailState';
import {
  getSessionStatusLabel,
  interpolateTranslation,
  useI18n,
} from '../../../../UpdateWuruize/frontend/I18nContext';
import type { Session } from '../../types/session';
import { formatFullDateTime } from '../../utils/timestampUtils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type WorkspaceDetailTab = 'overview' | 'git' | 'activity';

interface WorkspaceDetailPanelProps {
  workspace: WorkspaceDashboardRowLike | null;
  session?: Session;
  onOpenWorkspace: (sessionId: string) => void;
}

function getStatusBadgeVariant(runtimeStatus: Session['status'] | 'unknown') {
  switch (runtimeStatus) {
    case 'running':
    case 'ready':
      return 'success' as const;
    case 'waiting':
      return 'warning' as const;
    case 'error':
      return 'error' as const;
    case 'completed_unviewed':
      return 'primary' as const;
    case 'initializing':
    case 'stopped':
    case 'unknown':
    default:
      return 'default' as const;
  }
}

function renderDateTime(value: string | undefined, emptyValue: string) {
  if (!value) {
    return emptyValue;
  }

  return formatFullDateTime(value);
}

function FieldBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border-primary bg-bg-primary px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{label}</div>
      <div className={`text-sm text-text-primary ${valueClassName ?? ''}`}>{value}</div>
    </div>
  );
}

export function WorkspaceDetailPanel({
  workspace,
  session,
  onOpenWorkspace,
}: WorkspaceDetailPanelProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<WorkspaceDetailTab>('overview');

  const detail = useMemo(
    () => (workspace ? buildWorkspaceDetailModel(workspace, session) : null),
    [session, workspace],
  );

  const activityItems = useMemo(
    () => (workspace ? buildWorkspaceActivityItems(workspace, session) : []),
    [session, workspace],
  );

  const tabs = useMemo(
    () => [
      { id: 'overview', label: t('dashboard.detail.tabs.overview') },
      { id: 'git', label: t('dashboard.detail.tabs.git') },
      { id: 'activity', label: t('dashboard.detail.tabs.activity') },
    ] satisfies Array<{ id: WorkspaceDetailTab; label: string }>,
    [t],
  );

  if (!detail) {
    return (
      <Card padding="none" className="overflow-hidden border border-border-primary">
        <div className="border-b border-border-primary px-3 py-2.5">
          <div className="text-sm font-medium text-text-primary">{t('dashboard.detail.title')}</div>
        </div>
        <div className="px-4 py-8 text-center">
          <div className="text-sm font-medium text-text-secondary">{t('dashboard.detail.emptyTitle')}</div>
          <div className="mt-1 text-xs text-text-tertiary">{t('dashboard.detail.emptyBody')}</div>
        </div>
      </Card>
    );
  }

  const overviewTab = (
    <div className="space-y-3">
      <div className="rounded-xl border border-border-primary bg-surface-secondary/70 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-base font-semibold text-text-primary">{detail.workspaceLabel}</div>
              <Badge
                variant={detail.workspaceType === 'main' ? 'primary' : 'default'}
                size="sm"
                className="px-2 py-0.5 text-[11px]"
              >
                {detail.workspaceType === 'main'
                  ? t('dashboard.detail.badge.main')
                  : t('dashboard.detail.badge.standard')}
              </Badge>
              <Badge
                variant={getStatusBadgeVariant(detail.runtimeStatus)}
                size="sm"
                className="px-2 py-0.5 text-[11px]"
              >
                {getSessionStatusLabel(detail.runtimeStatus, t)}
              </Badge>
            </div>
            <div className="text-xs text-text-secondary">
              {detail.latestSummary || detail.statusMessage || t('dashboard.detail.value.noRecentActivity')}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<ExternalLink className="h-4 w-4" />}
            onClick={() => onOpenWorkspace(detail.sessionId)}
          >
            {t('dashboard.detail.action.openWorkspace')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <FieldBlock
          label={t('dashboard.detail.field.type')}
          value={
            detail.workspaceType === 'main'
              ? t('dashboard.detail.badge.main')
              : t('dashboard.detail.badge.standard')
          }
        />
        <FieldBlock label={t('dashboard.detail.field.path')} value={detail.worktreePath} valueClassName="break-all text-xs" />
        <FieldBlock label={t('dashboard.detail.field.branch')} value={detail.branchName} />
        <FieldBlock label={t('dashboard.detail.field.baseBranch')} value={detail.baseBranch} />
        <FieldBlock label={t('dashboard.detail.field.runtime')} value={getSessionStatusLabel(detail.runtimeStatus, t)} />
        <FieldBlock
          label={t('dashboard.detail.field.createdAt')}
          value={renderDateTime(detail.createdAt, t('dashboard.detail.value.noDate'))}
        />
        <FieldBlock
          label={t('dashboard.detail.field.lastActivity')}
          value={renderDateTime(detail.lastActivity, t('dashboard.detail.value.noRecentActivity'))}
        />
      </div>
    </div>
  );

  const gitTab = (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <FieldBlock
          label={t('dashboard.detail.field.aheadBehind')}
          value={
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="primary" size="sm" className="px-2 py-0.5 text-[11px]">
                {interpolateTranslation(t('dashboard.detail.value.aheadCount'), {
                  count: detail.commitsAhead,
                })}
              </Badge>
              <Badge variant="warning" size="sm" className="px-2 py-0.5 text-[11px]">
                {interpolateTranslation(t('dashboard.detail.value.behindCount'), {
                  count: detail.commitsBehind,
                })}
              </Badge>
            </div>
          }
        />
        <FieldBlock
          label={t('dashboard.detail.field.stale')}
          value={detail.isStale ? t('dashboard.detail.value.stale') : t('dashboard.detail.value.current')}
        />
        <FieldBlock
          label={t('dashboard.detail.field.staleSince')}
          value={renderDateTime(detail.staleSince, t('dashboard.detail.value.none'))}
        />
        <FieldBlock
          label={t('dashboard.detail.field.uncommitted')}
          value={
            detail.hasUncommittedChanges
              ? t('dashboard.workspace.code.uncommitted')
              : t('dashboard.workspace.code.clean')
          }
        />
        <FieldBlock
          label={t('dashboard.detail.field.pullRequest')}
          value={
            detail.pullRequest ? (
              <a
                href={detail.pullRequest.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-interactive hover:text-interactive-hover"
              >
                <span>{interpolateTranslation(t('dashboard.workspace.code.pullRequest'), { number: detail.pullRequest.number })}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              t('dashboard.detail.value.noPullRequest')
            )
          }
        />
        <FieldBlock label={t('dashboard.detail.field.baseCommit')} value={detail.shortBaseCommit} />
      </div>
    </div>
  );

  const activityTab = (
    <div className="space-y-2.5">
      {activityItems.length > 0 ? (
        activityItems.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border px-3 py-2.5 ${
              item.emphasis === 'primary'
                ? 'border-interactive/30 bg-interactive/5'
                : item.emphasis === 'warning'
                  ? 'border-status-warning/30 bg-status-warning/5'
                  : 'border-border-primary bg-bg-primary'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
                  {item.id === 'summary' ? <Sparkles className="h-3.5 w-3.5" /> : null}
                  {item.id === 'runtime' ? <Activity className="h-3.5 w-3.5" /> : null}
                  {item.id === 'git' ? <GitBranch className="h-3.5 w-3.5" /> : null}
                  {item.id === 'lifecycle' ? <History className="h-3.5 w-3.5" /> : null}
                  <span>{t(`dashboard.detail.activity.item.${item.id}`)}</span>
                </div>
                <div className="text-sm text-text-secondary">{item.body}</div>
              </div>
              <div className="shrink-0 text-right">
                {item.meta ? (
                  <div className="text-[11px] font-medium text-text-primary">{item.meta}</div>
                ) : null}
                <div className="text-[11px] text-text-tertiary">
                  {renderDateTime(item.timestamp, t('dashboard.detail.value.noDate'))}
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-border-primary bg-surface-secondary px-4 py-8 text-center text-sm text-text-tertiary">
          {t('dashboard.detail.activity.empty')}
        </div>
      )}
    </div>
  );

  return (
    <Card padding="none" className="overflow-hidden border border-border-primary">
      <div className="border-b border-border-primary px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-text-primary">{t('dashboard.detail.title')}</div>
            <div className="text-[11px] text-text-tertiary">
              {interpolateTranslation(t('dashboard.detail.subtitle'), {
                workspace: detail.workspaceLabel,
              })}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <FolderTree className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-[11px] text-text-tertiary">{detail.worktreePath}</span>
          </div>
        </div>
      </div>

      <div className="border-b border-border-primary px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-interactive text-text-on-interactive shadow-button'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-3">
        {activeTab === 'overview' ? overviewTab : null}
        {activeTab === 'git' ? gitTab : null}
        {activeTab === 'activity' ? activityTab : null}
      </div>
    </Card>
  );
}
