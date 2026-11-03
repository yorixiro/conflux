import { describe, expect, it, vi } from 'vitest';
import { publicImageSearchTerms, searchPublicImages } from './imageSearchFallback';

describe('public image search fallback', () => {
  it('keeps the original search and retries an English subject for common Chinese sticker terms', () => {
    expect(publicImageSearchTerms('猫咪表情包')).toEqual(['猫咪表情包', '猫咪', 'cat gif', 'cat']);
  });

  it('gets actual image file URLs after a zero-result query', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ query: { pages: {} } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        query: { pages: {
          '1': { title: 'File:Cat.gif', imageinfo: [{
            url: 'https://upload.wikimedia.org/example/cat.gif',
            mime: 'image/gif',
            size: 1024,
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Cat.gif'
          }] }
        } }
      }), { status: 200 }));
    const result = await searchPublicImages('猫咪表情包', 3, fetcher as typeof fetch);
    expect(result.provider).toBe('Wikimedia Commons');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].url).toBe('https://upload.wikimedia.org/example/cat.gif');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('excludes unsupported formats and oversized files', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      query: { pages: {
        '1': { title: 'File:Video.svg', imageinfo: [{url:'https://upload.wikimedia.org/a.svg',mime:'image/svg+xml',size:100}] },
        '2': { title: 'File:Large.png', imageinfo: [{url:'https://upload.wikimedia.org/b.png',mime:'image/png',size:9000000}] }
      } }
    }), { status: 200 }));
    const result = await searchPublicImages('rabbit', 4, fetcher as typeof fetch);
    expect(result.results).toEqual([]);
  });
});
