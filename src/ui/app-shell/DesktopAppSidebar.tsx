import { Fragment, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { CollectionShelf, Persona, World } from '../../types/domain';
import type { ConversationCardSummary } from '../../app/collection/conversationCardSummary';
import { Icon } from '../Icon';
import { useConversationLibrarySearch } from './useConversationLibrarySearch';
import './ConfluxSidebar.css';
import { PersonaAvatar } from '../collaborator/PersonaAvatar';
import { collectionRelativeDateLabel } from '../collection/collectionUtils';
import { useI18n } from '../../i18n';
import { SidebarCalendar } from './SidebarCalendar';
import { KekeOriginalSide } from '../keke-original/KekeOriginalSide';
import { useSpaceStore } from '../../stores/spaceStore';

export type DesktopAppSidebarShelfItem = {
  shelf: CollectionShelf;
  label: string;
};

export type DesktopAppSidebarProps = {
  presentation?: 'sidebar' | 'hub' | 'profile';
  onBackToChat?: () => void;
  initialTab?: 'profile' | 'library';
  activeWorld: World;
  activeConversationId: string | null;
  collectionShelf: CollectionShelf;
  collaboratorScopeId: string | null;
  currentCollaborator: Persona | null;
  chatCollaborator: Persona | null;
  collaborators: Persona[];
  conversations: ConversationCardSummary[];
  shelfItems: DesktopAppSidebarShelfItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenHome?: () => void;
  onSelectCollaborator: (collaboratorId: string | null) => void;
  onCreateCustomCollaborator: () => void;
  onCreateCollaboratorFromBuilder: () => void;
  onEditCollaborator: (collaboratorId?: string) => void;
  onSelectShelf: (shelf: CollectionShelf) => void;
  onOpenConversation: (conversationId: string, messageId?: string) => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onToggleConversationPinned: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string, title: string) => void;
  onCreateConversation: () => void;
  onCreateConversationForCollaborator?: (collaboratorId: string) => void;
  onOpenGroupWorld: () => void;
  onOpenSettings: () => void;
  onOpenApi?: () => void;
};

function sortSidebarConversations(conversations: ConversationCardSummary[]) {
  return [...conversations].sort((left, right) => {
    if (left.pinnedAt && right.pinnedAt) return right.pinnedAt - left.pinnedAt;
    if (left.pinnedAt) return -1;
    if (right.pinnedAt) return 1;
    return right.updatedAt - left.updatedAt;
  });
}

function sortSidebarCollaborators(collaborators: Persona[]) {
  return [...collaborators].sort((left, right) => {
    if (left.pinnedAt && right.pinnedAt) return right.pinnedAt - left.pinnedAt;
    if (left.pinnedAt) return -1;
    if (right.pinnedAt) return 1;
    return left.name.localeCompare(right.name, 'zh-Hans-CN');
  });
}

