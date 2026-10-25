import { describe, expect, it } from 'vitest';
import { executeEnvironmentDirectoryAction, type EnvironmentDirectorySnapshot } from './environmentDirectory';

const baseSnapshot: EnvironmentDirectorySnapshot = {
  activeWorld: 'chat',
  collectionShelf: 'code',
  activeConversation: {
    id: 'conv-1',
    title: '现在线',
    collaboratorId: 'persona-1',
    activeProjectId: 'project-1'
  },
  activeCollaboratorName: 'Pharos',
  albumOwnerId: 'persona-1',
  albumImageCards: [{
    id: 'photo-1',
    title: '雨天的照片',
    assetId: 'asset-1',
    tags: ['雨天', '纪念'],
    source: 'manual'
  }],
  albumCanSendImage: true,
  albumCanInspectImage: true,
  albumCanSaveAttachment: true,
  activeCardId: 'card-1',
  cards: [{
    id: 'card-1',
    title: '设置说明卡',
    language: 'markdown',
    kind: 'card',
    tags: ['settings']
  }],
  imageCards: [],
  roomProjects: [{
    id: 'project-1',
    title: 'Aru Native Mode',
    slug: 'aru-native-mode',
    entryFileId: 'file-1'
  }],
  projectFiles: [{
    id: 'file-1',
    projectId: 'project-1',
    filePath: 'src/nativeMode.ts',
    language: 'typescript',
    fileRole: 'logic',
    updatedAt: 123
  }],
  workspaceReferenceDocs: [{
    id: 'ref-1',
    projectId: 'project-1',
    title: '设计意图',
    summary: '环境目录不是操作系统',
    source: 'manual'
  }],
  memoryDocs: [{
    id: 'mem-1',
    title: '用户偏好',
    summary: '少兜底，边界清楚',
    updatedAt: 456
  }],
  providers: [{
    id: 'provider-1',
    name: 'OpenAI Compatible',
    protocol: 'openai-responses',
    model: 'gpt-5'
  }],
  activeProviderId: 'provider-1',
  mcpServers: [{
    id: 'mcp-1',
    name: 'Docs',
    isActive: true,
    tools: [{
      name: 'read_doc',
      description: 'Read docs',
      inputSchema: {},
      enabled: true
    }]
  }],
  webSearch: {
    provider: 'bingLocal',
    apiKey: '',
    bochaSummary: true,
    bochaFreshness: 'noLimit',
    customEndpoint: '',
    customAdapter: 'tavily',
    customLabel: ''
  },
  desktopLocalHost: null,
  attachmentCount: 0,
  archiveAttachmentCount: 0,
  imageAttachmentCount: 0,
  calendarAvailable: false,
  calendarWriteAvailable: false,
  imageGenerationAvailable: false,
  memorySearchAvailable: true
};

describe('executeEnvironmentDirectoryAction', () => {
  it('lists the root as a directory of environment surfaces rather than instructions', () => {
    const result = executeEnvironmentDirectoryAction(baseSnapshot, {
      kind: 'listEnvironmentNodes'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detailText).toContain('environment/settings');
    expect(result.detailText).toContain('environment/workspace');
    expect(result.detailText).toContain('节点是取景索引，不是写入口');
  });

  it('inspects a workspace node with real follow-up tools', () => {
    const result = executeEnvironmentDirectoryAction(baseSnapshot, {
      kind: 'inspectEnvironmentNode',
      nodeId: 'environment/workspace'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detailText).toContain('当前工作区：Aru Native Mode');
    expect(result.detailText).toContain('tool=listProjectFiles');
    expect(result.detailText).toContain('environment/workspace/file/file-1');
  });

  it('searches by natural language without materializing the whole tree into the request', () => {
    const result = executeEnvironmentDirectoryAction(baseSnapshot, {
      kind: 'searchEnvironmentNodes',
      query: 'provider'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detailText).toContain('environment/settings/provider');
    expect(result.detailText).toContain('OpenAI Compatible');
  });

  it('discovers the blue album from Archive with its existing image-card source and tool boundaries', () => {
    const root = executeEnvironmentDirectoryAction(baseSnapshot, { kind: 'listEnvironmentNodes' });
    expect(root.ok).toBe(true);
    if (!root.ok) return;
    expect(root.detailText).toContain('environment/archive');

    const found = executeEnvironmentDirectoryAction(baseSnapshot, {
      kind: 'searchEnvironmentNodes', query: '收藏册'
    });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.detailText).toContain('environment/archive/album');

    const album = executeEnvironmentDirectoryAction(baseSnapshot, {
      kind: 'inspectEnvironmentNode', nodeId: 'environment/archive/album'
    });
    expect(album.ok).toBe(true);
    if (!album.ok) return;
    expect(album.detailText).toContain('1 张收藏图片');
    expect(album.detailText).toContain('雨天的照片');
    expect(album.detailText).toContain('tool=sendImageAttachment');
    expect(album.detailText).toContain('tool=saveAttachmentToCollection');
    expect(album.detailText).toContain('不列用户私人或其他 AI 的收藏');
  });

  it('keeps an unbound conversation album empty without conflating missing access with lost photos', () => {
    const result = executeEnvironmentDirectoryAction({
      ...baseSnapshot,
      albumOwnerId: null,
      albumImageCards: []
    }, { kind: 'inspectEnvironmentNode', nodeId: 'environment/archive/album' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detailText).toContain('当前没有可读取收藏册的协作者');
    expect(result.detailText).not.toContain('asset-1');
    expect(result.detailText).not.toContain('雨天的照片');
    expect(result.detailText).not.toContain('tool=saveAttachmentToCollection');
  });

  it('does not advertise an album write tool when attachments are unavailable or disabled', () => {
    const result = executeEnvironmentDirectoryAction({
      ...baseSnapshot,
      albumCanSaveAttachment: false,
      albumCanSendImage: false
    }, { kind: 'inspectEnvironmentNode', nodeId: 'environment/archive/album' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detailText).toContain('当前附件收藏工具=未开放');
    expect(result.detailText).not.toContain('tool=saveAttachmentToCollection');
    expect(result.detailText).not.toContain('tool=sendImageAttachment');
  });
});
