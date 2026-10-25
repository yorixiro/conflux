import { useEffect, useState } from 'react';
import type { Conversation, McpServerConfig, Persona, PolarisTriggerRule, PolarisTriggerSchedule, ProviderProfile } from '../../../types/domain';
import { BasicSettingsTab } from '../../shell/persona/settings/BasicSettingsTab';
import { MemorySettingsTab } from '../../shell/persona/settings/MemorySettingsTab';
import { RequestSettingsTab } from '../../shell/persona/settings/RequestSettingsTab';
import { RoomSettingsTab } from '../../shell/persona/settings/RoomSettingsTab';
import { AutomationRulesPanel } from '../../shell/menu/AutomationRulesPanel';
import type { PersonaUpdatePatch } from '../../shell/persona/personaUiShared';
import { isCompanionCollaboratorId } from '../../../engines/companion';
import { isProductGuidePersona } from '../../../engines/personaBuiltin';
import type { I18nKey } from '../../../i18n/messages';
import { useI18n } from '../../../i18n/useI18n';
import { Icon } from '../../Icon';
const INFO_TABS = ['identity', 'request', 'memory', 'room', 'automation'] as const;
type CollaboratorInfoTab = (typeof INFO_TABS)[number];
export type CollaboratorInfoPageRequest = {
  collaboratorId: string | null;
  tab: 'identity' | 'memory';
};
const PRODUCT_GUIDE_INFO_TABS = INFO_TABS.filter((tab) => tab !== 'automation' && tab !== 'request');
const INFO_TAB_LABEL_KEYS = {
  identity: 'collaborator.info.tab.identity',
  memory: 'collaborator.info.tab.memory',
  room: 'collaborator.info.tab.room',
  automation: 'collaborator.info.tab.automation',
  request: 'collaborator.info.tab.request'
} satisfies Record<CollaboratorInfoTab, I18nKey>;

type CollaboratorInfoShelfProps = {
  pageRequest?: CollaboratorInfoPageRequest | null;
  isAggregateScope: boolean;
  currentCollaboratorId: string | null;
  currentCollaborator: Persona | null;
  fullscreenOpen: boolean;
  showChatAvatars: boolean;
  providers: ProviderProfile[];
  activeProviderId: string | null;
  conversations: Conversation[];
  triggerRules: PolarisTriggerRule[];
  mcpServers: McpServerConfig[];
  mcpToolTimeoutSeconds: number;
  onUpdateCollaborator: (patch: PersonaUpdatePatch) => void;
  onBackToChat: () => void;
  onDeleteCollaborator: (collaboratorId: string) => void;
  onSelectCollaboratorAvatar: (role: 'assistant' | 'user', files: FileList | File[]) => Promise<void>;
  onChooseCollaborator: () => void;
  onCreateCustomCollaborator: () => void;
  onOpenProviderSettings: () => void;
  onUpdateProvider: (providerId: string, patch: Partial<ProviderProfile>) => void;
  onCreateTriggerRule: (seed: {
    collaboratorId: string;
    conversationMode?: PolarisTriggerRule['target']['conversationMode'];
    conversationId?: string | null;
    schedule: PolarisTriggerSchedule;
    prompt: string;
    name?: string;
  }) => string | null;
  onUpdateTriggerRule: (ruleId: string, patch: Partial<PolarisTriggerRule>) => void;
  onDeleteTriggerRule: (ruleId: string) => void;
  onTestTriggerRule: (ruleId: string) => void;
  onCopyTriggerUrl: (ruleId: string) => void;
  onCreateMcpServer: (seed?: Partial<McpServerConfig>) => string;
  onUpdateMcpServer: (serverId: string, patch: Partial<McpServerConfig>) => void;
};

