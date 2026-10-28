import { useEffect, useRef } from 'react';
import type { ApiOverlayProps, MenuOverlayPage } from '../../app/shell/appShellContracts';
import { resolvePersonaProviderBinding } from '../../engines/personaProviderBinding';
import type { Persona } from '../../types/domain';
import { Icon, type IconName } from '../Icon';
import { getProviderModelDisplayLabel } from '../shell/apiProviderDisplay';
import './ConfluxQuickSettingsDrawer.css';

type QuickSettingsProps = {
  open: boolean;
  onClose: () => void;
  provider: Pick<ApiOverlayProps, 'providers' | 'activeProviderId' | 'api' | 'onSetActiveProvider'>;
  onOpenApi: () => void;
  onOpenMenu: (page: MenuOverlayPage) => void;
  onNewConversation: () => void;
  currentPersona: Persona | null;
  onSetPersonaProvider: (providerId: string) => void;
  onOpenPersona?: () => void;
  onOpenCodeCards: () => void;
};

function QuickAction({
  icon,
  label,
  detail,
  onClick
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="conflux-quick-settings-action" onClick={onClick}>
      <span className="conflux-quick-settings-action-icon"><Icon name={icon} size={18} /></span>
      <span className="conflux-quick-settings-action-copy">
        <span>{label}</span>
        {detail ? <small>{detail}</small> : null}
      </span>
      <Icon name="chevron" size={15} />
    </button>
  );
}

/** Reuse the existing settings routes and runtime provider state; this drawer owns no configuration. */
export function ConfluxQuickSettingsDrawer({
  open,
  onClose,
  provider,
  onOpenApi,
  onOpenMenu,
  onNewConversation,
  currentPersona,
  onSetPersonaProvider,
  onOpenPersona,
  onOpenCodeCards
}: QuickSettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const closeAndRun = (action: () => void) => {
    // Release the native modal/top layer before opening an existing settings sheet.
    dialogRef.current?.close();
    onClose();
    action();
  };
  const openMenuPage = (page: MenuOverlayPage) => closeAndRun(() => onOpenMenu(page));
  const binding = currentPersona ? resolvePersonaProviderBinding({
    globalApi: provider.api,
    providers: provider.providers,
    persona: currentPersona
  }) : null;
  const routeValue = binding?.fixedProviderId
    || (currentPersona?.advanced.providerRouteMode === 'inherit' ? '' : '__unconfigured__');

  return (
    <dialog
      ref={dialogRef}
      className="conflux-quick-settings-drawer"
      aria-label="聊天快捷设置"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="conflux-quick-settings-content">
        <header className="conflux-quick-settings-header">
          <div>
            <span className="conflux-quick-settings-eyebrow">CHAT / CONFLUX</span>
            <h2>快捷设置</h2>
            <p>当前对话 · 常用操作与设置</p>
          </div>
          <button type="button" className="conflux-quick-settings-close" onClick={onClose} aria-label="关闭快捷设置">
            <Icon name="x" size={20} />
          </button>
        </header>

        <div className="conflux-quick-settings-scroll">
          <section className="conflux-quick-settings-section" aria-labelledby="quick-api-heading">
            <h3 id="quick-api-heading">API · 模型</h3>
            <div className="conflux-quick-settings-provider">
              <div className="conflux-quick-settings-provider-heading">
                <span className="conflux-quick-settings-provider-mark"><Icon name="providerRoute" size={18} /></span>
                <div>
                  <strong>{binding?.status === 'unconfigured'
                    ? '当前 AI 尚未配置模型线路'
                    : binding?.status === 'missing-provider'
                      ? '当前 AI 原绑定线路已失效'
                      : binding?.api.name || '尚未选择 AI'}</strong>
                  <small>{binding?.status === 'ready'
                    ? binding.modelId || '尚未选择模型'
                    : '绑定有效线路后才能发送消息'}</small>
                </div>
              </div>
              <label className="conflux-quick-settings-provider-label" htmlFor="conflux-quick-provider-select">当前 AI · 模型线路</label>
              <select
                id="conflux-quick-provider-select"
                value={routeValue}
                onChange={(event) => onSetPersonaProvider(event.target.value)}
                disabled={!currentPersona}
              >
                <option value="__unconfigured__">未配置（暂不能聊天）</option>
                <option value="">跟随全局（需手动选择）</option>
                {binding?.fixedProviderId && !binding.fixedProvider
                  ? <option value={binding.fixedProviderId} disabled>已失效的线路</option>
                  : null}
                {provider.providers.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {getProviderModelDisplayLabel(item)}</option>
                ))}
              </select>
              <p>只为当前 AI 选择线路；不会修改其他联系人的模型绑定。</p>
            </div>
            <QuickAction icon="settings" label="管理 API 接口" detail="密钥、地址、协议和模型" onClick={() => closeAndRun(onOpenApi)} />
          </section>

          <section className="conflux-quick-settings-section" aria-labelledby="quick-chat-heading">
            <h3 id="quick-chat-heading">对话操作</h3>
            <QuickAction icon="plus" label="新建对话" onClick={() => closeAndRun(onNewConversation)} />
            {onOpenPersona ? (
              <QuickAction icon="persona" label="当前 AI 角色设置" onClick={() => closeAndRun(onOpenPersona)} />
            ) : null}
            <QuickAction icon="code" label="代码卡片" onClick={() => closeAndRun(onOpenCodeCards)} />
          </section>

          <section className="conflux-quick-settings-section" aria-labelledby="quick-system-heading">
            <h3 id="quick-system-heading">常用设置</h3>
            <QuickAction icon="layers" label="Token 用量" onClick={() => openMenuPage('usage')} />
            <QuickAction icon="brush" label="外观与主题" onClick={() => openMenuPage('display')} />
            <QuickAction icon="voice" label="语音设置" onClick={() => openMenuPage('voice')} />
            <QuickAction icon="download" label="数据备份" onClick={() => openMenuPage('backup')} />
            <QuickAction icon="wand" label="工具箱" onClick={() => openMenuPage('toolbox')} />
            <QuickAction icon="mcpServer" label="MCP 工具" onClick={() => openMenuPage('mcp')} />
          </section>
        </div>

        <footer className="conflux-quick-settings-footer">
          <button type="button" onClick={() => openMenuPage('root')}>
            <Icon name="settings" size={18} />
            <span>全部设置</span>
            <Icon name="chevron" size={16} />
          </button>
        </footer>
      </div>
    </dialog>
  );
}
