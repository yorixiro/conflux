import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestCollaboratorReply } from './requestPipeline';
import { getAssetBlob } from '../../infrastructure/assetStore';
import type { ChatMessage, ProviderProfile } from '../../types/domain';

const requestAssistantReplyMock = vi.hoisted(() => vi.fn());

vi.mock('../../infrastructure/assetStore', () => ({
  getAssetBlob: vi.fn()
}));

vi.mock('../chatApi', () => ({
  requestAssistantReply: requestAssistantReplyMock
}));

const textProvider: ProviderProfile = {
  id: 'custom-text',
  name: 'Text Provider',
  protocol: 'openai-completions',
  baseUrl: 'https://api.xiaomimimo.com/v1',
  path: '/chat/completions',
  apiKey: 'sk-test',
  model: 'text-model',
  capabilities: {
    images: false,
    streaming: true,
    thinking: false
  }
};

const visionProvider: ProviderProfile = {
  id: 'vision-provider',
  name: 'Vision Provider',
  protocol: 'openai-completions',
  baseUrl: 'https://vision.example.test/v1',
  path: '/chat/completions',
  apiKey: 'sk-test',
  model: 'vision-model',
  capabilities: {
    images: true,
    streaming: true,
    thinking: false
  }
};

const imageMessage: ChatMessage = {
  id: 'user-image',
  role: 'user',
  content: 'helphelp!',
  timestamp: 1,
  attachments: [{
    id: 'image-1',
    assetId: 'asset-1',
    kind: 'image',
    name: 'help.png',
    mimeType: 'image/png',
    size: 1024
  }]
};

