import { describe, expect, it } from 'vitest';
import { buildAssistantPromptParts } from './requestPromptLayers';
import { assembleAssistantContext } from './requestContext';
import { createPersonaTemplate } from '../../config/persona/personaBuilder';
import { normalizePersona } from '../../stores/personaStore';

const templateContext = {
  cur_date: '2026-11-02',
  cur_time: '00:00',
  cur_datetime: '2026-11-02 00:00:00',
  model_id: 'test-model',
  model_name: 'test-model',
  locale: 'zh-CN',
  timezone: 'Asia/Shanghai',
  system_version: 'test',
  device_info: 'test',
  battery_level: 'N/A',
  nickname: '用户',
  user_name: '用户',
  assistant_name: '星'
};

describe('persona prompt slots share existing request context and storage path', () => {
  it('only inserts nonempty enabled slots, resolves variables, and keeps their roles', () => {
    const parts = buildAssistantPromptParts({
      personaPrompt: '基本人设',
      personaPromptSource: 'custom',
      promptSlots: [
        { id: 'a', title: '起始记忆', role: 'system', enabled: true, content: '关于{assistant_name}的设定' },
        { id: 'b', title: '示例回应', role: 'assistant', enabled: true, content: '你好，{user_name}' },
        { id: 'c', title: '关闭', role: 'system', enabled: false, content: '不能出现' },
        { id: 'd', title: '空槽位', role: 'system', enabled: true, content: '  ' }
      ],
      templateContext,
      messages: []
    });
    const slots = parts.filter((part) => part.name === 'persona_custom_slot');
    expect(slots.map((slot) => [slot.label, slot.role, slot.content])).toEqual([
      ['起始记忆', 'system', '关于星的设定'],
      ['示例回应', 'assistant', '你好，用户']
    ]);
    const context = assembleAssistantContext({
      systemPromptParts: slots.map((slot) => ({
        name: slot.name, layer: slot.layer, role: slot.role, content: slot.content
      })),
      messages: [{ id: 'u1', role: 'user', content: '现在开始', timestamp: 1 }]
    });
    expect(context.segments[0]?.messages[0]?.role).toBe('system');
    expect(context.segments[1]?.messages[0]?.role).toBe('assistant');
    expect(context.segments[context.segments.length - 1]?.messages[0]?.content).toBe('现在开始');
  });

  it('preserves saved slots through persona normalization and legacy template defaults', () => {
    const draft = createPersonaTemplate({
      id: 'persona-test',
      name: '自定义',
      description: '',
      advanced: {
        promptSlots: [{
          id: 'slot-1', title: '世界观', role: 'system',
          content: '背景内容', enabled: false
        }]
      }
    });
    const normalized = normalizePersona(draft);
    expect(normalized.advanced.promptSlots).toEqual(draft.advanced.promptSlots);
    expect(createPersonaTemplate({ id: 'old-role', name: '旧角色', description: '' }).advanced.promptSlots)
      .toEqual([]);
  });

  it('leaves old personas without slots unchanged', () => {
    const base = {
      personaPrompt: '原有提示词',
      personaPromptSource: 'custom' as const,
      templateContext,
      messages: []
    };
    expect(buildAssistantPromptParts(base)).toEqual(
      buildAssistantPromptParts({ ...base, promptSlots: [] })
    );
  });
});
