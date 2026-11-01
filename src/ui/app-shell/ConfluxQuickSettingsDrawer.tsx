import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ApiOverlayProps, MenuOverlayPage } from '../../app/shell/appShellContracts';
import type { Persona } from '../../types/domain';
import type { PersonaUpdatePatch } from '../../app/persona/personaUpdatePatch';
import { usePersonaStore } from '../../stores/personaStore';
import { useRuntimeStore } from '../../stores/runtimeStore';
import { Icon, type IconName } from '../Icon';
import './ConfluxQuickSettingsDrawer.css';

const PromptSettingsTab = lazy(() => import('../shell/persona/settings/PromptSettingsTab').then((module) => ({ default: module.PromptSettingsTab })));
const MemorySettingsTab = lazy(() => import('../shell/persona/settings/MemorySettingsTab').then((module) => ({ default: module.MemorySettingsTab })));
const RoomSettingsTab = lazy(() => import('../shell/persona/settings/RoomSettingsTab').then((module) => ({ default: module.RoomSettingsTab })));
const PersonaApiConnectionPanel = lazy(() => import('../shell/persona/settings/PersonaApiConnectionPanel').then((module) => ({ default: module.PersonaApiConnectionPanel })));
const PersonaMcpSettingsPage = lazy(() => import('../shell/persona/settings/PersonaMcpSettingsPage').then((module) => ({ default: module.PersonaMcpSettingsPage })));
const EngineSettingsTab = lazy(() => import('../shell/persona/settings/EngineSettingsTab').then((module) => ({ default: module.EngineSettingsTab })));
const CustomRequestSettingsTab = lazy(() => import('../shell/persona/settings/CustomRequestSettingsTab').then((module) => ({ default: module.CustomRequestSettingsTab })));

type RoomSettingsPage = 'basic' | 'prompt' | 'model' | 'memory' | 'tools' | 'appearance';

const ROOM_PAGES: Array<{ id: RoomSettingsPage; label: string; icon: IconName }> = [
  { id: 'basic', label: '基本信息', icon: 'persona' },
  { id: 'prompt', label: '提示词', icon: 'promptScript' },
  { id: 'model', label: '模型', icon: 'providerRoute' },
  { id: 'memory', label: '记忆', icon: 'memoryShelf' },
  { id: 'tools', label: '工具', icon: 'mcpServer' },
  { id: 'appearance', label: '房间外观', icon: 'brush' }
];

type QuickSettingsProps = {
  open: boolean;
  onClose: () => void;
  provider: Pick<ApiOverlayProps, 'providers' | 'activeProviderId' | 'api' | 'onSetActiveProvider'>;
  onOpenApi: () => void;
  onOpenMenu: (page: MenuOverlayPage) => void;
  currentPersona: Persona | null;
};

