import { describe, expect, it, vi, afterEach } from 'vitest';
import { readWebPageContent, runWebSearch } from './webSearchTool';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('runWebSearch', () => {
  it('uses image search mode for image candidates', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      query: '猫表情包', provider: 'Bing Images',
      results: [{ title: '猫', url: 'https://img.example/cat.png', snippet: '出处' }]
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await runWebSearch('猫表情包', 3, null, 'images');
    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({ mode: 'image-search', maxResults: 3 }));
    if (result.ok) expect(result.detailText).toContain('sendImageAttachment');
  });


  it('sends the user search provider config with the search request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      query: '小红书 链接',
      provider: 'Bocha Search',
      results: [{
        title: '结果',
        url: 'https://example.cn',
        snippet: '摘要'
      }]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runWebSearch('小红书 链接', 4, {
      provider: 'bocha',
      apiKey: 'bocha-key',
      bochaSummary: true,
      bochaFreshness: 'oneWeek'
    });

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      mode: 'search',
      query: '小红书 链接',
      maxResults: 4,
      searchProvider: 'bocha',
      searchApiKey: 'bocha-key',
      bochaSummary: true,
      bochaFreshness: 'oneWeek'
    }));
  });

  it('sends Tavily BYOK search config through the web-search tool', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      query: 'Claude Sonnet 4.6 docs',
      provider: 'Tavily Search',
      results: [{
        title: 'Claude models',
        url: 'https://docs.anthropic.com/en/docs/about-claude/models',
        snippet: 'Claude Sonnet 4.6 is listed.'
      }]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runWebSearch('Claude Sonnet 4.6 docs', 5, {
      provider: 'tavily',
      apiKey: 'tvly-test',
      bochaSummary: true,
      bochaFreshness: 'noLimit'
    });

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      mode: 'search',
      query: 'Claude Sonnet 4.6 docs',
      maxResults: 5,
      searchProvider: 'tavily',
      searchApiKey: 'tvly-test'
    }));
  });

  it('sends custom search endpoint and adapter through the web-search tool', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      query: 'agent search',
      provider: 'My Search',
      results: [{
        title: 'Result',
        url: 'https://example.com/result',
        snippet: 'Custom result.'
      }]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runWebSearch('agent search', 3, {
      provider: 'custom',
      apiKey: 'custom-key',
      bochaSummary: true,
      bochaFreshness: 'noLimit',
      customEndpoint: 'https://search.example.com/search',
      customAdapter: 'tavily',
      customLabel: 'My Search'
    });

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      mode: 'search',
      query: 'agent search',
      maxResults: 3,
      searchProvider: 'custom',
      searchApiKey: 'custom-key',
      customSearchEndpoint: 'https://search.example.com/search',
      customSearchAdapter: 'tavily',
      customSearchLabel: 'My Search'
    }));
  });

  it('defaults to local degraded search instead of a server-owned key', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      query: 'OpenAI',
      provider: 'Bing HTML fallback (degraded)',
      degraded: true,
      warning: '服务器内置搜索 Key 未启用',
      results: [{
        title: 'OpenAI',
        url: 'https://openai.com',
        snippet: 'OpenAI'
      }]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runWebSearch('OpenAI');

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      mode: 'search',
      query: 'OpenAI',
      searchProvider: 'bingLocal'
    }));
  });

  it('reports malformed search responses at the API boundary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      query: 'OpenAI',
      provider: 'broken'
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })));

    await expect(runWebSearch('OpenAI')).resolves.toEqual({
      ok: false,
      error: '搜索服务返回格式异常。'
    });
  });

  it('reports malformed page-read responses at the API boundary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      url: 'https://example.com',
      title: 'Example',
      provider: 'remote-page',
      truncated: false,
      originalLength: 0
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })));

    await expect(readWebPageContent('https://example.com')).resolves.toEqual({
      ok: false,
      error: '网页读取服务返回格式异常。'
    });
  });
});
