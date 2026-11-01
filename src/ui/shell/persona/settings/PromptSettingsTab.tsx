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


/** Main persona prompt and added slots share one editor and one storage path. */
function PromptSlotsEditor({
  activeCollaboratorId,
  activePersona,
  onUpdatePersona,
  expandedUsesPageScroll
}: PromptSettingsTabProps) {
  const slots = activePersona?.advanced.promptSlots ?? [];
  const editable = canEditPersonaPrompt(activePersona);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  useEffect(() => {
    setEditingSlotId(null);
  }, [activeCollaboratorId]);

  const save = (next: PersonaPromptSlot[]) => onUpdatePersona({ advanced: { promptSlots: next } });
  const edit = (id: string, patch: Partial<PersonaPromptSlot>) =>
    save(slots.map((slot) => slot.id === id ? { ...slot, ...patch } : slot));
  const add = () => {
    const id = createUid('prompt-slot');
    save([...slots, { id, title: '槽位 ' + (slots.length + 2), role: 'system', content: '', enabled: true }]);
    setEditingSlotId(id);
  };
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
    <section className="prompt-slots-editor" aria-label="提示词编辑">
      <div className="prompt-slots-toolbar">
        <span className="ps-field-label">提示词 <small>{1 + slots.length} 个槽位</small></span>
        {editable ? (
          <button type="button" className="ps-field-expand-btn" onClick={add}>＋ 添加槽位</button>
        ) : null}
      </div>

      <PromptCoreSettingsPage
        activeCollaboratorId={activeCollaboratorId}
        activePersona={activePersona}
        onUpdatePersona={onUpdatePersona}
        page="prompt"
        expandedUsesPageScroll={expandedUsesPageScroll}
      />

      {editable ? slots.map((slot, index) => {
        const expanded = editingSlotId === slot.id;
        const summary = slot.content.trim().replace(/\s+/g, ' ').slice(0, 100);
        return (
          <div className="prompt-slot-card" key={slot.id}>
            <div className="prompt-slot-card-head">
              <button
                type="button"
                className="prompt-slot-trigger"
                aria-expanded={expanded}
                onClick={() => setEditingSlotId(expanded ? null : slot.id)}
              >
                <strong>{slot.title.trim() || '未命名槽位'}</strong>
                <small className="prompt-slot-role">{slot.role.toUpperCase()}</small>
                {!expanded ? <span className="prompt-slot-summary">{summary || '空白槽位'}</span> : null}
              </button>
              <label className="prompt-slot-enable">
                <input
                  type="checkbox"
                  checked={slot.enabled !== false}
                  onChange={(event) => edit(slot.id, { enabled: event.target.checked })}
                  aria-label={`启用${slot.title}`}
                />
                <span>{slot.enabled === false ? '已关闭' : '启用'}</span>
              </label>
            </div>

            {expanded ? (
              <div className="prompt-slot-fields">
                <div className="prompt-slot-field-row">
                  <label>
                    <span>名称</span>
                    <input className="ps-input" value={slot.title}
                      onChange={(event) => edit(slot.id, { title: event.target.value })} />
                  </label>
                  <label>
                    <span>角色</span>
                    <select className="ps-input" value={slot.role}
                      onChange={(event) => edit(slot.id, { role: event.target.value as PersonaPromptSlot['role'] })}>
                      <option value="system">SYSTEM</option>
                      <option value="assistant">ASSISTANT</option>
                    </select>
                  </label>
                </div>
                <textarea
                  className="ps-textarea ps-textarea--mono"
                  aria-label={`${slot.title}内容`}
                  rows={7}
                  value={slot.content}
                  onChange={(event) => edit(slot.id, { content: event.target.value })}
                  placeholder="填写提示词，可留空"
                />
                <div className="prompt-slot-actions">
                  <button type="button" className="ps-field-expand-btn" disabled={index === 0}
                    onClick={() => move(index, -1)}>上移</button>
                  <button type="button" className="ps-field-expand-btn" disabled={index === slots.length - 1}
                    onClick={() => move(index, 1)}>下移</button>
                  <button type="button" className="ps-field-expand-btn"
                    onClick={() => {
                      if (slot.content.trim() && !window.confirm('删除此槽位及其内容？')) return;
                      save(slots.filter((item) => item.id !== slot.id));
                      setEditingSlotId(null);
                    }}>删除槽位</button>
                </div>
              </div>
            ) : null}
          </div>
        );
      }) : null}
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
        <PromptSlotsEditor
          activeCollaboratorId={activeCollaboratorId}
          activePersona={activePersona}
          onUpdatePersona={onUpdatePersona}
          expandedUsesPageScroll={expandedUsesPageScroll}
        />
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
