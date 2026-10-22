import { Fragment, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { CollectionShelf, Persona, World } from '../../types/domain';
import type { ConversationCardSummary } from '../../app/collection/conversationCardSummary';
import { Icon } from '../Icon';
import { useConversationLibrarySearch } from './useConversationLibrarySearch';
import './ConfluxSidebar.css';
import { PersonaAvatar } from '../collaborator/PersonaAvatar';
import { collectionRelativeDateLabel } from '../collection/collectionUtils';
import { useI18n } from '../../i18n';
import { CollaboratorCreatePicker } from '../worlds/chat/collaborator/CollaboratorCreatePicker';

export type DesktopAppSidebarShelfItem = {
  shelf: CollectionShelf;
  label: string;
};

export type DesktopAppSidebarProps = {
  activeWorld: World;
  activeConversationId: string | null;
  collectionShelf: CollectionShelf;
  collaboratorScopeId: string | null;
  currentCollaborator: Persona | null;
  collaborators: Persona[];
  conversations: ConversationCardSummary[];
  shelfItems: DesktopAppSidebarShelfItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenHome?: () => void;
  onSelectCollaborator: (collaboratorId: string | null) => void;
  onCreateCollaboratorFromBuilder: () => void;
  onCreateCustomCollaborator: () => void;
  onSelectShelf: (shelf: CollectionShelf) => void;
  onOpenConversation: (conversationId: string, messageId?: string) => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onToggleConversationPinned: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string, title: string) => void;
  onCreateConversation: () => void;
  onOpenGroupWorld: () => void;
  onOpenSettings: () => void;
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
  activeWorld,
  activeConversationId,
  collectionShelf,
  collaboratorScopeId,
  currentCollaborator,
  collaborators,
  conversations,
  shelfItems,
  collapsed,
  onToggleCollapsed,
  onOpenHome,
  onSelectCollaborator,
  onCreateCollaboratorFromBuilder,
  onCreateCustomCollaborator,
  onSelectShelf,
  onOpenConversation,
  onRenameConversation,
  onToggleConversationPinned,
  onDeleteConversation,
  onCreateConversation,
  onOpenGroupWorld,
  onOpenSettings
}: DesktopAppSidebarProps) {
  const { language, t } = useI18n();
  const [sidebarTab, setSidebarTab] = useState<'profile' | 'library'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const librarySearch = useConversationLibrarySearch(conversations, sidebarTab === 'library' ? searchQuery : '');
  const [collaboratorPickerOpen, setCollaboratorPickerOpen] = useState(false);
  const [collaboratorCreatePickerOpen, setCollaboratorCreatePickerOpen] = useState(false);
  const [actionMenuConversationId, setActionMenuConversationId] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [conversationTitleDraft, setConversationTitleDraft] = useState('');
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextThreadClickRef = useRef(false);
  const sortedConversations = sortSidebarConversations(librarySearch.results);
  const sortedCollaborators = sortSidebarCollaborators(collaborators);
  const hasRoomyCollaboratorPicker = sortedCollaborators.length >= 2;
  const collaboratorName = currentCollaborator?.name.trim() || (collaboratorScopeId ? t('common.collaborator') : t('common.allCollaborators'));
  const collaboratorDescription = currentCollaborator?.description.trim() || t('desktop.switchCollaboratorHint');

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
    setCollaboratorCreatePickerOpen(false);
    setActionMenuConversationId(null);
    setEditingConversationId(null);
    setConversationTitleDraft('');
  };
  const openConversationMenu = (conversationId: string) => {
    setCollaboratorPickerOpen(false);
    setCollaboratorCreatePickerOpen(false);
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

  return (
    <aside className={`desktop-app-sidebar ${collapsed ? 'collapsed' : ''}`} aria-label={t('desktop.navLabel')}>
      <div className="desktop-app-sidebar-topline">
        <button
          type="button"
          className="desktop-sidebar-collapse-toggle"
          onClick={() => {
            setCollaboratorPickerOpen(false);
            setCollaboratorCreatePickerOpen(false);
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
      </div>

      <div className="conflux-sidebar-tabs" role="tablist" aria-label="侧栏内容">
        <button type="button" id="conflux-profile-tab" role="tab" aria-selected={sidebarTab === 'profile'} aria-controls="conflux-profile-panel" onClick={() => setSidebarTab('profile')}>个人资料</button>
        <button type="button" id="conflux-library-tab" role="tab" aria-selected={sidebarTab === 'library'} aria-controls="conflux-library-panel" onClick={() => setSidebarTab('library')}>对话库</button>
      </div>
      {sidebarTab === 'profile' ? (
      <div id="conflux-profile-panel" role="tabpanel" aria-labelledby="conflux-profile-tab" className="conflux-sidebar-panel">
      <button
        type="button"
        className={`desktop-sidebar-collaborator-root ${collaboratorPickerOpen ? 'active' : ''}`}
        onClick={() => {
          if (collaboratorPickerOpen) {
            setCollaboratorCreatePickerOpen(false);
          }
          setCollaboratorPickerOpen((open) => !open);
        }}
        aria-expanded={collaboratorPickerOpen}
      >
        {currentCollaborator ? (
          <PersonaAvatar
            role="assistant"
            seed={currentCollaborator.id}
            assetId={currentCollaborator.assistantAvatarAssetId}
            shape={currentCollaborator.assistantAvatarShape}
            size={28}
          />
        ) : (
          <span className="desktop-sidebar-root-icon" aria-hidden="true">
            <Icon name="persona" size={18} />
          </span>
        )}
        <span className="desktop-sidebar-root-copy">
          <strong>{t('desktop.currentCollaborator')}</strong>
          <small>{collaboratorName}</small>
        </span>
        <Icon name="chevron" size={15} />
      </button>
      {collaboratorPickerOpen ? (
        <div
          className={`desktop-sidebar-collaborator-picker ${hasRoomyCollaboratorPicker ? 'desktop-sidebar-collaborator-picker--roomy' : ''}`}
          role="listbox"
          aria-label={t('desktop.switchCollaborator')}
        >
          <button
            type="button"
            className={`desktop-sidebar-collaborator-option ${collaboratorScopeId === null ? 'active' : ''}`}
            onClick={() => handleSelectCollaborator(null)}
            role="option"
            aria-selected={collaboratorScopeId === null}
          >
            <span className="desktop-sidebar-root-icon" aria-hidden="true">
              <Icon name="persona" size={16} />
            </span>
            <span className="desktop-sidebar-collaborator-option-copy">
              <strong>{t('common.allCollaborators')}</strong>
              <small>{t('desktop.allRooms')}</small>
            </span>
          </button>
          {sortedCollaborators.map((collaborator) => (
            <button
              key={collaborator.id}
              type="button"
              className={`desktop-sidebar-collaborator-option ${collaboratorScopeId === collaborator.id ? 'active' : ''}`}
              onClick={() => handleSelectCollaborator(collaborator.id)}
              role="option"
              aria-selected={collaboratorScopeId === collaborator.id}
            >
              <PersonaAvatar
                role="assistant"
                seed={collaborator.id}
                assetId={collaborator.assistantAvatarAssetId}
                shape={collaborator.assistantAvatarShape}
                size={26}
              />
              <span className="desktop-sidebar-collaborator-option-copy">
                <strong>{collaborator.name}</strong>
                <small>{collaborator.description.trim() || t('desktop.noCollaboratorImpression')}</small>
              </span>
              {collaborator.pinnedAt ? <Icon name="polarisStar" size={11} /> : null}
            </button>
          ))}
          <button
            type="button"
            className={`desktop-sidebar-collaborator-option desktop-sidebar-collaborator-create ${collaboratorCreatePickerOpen ? 'active' : ''}`}
            onClick={() => {
              setActionMenuConversationId(null);
              setEditingConversationId(null);
              setConversationTitleDraft('');
              setCollaboratorCreatePickerOpen((open) => !open);
            }}
            aria-expanded={collaboratorCreatePickerOpen}
          >
            <span className="desktop-sidebar-root-icon" aria-hidden="true">
              <Icon name="personaCreate" size={16} />
            </span>
            <span className="desktop-sidebar-collaborator-option-copy">
              <strong>{t('desktop.createCollaborator')}</strong>
              <small>{t('desktop.createCollaboratorDetail')}</small>
            </span>
          </button>
          {collaboratorCreatePickerOpen ? (
            <div className="desktop-sidebar-collaborator-create-picker">
              <CollaboratorCreatePicker
                showCloseButton={false}
                onCloseCreatePicker={() => setCollaboratorCreatePickerOpen(false)}
                onCreateFromBuilder={() => {
                  setCollaboratorPickerOpen(false);
                  setCollaboratorCreatePickerOpen(false);
                  onCreateCollaboratorFromBuilder();
                }}
                onCreateCustomCollaborator={() => {
                  setCollaboratorPickerOpen(false);
                  setCollaboratorCreatePickerOpen(false);
                  onCreateCustomCollaborator();
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

        <section className="conflux-sidebar-profile" aria-label="当前角色资料">
          <h2>{currentCollaborator?.name || '个人资料'}</h2>
          <p>{currentCollaborator?.description || '选择一位角色查看资料。'}</p>
          {currentCollaborator?.userName ? <p>我的称呼：{currentCollaborator.userName}</p> : null}
          <button type="button" className="desktop-sidebar-nav-item" onClick={() => onSelectShelf('info')}>
            <Icon name="navInfo" size={18} /><span>聊天资料与设置</span>
          </button>
        </section>
      </div>
      ) : null}

      {sidebarTab === 'library' ? (
      <section id="conflux-library-panel" role="tabpanel" aria-labelledby="conflux-library-tab" className="desktop-sidebar-section desktop-sidebar-threads conflux-sidebar-panel">
        <button type="button" className="conflux-sidebar-create" onClick={collaborators.length ? onCreateConversation : onCreateCustomCollaborator}>
          {collaborators.length ? '新建对话' : '创建角色并开始聊天'}
        </button>
        <label className="conflux-sidebar-search">
          <span>搜索聊天记录</span>
          <input type="search" placeholder="搜索对话标题、聊天内容" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
        </label>
        {librarySearch.busy ? <p className="conflux-sidebar-status" role="status">正在搜索聊天记录…</p> : null}
        {librarySearch.failedCount ? <p className="conflux-sidebar-status" role="status">{librarySearch.failedCount} 个对话未能读取，结果可能不完整。<button type="button" onClick={librarySearch.retry}>重试</button></p> : null}
        <div className="desktop-sidebar-thread-list">
          {sortedConversations.length > 0 ? (
            sortedConversations.map((conversation, index) => {
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
            <p className="desktop-sidebar-thread-empty">{librarySearch.busy ? '正在读取记录' : searchQuery.trim() ? '没有找到匹配的对话' : t('desktop.noChats')}</p>
          )}
        </div>
      </section>
      ) : null}

      <footer className="desktop-sidebar-footer">
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

      </footer>
    </aside>
  );
}
