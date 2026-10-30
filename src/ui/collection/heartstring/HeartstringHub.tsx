import { useState } from 'react';
import { ArchiveAlbumShelf } from '../album/ArchiveAlbumShelf';
import { useMemoryGalaxy } from './MemoryGalaxyFullscreen';
import './heartstring.css';

type HeartstringSection = 'album' | 'letters' | 'timeline' | 'reading' | 'memory';

const sections: Array<{ id: HeartstringSection; label: string }> = [
  { id: 'album', label: '收藏册' },
  { id: 'letters', label: '信笺' },
  { id: 'timeline', label: '时光' },
  { id: 'reading', label: '共读' },
  { id: 'memory', label: '记忆图谱' }
];

const planned: Record<'letters' | 'timeline' | 'reading', { title: string; description: string; purpose: string }> = {
  letters: {
    title: '信笺',
    description: '属于你与 AI 的信，未来在这里按收件人、时间和信件状态收藏。',
    purpose: '当前尚未建立独立的信件存储与编辑功能。这一页不显示虚构的信件，也不读取聊天历史充数。'
  },
  timeline: {
    title: '时光',
    description: '纪念日、珍藏的对话片段与照片，会以时间为线索慢慢排开。',
    purpose: '当前尚未建立纪念事件的数据结构；未来由你主动选择珍藏什么，不自动收录所有聊天。'
  },
  reading: {
    title: '共读',
    description: '一边读同一本书，一边和选中的 AI 讨论章节、留下批注与共同书签。',
    purpose: '共读会话尚未接入。后续需要真实的书籍来源、阅读进度、批注存储与 AI 会话关联；目前不会假装已经能共读。'
  }
};

export function HeartstringHub({ searchTerm }: { searchTerm: string }) {
  const { open: memoryOpen, enter: enterMemory } = useMemoryGalaxy();
  const [active, setActive] = useState<HeartstringSection>(memoryOpen ? 'memory' : 'album');
  return (
    <div className="heartstring-hub">
      <header className="heartstring-header">
        <div>
          <span className="heartstring-eyebrow">CONFLUX / HEARTSTRING</span>
          <h2>心弦</h2>
          <p>照片、书页、信件与记忆，各有归处。</p>
        </div>
      </header>
      <nav className="heartstring-sections" aria-label="心弦内容" role="tablist">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            id={`heartstring-tab-${section.id}`}
            aria-controls={`heartstring-panel-${section.id}`}
            aria-selected={active === section.id}
            className={active === section.id ? 'is-active' : ''}
            onClick={() => setActive(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <section
        className="heartstring-content"
        role="tabpanel"
        id={`heartstring-panel-${active}`}
        aria-labelledby={`heartstring-tab-${active}`}
      >
        {active === 'album' ? <ArchiveAlbumShelf searchTerm={searchTerm} /> : null}
        {active === 'memory' ? (
          <div className="heartstring-future heartstring-memory-entry">
            <span className="heartstring-eyebrow">A CONSTELLATION OF MEMORIES</span>
            <h3>记忆星河</h3><p>走进星光，读一段与你有关的记忆。</p>
            <button type="button" data-enter-memory onClick={enterMemory}>进入记忆星河</button>
          </div>
        ) : null}
        {active === 'letters' || active === 'timeline' || active === 'reading' ? (
          <div className="heartstring-future">
            <span className="heartstring-future__tag">建设计划</span>
            <h3>{planned[active].title}</h3>
            <p>{planned[active].description}</p>
            <p className="heartstring-future__note">{planned[active].purpose}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
