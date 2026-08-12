import type { Project } from '../../types/project';
import type { ClaudeJsonMessage, Session } from '../../types/session';

export type ResultGroup = 'recent' | 'favorites' | 'projects' | 'workspaces';

export interface ResultItem {
  id: string;
  type: 'project' | 'workspace';
  group: ResultGroup;
  score: number;
  title: string;
  subtitle: string;
  description?: string;
  project?: Project;
  session?: Session;
  badges: Array<'recent' | 'favorite' | 'active-project' | 'active-workspace'>;
}

export type ListRow =
  | { type: 'header'; group: ResultGroup }
  | { type: 'item'; item: ResultItem; flatIndex: number };

export const GROUP_ORDER: ResultGroup[] = ['recent', 'favorites', 'projects', 'workspaces'];

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function getBranchName(session: Session) {
  return session.worktreePath?.replace(/\\/g, '/').split('/').pop() || '';
}

function scoreField(field: string, query: string) {
  if (!field) {
    return -1;
  }

  const normalizedField = field.toLowerCase();
  if (normalizedField === query) {
    return 120;
  }

  if (normalizedField.startsWith(query)) {
    return 92;
  }

  const substringIndex = normalizedField.indexOf(query);
  if (substringIndex >= 0) {
    return Math.max(40, 80 - substringIndex);
  }

  let queryIndex = 0;
  for (let i = 0; i < normalizedField.length && queryIndex < query.length; i += 1) {
    if (normalizedField[i] === query[queryIndex]) {
      queryIndex += 1;
    }
  }

  return queryIndex === query.length ? 24 : -1;
}

export function scoreFields(fields: string[], query: string, bonus: number = 0) {
  if (!query) {
    return bonus;
  }

  const scores = fields.map((field) => scoreField(field, query)).filter((score) => score >= 0);
  if (scores.length === 0) {
    return -1;
  }

  return Math.max(...scores) + bonus;
}

function stripAnsi(value: string) {
  const escapeCharacter = String.fromCharCode(27);
  const ansiPattern = new RegExp(`${escapeCharacter}\\[[0-9;]*m`, 'g');
  return value.replace(ansiPattern, '');
}

function cleanPreviewText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = stripAnsi(value).replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return null;
  }

  return cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned;
}

function extractTextContent(content: unknown): string | null {
  if (!content) {
    return null;
  }

  if (typeof content === 'string') {
    return cleanPreviewText(content);
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const textValue =
        'text' in item && typeof item.text === 'string'
          ? item.text
          : 'content' in item && typeof item.content === 'string'
            ? item.content
            : null;

      const cleaned = cleanPreviewText(textValue);
      if (cleaned) {
        return cleaned;
      }
    }
  }

  return null;
}

export function extractSessionSummary(session: Session) {
  const reversedMessages = [...session.jsonMessages].reverse();
  for (const message of reversedMessages) {
    const candidates = [
      typeof message.summary === 'string' ? message.summary : null,
      typeof message.text === 'string' ? message.text : null,
      typeof message.result === 'string' ? message.result : null,
      extractTextContent(message.content),
      extractTextContent(message.message?.content),
      typeof message.raw_output === 'string' ? message.raw_output : null,
    ];

    for (const candidate of candidates) {
      const cleaned = cleanPreviewText(candidate);
      if (cleaned) {
        return cleaned;
      }
    }
  }

  const reversedOutput = [...session.output].reverse();
  for (const line of reversedOutput) {
    const cleaned = cleanPreviewText(line);
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

export function formatRelativeTime(value?: string) {
  if (!value) {
    return '--';
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return '--';
  }

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) {
    return '<1m';
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export function getSessionStatusLabel(session: Session, language: 'en' | 'zh') {
  const labels = {
    en: {
      initializing: 'Initializing',
      ready: 'Ready',
      running: 'Running',
      waiting: 'Waiting',
      stopped: 'Stopped',
      completed_unviewed: 'Completed',
      error: 'Error',
    },
    zh: {
      initializing: '初始化中',
      ready: '就绪',
      running: '运行中',
      waiting: '等待中',
      stopped: '已停止',
      completed_unviewed: '已完成',
      error: '异常',
    },
  } as const;

  return labels[language][session.status] ?? session.status;
}

export function getStatusTone(session: Session) {
  if (session.status === 'running' || session.status === 'initializing') {
    return 'success';
  }

  if (session.status === 'waiting') {
    return 'warning';
  }

  if (session.status === 'error') {
    return 'danger';
  }

  return 'neutral';
}

export function buildListRows(groupedResults: Array<{ group: ResultGroup; items: ResultItem[] }>) {
  const rows: ListRow[] = [];
  let flatIndex = 0;

  groupedResults.forEach(({ group, items }) => {
    rows.push({ type: 'header', group });
    items.forEach((item) => {
      rows.push({ type: 'item', item, flatIndex });
      flatIndex += 1;
    });
  });

  return {
    rows,
    resultCount: flatIndex,
  };
}

export function getMessageText(message: ClaudeJsonMessage) {
  return cleanPreviewText(
    typeof message.summary === 'string'
      ? message.summary
      : typeof message.text === 'string'
        ? message.text
        : typeof message.result === 'string'
          ? message.result
          : null,
  );
}
