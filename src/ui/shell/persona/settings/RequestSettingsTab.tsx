import { useState, type ReactNode } from 'react';
import type { I18nKey } from '../../../../i18n/messages';
import { useI18n } from '../../../../i18n/useI18n';
import type { McpServerConfig, ProviderProfile } from '../../../../types/domain';
import { Icon, type IconName } from '../../../Icon';
import { type PersonaTabProps } from '../personaUiShared';
import { CustomRequestSettingsTab } from './CustomRequestSettingsTab';
import { EngineSettingsTab } from './EngineSettingsTab';
import { PersonaApiConnectionPanel } from './PersonaApiConnectionPanel';
import { PersonaMcpSettingsPage } from './PersonaMcpSettingsPage';

type RequestSettingsTabProps = PersonaTabProps & {
  onOpenProviderSettings?: () => void;
  onUpdateProvider: (providerId: string, patch: Partial<ProviderProfile>) => void;
  mcpServers: McpServerConfig[];
  mcpToolTimeoutSeconds: number;
  onCreateMcpServer: (seed?: Partial<McpServerConfig>) => string;
  onUpdateMcpServer: (serverId: string, patch: Partial<McpServerConfig>) => void;
};

type RequestSettingsPage = 'route' | 'engine' | 'custom' | 'mcp';

const REQUEST_PAGE_META: Array<{
  id: RequestSettingsPage;
  labelKey: I18nKey;
  icon: IconName;
}> = [
  { id: 'route', labelKey: 'request.settings.providerSection', icon: 'providerRoute' },
  { id: 'engine', labelKey: 'request.settings.engineSection', icon: 'orbit' },
  { id: 'custom', labelKey: 'request.settings.customSection', icon: 'code' },
  { id: 'mcp', labelKey: 'request.settings.mcpSection', icon: 'mcpServer' }
];

function RequestSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="request-settings-section">
      <div className="request-settings-section-title">{title}</div>
      {children}
    </div>
  );
}

export function RequestSettingsTab(props: RequestSettingsTabProps) {
  const { t } = useI18n();
  const [activePage, setActivePage] = useState<RequestSettingsPage>('route');

  return (
    <div className="request-settings-flow">
      <div className="room-theme-page-nav request-page-nav" role="tablist" aria-label={t('request.settings.pageNavLabel')}>
        {REQUEST_PAGE_META.map((page) => (
          <button
            key={page.id}
            type="button"
            className={activePage === page.id ? 'active' : ''}
            onClick={() => setActivePage(page.id)}
          >
            <Icon name={page.icon} size={14} />
            <span>{t(page.labelKey)}</span>
          </button>
        ))}
      </div>

      {activePage === 'route' ? (
        <RequestSection title={t('request.settings.providerSection')}>
          <PersonaApiConnectionPanel {...props} />
        </RequestSection>
      ) : null}
      {activePage === 'engine' ? (
        <RequestSection title={t('request.settings.engineSection')}>
          <EngineSettingsTab {...props} />
        </RequestSection>
      ) : null}
      {activePage === 'custom' ? (
        <RequestSection title={t('request.settings.customSection')}>
          <CustomRequestSettingsTab {...props} />
        </RequestSection>
      ) : null}
      {activePage === 'mcp' ? (
        <RequestSection title={t('request.settings.mcpSection')}>
          <PersonaMcpSettingsPage {...props} />
        </RequestSection>
      ) : null}
    </div>
  );
}
