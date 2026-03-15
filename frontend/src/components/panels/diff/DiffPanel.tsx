import React, { useEffect, useState, useRef } from 'react';
import CombinedDiffView from './CombinedDiffView';
import type { CombinedDiffViewHandle } from './CombinedDiffView';
import type { ToolPanel, DiffPanelState } from '../../../../../shared/types/panels';
import { AlertCircle } from 'lucide-react';

interface DiffPanelProps {
  panel: ToolPanel;
  isActive: boolean;
  sessionId: string;
  isMainRepo?: boolean;
}

export const DiffPanel: React.FC<DiffPanelProps> = ({
  panel,
  isActive,
  sessionId,
  isMainRepo = false
}) => {
  const [isStale, setIsStale] = useState(false);
  const diffState = panel.state?.customState as DiffPanelState | undefined;
  const lastRefreshRef = useRef<number>(Date.now());
  const combinedDiffRef = useRef<CombinedDiffViewHandle>(null);
  const lastFingerprintRef = useRef<string | null>(null);

  // Listen for file change events from other panels
  useEffect(() => {
    const handlePanelEvent = (event: CustomEvent) => {
      const { type, source, data } = event.detail || {};

      // Mark as stale when files change from other panels
      if (type === 'files:changed' || type === 'terminal:command_executed') {
        if (source.sessionId === sessionId && source.panelId !== panel.id) {
          setIsStale(true);
        }
      } else if (type === 'git:operation_completed') {
        // Refresh diff when git operations complete for this session (e.g., merge to main)
        if (source?.sessionId === sessionId) {
          const op = data?.operation as string | undefined;
          if (!op || op === 'merge_to_main' || op === 'squash_and_merge') {
            setIsStale(true);
          }
        }
      }
    };

    window.addEventListener('panel:event', handlePanelEvent as EventListener);

    return () => {
      window.removeEventListener('panel:event', handlePanelEvent as EventListener);
    };
  }, [panel.id, sessionId]);

  // When panel becomes active after being inactive, check fingerprint before marking stale
  const wasActiveRef = useRef(isActive);
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      // Check if git state actually changed before triggering a refresh
      (async () => {
        try {
          const result = await window.electron?.invoke('sessions:get-diff-fingerprint', sessionId);
          if (result?.success && result.data?.fingerprint) {
            const newFingerprint = result.data.fingerprint;
            if (lastFingerprintRef.current === null || lastFingerprintRef.current !== newFingerprint) {
              lastFingerprintRef.current = newFingerprint;
              setIsStale(true);
            }
            // If fingerprint matches, skip refresh -- data hasn't changed
          } else {
            // Fallback: if fingerprint check fails, mark stale to be safe
            setIsStale(true);
          }
        } catch {
          setIsStale(true);
        }
      })();
    }
    wasActiveRef.current = isActive;
  }, [isActive, sessionId]);

  // Auto-refresh when becoming active and stale
  useEffect(() => {
    if (isActive && isStale) {
      setIsStale(false);
      combinedDiffRef.current?.refresh();

      const timer = setTimeout(() => {
        lastRefreshRef.current = Date.now();

        // Update fingerprint after refresh so next activation can skip if unchanged
        window.electron?.invoke('sessions:get-diff-fingerprint', sessionId).then((result: { success: boolean; data?: { fingerprint: string } } | undefined) => {
          if (result?.success && result.data?.fingerprint) {
            lastFingerprintRef.current = result.data.fingerprint;
          }
        }).catch(() => { /* best effort */ });

        window.electron?.invoke('panels:update', panel.id, {
          state: {
            ...panel.state,
            customState: {
              ...diffState,
              lastRefresh: new Date().toISOString(),
              isDiffStale: false
            }
          }
        });

        window.dispatchEvent(new CustomEvent('panel:event', {
          detail: {
            type: 'diff:refreshed',
            source: {
              panelId: panel.id,
              panelType: 'diff',
              sessionId
            },
            timestamp: new Date().toISOString()
          }
        }));
      }, 500);

      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- panel.state/diffState intentionally excluded: they are written inside this effect via IPC and must not re-trigger it
  }, [isActive, isStale, panel.id, sessionId]);

  return (
    <div className="diff-panel h-full flex flex-col bg-gray-800">
      {/* Stale indicator bar */}
      {isStale && !isActive && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Files changed - switch to diff panel to refresh</span>
          </div>
        </div>
      )}

      {/* Main diff view */}
      <div className="flex-1 overflow-hidden">
        <CombinedDiffView
          ref={combinedDiffRef}
          sessionId={sessionId}
          selectedExecutions={[]}
          isGitOperationRunning={false}
          isMainRepo={isMainRepo}
          isVisible={isActive}
        />
      </div>
    </div>
  );
};

export default DiffPanel;
