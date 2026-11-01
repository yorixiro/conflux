import { useEffect, useState } from 'react';
import { canEditPersonaPrompt, isProductGuidePersona } from '../../../../engines/personaBuiltin';
import { createUid } from '../../../../engines/id';
import type { PersonaPromptSlot } from '../../../../types/domain';
import { Icon, type IconName } from '../../../Icon';
import { type PersonaTabProps } from '../personaUiShared';
import { PromptCoreSettingsPage } from './PromptCoreSettingsPage';
import { SnippetsSettingsTab } from './SnippetsSettingsTab';

type PromptSettingsTabProps = PersonaTabProps & {
  expandedUsesPageScroll?: boolean;
};

type PromptSettingsPage = 'prompt' | 'message' | 'tone' | 'rules';

const PROMPT_PAGE_META: Record<PromptSettingsPage, {
  label: string;
  icon: IconName;
}> = {
  prompt: { label: '提示词', icon: 'promptScript' },
  message: { label: '消息', icon: 'promptMessage' },
  tone: { label: '调性', icon: 'promptTone' },
  rules: { label: '世界书', icon: 'promptRules' }
};

const PROMPT_PAGES: PromptSettingsPage[] = ['prompt', 'message', 'tone', 'rules'];


/** Part of the existing persona prompt editor; no second settings or storage path. */
function PromptSlotsEditor({ activePersona, onUpdatePersona }: Pick<PersonaTabProps, 'activePersona' | 'onUpdatePersona'>) {
  const slots = activePersona?.advanced.promptSlots ?? [];
  if (!activePersona || !canEditPersonaPrompt(activePersona)) return null;

  const save = (next: PersonaPromptSlot[]) => onUpdatePersona({ advanced: { promptSlots: next } });
  const edit = (id: string, patch: Partial<PersonaPromptSlot>) =>
    save(slots.map((slot) => slot.id === id ? { ...slot, ...patch } : slot));
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= slots.length) return;
    const next = [...slots];
    const [moving] = next.splice(index, 1);
    if (!moving) return;
    next.splice(destination, 0, moving);
    save(next);
  };

  return (
    <section className="ps-field prompt-settings-field" aria-label="补充提示词槽位">
      <div className="ps-field-head ps-field-head--inline-action">
        <span className="ps-field-label">补充提示词槽位</span>
        <span className="ps-field-hint">{slots.length} 个 · 可调整顺序</span>
        <button
          type="button" className="btn-secondary compact"
          onClick={() => save([...slots, {
            id: createUid('prompt-slot'), title: '槽位 ' + (slots.length + 1),
            role: 'system', content: '', enabled: true
          }])}
        >＋ 添加槽位</button>
      </div>
      <p className="ps-footnote">
        可自由增删、调整顺序。SYSTEM 是补充系统提示，ASSISTANT 是示例助手消息；
        关闭的槽位和空白槽位不发送。不会重复保存到记忆库、世界书或消息模板。
      </p>
      {slots.map((slot, index) => (
        <div key={slot.id} className="ps-field prompt-settings-field" style={{ marginTop: 12 }}>
          <div className="ps-field-head" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="ps-input" style={{ flex: '1 1 9rem', minWidth: 0 }}
              aria-label="槽位名称" value={slot.title}
              onChange={(e) => edit(slot.id, { title: e.target.value })}
              placeholder="槽位名称"
            />
            <select
              className="ps-input" style={{ flex: '0 1 8rem', minWidth: 0 }}
              aria-label="槽位角色" value={slot.role}
              onChange={(e) => edit(slot.id, { role: e.target.value as PersonaPromptSlot['role'] })}
            >
              <option value="system">SYSTEM</option>
              <option value="assistant">ASSISTANT</option>
            </select>
            <label className="ps-field-hint">
              <input type="checkbox" checked={slot.enabled !== false}
                onChange={(e) => edit(slot.id, { enabled: e.target.checked })} /> 启用
            </label>
            <button type="button" className="btn-secondary compact"
              aria-label={'上移' + slot.title} disabled={index === 0}
              onClick={() => move(index, -1)}>↑</button>
            <button type="button" className="btn-secondary compact"
              aria-label={'下移' + slot.title} disabled={index === slots.length - 1}
              onClick={() => move(index, 1)}>↓</button>
            <button type="button" className="btn-secondary compact"
              aria-label={'删除' + slot.title}
              onClick={() => {
                if (!slot.content.trim() || window.confirm('删除这个槽位及其内容？')) {
                  save(slots.filter((item) => item.id !== slot.id));
                }
              }}>删除</button>
          </div>
          <textarea
            className="ps-textarea ps-textarea--mono"
            aria-label={slot.title + '的提示词内容'}
            rows={5} value={slot.content}
            onChange={(e) => edit(slot.id, { content: e.target.value })}
            placeholder={slot.role === 'system' ? '填写补充系统提示词（可留空）' : '填写示例 AI 回复（可留空）'}
          />
        </div>
      ))}
    </section>
  );
}

export function PromptSettingsTab({
  activeCollaboratorId,
  activePersona,
  onUpdatePersona,
  expandedUsesPageScroll = false
}: PromptSettingsTabProps) {
  const [activePromptPage, setActivePromptPage] = useState<PromptSettingsPage>('prompt');

  useEffect(() => {
    setActivePromptPage('prompt');
  }, [activeCollaboratorId]);

  if (isProductGuidePersona(activePersona)) {
    return null;
  }

  return (
    <div className="prompt-settings-flow">
      <div className="room-theme-page-nav prompt-page-nav" role="tablist" aria-label="提示词设置分页">
        {PROMPT_PAGES.map((page) => (
          <button
            key={page}
            type="button"
            role="tab"
            aria-selected={activePromptPage === page}
            className={activePromptPage === page ? 'active' : ''}
            onClick={() => setActivePromptPage(page)}
          >
            <Icon name={PROMPT_PAGE_META[page].icon} size={14} />
            <span>{PROMPT_PAGE_META[page].label}</span>
          </button>
        ))}
      </div>

      {activePromptPage === 'prompt' ? (
        <>
          <PromptCoreSettingsPage
            activeCollaboratorId={activeCollaboratorId}
            activePersona={activePersona}
            onUpdatePersona={onUpdatePersona}
            page="prompt"
            expandedUsesPageScroll={expandedUsesPageScroll}
          />
          <PromptSlotsEditor activePersona={activePersona} onUpdatePersona={onUpdatePersona} />
        </>
      ) : null}

      {activePromptPage === 'message' ? (
        <>
          <PromptCoreSettingsPage
            activeCollaboratorId={activeCollaboratorId}
            activePersona={activePersona}
            onUpdatePersona={onUpdatePersona}
            page="message"
            expandedUsesPageScroll={expandedUsesPageScroll}
          />
          <SnippetsSettingsTab
            activeCollaboratorId={activeCollaboratorId}
            activePersona={activePersona}
            onUpdatePersona={onUpdatePersona}
            visibleSections="textRules"
          />
        </>
      ) : null}

      {activePromptPage === 'tone' ? (
        <SnippetsSettingsTab
          activeCollaboratorId={activeCollaboratorId}
          activePersona={activePersona}
          onUpdatePersona={onUpdatePersona}
          visibleSections="tone"
        />
      ) : null}

      {activePromptPage === 'rules' ? (
        <SnippetsSettingsTab
          activeCollaboratorId={activeCollaboratorId}
          activePersona={activePersona}
          onUpdatePersona={onUpdatePersona}
          visibleSections="worldBook"
        />
      ) : null}
    </div>
  );
}