describe('requestPipeline', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    vi.mocked(getAssetBlob).mockReset();
    requestAssistantReplyMock.mockReset();
  });

  it('exports the collaborator request entrypoint', () => {
    expect(typeof requestCollaboratorReply).toBe('function');
  });

  it('routes a selected Devin ACP provider through chat with real context separators and streamed output', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { prompt: string; initialContext: string };
      expect(body.prompt).toBe('hello');
      expect(body.initialContext).toContain('[user]\nhello');
      expect(body.initialContext).not.toContain(']\\\\n');
      return new Response('data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"hi"}}}\n\ndata: {"type":"done"}\n\n', {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const progress = vi.fn();
    const reply = await requestCollaboratorReply({
      api: { ...textProvider, agentTransport: 'devin-acp' },
      persona: null,
      messages: [{ id: 'user-1', role: 'user', content: 'hello', timestamp: 1 }],
      onProgress: progress
    });
    expect(reply.content).toBe('hi');
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ content: 'hi' }));
    expect(fetchMock).toHaveBeenCalledWith('/devin-acp/prompt', expect.objectContaining({ method: 'POST' }));
    expect(requestAssistantReplyMock).not.toHaveBeenCalled();
  });

  it('preserves readable documents and raw ZIP attachment metadata on Devin ACP without rejecting the turn', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { initialContext: string; prompt: string };
      expect(body.initialContext).toContain('PDF 正文：Conflux 附件测试');
      expect(body.initialContext).toContain('archive.zip');
      expect(body.initialContext).toContain('请阅读附件');
      return new Response('data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"文件已列出"}}}\n\ndata: {"type":"done"}\n\n', {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const reply = await requestCollaboratorReply({
      api: { ...textProvider, agentTransport: 'devin-acp' },
      persona: null,
      messages: [{
        id: 'document-turn', role: 'user', content: '这是文件', timestamp: 1,
        attachments: [
          { id: 'pdf-1', assetId: 'asset-pdf', kind: 'file', name: 'notes.pdf',
            mimeType: 'application/pdf', size: 1000, textContent: 'PDF 正文：Conflux 附件测试' },
          { id: 'zip-1', assetId: 'asset-zip', kind: 'file', name: 'archive.zip',
            mimeType: 'application/zip', size: 1000 }
        ]
      }, {
        id: 'latest-turn', role: 'user', content: '请阅读附件', timestamp: 2
      }]
    });
    expect(reply.content).toBe('文件已列出');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not let an old unreadable image block later text-only ACP turns', async () => {
    const fetchMock = vi.fn(async () => new Response(
      'data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"可以继续聊天"}}}\n\ndata: {"type":"done"}\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    ));
    vi.stubGlobal('fetch', fetchMock);
    const reply = await requestCollaboratorReply({
      api: { ...textProvider, agentTransport: 'devin-acp' },
      persona: null,
      messages: [imageMessage, {
        id: 'later-text', role: 'user', content: '现在只聊天', timestamp: 2
      }]
    });
    expect(reply.content).toBe('可以继续聊天');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends native ACP image content when the live agent advertises image input, without an OCR provider', async () => {
    vi.mocked(getAssetBlob).mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' }));
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/devin-acp/capabilities') {
        return new Response(JSON.stringify({ promptCapabilities: { image: true } }), {
          headers: { 'content-type': 'application/json' }
        });
      }
      expect(url).toBe('/devin-acp/prompt');
      const body = JSON.parse(String(init?.body)) as {
        images: Array<{ mimeType: string; data: string }>;
        prompt: string; initialContext: string;
      };
      expect(body.images).toHaveLength(1);
      expect(body.images[0]?.mimeType).toBe('image/png');
      expect(body.images[0]?.data).toBeTruthy();
      expect(body.initialContext).toContain('helphelp!');
      return new Response('data: {"type":"update","update":{"sessionUpdate":"agent_message_chunk","content":{"text":"看到了图片"}}}\n\ndata: {"type":"done"}\n\n', {
        headers: { 'content-type': 'text/event-stream' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const reply = await requestCollaboratorReply({
      api: { ...textProvider, agentTransport: 'devin-acp' },
      persona: null,
      messages: [imageMessage]
    });
    expect(reply.content).toBe('看到了图片');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestAssistantReplyMock).not.toHaveBeenCalled();
  });

  it('does not send native ACP images when the agent explicitly reports no image capability', async () => {
    vi.mocked(getAssetBlob).mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' }));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      promptCapabilities: { image: false }
    }), { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestCollaboratorReply({
      api: { ...textProvider, agentTransport: 'devin-acp' },
      persona: null,
      messages: [imageMessage]
    })).rejects.toThrow('当前 Devin ACP 未声明直接看图能力');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('checks ACP image capability without sending unsupported image content', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('/devin-acp/capabilities');
      return new Response(JSON.stringify({ promptCapabilities: { image: false } }), {
        headers: { 'content-type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestCollaboratorReply({
      api: { ...textProvider, agentTransport: 'devin-acp' },
      persona: null,
      messages: [imageMessage]
    })).rejects.toThrow('当前 Devin ACP 未声明直接看图能力');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith('/devin-acp/prompt', expect.anything());
  });

  it('blocks image turns before sending when the effective model is text-only and OCR is unavailable', async () => {
    await expect(requestCollaboratorReply({
      api: textProvider,
      persona: null,
      messages: [imageMessage]
    })).rejects.toThrow('当前模型没有直接图片能力');
  });

  it('sends inline images to a vision model without requiring an OCR route', async () => {
    vi.mocked(getAssetBlob).mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' }));
    requestAssistantReplyMock.mockResolvedValueOnce({ content: '主模型直接看到了图片' });

    const reply = await requestCollaboratorReply({
      api: visionProvider,
      imageUnderstanding: { enabled: false },
      persona: null,
      activeConversationId: 'conversation-vision-1',
      messages: [imageMessage]
    });

    expect(reply.content).toBe('主模型直接看到了图片');
    expect(getAssetBlob).toHaveBeenCalledWith('asset-1');
    expect(requestAssistantReplyMock).toHaveBeenCalledTimes(1);
    expect(requestAssistantReplyMock).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'conversation-vision-1'
    }));
    const mainRequestContext = requestAssistantReplyMock.mock.calls[0]?.[0]?.context;
    expect(JSON.stringify(mainRequestContext)).toContain('data:image/png;base64,');
  });

  it('does not send a blind vision request when image hydration fails', async () => {
    vi.mocked(getAssetBlob).mockResolvedValue(null);

    await expect(requestCollaboratorReply({
      api: visionProvider,
      persona: null,
      messages: [imageMessage]
    })).rejects.toThrow('图片附件没有成功进入模型请求');

    expect(requestAssistantReplyMock).not.toHaveBeenCalled();
  });

  it('does not let a tool followup bypass failed image hydration', async () => {
    vi.mocked(getAssetBlob).mockResolvedValue(null);

    await expect(requestCollaboratorReply({
      api: visionProvider,
      persona: null,
      messages: [
        imageMessage,
        {
          id: 'tool-followup',
          role: 'system',
          content: '图片属性工具已经执行，请继续回答用户。',
          timestamp: 2,
          origin: 'tool-runtime'
        }
      ]
    })).rejects.toThrow('图片附件没有成功进入模型请求');

    expect(requestAssistantReplyMock).not.toHaveBeenCalled();
  });

  it('ignores the legacy global image understanding route for text-only chat providers', async () => {
    vi.mocked(getAssetBlob).mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' }));

    await expect(requestCollaboratorReply({
      api: textProvider,
      providers: [visionProvider],
      imageUnderstanding: {
        enabled: true,
        providerId: visionProvider.id
      },
      persona: null,
      messages: [imageMessage]
    })).rejects.toThrow('当前模型没有直接图片能力');

    expect(requestAssistantReplyMock).not.toHaveBeenCalled();
  });

  it('uses the chat provider scoped image understanding route before sending image turns to a text-only model', async () => {
    vi.mocked(getAssetBlob).mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' }));
    requestAssistantReplyMock
      .mockResolvedValueOnce({ content: '图片里写着：OCR OK' })
      .mockResolvedValueOnce({ content: '主模型收到 OCR' });

    const reply = await requestCollaboratorReply({
      api: {
        ...textProvider,
        imageUnderstanding: {
          enabled: true,
          providerId: visionProvider.id
        }
      },
      providers: [visionProvider],
      persona: null,
      messages: [imageMessage]
    });

    expect(reply.content).toBe('主模型收到 OCR');
    expect(requestAssistantReplyMock).toHaveBeenCalledTimes(2);
    expect(requestAssistantReplyMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      api: visionProvider
    }));
    expect(requestAssistantReplyMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      api: expect.objectContaining({
        id: textProvider.id,
        model: textProvider.model
      })
    }));
    const mainRequestContext = requestAssistantReplyMock.mock.calls[1]?.[0]?.context;
    expect(JSON.stringify(mainRequestContext)).toContain('OCR OK');
  });

  it('uses the chat provider scoped image understanding route without reading the legacy global fallback', async () => {
    vi.mocked(getAssetBlob).mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' }));
    requestAssistantReplyMock
      .mockResolvedValueOnce({ content: 'provider scoped OCR' })
      .mockResolvedValueOnce({ content: '主模型收到 provider OCR' });

    const reply = await requestCollaboratorReply({
      api: {
        ...textProvider,
        imageUnderstanding: {
          enabled: true,
          providerId: visionProvider.id,
          modelOverride: 'vision-ocr-model'
        }
      },
      providers: [visionProvider],
      imageUnderstanding: {
        enabled: false
      },
      persona: null,
      messages: [imageMessage]
    });

    expect(reply.content).toBe('主模型收到 provider OCR');
    expect(requestAssistantReplyMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      api: expect.objectContaining({
        id: visionProvider.id,
        model: 'vision-ocr-model'
      })
    }));
    const mainRequestContext = requestAssistantReplyMock.mock.calls[1]?.[0]?.context;
    expect(JSON.stringify(mainRequestContext)).toContain('provider scoped OCR');
  });
});
