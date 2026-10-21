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

const sections: { title: string; description: string; shelf: CollectionShelf; number: string }[] = [
  { title: '项目与工作区', description: '继续已有项目、整理资料', shelf: 'project', number: '01' },
  { title: '代码与卡片', description: '查看保存的代码片段', shelf: 'code', number: '02' },
  { title: '图像收藏', description: '集中管理图片素材', shelf: 'image', number: '03' },
  { title: '角色资料', description: '查看与编辑协作者', shelf: 'info', number: '04' }
];

function timeLabel(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(timestamp));
}

/**
 * Presentation only. Never duplicates the chat store or chat request pipeline.
 * Every conversation and action comes from the existing AppShell controller.
 */
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
      <div className="conflux-home-noise" aria-hidden="true" />
      <header className="conflux-home-masthead">
        <div className="conflux-home-brand">
          <span className="conflux-home-brand-mark" aria-hidden="true">✧</span>
          <div>
            <span className="conflux-home-brand-name">Conflux</span>
            <span className="conflux-home-brand-caption">私人空间 / HOME</span>
          </div>
        </div>
        <button type="button" className="conflux-home-create" onClick={onNewConversation} disabled={collaboratorCount === 0}>
          <span aria-hidden="true">＋</span> 新建对话
        </button>
      </header>

      <main className="conflux-home-content">
        <div className="conflux-home-primary">
          <header className="conflux-home-intro">
            <p className="conflux-home-eyebrow">PERSONAL SPACE <span aria-hidden="true">—</span> 001</p>
            <h1>你的空间，<em>继续生长。</em></h1>
            <p className="conflux-home-intro-caption">从上一次对话继续，或进入你的收藏与工作区。</p>
          </header>

          <section className="conflux-home-continue" aria-labelledby="conflux-continue-title">
            <div className="conflux-home-section-label">
              <h2 id="conflux-continue-title">上次停留</h2>
              <span>CONTINUE</span>
            </div>
            {resume ? (
              <button type="button" className="conflux-home-resume" onClick={() => onOpenConversation(resume.id)}>
                <span className="conflux-home-resume-marker" aria-hidden="true">✧</span>
                <span className="conflux-home-resume-main">
                  <strong>{resume.displayTitle || resume.title || '未命名对话'}</strong>
                  <small>{resume.latestExcerpt}</small>
                  <span>{timeLabel(resume.updatedAt)} · {resume.messageCount} 条消息</span>
                </span>
                <span className="conflux-home-resume-arrow" aria-hidden="true">↗</span>
              </button>
            ) : (
              <div className="conflux-home-empty">
                <p>这里还没有对话。</p>
                <button type="button" onClick={onNewConversation} disabled={collaboratorCount === 0}>开始第一段对话 ↗</button>
                {collaboratorCount === 0 ? <small>请先在角色资料中创建协作者</small> : null}
              </div>
            )}
          </section>

          <section className="conflux-home-recent" aria-labelledby="conflux-recent-title">
            <div className="conflux-home-section-label">
              <h2 id="conflux-recent-title">最近的对话</h2>
              <span>RECENT / {conversations.length}</span>
            </div>
            {recent.length > 0 ? (
              <div className="conflux-home-threads">
                {recent.map((conversation, index) => (
                  <button
                    type="button"
                    className="conflux-home-thread"
                    key={conversation.id}
                    onClick={() => onOpenConversation(conversation.id)}
                  >
                    <span className="conflux-home-thread-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="conflux-home-thread-text">
                      <strong>{conversation.displayTitle || conversation.title || '未命名对话'}</strong>
                      <small>{conversation.latestExcerpt}</small>
                    </span>
                    <time>{timeLabel(conversation.updatedAt)}</time>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            ) : <p className="conflux-home-muted">对话记录会在这里出现，不使用演示假数据。</p>}
          </section>
        </div>

        <aside className="conflux-home-secondary" aria-label="功能导航">
          <div className="conflux-home-section-label">
            <h2>空间目录</h2><span>INDEX</span>
          </div>
          <nav className="conflux-home-module-list" aria-label="已有功能">
            {sections.map((section) => (
              <button type="button" className="conflux-home-module" key={section.shelf} onClick={() => onOpenShelf(section.shelf)}>
                <span className="conflux-home-module-num">{section.number}</span>
                <span className="conflux-home-module-copy">
                  <strong>{section.title}</strong>
                  <small>{section.description}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
            <button type="button" className="conflux-home-module" onClick={onOpenGroup}>
              <span className="conflux-home-module-num">05</span>
              <span className="conflux-home-module-copy">
                <strong>群聊</strong><small>进入现有多人对话空间</small>
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          </nav>
          <footer className="conflux-home-footer">
            <span className="conflux-home-footer-star" aria-hidden="true">✳</span>
            <p>这里仅显示已接入的功能。日记、书信、记忆星图与主题工坊将在迁移后出现，不会放置无法使用的空入口。</p>
          </footer>
        </aside>
      </main>
    </section>
  );
}
