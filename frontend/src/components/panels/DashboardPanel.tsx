import React from 'react';
import { ProjectDashboard } from '../ProjectDashboard';
import { useSession } from '../../contexts/SessionContext';
import { useI18n } from '../../I18nContext';

interface DashboardPanelProps {
  panelId: string;
  sessionId: string;
  isActive: boolean;
}

const DashboardPanel: React.FC<DashboardPanelProps> = () => {
  const sessionContext = useSession();
  const { t } = useI18n();
  
  // Get project info from session context
  const projectIdStr = sessionContext?.projectId;
  const projectName = sessionContext?.projectName || 'Project';

  if (!projectIdStr) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-gray-400">{t('dashboard.panel.noProject')}</div>
      </div>
    );
  }

  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-gray-400">{t('dashboard.panel.invalidProject')}</div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 bg-gray-900 overflow-hidden">
      <ProjectDashboard 
        projectId={projectId} 
        projectName={projectName} 
      />
    </div>
  );
};

export default DashboardPanel;
