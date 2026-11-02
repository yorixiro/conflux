import { useMenuAutomationController } from '../../app/shell/useMenuAutomationController';
import { useI18n } from '../../i18n/useI18n';
import { useChatStore } from '../../stores/chatStore';
import { usePersonaStore } from '../../stores/personaStore';
import { useRuntimeStore } from '../../stores/runtimeStore';
import { AutomationRulesPanel } from '../shell/menu/AutomationRulesPanel';

export function RoomAutomationSettings({ collaboratorId, onAfterTest }: {
  collaboratorId: string;
  onAfterTest: () => void;
}) {
  const copy = useI18n();
  const personas = usePersonaStore((state) => state.personas);
  const conversations = useChatStore((state) => state.conversations);
  const rules = useRuntimeStore((state) => state.triggerRules);
  const companionHost = useRuntimeStore((state) => state.companionHost);
  const createTriggerRule = useRuntimeStore((state) => state.createTriggerRule);
  const updateTriggerRule = useRuntimeStore((state) => state.updateTriggerRule);
  const deleteTriggerRule = useRuntimeStore((state) => state.deleteTriggerRule);
  const actions = useMenuAutomationController({
    personas, triggerRules: rules, companionHost,
    createTriggerRule, updateTriggerRule, deleteTriggerRule,
    ui: { alert: (message) => window.alert(message), confirm: (message) => window.confirm(message) },
    copy
  });

  return (
    <div className="conflux-room-automation">
      <p className="conflux-room-settings-note">
        只显示这个角色的主动消息规则。定时执行仍受应用运行状态和后台服务限制。
      </p>
      <AutomationRulesPanel
        personas={personas}
        conversations={conversations}
        triggerRules={rules}
        lockedCollaboratorId={collaboratorId}
        rulesNote="修改只影响当前角色已有的规则。"
        onCreateTriggerRule={(seed) => seed.collaboratorId === collaboratorId
          ? actions.onCreateAutomationRule(seed) : null}
        onUpdateTriggerRule={(id, patch) => {
          const rule = rules.find((entry) => entry.id === id);
          if (!rule || rule.target.collaboratorId !== collaboratorId) return;
          if (patch.target?.collaboratorId && patch.target.collaboratorId !== collaboratorId) return;
          actions.onUpdateAutomationRule(id, patch);
        }}
        onDeleteTriggerRule={(id) => {
          if (rules.some((rule) => rule.id === id && rule.target.collaboratorId === collaboratorId))
            actions.onDeleteAutomationRule(id);
        }}
        onTestTriggerRule={(id) => {
          if (rules.some((rule) => rule.id === id && rule.target.collaboratorId === collaboratorId))
            actions.onTestAutomationRule(id);
        }}
        onCopyTriggerUrl={(id) => {
          if (rules.some((rule) => rule.id === id && rule.target.collaboratorId === collaboratorId))
            void actions.onCopyAutomationTriggerUrl(id);
        }}
        onAfterTestTriggerRule={onAfterTest}
      />
    </div>
  );
}