export function CollaboratorInfoShelf({
  pageRequest,
  isAggregateScope,
  currentCollaboratorId,
  currentCollaborator,
  fullscreenOpen,
  showChatAvatars,
  providers,
  activeProviderId,
  conversations,
  triggerRules,
  mcpServers,
  mcpToolTimeoutSeconds,
  onUpdateCollaborator,
  onBackToChat,
  onDeleteCollaborator,
  onSelectCollaboratorAvatar,
  onChooseCollaborator,
  onCreateCustomCollaborator,
  onOpenProviderSettings,
  onUpdateProvider,
  onCreateTriggerRule,
  onUpdateTriggerRule,
  onDeleteTriggerRule,
  onTestTriggerRule,
  onCopyTriggerUrl,
  onCreateMcpServer,
  onUpdateMcpServer
}: CollaboratorInfoShelfProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<CollaboratorInfoTab>('identity');
  const visibleTabs = isProductGuidePersona(currentCollaborator) ? PRODUCT_GUIDE_INFO_TABS : INFO_TABS;
  const isCompanionCollaborator = isCompanionCollaboratorId(currentCollaboratorId);
  const collaboratorName = currentCollaborator?.name.trim() || t('collaborator.info.fallbackName');

  useEffect(() => {
    setActiveTab(pageRequest?.collaboratorId === currentCollaboratorId ? pageRequest.tab : 'identity');
  }, [currentCollaboratorId, pageRequest]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab === activeTab)) {
      setActiveTab('identity');
    }
  }, [activeTab, visibleTabs]);

  if (isAggregateScope || !currentCollaborator) {
    return (
      <section className="collaborator-info-shelf collaborator-info-shelf-empty">
        <div className="empty-state-floating">
          <p className="empty-state-title">{t('collaborator.info.emptyTitle')}</p>
          <p className="empty-state-hint">{t('collaborator.info.emptyHint')}</p>
          <button type="button" className="btn-secondary" onClick={onChooseCollaborator}>选择已有角色</button>
          <button type="button" className="btn-secondary" onClick={onCreateCustomCollaborator}>新建角色</button>
          <button type="button" className="btn-secondary" onClick={onBackToChat}>返回聊天</button>
        </div>
      </section>
    );
  }

  return (
    <section className={`collaborator-info-shelf ${fullscreenOpen ? 'collaborator-info-shelf--fullscreen' : ''}`.trim()}>
      <div className={`collaborator-info-detail-shell ${fullscreenOpen ? 'collaborator-info-detail-shell--fullscreen' : ''}`.trim()}>
        <div className="conflux-role-navigation">
          <button type="button" className="btn-secondary" onClick={onBackToChat}>
            <span className="conflux-role-back-icon"><Icon name="chevron" size={16} /></span>返回聊天
          </button>
          <span>{collaboratorName}</span>
        </div>
        <div className="ps-nav collaborator-info-nav" role="tablist" aria-label="角色设置">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`ps-nav-item ${activeTab === tab ? 'ps-nav-item--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(INFO_TAB_LABEL_KEYS[tab])}
            </button>
          ))}
        </div>

        <div className="ps-content collaborator-info-content">
          <div className="ps-section">
            {isProductGuidePersona(currentCollaborator) ? (
              <div className="conflux-role-notice">
                <strong>内置使用向导</strong>
                <p>小助手的人设和线路由程序固定。要设置自己的聊天角色，请新建一个；原有对话会保留。</p>
                <button type="button" className="btn-secondary" onClick={onCreateCustomCollaborator}>新建可编辑角色</button>
              </div>
            ) : <p className="ps-footnote">正在设置：{collaboratorName} · 修改自动保存</p>}
            {activeTab === 'identity' && (
              <BasicSettingsTab
                activeCollaboratorId={currentCollaboratorId}
                activePersona={currentCollaborator}
                providers={providers}
                activeProviderId={activeProviderId}
                showChatAvatars={showChatAvatars}
                onUpdatePersona={onUpdateCollaborator}
                deletePersonaLabel={isCompanionCollaborator
                  ? t('collaborator.info.disconnectLabel', { name: collaboratorName })
                  : t('collaborator.info.deleteLabel', { name: collaboratorName })}
                deletePersonaHint={
                  isCompanionCollaborator
                    ? t('collaborator.info.disconnectHint')
                    : t('collaborator.info.deleteHint')
                }
                onDeletePersona={() => {
                  if (!currentCollaboratorId) return;
                  onDeleteCollaborator(currentCollaboratorId);
                }}
                onSelectPersonaAvatar={onSelectCollaboratorAvatar}
                onSetPersonaAvatarIcon={(role, iconId) =>
                  onUpdateCollaborator(
                    role === 'assistant' ? { assistantAvatarIconId: iconId } : { userAvatarIconId: iconId }
                  )}
                onSetPersonaAvatarShape={(role, shape) =>
                  onUpdateCollaborator(
                    role === 'assistant' ? { assistantAvatarShape: shape } : { userAvatarShape: shape }
                  )}
                onSetPersonaAvatarSize={(role, size) =>
                  onUpdateCollaborator(
                    role === 'assistant' ? { assistantAvatarSize: size } : { userAvatarSize: size }
                  )}
              />
            )}
            {activeTab === 'room' && (
              <RoomSettingsTab
                activeCollaboratorId={currentCollaboratorId}
                activePersona={currentCollaborator}
                onUpdatePersona={onUpdateCollaborator}
                onSelectPersonaAvatar={onSelectCollaboratorAvatar}
                onSetPersonaAvatarIcon={(role, iconId) =>
                  onUpdateCollaborator(
                    role === 'assistant' ? { assistantAvatarIconId: iconId } : { userAvatarIconId: iconId }
                  )}
                onSetPersonaAvatarShape={(role, shape) =>
                  onUpdateCollaborator(
                    role === 'assistant' ? { assistantAvatarShape: shape } : { userAvatarShape: shape }
                  )}
                onSetPersonaAvatarSize={(role, size) =>
                  onUpdateCollaborator(
                    role === 'assistant' ? { assistantAvatarSize: size } : { userAvatarSize: size }
                  )}
              />
            )}
            {activeTab === 'memory' && (
              <MemorySettingsTab
                activeCollaboratorId={currentCollaboratorId}
                activePersona={currentCollaborator}
                onUpdatePersona={onUpdateCollaborator}
              />
            )}
            {activeTab === 'automation' && (
              <AutomationRulesPanel
                personas={[currentCollaborator]}
                conversations={conversations}
                triggerRules={triggerRules}
                lockedCollaboratorId={currentCollaboratorId}
                emptyTitle={t('settings.automation.collaboratorEmptyTitle')}
                emptyActionLabel={t('settings.automation.collaboratorEmptyAction')}
                formNote={t('settings.automation.collaboratorFormNote')}
                rulesNote={t('settings.automation.collaboratorRulesNote')}
                onCreateTriggerRule={onCreateTriggerRule}
                onUpdateTriggerRule={onUpdateTriggerRule}
                onDeleteTriggerRule={onDeleteTriggerRule}
                onTestTriggerRule={onTestTriggerRule}
                onCopyTriggerUrl={onCopyTriggerUrl}
              />
            )}
            {activeTab === 'request' && (
              <RequestSettingsTab
                activeCollaboratorId={currentCollaboratorId}
                activePersona={currentCollaborator}
                providers={providers}
                activeProviderId={activeProviderId}
                onUpdatePersona={onUpdateCollaborator}
                onOpenProviderSettings={onOpenProviderSettings}
                onUpdateProvider={onUpdateProvider}
                mcpServers={mcpServers}
                mcpToolTimeoutSeconds={mcpToolTimeoutSeconds}
                onCreateMcpServer={onCreateMcpServer}
                onUpdateMcpServer={onUpdateMcpServer}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
