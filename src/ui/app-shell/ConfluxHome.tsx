import type { CollectionShelf } from '../../types/domain';
import type { ConversationCardSummary } from '../../app/collection/conversationCardSummary';
import './ConfluxHome.css';

type ConfluxHomeProps = {
  conversations: ConversationCardSummary[];
  activeConversationId: string | null;
  collaboratorCount: number;
  onOpenConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onOpenShelf: (shelf: CollectionShelf) => void;
  onOpenGroup: () => void;
};

const modules: { label: string; detail: string; shelf: CollectionShelf }[] = [
  { label: '对话档案', detail: '历史、检索与整理', shelf: 'dialogue' },
  { label: '角色档案', detail: '协作者资料与编辑', shelf: 'info' },
  { label: '项目工作区', detail: '项目与相关资料', shelf: 'project' },
  { label: '代码卡片', detail: '保存的代码片段', shelf: 'code' },
  { label: '图片素材', detail: '图片和收藏', shelf: 'image' }
];

function timeLabel(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(timestamp));
}

export function ConfluxHome({
  conversations,
  activeConversationId,
  collaboratorCount,
  onOpenConversation,
  onNewConversation,
  onOpenShelf,
  onOpenGroup
}: ConfluxHomeProps) {
  const recent = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 7);
  const resume = conversations.find((item) => item.id === activeConversationId) ?? recent[0] ?? null;

  return (
    <section className="conflux-home" aria-label="Conflux 首页">
      <header className="conflux-home-header">
        <div className="conflux-home-heading">
          <h1>主页</h1>
          <span>Conflux</span>
        </div>
        <button type="button" className="conflux-home-create" onClick={onNewConversation} disabled={collaboratorCount === 0}>
          新建对话
        </button>
      </header>

      <div className="conflux-home-layout">
        <div className="conflux-home-main">
          <section className="conflux-home-section" aria-labelledby="conflux-home-resume-title">
            <h2 id="conflux-home-resume-title">继续对话</h2>
            {resume ? (
              <button type="button" className="conflux-home-resume" onClick={() => onOpenConversation(resume.id)}>
                <span className="conflux-home-item-content">
                  <strong>{resume.displayTitle || resume.title || '未命名对话'}</strong>
                  <small>{resume.latestExcerpt || '暂无消息'}</small>
                </span>
                <span className="conflux-home-meta">{timeLabel(resume.updatedAt)}</span>
                <span aria-hidden="true" className="conflux-home-arrow">→</span>
              </button>
            ) : (
              <div className="conflux-home-empty">
                <p>暂无对话记录</p>
                <button type="button" onClick={onNewConversation} disabled={collaboratorCount === 0}>开始对话</button>
                {collaboratorCount === 0 ? <small>请先创建协作者</small> : null}
              </div>
            )}
          </section>

          <section className="conflux-home-section" aria-labelledby="conflux-home-recent-title">
            <h2 id="conflux-home-recent-title">最近的对话</h2>
            {recent.length ? (
              <div className="conflux-home-list">
                {recent.map((conversation) => (
                  <button type="button" className="conflux-home-conversation" key={conversation.id} onClick={() => onOpenConversation(conversation.id)}>
                    <span className="conflux-home-item-content">
                      <strong>{conversation.displayTitle || conversation.title || '未命名对话'}</strong>
                      <small>{conversation.latestExcerpt || '暂无消息'}</small>
                    </span>
                    <time className="conflux-home-meta">{timeLabel(conversation.updatedAt)}</time>
                  </button>
                ))}
              </div>
            ) : <p className="conflux-home-muted">暂无对话记录</p>}
          </section>
        </div>

        <aside className="conflux-home-side" aria-label="功能模块">
          <section className="conflux-home-section" aria-labelledby="conflux-home-modules-title">
            <h2 id="conflux-home-modules-title">功能模块</h2>
            <div className="conflux-home-modules">
              {modules.map((module) => (
                <button type="button" className="conflux-home-module" key={module.shelf} onClick={() => onOpenShelf(module.shelf)}>
                  <strong>{module.label}</strong>
                  <small>{module.detail}</small>
                </button>
              ))}
              <button type="button" className="conflux-home-module" onClick={onOpenGroup}>
                <strong>群组</strong>
                <small>多人对话</small>
              </button>
            </div>
          </section>
          <section className="conflux-home-section" aria-labelledby="conflux-home-summary-title">
            <h2 id="conflux-home-summary-title">数据概览</h2>
            <div className="conflux-home-summary">
              <div><strong>{conversations.length}</strong><span>对话</span></div>
              <div><strong>{collaboratorCount}</strong><span>协作者</span></div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
