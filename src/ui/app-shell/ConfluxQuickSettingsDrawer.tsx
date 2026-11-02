import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ApiOverlayProps, MenuOverlayPage } from '../../app/shell/appShellContracts';
import type { Persona, AvatarDisplaySize, AvatarIconId, AvatarShape } from '../../types/domain';
import type { PersonaUpdatePatch } from '../../app/persona/personaUpdatePatch';
import { createStoredAttachment } from '../../infrastructure/assetStore';
import { usePersonaStore } from '../../stores/personaStore';
import { useRuntimeStore } from '../../stores/runtimeStore';
import { Icon, type IconName } from '../Icon';
import './ConfluxQuickSettingsDrawer.css';

const BasicSettingsTab = lazy(() => import('../shell/persona/settings/BasicSettingsTab').then((module) => ({ default: module.BasicSettingsTab })));
const PromptSettingsTab = lazy(() => import('../shell/persona/settings/PromptSettingsTab').then((module) => ({ default: module.PromptSettingsTab })));
const MemorySettingsTab = lazy(() => import('../shell/persona/settings/MemorySettingsTab').then((module) => ({ default: module.MemorySettingsTab })));
const RoomSettingsTab = lazy(() => import('../shell/persona/settings/RoomSettingsTab').then((module) => ({ default: module.RoomSettingsTab })));
const PersonaApiConnectionPanel = lazy(() => import('../shell/persona/settings/PersonaApiConnectionPanel').then((module) => ({ default: module.PersonaApiConnectionPanel })));
const PersonaMcpSettingsPage = lazy(() => import('../shell/persona/settings/PersonaMcpSettingsPage').then((module) => ({ default: module.PersonaMcpSettingsPage })));
const EngineSettingsTab = lazy(() => import('../shell/persona/settings/EngineSettingsTab').then((module) => ({ default: module.EngineSettingsTab })));
const CustomRequestSettingsTab = lazy(() => import('../shell/persona/settings/CustomRequestSettingsTab').then((module) => ({ default: module.CustomRequestSettingsTab })));

type RoomPage = 'identity' | 'prompt' | 'route' | 'engine' | 'custom' | 'mcp' | 'memory' | 'appearance';
const ROOM_PAGES: Array<{ id: RoomPage; label: string; description: string; icon: IconName }> = [
  { id: 'identity', label: '角色资料', description: '名称、称呼、头像、相处设定和角色管理', icon: 'persona' },
  { id: 'prompt', label: '提示词设置', description: '主提示词、槽位、消息、调性与世界书', icon: 'promptScript' },
  { id: 'route', label: 'API 与模型线路', description: '为当前角色独立指定连接与模型', icon: 'providerRoute' },
  { id: 'engine', label: '生成参数', description: '温度、上下文、思考强度和流式输出', icon: 'orbit' },
  { id: 'custom', label: '自定义请求', description: '请求头与请求体', icon: 'code' },
  { id: 'mcp', label: 'MCP 与工具', description: '当前角色的 MCP 服务器选择', icon: 'mcpServer' },
  { id: 'memory', label: '角色记忆', description: '记忆条目、资料文档、对话总结和索引', icon: 'memoryShelf' },
  { id: 'appearance', label: '房间外观', description: '背景、贴纸、头像、主题和自定义 CSS', icon: 'brush' }
];
const QUICK_LINKS: Array<{ label: string; icon: IconName; page: MenuOverlayPage }> = [
  { label: 'Token 用量', icon: 'layers', page: 'usage' },
  { label: '语音设置', icon: 'voice', page: 'voice' },
  { label: '应用外观', icon: 'brush', page: 'display' },
  { label: '数据备份', icon: 'download', page: 'backup' },
  { label: '工具箱', icon: 'wand', page: 'toolbox' },
  { label: '管理 MCP 服务', icon: 'mcpServer', page: 'mcp' }
];

type RoomSettingsProps = {
  open: boolean;
  onClose: () => void;
  provider: Pick<ApiOverlayProps, 'providers' | 'activeProviderId' | 'api' | 'onSetActiveProvider'>;
  onOpenApi: () => void;
  onOpenMenu: (page: MenuOverlayPage) => void;
  onDeleteCollaborator: (id: string) => void;
  currentPersona: Persona | null;
};