/** An editor for the active AI room. Uses the existing persona store and settings components. */
export function ConfluxQuickSettingsDrawer({
  open,
  onClose,
  provider,
  onOpenApi,
  onOpenMenu,
  currentPersona
}: QuickSettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activePage, setActivePage] = useState<RoomSettingsPage>('basic');
  const mcpServers = useRuntimeStore((state) => state.mcpServers);
  const mcpToolTimeoutSeconds = useRuntimeStore((state) => state.mcpToolTimeoutSeconds);
  const createMcpServer = useRuntimeStore((state) => state.createMcpServer);
  const updateMcpServer = useRuntimeStore((state) => state.updateMcpServer);
  const updateProvider = useRuntimeStore((state) => state.updateProvider);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    setActivePage('basic');
  }, [currentPersona?.id]);

  const closeAndRun = (action: () => void) => {
    dialogRef.current?.close();
    onClose();
    action();
  };

  const updatePersona = (patch: PersonaUpdatePatch) => {
    if (!currentPersona) return;
    usePersonaStore.getState().updateCollaborator(currentPersona.id, patch);
  };

  const personaProps = {
    activeCollaboratorId: currentPersona?.id ?? null,
    activePersona: currentPersona,
    providers: provider.providers,
    activeProviderId: provider.activeProviderId,
    onUpdatePersona: updatePersona
  };

  return (
    <dialog
      ref={dialogRef}
      className="conflux-quick-settings-drawer conflux-room-settings-drawer"
      aria-label="当前 AI 房间设置"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="conflux-quick-settings-content">
        <header className="conflux-quick-settings-header">
          <div>
            <span className="conflux-quick-settings-eyebrow">CONFLUX / ROOM</span>
            <h2>房间设置</h2>
            <p>{currentPersona?.name.trim() || '尚未选择 AI'} · 修改自动保存</p>
          </div>
          <button type="button" className="conflux-quick-settings-close" onClick={onClose} aria-label="关闭房间设置">
            <Icon name="x" size={20} />
          </button>
        </header>

        {currentPersona ? (
          <>
            <nav className="conflux-room-settings-nav" aria-label="房间设置分类">
              {ROOM_PAGES.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={activePage === page.id ? 'active' : ''}
                  aria-current={activePage === page.id ? 'page' : undefined}
                  onClick={() => setActivePage(page.id)}
                >
                  <Icon name={page.icon} size={16} />
                  <span>{page.label}</span>
                </button>
              ))}
            </nav>
            <div className="conflux-quick-settings-scroll conflux-room-settings-scroll" key={currentPersona.id + ':' + activePage}>
              <Suspense fallback={<p className="conflux-room-settings-note">正在打开设置…</p>}>
              {activePage === 'basic' ? (
                <section className="conflux-room-settings-fields" aria-label="房间基本信息">
                  <label className="ps-field">
                    <span className="ps-field-label">AI 名称</span>
                    <input className="ps-input" value={currentPersona.name} onChange={(e) => updatePersona({ name: e.target.value })} />
                  </label>
                  <label className="ps-field">
                    <span className="ps-field-label">简介</span>
                    <input className="ps-input" value={currentPersona.description} onChange={(e) => updatePersona({ description: e.target.value })} />
                  </label>
                  <label className="ps-field">
                    <span className="ps-field-label">AI 对你的称呼</span>
                    <input className="ps-input" value={currentPersona.userName || ''} onChange={(e) => updatePersona({ userName: e.target.value })} placeholder="可以随时修改" />
                  </label>
                  <label className="ps-field">
                    <span className="ps-field-label">相处设定</span>
                    <textarea className="ps-textarea" rows={3} value={currentPersona.purpose || ''} onChange={(e) => updatePersona({ purpose: e.target.value })} />
                  </label>
                </section>
              ) : null}

              {activePage === 'prompt' ? <PromptSettingsTab {...personaProps} expandedUsesPageScroll /> : null}

              {activePage === 'model' ? (
                <section className="conflux-room-settings-fields" aria-label="模型与 API">
                  <PersonaApiConnectionPanel {...personaProps} onOpenProviderSettings={() => closeAndRun(onOpenApi)} onUpdateProvider={updateProvider} />
                  <details className="conflux-room-settings-advanced">
                    <summary>高级模型参数</summary>
                    <EngineSettingsTab {...personaProps} />
                  </details>
                  <details className="conflux-room-settings-advanced">
                    <summary>自定义请求参数</summary>
                    <CustomRequestSettingsTab {...personaProps} />
                  </details>
                </section>
              ) : null}

              {activePage === 'memory' ? <MemorySettingsTab {...personaProps} /> : null}

              {activePage === 'tools' ? (
                <section className="conflux-room-settings-fields" aria-label="当前 AI 工具">
                  <p className="conflux-room-settings-note">在此选择当前 AI 使用的 MCP 连接。内置工具的全局注册与权限仍在应用工具箱中管理。</p>
                  <PersonaMcpSettingsPage
                    {...personaProps}
                    mcpServers={mcpServers}
                    mcpToolTimeoutSeconds={mcpToolTimeoutSeconds}
                    onCreateMcpServer={createMcpServer}
                    onUpdateMcpServer={updateMcpServer}
                  />
                </section>
              ) : null}

              {activePage === 'appearance' ? <RoomSettingsTab {...personaProps} /> : null}
              </Suspense>
            </div>
          </>
        ) : (
          <div className="conflux-quick-settings-scroll">
            <p className="conflux-room-settings-note">先进入一个 AI 房间，再编辑它的设置。</p>
          </div>
        )}
        <footer className="conflux-quick-settings-footer">
          <button type="button" onClick={() => closeAndRun(() => onOpenMenu('root'))}>
            <Icon name="settings" size={18} />
            <span>应用全局设置</span>
            <Icon name="chevron" size={16} />
          </button>
        </footer>
      </div>
    </dialog>
  );
}
