import { useEffect, useState } from 'react';
import type { CollectionShelf } from '../../types/domain';
import type { ConversationCardSummary } from '../../app/collection/conversationCardSummary';
import { CosmosChart, PoetDial } from './HomeClockArt';
import { LeoPlate } from './LeoPlate';
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
  { label: '角色设置', shelf: 'info' },
  { label: '项目文件', shelf: 'project' },
  { label: '代码卡片', shelf: 'code' },
  { label: '图片素材', shelf: 'image' }
];

export function ConfluxHome({
  conversations, activeConversationId, collaboratorCount, onOpenConversation,
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
      <div className="home-sheet">
        <header className="conflux-home-header">
          <h1 aria-label="Conflux 主页" lang="en">Conflux</h1>
          <button type="button" className="conflux-home-chat" onClick={() => resume ? onOpenConversation(resume.id) : onNewConversation()}>
            {resume ? '继续对话' : '开始聊天'}
          </button>
        </header>
        <div className="home-observation">
          <CosmosChart />
          <LeoPlate />
        </div>
        <div className="conflux-home-layout">
          <section className="conflux-home-slot conflux-home-clock" aria-label="时钟展示">
            <PoetDial now={now} />
            <h2>当地时间</h2>
            <time dateTime={now.toISOString()}><strong>{time}</strong><span>{date}</span></time>
          </section>
          <dl className="home-index">
            <div><dt>对话</dt><dd>{conversations.length}</dd></div>
            <div><dt>角色</dt><dd>{collaboratorCount}</dd></div>
            <div><dt>消息</dt><dd>{conversations.reduce((n, item) => n + item.messageCount, 0)}</dd></div>
          </dl>
          <div className="conflux-home-secondary-row">
            <section className="conflux-home-slot conflux-home-todo" aria-label="待办占位区域">
              <header><h2>待办</h2><span className="conflux-home-slot-label">预留</span></header>
            </section>
            <section className="conflux-home-slot conflux-home-calendar" aria-label="日历占位区域">
              <header><h2>日历</h2><span className="conflux-home-slot-label">预留</span></header>
            </section>
          </div>
          <section className="conflux-home-slot conflux-home-functions" aria-label="小功能区域">
            <h2>小功能</h2>
            <div className="conflux-home-module-grid">
              {modules.map(module => <button type="button" key={module.shelf} onClick={() => onOpenShelf(module.shelf)}>{module.label}</button>)}
              <button type="button" onClick={onOpenGroup}>群组</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
