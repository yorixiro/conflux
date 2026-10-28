import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PERSONAS,
  BUNDLED_DEFAULT_PERSONA_IDS,
  POLARIS_ASSISTANT_DEFAULT_MODEL,
  POLARIS_ASSISTANT_DEFAULT_PROVIDER_ID,
  POLARIS_ASSISTANT_PERSONA_ID,
  createPersonaTemplate
} from '../config/persona/personaBuilder';
import { migratePersistedPersonaPayload, migratePersistedPersonas, usePersonaStore } from './personaStore';
import * as personaMemoryDocPersistence from './personaMemoryReferenceDocPersistence';

describe('migratePersistedPersonas', () => {
  it('preserves user-edited Pharos fields and prompt during hydration', () => {
    const defaultPharos = DEFAULT_PERSONAS.find((persona) => persona.id === 'pharos');
    expect(defaultPharos).toBeDefined();

    const editedPharos = createPersonaTemplate({
      ...defaultPharos!,
      id: 'pharos',
      name: '砚',
      description: '用户改过的描述',
      purpose: '用户改过的方向',
      compiledPrompt: '用户改过的 Pharos 提示词'
    });

    const personas = migratePersistedPersonas([editedPharos]);
    const pharos = personas.find((persona) => persona.id === 'pharos');

    expect(pharos?.systemRole).toBe('default');
    expect(pharos?.name).toBe('砚');
    expect(pharos?.description).toBe('用户改过的描述');
    expect(pharos?.purpose).toBe('用户改过的方向');
    expect(pharos?.compiledPrompt).toBe('用户改过的 Pharos 提示词');
  });

  it('seeds Xiao Assistant into legacy persisted collaborators without restoring Pharos', () => {
    const customPersona = createPersonaTemplate({
      id: 'persona-custom',
      name: '自定义',
      description: '用户创建的角色'
    });

    const personas = migratePersistedPersonas([customPersona]);

    expect(personas.map((persona) => persona.id)).toEqual([POLARIS_ASSISTANT_PERSONA_ID, 'persona-custom']);
    expect(personas.some((persona) => persona.id === 'pharos')).toBe(false);
  });

  it('does not restore Xiao Assistant after the seed marker exists', () => {
    const customPersona = createPersonaTemplate({
      id: 'persona-custom',
      name: '自定义',
      description: '用户创建的角色'
    });

    const personas = migratePersistedPersonas([customPersona], [POLARIS_ASSISTANT_PERSONA_ID]);

    expect(personas.map((persona) => persona.id)).toEqual(['persona-custom']);
  });

  it('preserves valid avatar logo choices and drops unknown persisted values', () => {
    const customPersona = createPersonaTemplate({
      id: 'persona-custom',
      name: '自定义',
      description: '用户创建的角色',
      assistantAvatarIconId: 'claude',
      userAvatarIconId: 'gemini'
    });
    const invalidPersona = {
      ...customPersona,
      id: 'persona-invalid',
      assistantAvatarIconId: 'not-a-logo',
      userAvatarIconId: 'not-a-logo'
    } as unknown as typeof customPersona;

    const personas = migratePersistedPersonas([customPersona, invalidPersona], [POLARIS_ASSISTANT_PERSONA_ID]);

    expect(personas.find((persona) => persona.id === 'persona-custom')).toMatchObject({
      assistantAvatarIconId: 'claude',
      userAvatarIconId: 'gemini'
    });
    expect(personas.find((persona) => persona.id === 'persona-invalid')).toMatchObject({
      assistantAvatarIconId: null,
      userAvatarIconId: null
    });
  });

  it('records Xiao Assistant as seeded when persisted collaborators already contain it', () => {
    const assistant = DEFAULT_PERSONAS.find((persona) => persona.id === POLARIS_ASSISTANT_PERSONA_ID);
    expect(assistant).toBeDefined();

    const migrated = migratePersistedPersonaPayload({ personas: [assistant!] });

    expect(migrated.personas.map((persona) => persona.id)).toEqual([POLARIS_ASSISTANT_PERSONA_ID]);
    expect(migrated.seededDefaultPersonaIds).toEqual([POLARIS_ASSISTANT_PERSONA_ID]);
  });

  it('updates existing Xiao Assistant to the fixed product guide model and latest prompt', () => {
    const staleAssistant = createPersonaTemplate({
      id: POLARIS_ASSISTANT_PERSONA_ID,
      name: '旧小助手',
      description: '旧描述',
      compiledPrompt: '旧提示',
      advanced: {
        providerId: '',
        modelOverride: ''
      }
    });

    const personas = migratePersistedPersonas([staleAssistant], [POLARIS_ASSISTANT_PERSONA_ID]);
    const assistant = personas.find((persona) => persona.id === POLARIS_ASSISTANT_PERSONA_ID);

    expect(assistant).toMatchObject({
      name: '小助手',
      description: 'Polaris 使用向导',
      purpose: '带你认识这个房间。有问题时，可以问北极星小助手。',
      compiledPrompt: expect.stringContaining('彩色圆形轨道'),
      advanced: {
        providerId: POLARIS_ASSISTANT_DEFAULT_PROVIDER_ID,
        modelOverride: POLARIS_ASSISTANT_DEFAULT_MODEL,
        showThinking: false
      }
    });
    expect(assistant?.compiledPrompt).toContain('readPolarisKnowledge');
    expect(assistant?.compiledPrompt).toContain('设置 → 工具箱 → 产品知识');
    expect(assistant?.compiledPrompt).toContain('不是回形针');
    expect(assistant?.compiledPrompt).toContain('思路摘要入口');
    expect(assistant?.compiledPrompt).toContain('结构化换肤工具');
    expect(assistant?.compiledPrompt).toContain('读写 theme.css');
    expect(assistant?.compiledPrompt).toContain('气泡变成渐变彩色');
    expect(assistant?.compiledPrompt).toContain('上手陪练');
    expect(assistant?.compiledPrompt).toContain('给一个低风险的小示范');
    expect(assistant?.compiledPrompt).toContain('我先给你写张小卡片试试');
    expect(assistant?.compiledPrompt).toContain('用户正在输入框里和你说话时，通常是在聊天世界');
    expect(assistant?.compiledPrompt).toContain('房间世界是点顶栏切换过去的收藏空间');
    expect(assistant?.compiledPrompt).toContain('一个协作者对应一个房间');
    expect(assistant?.compiledPrompt).toContain('Pharos（灯塔）');
    expect(assistant?.compiledPrompt).toContain('任务模式。原理是给当前对话挂一个任务面板和持续工作状态');
    expect(assistant?.compiledPrompt).toContain('原理是粒度不同');
    expect(assistant?.compiledPrompt).toContain('API / 供应商是模型线路配置');
    expect(assistant?.compiledPrompt).toContain('工具箱是内置工具开关');
    expect(assistant?.compiledPrompt).toContain('MCP 是外部工具接入');
    expect(assistant?.compiledPrompt).toContain('产品知识工具默认适合小助手使用');
    expect(assistant?.compiledPrompt).toContain('供应商负责“哪个模型来回答”');
    expect(assistant?.compiledPrompt).not.toContain('精修');
  });

  it('removes bundled defaults from native app persona hydration', () => {
    const assistant = DEFAULT_PERSONAS.find((persona) => persona.id === POLARIS_ASSISTANT_PERSONA_ID);
    const pharos = DEFAULT_PERSONAS.find((persona) => persona.id === 'pharos');
    const customPersona = createPersonaTemplate({
      id: 'persona-custom',
      name: '自定义',
      description: '用户创建的角色'
    });
    expect(assistant).toBeDefined();
    expect(pharos).toBeDefined();

    const migrated = migratePersistedPersonaPayload({
      personas: [assistant!, pharos!, customPersona],
      seededDefaultPersonaIds: []
    }, {
      includeBundledDefaultPersonas: false
    });

    expect(migrated.personas.map((persona) => persona.id)).toEqual(['persona-custom']);
    expect(migrated.seededDefaultPersonaIds).toEqual([...BUNDLED_DEFAULT_PERSONA_IDS]);
  });

  it('starts fresh installs with Xiao Assistant before Pharos', () => {
    usePersonaStore.setState(usePersonaStore.getInitialState(), true);

    const state = usePersonaStore.getState();

    expect(state.activeCollaboratorId).toBe('polaris-assistant');
    expect(state.seededDefaultPersonaIds).toEqual([POLARIS_ASSISTANT_PERSONA_ID]);
    expect(state.personas.map((persona) => persona.id)).toEqual(['polaris-assistant', 'pharos']);
    expect(state.personas[0]).toMatchObject({
      name: '小助手',
      description: 'Polaris 使用向导',
      purpose: '带你认识这个房间。有问题时，可以问北极星小助手。',
      systemRole: null,
      compiledPrompt: expect.stringContaining('Polaris 的默认产品向导和上手陪练'),
      advanced: {
        providerId: POLARIS_ASSISTANT_DEFAULT_PROVIDER_ID,
        modelOverride: POLARIS_ASSISTANT_DEFAULT_MODEL,
        showThinking: false
      }
    });
    expect(state.personas[1]).toMatchObject({
      id: 'pharos',
      systemRole: 'default'
    });
  });

  it('allows deleting the built-in Pharos persona', () => {
    usePersonaStore.setState(usePersonaStore.getInitialState(), true);

    const deleted = usePersonaStore.getState().deleteCollaborator('pharos');

    expect(deleted).toBe(true);
    expect(usePersonaStore.getState().personas.some((persona) => persona.id === 'pharos')).toBe(false);
    expect(usePersonaStore.getState().activeCollaboratorId).toBe(usePersonaStore.getState().personas[0]?.id ?? null);
  });

  it('stages an explicit memory-doc body deletion when a collaborator is deleted', () => {
    usePersonaStore.setState(usePersonaStore.getInitialState(), true);
    const stageDeletion = vi.spyOn(personaMemoryDocPersistence, 'stagePersonaMemoryDocDeletionForPersona');

    try {
      usePersonaStore.getState().deleteCollaborator('pharos');
      // The body deletion goes through the explicit channel, not through the persona being
      // absent from the next persist's list.
      expect(stageDeletion).toHaveBeenCalledWith('pharos');
    } finally {
      stageDeletion.mockRestore();
    }
  });

  it('allows editing the built-in Pharos prompt', () => {
    usePersonaStore.setState(usePersonaStore.getInitialState(), true);

    usePersonaStore.getState().updateCollaborator('pharos', {
      compiledPrompt: '用户改过的 Pharos 提示词'
    });

    const pharos = usePersonaStore.getState().personas.find((persona) => persona.id === 'pharos');
    expect(pharos?.compiledPrompt).toBe('用户改过的 Pharos 提示词');
  });

  it('preserves explicit generated prompt opt-out when a collaborator prompt is cleared', () => {
    usePersonaStore.setState(usePersonaStore.getInitialState(), true);
    const customId = usePersonaStore.getState().createPersona({ activate: true, template: 'custom' });

    usePersonaStore.getState().updateCollaborator(customId, {
      compiledPrompt: '',
      generatedPromptMode: 'off',
      builderManaged: false
    });

    const persona = usePersonaStore.getState().personas.find((item) => item.id === customId);
    expect(persona?.advanced.providerRouteMode).toBe('unconfigured');
    expect(persona?.compiledPrompt).toBe('');
    expect(persona?.generatedPromptMode).toBe('off');
    expect(persona?.builderManaged).toBe(false);
  });

  it('pins collaborators above the normal list', () => {
    usePersonaStore.setState(usePersonaStore.getInitialState(), true);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

    try {
      usePersonaStore.getState().toggleCollaboratorPinned('pharos');

      const state = usePersonaStore.getState();
      expect(state.personas[0]?.id).toBe('pharos');
      expect(state.personas[0]?.pinnedAt).toBe(12345);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('keeps pinned collaborators first after hydration migration', () => {
    const pinned = createPersonaTemplate({
      id: 'persona-pinned',
      name: '置顶',
      description: '排在前面',
      pinnedAt: 20
    });
    const regular = createPersonaTemplate({
      id: 'persona-regular',
      name: '普通',
      description: '留在后面'
    });

    const personas = migratePersistedPersonas([regular, pinned], [POLARIS_ASSISTANT_PERSONA_ID]);

    expect(personas.map((persona) => persona.id)).toEqual(['persona-pinned', 'persona-regular']);
  });
});
