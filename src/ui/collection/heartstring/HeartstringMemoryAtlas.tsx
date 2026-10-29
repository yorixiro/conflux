import { useState } from 'react';
import { usePersonaStore } from '../../../stores/personaStore';
import { MemorySettingsTab } from '../../shell/persona/settings/MemorySettingsTab';

export type MemoryAtlasCounts = {
  entries: number;
  docs: number;
  summaries: number;
  indexed: number;
};

export function countMemoryAtlasSources(memory: {
  personalMemories: string[];
  referenceDocs: unknown[];
  conversationSummaries: unknown[];
  vectorIndex?: { indexedChunkCount?: number } | null;
}): MemoryAtlasCounts {
  return {
    entries: memory.personalMemories.filter((entry) => entry.trim().length > 0).length,
    docs: memory.referenceDocs.length,
    summaries: memory.conversationSummaries.length,
    indexed: Math.max(0, memory.vectorIndex?.indexedChunkCount ?? 0)
  };
}

export function HeartstringMemoryAtlas() {
  const personas = usePersonaStore((state) => state.personas);
  const updateCollaborator = usePersonaStore((state) => state.updateCollaborator);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const persona = personas.find((item) => item.id === chosenId) ?? personas[0] ?? null;

  if (!persona) {
    return (
      <div className="heartstring-future">
        <h3>记忆图谱</h3>
        <p>当前没有可管理的 AI 角色。请先在「对话」里创建角色。</p>
      </div>
    );
  }

  const counts = countMemoryAtlasSources(persona.memory);
  const sources = [
    { key: 'entries', label: '记忆条目', count: counts.entries, detail: '明确保存的长期信息' },
    { key: 'docs', label: '长期资料', count: counts.docs, detail: '已登记的参考文档' },
    { key: 'summaries', label: '对话摘要', count: counts.summaries, detail: '由对话提炼的总结' },
    { key: 'indexed', label: '向量索引', count: counts.indexed, detail: '已索引片段数' }
  ] as const;

  return (
    <div className="heartstring-memory">
      <header className="heartstring-memory__heading">
        <div>
          <span className="heartstring-eyebrow">MEMORY / MAP</span>
          <h3>记忆图谱</h3>
          <p>查看每个角色的记忆来源，并在下方直接维护原有记忆库。</p>
        </div>
        <label className="heartstring-memory__persona">
          <span>查看 AI</span>
          <select value={persona.id} onChange={(event) => setChosenId(event.target.value)}>
            {personas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </header>
      <div className="heartstring-memory__map" aria-label={`${persona.name}的记忆来源结构`}>
        <div className="heartstring-memory__center">
          <span>记忆归属</span>
          <strong>{persona.name}</strong>
        </div>
        <div className="heartstring-memory__branches">
          {sources.map((source) => (
            <div key={source.key} className="heartstring-memory__node">
              <span>{source.label}</span>
              <strong>{source.count}</strong>
              <small>{source.detail}</small>
            </div>
          ))}
        </div>
      </div>
      <p className="heartstring-memory__disclaimer">这里展示的是实际存储的记忆来源及数量，不会臆造记忆之间的语义关联；也不会自动创建向量索引或调用收费模型。</p>
      <div className="heartstring-memory__editor">
        <h4>管理 {persona.name} 的记忆</h4>
        <MemorySettingsTab
          activeCollaboratorId={persona.id}
          activePersona={persona}
          onUpdatePersona={(patch) => updateCollaborator(persona.id, patch)}
        />
      </div>
    </div>
  );
}