export function DesktopAppSidebar({
  presentation = 'sidebar',
  onBackToChat,
  initialTab = 'library',
  activeWorld,
  activeConversationId,
  collectionShelf,
  collaboratorScopeId,
  currentCollaborator,
  chatCollaborator,
  collaborators,
  conversations,
  shelfItems,
  collapsed,
  onToggleCollapsed,
  onOpenHome,
  onSelectCollaborator,
  onCreateCustomCollaborator,
  onCreateCollaboratorFromBuilder,
  onEditCollaborator,
  onSelectShelf,
  onOpenConversation,
  onRenameConversation,
  onToggleConversationPinned,
  onDeleteConversation,
  onCreateConversation,
  onCreateConversationForCollaborator,
  onOpenGroupWorld,
  onOpenSettings,
  onOpenApi
}: DesktopAppSidebarProps) {
  const { language, t } = useI18n();
  const kekeThemeActive = useSpaceStore((state) => state.theme.activePresetId === 'keke-doodle' || state.theme.activePresetId === 'keke-pois');
  const [sidebarTab, setSidebarTab] = useState<'profile' | 'library'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const librarySearch = useConversationLibrarySearch(conversations, sidebarTab === 'library' ? searchQuery : '');
  const [collaboratorPickerOpen, setCollaboratorPickerOpen] = useState(false);
  const [actionMenuConversationId, setActionMenuConversationId] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [conversationTitleDraft, setConversationTitleDraft] = useState('');
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextThreadClickRef = useRef(false);
  const sortedConversations = sortSidebarConversations(librarySearch.results);
  const sortedCollaborators = sortSidebarCollaborators(collaborators);
  const filteredCollaborators = sortedCollaborators.filter((collaborator) =>
    `${collaborator.name} ${collaborator.description}`.toLowerCase().includes(contactQuery.trim().toLowerCase())
  );
  const collaboratorName = currentCollaborator?.name.trim() || '尚未选择角色';
  const profileName = chatCollaborator?.name.trim() || '尚未选择聊天角色';

  useEffect(() => {
    const liveConversationIds = new Set(conversations.map((conversation) => conversation.id));
    if (actionMenuConversationId && !liveConversationIds.has(actionMenuConversationId)) {
      setActionMenuConversationId(null);
    }
    if (editingConversationId && !liveConversationIds.has(editingConversationId)) {
      setEditingConversationId(null);
      setConversationTitleDraft('');
    }
  }, [actionMenuConversationId, conversations, editingConversationId]);

  useEffect(() => () => { if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current); }, []);

  const clearLongPress = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const handleSelectCollaborator = (collaboratorId: string | null) => {
    onSelectCollaborator(collaboratorId);
    setCollaboratorPickerOpen(false);
    setActionMenuConversationId(null);
    setEditingConversationId(null);
    setConversationTitleDraft('');
  };
  const openConversationMenu = (conversationId: string) => {
    setCollaboratorPickerOpen(false);
    setActionMenuConversationId((current) => (current === conversationId ? null : conversationId));
  };
  const beginConversationRename = (conversation: ConversationCardSummary) => {
    setActionMenuConversationId(conversation.id);
    setEditingConversationId(conversation.id);
    setConversationTitleDraft(conversation.title);
  };
  const commitConversationRename = (conversationId: string) => {
    const nextTitle = conversationTitleDraft.trim();
    if (!nextTitle) return;
    onRenameConversation(conversationId, nextTitle);
    setEditingConversationId(null);
    setConversationTitleDraft('');
    setActionMenuConversationId(null);
  };
  const cancelConversationRename = () => {
    setEditingConversationId(null);
    setConversationTitleDraft('');
  };
  const handleConversationDelete = (conversation: ConversationCardSummary) => {
    onDeleteConversation(conversation.id, conversation.title);
    setActionMenuConversationId(null);
    if (editingConversationId === conversation.id) {
      setEditingConversationId(null);
      setConversationTitleDraft('');
    }
  };
  const handleThreadPointerDown = (event: PointerEvent, conversationId: string) => {
    clearLongPress();
    if (event.pointerType === 'mouse') return;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      suppressNextThreadClickRef.current = true;
      setActionMenuConversationId(conversationId);
    }, 520);
  };
  const handleThreadPointerEnd = () => {
    clearLongPress();
  };

  const rolePicker = presentation === 'hub' ? (
    <section id="conflux-role-picker" className={`conflux-sidebar-contact-list ${presentation === 'sidebar' ? 'conflux-sidebar-contact-list--sidebar' : ''}`} aria-label="AI 通讯录">
      <header><strong>所有 AI 角色 · {sortedCollaborators.length}</strong></header>
      <label className="conflux-sidebar-search"><span>搜索 AI</span><input type="search" value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="搜索角色名字或简介" /></label>
      <div className={`desktop-sidebar-collaborator-picker ${presentation === 'sidebar' ? 'conflux-sidebar-flat-contacts' : ''}`} role="list" aria-label="角色列表">
      {filteredCollaborators.map(collaborator => (
        <div key={collaborator.id} className="conflux-sidebar-contact-row" role="listitem">
        <button
          type="button"
          className={`desktop-sidebar-collaborator-option ${collaboratorScopeId === collaborator.id ? 'active' : ''}`}
          onClick={() => handleSelectCollaborator(collaborator.id)}
          aria-label={`和${collaborator.name}聊天`}
          aria-pressed={collaboratorScopeId === collaborator.id}
        >
          <PersonaAvatar
            role="assistant"
            seed={collaborator.id}
            assetId={collaborator.assistantAvatarAssetId}
            iconId={collaborator.assistantAvatarIconId}
            shape={collaborator.assistantAvatarShape}
            size={presentation === 'hub' ? 44 : 34}
          />
          <span className="desktop-sidebar-collaborator-option-copy">
            <strong>{collaborator.name}</strong>
            <small>{collaborator.description.trim() || '暂无角色简介'}</small>
          </span>
          {collaborator.pinnedAt ? <Icon name="polarisStar" size={11} /> : null}
        </button>
        {presentation === 'hub' && onCreateConversationForCollaborator ? <button type="button" className="conflux-library-role-settings" aria-label={`与${collaborator.name}新建对话`} title="新建对话" onClick={() => onCreateConversationForCollaborator(collaborator.id)}><Icon name="plus" size={18} /></button> : null}
        <button type="button" className="conflux-library-role-settings" aria-label={`设置${collaborator.name}`} title="角色设置" onClick={() => onEditCollaborator(collaborator.id)}><Icon name="settings" size={16} /></button>
        </div>
      ))}
      {presentation === 'hub' && filteredCollaborators.length === 0 ? <p className="conflux-sidebar-status">{sortedCollaborators.length ? '没有找到匹配的 AI 角色。' : '还没有 AI 角色。点击「新建角色」开始创建。'}</p> : null}
      {presentation === 'sidebar' && sortedCollaborators.length === 0 ? <p className="conflux-sidebar-status">还没有 AI 角色，可以新建一个开始聊天。</p> : null}
      </div>
      {presentation === 'sidebar' ? <button type="button" className="conflux-sidebar-contact-reset" onClick={() => handleSelectCollaborator(null)}>查看全部对话</button> : null}
      {presentation !== 'hub' ? <details className="conflux-sidebar-contact-more"><summary>更多创建方式</summary><button type="button" onClick={onCreateCollaboratorFromBuilder}>人设生成器</button></details> : null}
    </section>
  ) : null;

  return (
    <aside className={`desktop-app-sidebar ${collapsed ? 'collapsed' : ''} ${presentation === 'hub' ? 'conflux-conversation-hub' : ''} ${kekeThemeActive && presentation !== 'hub' ? 'keke-themed' : ''}`} aria-label={presentation === 'hub' ? '对话与 AI 通讯录' : presentation === 'profile' ? '当前 AI 资料' : t('desktop.navLabel')}>
      {presentation === 'hub' ? (
        <>
          <header className="conflux-hub-heading">
            <div className="conflux-hub-title">
              <button type="button" className="conflux-hub-back" onClick={onBackToChat} aria-label="返回" title="返回">
                <Icon name="chevron" size={19} />
              </button>
              <div>
                <span>CONFLUX / CHAT</span>
                <h1>AI 通讯录</h1>
              </div>
            </div>
            <button type="button" className="conflux-hub-new-role" onClick={onCreateCollaboratorFromBuilder} aria-label="新建 AI 角色" title="新建 AI 角色"><Icon name="plus" size={19} /><span>新建角色</span></button>
          </header>
        </>
      ) : null}
      {presentation === 'sidebar' ? <div className="desktop-app-sidebar-topline">
        <button
          type="button"
          className="desktop-sidebar-collapse-toggle"
          onClick={() => {
            setCollaboratorPickerOpen(false);
            onToggleCollapsed();
          }}
          aria-label={collapsed ? t('desktop.expandSidebar') : t('desktop.collapseSidebar')}
          title={collapsed ? t('desktop.expandSidebarTitle') : t('desktop.collapseSidebarTitle')}
          aria-pressed={collapsed}
        >
          <Icon name="sidebar" size={17} />
        </button>
        {onOpenHome ? (
          <button
            type="button"
            className="desktop-sidebar-collapse-toggle"
            onClick={onOpenHome}
            aria-label="回到 Conflux 首页"
            title="返回首页"
          >
            <Icon name="navWorkspace" size={17} />
          </button>
        ) : null}
      </div> : null}

      {presentation === 'sidebar' ? <div className="conflux-sidebar-tabs" role="tablist" aria-label="侧栏内容">
        <button type="button" id="conflux-profile-tab" role="tab" aria-selected={sidebarTab === 'profile'} aria-controls="conflux-profile-panel" onClick={() => setSidebarTab('profile')}>个人资料</button>
        <button type="button" id="conflux-library-tab" role="tab" aria-selected={sidebarTab === 'library'} aria-controls="conflux-library-panel" onClick={() => setSidebarTab('library')}>对话库</button>
        {kekeThemeActive ? <button type="button" className="keke-tabs-gear" onClick={onOpenSettings} aria-label="设置" title="设置">☼</button> : null}
      </div> : null}
      {(presentation === 'profile' || (presentation === 'sidebar' && sidebarTab === 'profile')) ? (
        <section
          id="conflux-profile-panel"
          role="tabpanel"
          aria-label={presentation === 'profile' ? '当前 AI 资料与日历' : undefined}
          aria-labelledby={presentation === 'sidebar' ? 'conflux-profile-tab' : undefined}
          className={`conflux-sidebar-panel conflux-sidebar-profile${kekeThemeActive ? ' keke-sidebar-profile' : ''}`}
        >
          {kekeThemeActive ? <KekeOriginalSide persona={chatCollaborator} conversationCount={conversations.length} onEdit={() => chatCollaborator && onEditCollaborator(chatCollaborator.id)} /> : <>
          <div className="conflux-profile-heading">
            {chatCollaborator ? (
              <PersonaAvatar
                role="assistant"
                seed={chatCollaborator.id}
                assetId={chatCollaborator.assistantAvatarAssetId}
                iconId={chatCollaborator.assistantAvatarIconId}
                shape={chatCollaborator.assistantAvatarShape}
                size={44}
              />
            ) : <Icon name="persona" size={28} />}
            <div>
              <h2>{profileName}</h2>
              <p>{chatCollaborator?.description.trim() || '从对话库的通讯录里选择一个聊天角色。'}</p>
            </div>
            <button
              type="button"
              className="conflux-profile-edit"
              onClick={() => chatCollaborator && onEditCollaborator(chatCollaborator.id)}
              disabled={!chatCollaborator}
              aria-label="角色设置"
              title="编辑当前聊天角色"
            >
              <Icon name="settings" size={17} />
              <span>角色设置</span>
            </button>
          </div>
          <SidebarCalendar />
          </>}
        </section>
      ) : null}

      {(presentation === 'hub' || (presentation === 'sidebar' && sidebarTab === 'library')) ? (
      <section id="conflux-library-panel" role={presentation === 'hub' ? 'region' : 'tabpanel'} aria-label={presentation === 'hub' ? 'AI 通讯录' : undefined} aria-labelledby={presentation === 'hub' ? undefined : 'conflux-library-tab'} className="desktop-sidebar-section desktop-sidebar-threads conflux-sidebar-panel">
        {presentation !== 'hub' && !collaboratorPickerOpen ? <>
        <div className="conflux-library-role">
          <button type="button" className="conflux-library-role-select" onClick={() => setSidebarTab('profile')} title="查看聊天角色资料">
            {currentCollaborator ? <PersonaAvatar role="assistant" seed={currentCollaborator.id} assetId={currentCollaborator.assistantAvatarAssetId} iconId={currentCollaborator.assistantAvatarIconId} shape={currentCollaborator.assistantAvatarShape} size={32} /> : <Icon name="persona" size={24} />}
            <span>{currentCollaborator ? collaboratorName : '全部角色'}</span>
          </button>
          <button type="button" className="conflux-library-role-settings" onClick={collaborators.length ? onCreateConversation : onCreateCustomCollaborator} aria-label={collaborators.length ? '新建对话' : '新建 AI 角色'} title={collaborators.length ? '新建对话' : '新建 AI 角色'}><Icon name="plus" size={18} /></button>
          <button type="button" className="conflux-library-role-settings" onClick={() => onEditCollaborator()} disabled={!currentCollaborator} aria-label={`设置${collaboratorName}`} title="角色设置"><Icon name="settings" size={18} /></button>
        </div>
        </> : null}
        {rolePicker}
        {presentation !== 'hub' && !collaboratorPickerOpen ? <>
        {presentation !== 'hub' && collapsed ? <button type="button" className="conflux-sidebar-create" onClick={collaborators.length ? onCreateConversation : onCreateCustomCollaborator}>
          {collaborators.length ? '新建对话' : '创建角色并开始聊天'}
        </button> : null}
        <label className="conflux-sidebar-search">
          <span>搜索聊天记录</span>
          <input type="search" placeholder="搜索对话标题、聊天内容" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
        </label>
        {librarySearch.busy ? <p className="conflux-sidebar-status" role="status">正在搜索聊天记录…</p> : null}
        {librarySearch.failedCount ? <p className="conflux-sidebar-status" role="status">{librarySearch.failedCount} 个对话未能读取，结果可能不完整。<button type="button" onClick={librarySearch.retry}>重试</button></p> : null}
        <div className="desktop-sidebar-thread-list">
          {sortedConversations.length > 0 ? (
            sortedConversations.map((conversation, index) => {
              const owner = collaborators.find((collaborator) => collaborator.id === conversation.collaboratorId) ?? null;
              const active = conversation.id === activeConversationId;
              const menuOpen = actionMenuConversationId === conversation.id;
              const editing = editingConversationId === conversation.id;
              const startsGroup = index === 0 || (!searchQuery.trim() && Boolean(conversation.pinnedAt) !== Boolean(sortedConversations[index - 1].pinnedAt));
              return (
                <Fragment key={conversation.id}>
                  {startsGroup ? <h3 className="desktop-sidebar-section-label">{searchQuery.trim() ? '搜索结果' : conversation.pinnedAt ? '置顶对话' : '对话列表'}</h3> : null}
                <div
                  className={`desktop-sidebar-thread-row ${active ? 'active' : ''} ${conversation.pinnedAt ? 'pinned' : ''} ${menuOpen ? 'menu-open' : ''} ${editing ? 'editing' : ''}`}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setActionMenuConversationId(conversation.id);
                  }}
                >
                  {editing ? (
                    <div className="desktop-sidebar-thread-edit">
                      <input
                        value={conversationTitleDraft}
                        onChange={(event) => setConversationTitleDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            commitConversationRename(conversation.id);
                          } else if (event.key === 'Escape') {
                            cancelConversationRename();
                          }
                        }}
                        aria-label={t('desktop.renameConversation')}
                        autoFocus
                      />
                      <div className="desktop-sidebar-thread-edit-actions">
                        <button
                          type="button"
                          className="desktop-sidebar-thread-menu-item"
                          onClick={() => commitConversationRename(conversation.id)}
                        >
                          {t('desktop.saveConversationName')}
                        </button>
                        <button
                          type="button"
                          className="desktop-sidebar-thread-menu-item"
                          onClick={cancelConversationRename}
                        >
                          {t('desktop.cancelConversationName')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="desktop-sidebar-thread-body">
                      <button
                        type="button"
                        className="desktop-sidebar-thread"
                        onPointerDown={(event) => handleThreadPointerDown(event, conversation.id)}
                        onPointerMove={handleThreadPointerEnd}
                        onPointerUp={handleThreadPointerEnd}
                        onPointerCancel={handleThreadPointerEnd}
                        onClick={() => {
                          if (suppressNextThreadClickRef.current) {
                            suppressNextThreadClickRef.current = false;
                            return;
                          }
                          onOpenConversation(conversation.id);
                        }}
                      >
                        {presentation === 'hub' ? <>
                          <span className="conflux-hub-thread-avatar">{owner ? <PersonaAvatar role="assistant" seed={owner.id} assetId={owner.assistantAvatarAssetId} iconId={owner.assistantAvatarIconId} shape={owner.assistantAvatarShape} size={42} /> : <Icon name="persona" size={24} />}</span>
                          <span className="conflux-hub-thread-copy">
                            <strong>{owner?.name || '未归属历史'}</strong>
                            <span className="conflux-hub-thread-preview">{conversation.displayTitle === '新对话' ? conversation.latestExcerpt : `${conversation.displayTitle} · ${conversation.latestExcerpt}`}</span>
                          </span>
                          <span className="conflux-hub-thread-time">{collectionRelativeDateLabel(conversation.updatedAt, language)}</span>
                        </> : <>
                          <span className="desktop-sidebar-thread-title">
                            {conversation.pinnedAt ? <Icon name="polarisStar" size={10} /> : null}
                            <span>{conversation.displayTitle}</span>
                          </span>
                          <span className="desktop-sidebar-thread-meta">
                            {conversation.activeProjectTitle ? (
                              <>
                                <span className="desktop-sidebar-thread-project">{conversation.activeProjectTitle}</span>
                                <span aria-hidden="true"> · </span>
                              </>
                            ) : null}
                            {collectionRelativeDateLabel(conversation.updatedAt, language)}
                          </span>
                        </>}
                      </button>
                      <button
                        type="button"
                        className="desktop-sidebar-thread-more"
                        onClick={(event) => {
                          event.stopPropagation();
                          openConversationMenu(conversation.id);
                        }}
                        aria-label={t('desktop.conversationActions', { title: conversation.displayTitle })}
                        title={t('desktop.conversationActionsTitle')}
                        aria-expanded={menuOpen}
                      >
                        <Icon name="more" size={15} />
                      </button>
                    </div>
                  )}
                  {conversation.searchMatches?.matches[0] ? (
                    <button type="button" className="conflux-sidebar-hit" onClick={() => onOpenConversation(conversation.id, conversation.searchMatches!.matches[0].messageId)}>
                      <span>{conversation.searchMatches.total} 条内容匹配</span>{conversation.searchMatches.matches[0].excerpt}
                    </button>
                  ) : null}
                  {menuOpen && !editing ? (
                    <div className="desktop-sidebar-thread-menu">
                      <button
                        type="button"
                        className="desktop-sidebar-thread-menu-item"
                        onClick={() => {
                          onToggleConversationPinned(conversation.id);
                          setActionMenuConversationId(null);
                        }}
                      >
                        <Icon name="pin" size={13} />
                        <span>{conversation.pinnedAt ? t('desktop.unpinConversation') : t('desktop.pinConversation')}</span>
                      </button>
                      <button
                        type="button"
                        className="desktop-sidebar-thread-menu-item"
                        onClick={() => beginConversationRename(conversation)}
                      >
                        <Icon name="edit" size={13} />
                        <span>{t('desktop.renameConversation')}</span>
                      </button>
                      <button
                        type="button"
                        className="desktop-sidebar-thread-menu-item danger"
                        onClick={() => handleConversationDelete(conversation)}
                      >
                        <Icon name="x" size={13} />
                        <span>{t('desktop.deleteConversation')}</span>
                      </button>
                    </div>
                  ) : null}
                </div>
                </Fragment>
              );
            })
          ) : (
            <div className="conflux-hub-empty">
              <p className="desktop-sidebar-thread-empty">{librarySearch.busy ? '正在读取记录' : searchQuery.trim() ? '没有找到匹配的对话' : t('desktop.noChats')}</p>
              {presentation === 'hub' && !searchQuery.trim() ? <button type="button" onClick={() => setCollaboratorPickerOpen(true)}>选择 AI 开始聊天</button> : null}
            </div>
          )}
        </div>
        </> : null}
      </section>
      ) : null}

      {presentation === 'sidebar' ? <footer className="desktop-sidebar-footer">
        <button
          type="button"
          className="desktop-sidebar-settings"
          onClick={onOpenSettings}
          aria-label={t('common.settings')}
          title={t('common.settings')}
        >
          <Icon name="settings" size={17} />
          <span>{t('common.settings')}</span>
        </button>

      </footer> : null}
    </aside>
  );
}
