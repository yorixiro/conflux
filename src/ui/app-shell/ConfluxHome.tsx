import { useEffect, useState } from 'react';
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

const modules: { label: string; shelf: CollectionShelf }[] = [
  { label: '对话档案', shelf: 'dialogue' },
  { label: '角色资料', shelf: 'info' },
  { label: '项目文件', shelf: 'project' },
  { label: '代码卡片', shelf: 'code' },
  { label: '图片素材', shelf: 'image' }
];

/** Fixed structural slots for Claude's visual layer; no invented records or extra navigation. */
export function ConfluxHome({
  conversations, activeConversationId, onOpenConversation,
  onNewConversation, onOpenShelf, onOpenGroup
}: ConfluxHomeProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000 * 30);
    return () => window.clearInterval(timer);
  }, []);
  const recent = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const resume = conversations.find(item => item.id === activeConversationId) ?? recent[0];
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now);

  return (
    <section className="conflux-home" aria-label="Conflux 首页">
      <header className="conflux-home-header">
        <h1>主页</h1>
        <button type="button" className="conflux-home-chat" onClick={() => resume ? onOpenConversation(resume.id) : onNewConversation()}>
          {resume ? '继续对话' : '开始聊天'}
        </button>
      </header>
      <div className="conflux-home-layout">
        <div className="conflux-home-first-row">
          <section className="conflux-home-slot conflux-home-clock" aria-label="时钟展示">
            <h2>时钟</h2>
            <time dateTime={now.toISOString()}><strong>{time}</strong><span>{date}</span></time>
          </section>
          <section className="conflux-home-slot conflux-home-todo" aria-label="待办占位区域">
            <header><h2>待办</h2><span className="conflux-home-slot-label">预留</span></header>
            <div className="conflux-home-placeholder">待办列表区域</div>
          </section>
        </div>
        <section className="conflux-home-slot conflux-home-calendar" aria-label="日历占位区域">
          <header><h2>日历</h2><span className="conflux-home-slot-label">预留</span></header>
          <div className="conflux-home-placeholder">日历与日程区域</div>
        </section>
        <section className="conflux-home-slot conflux-home-functions" aria-label="小功能区域">
          <h2>小功能</h2>
          <div className="conflux-home-module-grid">
            {modules.map(module => <button type="button" key={module.shelf} onClick={() => onOpenShelf(module.shelf)}>{module.label}</button>)}
            <button type="button" onClick={onOpenGroup}>群组</button>
          </div>
        </section>
      </div>
    </section>
  );
}
