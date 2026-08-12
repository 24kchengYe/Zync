import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { GitStatusManager } from '../gitStatusManager';
import { execSync } from '../../utils/commandExecutor';
import { existsSync } from 'fs';
import {
  fastCheckWorkingDirectory,
  fastGetAheadBehind,
  fastGetDiffStats,
} from '../gitPlumbingCommands';
import type { SessionManager } from '../sessionManager';
import type { WorktreeManager } from '../worktreeManager';
import type { GitDiffManager } from '../gitDiffManager';
import type { Logger } from '../../utils/logger';

// Type for accessing private methods in tests
interface GitStatusManagerWithPrivates {
  fetchGitStatus(sessionId: string): Promise<{ state: string; lastChecked: string; [key: string]: unknown } | null>;
  cache: Record<string, { status: { state: string; lastChecked: string; [key: string]: unknown }; lastChecked: number }>;
}

// Mock the modules
vi.mock('../../utils/commandExecutor');
vi.mock('../gitPlumbingCommands');
vi.mock('fs');

describe('GitStatusManager', () => {
  let gitStatusManager: GitStatusManager;
  let mockSessionManager: SessionManager;
  let mockWorktreeManager: WorktreeManager;
  let mockGitDiffManager: GitDiffManager;
  let mockLogger: Logger;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock instances
    mockSessionManager = {
      getSession: vi.fn(),
      getProjectForSession: vi.fn(),
      getProjectContext: vi.fn(),
      getAllSessions: vi.fn(),
    } as Partial<SessionManager> as SessionManager;

    mockWorktreeManager = {
      getProjectMainBranch: vi.fn().mockResolvedValue('main'),
    } as Partial<WorktreeManager> as WorktreeManager;

    mockGitDiffManager = {
      captureWorkingDirectoryDiff: vi.fn().mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 },
      }),
    } as Partial<GitDiffManager> as GitDiffManager;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    } as Partial<Logger> as Logger;

    // Create GitStatusManager instance
    gitStatusManager = new GitStatusManager(
      mockSessionManager,
      mockWorktreeManager,
      mockGitDiffManager,
      mockLogger
    );
  });

  describe('fetchGitStatus', () => {
    const mockSession = {
      id: 'test-session',
      worktreePath: '/test/worktree',
      archived: false,
    };

    const mockProject = {
      id: 1,
      path: '/test/project',
    };

    beforeEach(() => {
      (mockSessionManager.getSession as Mock).mockResolvedValue(mockSession);
      (mockSessionManager.getProjectForSession as Mock).mockReturnValue(mockProject);
      (mockSessionManager.getProjectContext as Mock).mockReturnValue({
        project: mockProject,
        commandRunner: undefined,
      });
      (fastCheckWorkingDirectory as Mock).mockReturnValue({
        hasModified: false,
        hasStaged: false,
        hasUntracked: false,
        hasConflicts: false,
      });
      (fastGetAheadBehind as Mock).mockReturnValue({ ahead: 0, behind: 0 });
      (fastGetDiffStats as Mock).mockReturnValue({
        filesChanged: 0,
        additions: 0,
        deletions: 0,
      });
      (execSync as Mock).mockReturnValue(Buffer.from('0'));
      (existsSync as Mock).mockReturnValue(false); // No rebase in progress
    });

    it('should return clean status when no changes', async () => {
      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      expect(status).toBeTruthy();
      expect(status!.state).toBe('clean');
      expect(status!.ahead).toBeUndefined();
      expect(status!.behind).toBeUndefined();
      expect(status!.additions).toBeUndefined();
      expect(status!.deletions).toBeUndefined();
    });

    it('should return modified status with uncommitted changes', async () => {
      (fastCheckWorkingDirectory as Mock).mockReturnValue({
        hasModified: true,
        hasStaged: false,
        hasUntracked: false,
        hasConflicts: false,
      });
      (fastGetDiffStats as Mock).mockReturnValue({
        filesChanged: 3,
        additions: 15,
        deletions: 5,
      });

      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      expect(status!.state).toBe('modified');
      expect(status!.filesChanged).toBe(3);
      expect(status!.additions).toBe(15);
      expect(status!.deletions).toBe(5);
      expect(status!.hasUncommittedChanges).toBe(true);
    });

    it('should return ahead status when commits ahead of main', async () => {
      (fastGetAheadBehind as Mock).mockReturnValue({ ahead: 3, behind: 0 });
      (execSync as Mock)
        .mockReturnValueOnce(Buffer.from(' 5 files changed, 20 insertions(+), 10 deletions(-)')) // Diff stats
        .mockReturnValueOnce(Buffer.from('3')); // 3 total commits

      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      expect(status!.state).toBe('ahead');
      expect(status!.ahead).toBe(3);
      expect(status!.totalCommits).toBe(3);
      expect(status!.commitFilesChanged).toBe(5);
      expect(status!.commitAdditions).toBe(20);
      expect(status!.commitDeletions).toBe(10);
      expect(status!.isReadyToMerge).toBe(true);
    });

    it('should return behind status when commits behind main', async () => {
      (fastGetAheadBehind as Mock).mockReturnValue({ ahead: 0, behind: 5 });

      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      expect(status!.state).toBe('behind');
      expect(status!.behind).toBe(5);
      expect(status!.ahead).toBeUndefined();
    });

    it('should return diverged status when both ahead and behind', async () => {
      (fastGetAheadBehind as Mock).mockReturnValue({ ahead: 2, behind: 3 });
      (execSync as Mock)
        .mockReturnValueOnce(Buffer.from(' 4 files changed, 15 insertions(+), 8 deletions(-)')) // Diff stats
        .mockReturnValueOnce(Buffer.from('2')); // 2 total commits

      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      expect(status!.state).toBe('diverged');
      expect(status!.ahead).toBe(2);
      expect(status!.behind).toBe(3);
      expect(status!.totalCommits).toBe(2);
    });

    it('should return conflict status when merge conflicts exist', async () => {
      (fastCheckWorkingDirectory as Mock).mockReturnValue({
        hasModified: true,
        hasStaged: false,
        hasUntracked: false,
        hasConflicts: true,
      });
      (fastGetDiffStats as Mock).mockReturnValue({
        filesChanged: 2,
        additions: 5,
        deletions: 3,
      });

      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      expect(status!.state).toBe('conflict');
      // The hasMergeConflicts property is not exposed in the result,
      // but the state being 'conflict' indicates merge conflicts exist
    });

    it('should handle untracked files', async () => {
      (fastCheckWorkingDirectory as Mock).mockReturnValue({
        hasModified: false,
        hasStaged: false,
        hasUntracked: true,
        hasConflicts: false,
      });

      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      expect(status!.state).toBe('untracked');
      expect(status!.hasUntrackedFiles).toBe(true);
    });

    it('should still fetch status for archived session', async () => {
      // The actual implementation doesn't check for archived status in fetchGitStatus
      // It only checks in the public methods like refreshSessionGitStatus
      const archivedSession = { ...mockSession, archived: true };
      (mockSessionManager.getSession as Mock).mockResolvedValue(archivedSession);

      (fastCheckWorkingDirectory as Mock).mockReturnValue({
        hasModified: false,
        hasStaged: false,
        hasUntracked: true,
        hasConflicts: false,
      });

      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      // It will still return a status for archived sessions
      expect(status).toBeTruthy();
      expect(status!.state).toBe('untracked');
    });

    it('should return null when session not found', async () => {
      (mockSessionManager.getSession as Mock).mockResolvedValue(null);

      const status = await (gitStatusManager as unknown as GitStatusManagerWithPrivates).fetchGitStatus('test-session');

      expect(status).toBeNull();
    });
  });

  describe('caching', () => {
    it('should return cached status within TTL', async () => {
      const mockStatus = { state: 'clean' as const, lastChecked: new Date().toISOString() };
      (gitStatusManager as unknown as GitStatusManagerWithPrivates).cache['test-session'] = {
        status: mockStatus,
        lastChecked: Date.now(),
      };

      const fetchSpy = vi.spyOn(gitStatusManager as unknown as GitStatusManagerWithPrivates, 'fetchGitStatus');
      
      const status = await gitStatusManager.getGitStatus('test-session');

      expect(status).toEqual(mockStatus);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should fetch fresh status after TTL expires', async () => {
      const oldStatus = { state: 'clean' as const, lastChecked: new Date().toISOString() };
      const newStatus = { state: 'modified' as const, lastChecked: new Date().toISOString() };
      
      (gitStatusManager as unknown as GitStatusManagerWithPrivates).cache['test-session'] = {
        status: oldStatus,
        lastChecked: Date.now() - 31000, // Expired
      };

      vi.spyOn(gitStatusManager as unknown as GitStatusManagerWithPrivates, 'fetchGitStatus').mockResolvedValue(newStatus);
      
      const status = await gitStatusManager.getGitStatus('test-session');

      expect(status).toEqual(newStatus);
    });
  });
});