export function ConfluxQuickSettingsDrawer({
  open, onClose, provider, onOpenApi, onOpenMenu, onDeleteCollaborator, currentPersona
}: RoomSettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState<RoomPage | null>(null);
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

  useEffect(() => { setActivePage(null); }, [currentPersona?.id]);
  const navigate = (page: RoomPage | null) => {
    setActivePage(page);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const closeAndRun = (action: () => void) => {
    dialogRef.current?.close();
    onClose();
    action();
  };
  const updatePersona = (patch: PersonaUpdatePatch) => {
    if (!currentPersona) return;
    usePersonaStore.getState().updateCollaborator(currentPersona.id, patch);
  };
  const selectAvatar = async (role: 'assistant' | 'user', files: FileList | File[]) => {
    if (!currentPersona) return;
    const [file] = Array.from(files);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('请选择图片文件。');
      return;
    }
    try {
      const attachment = await createStoredAttachment({
        kind: 'image', name: file.name, mimeType: file.type || 'image/*', blob: file
      });
      usePersonaStore.getState().updateCollaborator(currentPersona.id, role === 'assistant'
        ? { assistantAvatarAssetId: attachment.assetId, assistantAvatarIconId: null }
        : { userAvatarAssetId: attachment.assetId, userAvatarIconId: null });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '头像保存失败');
    }
  };
  const setAvatarIcon = (role: 'assistant' | 'user', iconId: AvatarIconId | null) =>
    updatePersona(role === 'assistant' ? { assistantAvatarIconId: iconId } : { userAvatarIconId: iconId });
  const setAvatarShape = (role: 'assistant' | 'user', shape: AvatarShape) =>
    updatePersona(role === 'assistant' ? { assistantAvatarShape: shape } : { userAvatarShape: shape });
  const setAvatarSize = (role: 'assistant' | 'user', size: AvatarDisplaySize) =>
    updatePersona(role === 'assistant' ? { assistantAvatarSize: size } : { userAvatarSize: size });
  const deletePersona = () => {
    if (!currentPersona) return;
    const id = currentPersona.id;
    onDeleteCollaborator(id);
    if (!usePersonaStore.getState().personas.some((item) => item.id === id)) onClose();
  };
  const personaProps = {
    activeCollaboratorId: currentPersona?.id ?? null,
    activePersona: currentPersona,
    providers: provider.providers,
    activeProviderId: provider.activeProviderId,
    onUpdatePersona: updatePersona,
    onSelectPersonaAvatar: selectAvatar,
    onSetPersonaAvatarIcon: setAvatarIcon,
    onSetPersonaAvatarShape: setAvatarShape,
    onSetPersonaAvatarSize: setAvatarSize
  };
  const currentPageMeta = ROOM_PAGES.find((page) => page.id === activePage);

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
            <span className="conflux-quick-settings-eyebrow">ROOM / CONFLUX</span>
            <h2>{currentPersona?.name.trim() || '当前 AI'} · 房间设置</h2>
            <p>当前房间的设置 · 修改自动保存</p>
          </div>
          <button type="button" className="conflux-quick-settings-close" onClick={onClose} aria-label="关闭房间设置">
            <Icon name="x" size={20} />
          </button>
        </header>
        <div className="conflux-quick-settings-scroll conflux-room-settings-scroll" ref={scrollRef}>
          {!currentPersona ? (
            <p className="conflux-room-settings-note">请先选择一个 AI 房间。</p>
          ) : activePage === null ? (
            <>
              <div className="conflux-room-settings-section-label">当前 AI · 房间设置</div>
              <nav className="conflux-room-settings-nav" aria-label="房间设置分类">
                {ROOM_PAGES.map((page) => (
                  <button key={page.id} type="button" onClick={() => navigate(page.id)}>
                    <span className="conflux-room-settings-entry-icon"><Icon name={page.icon} size={18} /></span>
                    <span className="conflux-room-settings-entry-copy"><strong>{page.label}</strong><small>{page.description}</small></span>
                    <Icon name="chevron" size={17} />
                  </button>
                ))}
              </nav>
              <div className="conflux-room-settings-section-label">其他常用设置</div>
              <nav className="conflux-room-settings-nav conflux-room-settings-nav--common" aria-label="常用应用设置">
                {QUICK_LINKS.map((link) => (
                  <button key={link.page} type="button" onClick={() => closeAndRun(() => onOpenMenu(link.page))}>
                    <span className="conflux-room-settings-entry-icon"><Icon name={link.icon} size={18} /></span>
                    <span className="conflux-room-settings-entry-copy"><strong>{link.label}</strong></span>
                    <Icon name="chevron" size={17} />
                  </button>
                ))}
                <button type="button" onClick={() => closeAndRun(onOpenApi)}>
                  <span className="conflux-room-settings-entry-icon"><Icon name="providerRoute" size={18} /></span>
                  <span className="conflux-room-settings-entry-copy"><strong>管理 API 连接</strong></span>
                  <Icon name="chevron" size={17} />
                </button>
                <button type="button" onClick={() => closeAndRun(() => onOpenMenu('root'))}>
                  <span className="conflux-room-settings-entry-icon"><Icon name="settings" size={18} /></span>
                  <span className="conflux-room-settings-entry-copy"><strong>全部应用设置</strong></span>
                  <Icon name="chevron" size={17} />
                </button>
              </nav>
            </>
          ) : (
            <>
              <button type="button" className="conflux-room-settings-back" onClick={() => navigate(null)}>
                <Icon name="chevron" size={17} /> 返回房间设置
              </button>
              <h3 className="conflux-room-settings-detail-title">{currentPageMeta?.label}</h3>
              <div className="conflux-room-settings-detail" key={currentPersona.id + ':' + activePage}>
                <Suspense fallback={<p className="conflux-room-settings-note">正在加载设置…</p>}>
                  {activePage === 'identity' ? (
                    <BasicSettingsTab
                      {...personaProps}
                      showPromptSettings={false}
                      onDeletePersona={deletePersona}
                    />
                  ) : null}
                  {activePage === 'prompt' ? <PromptSettingsTab {...personaProps} expandedUsesPageScroll /> : null}
                  {activePage === 'route' ? (
                    <PersonaApiConnectionPanel {...personaProps}
                      onOpenProviderSettings={() => closeAndRun(onOpenApi)}
                      onUpdateProvider={updateProvider} />
                  ) : null}
                  {activePage === 'engine' ? <EngineSettingsTab {...personaProps} /> : null}
                  {activePage === 'custom' ? <CustomRequestSettingsTab {...personaProps} /> : null}
                  {activePage === 'mcp' ? (
                    <PersonaMcpSettingsPage
                      {...personaProps}
                      mcpServers={mcpServers}
                      mcpToolTimeoutSeconds={mcpToolTimeoutSeconds}
                      onCreateMcpServer={createMcpServer}
                      onUpdateMcpServer={updateMcpServer}
                    />
                  ) : null}
                  {activePage === 'memory' ? <MemorySettingsTab {...personaProps} /> : null}
                  {activePage === 'appearance' ? <RoomSettingsTab {...personaProps} /> : null}
                </Suspense>
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
