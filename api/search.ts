import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRemotePageWithSafeRedirects } from '../src/engines/server/remotePageReader.js';
import { searchPublicImages } from '../src/engines/server/imageSearchFallback.js';
import { isAllowedPolarisApiOrigin } from '../src/engines/server/corsOrigin.js';

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const BING_SEARCH_URL = 'https://www.bing.com/search';
const BING_IMAGES_URL = 'https://www.bing.com/images/search';
const BRAVE_IMAGES_URL = 'https://api.search.brave.com/res/v1/images/search';
const MAX_IMAGE_IMPORT_BYTES = 6 * 1024 * 1024;
const IMPORT_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const DEFAULT_SEARCH_LIMIT = 8;
const MAX_SEARCH_LIMIT = 20;
const DEFAULT_READ_MAX_CHARS = 40_000;
const MAX_READ_MAX_CHARS = 80_000;
const DAILY_LIMIT = 60;
const rateCounts = new Map<string, { count: number; date: string }>();

type SearchResultItem = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
};

function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  if (isAllowedPolarisApiOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Polaris-Device-Id');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function getUserId(req: VercelRequest): string {
  const deviceId = (req.headers['x-polaris-device-id'] as string)?.trim();
  if (deviceId) return deviceId;
  const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const ip = req.headers['x-real-ip'] as string;
  if (ip) return ip.trim();
  return 'anonymous';
}

function getRateLimitState(userId: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const entry = rateCounts.get(userId);
  if (!entry || entry.date !== today) {
    return { allowed: true, remaining: DAILY_LIMIT };
  }
  if (entry.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: DAILY_LIMIT - entry.count };
}

function consumeRateLimit(userId: string): { remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const entry = rateCounts.get(userId);
  const nextCount = !entry || entry.date !== today ? 1 : Math.min(entry.count + 1, DAILY_LIMIT);
  rateCounts.set(userId, { count: nextCount, date: today });
  return { remaining: Math.max(0, DAILY_LIMIT - nextCount) };
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decodeBingResultUrl(rawHref: string) {
  const href = decodeHtml(rawHref);
  if (/^https?:\/\//i.test(href) && !href.includes('bing.com/ck/a')) {
    return href;
  }
  const match = href.match(/[?&]u=([^&]+)/);
  if (!match) return href;
  const encoded = decodeURIComponent(match[1]);
  if (!encoded.startsWith('a1')) return href;
  try {
    return Buffer.from(encoded.slice(2), 'base64').toString('utf8');
  } catch {
    return href;
  }
}

async function runBraveSearch(query: string, maxResults: number): Promise<{ provider: string; results: SearchResultItem[] }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Brave Search API key missing');
  }

  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(maxResults));

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey
    }
  });
  if (!response.ok) {
    throw new Error(`Brave search failed (${response.status})`);
  }

  const data = await response.json() as {
    web?: {
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
      }>;
    };
  };

  const results = (data.web?.results ?? [])
    .map((item) => ({
      title: item.title?.trim() || item.url?.trim() || '未命名结果',
      url: item.url?.trim() || '',
      snippet: item.description?.trim() || '',
      source: 'Brave'
    }))
    .filter((item) => item.url);

  return { provider: 'Brave Search', results };
}

async function runBingSearch(query: string, maxResults: number): Promise<{ provider: string; results: SearchResultItem[] }> {
  const url = new URL(BING_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(maxResults));
  url.searchParams.set('setlang', 'zh-Hans');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PolarisBot/1.0; +https://vercel.app)',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  });
  if (!response.ok) {
    throw new Error(`Bing search failed (${response.status})`);
  }

  const html = await response.text();
  const sections = html.split(/<li class="b_algo"[\s>]/i).slice(1);
  const results: SearchResultItem[] = [];

  for (const section of sections) {
    if (results.length >= maxResults) break;
    const linkMatch = section.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const urlValue = decodeBingResultUrl(linkMatch[1]);
    if (!/^https?:\/\//i.test(urlValue)) continue;

    const snippetMatch = section.match(/<div class="b_caption"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    const sourceMatch = section.match(/<cite>([\s\S]*?)<\/cite>/i);
    results.push({
      title: stripHtml(linkMatch[2]) || urlValue,
      url: urlValue,
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : '',
      source: sourceMatch ? stripHtml(sourceMatch[1]) : 'Bing'
    });
  }

  return { provider: 'Bing', results };
}


async function runBraveImageSearch(query: string, maxResults: number, clientApiKey?: string) {
  const apiKey = clientApiKey?.trim() || process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) throw new Error('Brave Image Search requires an API key');
  const url = new URL(BRAVE_IMAGES_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(maxResults));
  url.searchParams.set('safesearch', 'strict');
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey }
  });
  if (!response.ok) throw new Error('Brave image search failed (' + response.status + ')');
  const data = await response.json() as {
    results?: Array<{
      title?: string | null;
      url?: string | null;
      source?: string | null;
      properties?: { url?: string | null };
      thumbnail?: { src?: string | null };
    }>;
  };
  const results: SearchResultItem[] = (data.results ?? []).flatMap((item) => {
    const imageUrl = item.properties?.url || item.thumbnail?.src || '';
    if (!/^https?:\/\//i.test(imageUrl)) return [];
    return [{
      title: item.title?.trim() || '图片',
      url: imageUrl,
      snippet: item.url ? '图片来源页：' + item.url : '',
      source: item.source || 'Brave Images'
    }];
  });
  return { provider: 'Brave Images', results: results.slice(0, maxResults) };
}

async function runBingImageSearch(query: string, maxResults: number) {
  const url = new URL(BING_IMAGES_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('adlt', 'strict');
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ConfluxBot/1.0)',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  });
  if (!response.ok) throw new Error('Bing image search failed (' + response.status + ')');
  const html = await response.text();
  const tags = html.match(/<a\b[^>]*\bclass=(["'])[^"']*\biusc\b[^"']*\1[^>]*>/gi) ?? [];
  const results: SearchResultItem[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    if (results.length >= maxResults) break;
    const metadata = tag.match(/\bm=(["'])([\s\S]*?)\1/i)?.[2];
    if (!metadata) continue;
    try {
      const entry = JSON.parse(decodeHtml(metadata)) as {
        murl?: string; turl?: string; purl?: string; t?: string;
      };
      const imageUrl = entry.murl || entry.turl || '';
      if (!/^https?:\/\//i.test(imageUrl) || seen.has(imageUrl)) continue;
      seen.add(imageUrl);
      results.push({
        title: entry.t?.trim() || '图片',
        url: imageUrl,
        snippet: entry.purl ? '图片来源页：' + entry.purl : '',
        source: 'Bing Images'
      });
    } catch {
      // Ignore malformed search metadata.
    }
  }
  return { provider: 'Bing Images', results };
}


async function runCommonsImageSearch(query: string, maxResults: number) {
  const cleaned = query.replace(/表情包|动图|贴纸|图片/g, ' ').trim();
  const terms = [query.trim(), cleaned];
  const animal = /猫/.test(query) ? 'cat' : /狗|犬/.test(query) ? 'dog'
    : /兔/.test(query) ? 'rabbit' : /熊猫/.test(query) ? 'panda' : '';
  if (animal) terms.push(animal + ' meme', animal);
  for (const term of [...new Set(terms.filter(Boolean))]) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    for (const [key, value] of Object.entries({
      action: 'query', format: 'json', generator: 'search',
      gsrsearch: term, gsrnamespace: '6', gsrlimit: String(Math.min(30, maxResults * 5)),
      prop: 'imageinfo', iiprop: 'url|mime|size'
    })) url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Conflux/1.0 (image search)' },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('Commons image search failed (' + response.status + ')');
    const data = await response.json() as { query?: { pages?: Record<string, {
      title?: string;
      imageinfo?: Array<{ url?: string; mime?: string; size?: number; descriptionurl?: string }>;
    }> } };
    const results: SearchResultItem[] = Object.values(data.query?.pages ?? {}).flatMap(page => {
      const image = page.imageinfo?.[0];
      if (!image?.url?.startsWith('https://') ||
        !IMPORT_IMAGE_MIMES.has(image.mime || '') ||
        (typeof image.size === 'number' && image.size > MAX_IMAGE_IMPORT_BYTES)) return [];
      return [{
        title: page.title?.replace(/^File:/, '') || '图片',
        url: image.url,
        snippet: image.descriptionurl ? '图片来源：' + image.descriptionurl : '',
        source: 'Wikimedia Commons'
      }];
    }).slice(0, maxResults);
    if (results.length) return { provider: 'Wikimedia Commons', results };
  }
  return { provider: 'Wikimedia Commons', results: [] as SearchResultItem[] };
}

async function importRemoteImage(rawUrl: string) {
  const { response, finalUrl } = await fetchRemotePageWithSafeRedirects(rawUrl, {
    headers: { Accept: 'image/png,image/jpeg,image/webp,image/gif' },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error('图片读取失败（' + response.status + '）');
  const mimeType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!IMPORT_IMAGE_MIMES.has(mimeType)) {
    throw new Error('图片只支持 PNG、JPEG、WebP 或 GIF 格式。');
  }
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_IMPORT_BYTES) {
    throw new Error('图片超过 6 MiB 限制。');
  }
  if (!response.body) throw new Error('图片响应缺少文件内容。');
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_IMPORT_BYTES) {
        await reader.cancel();
        throw new Error('图片超过 6 MiB 限制。');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new Error('图片文件为空。');
  return {
    url: finalUrl,
    mimeType,
    dataUrl: 'data:' + mimeType + ';base64,' + Buffer.concat(chunks).toString('base64')
  };
}

function htmlToReadableText(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const description = metaTags
    .map((tag) => {
      const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase();
      if (!key || !['description', 'og:description', 'twitter:description'].includes(key)) return '';
      return decodeHtml(tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? '').trim();
    })
    .find(Boolean);
  const title = titleMatch ? stripHtml(titleMatch[1]) : null;
  const text = stripHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/li|\/section|\/article|\/h\d)>/gi, '\n')
  );
  return { title, text: [description, text].filter(Boolean).join('\n\n') };
}

function restrictedSocialPlatformLabel(rawUrl: string, finalUrl: string) {
  const urls = [rawUrl, finalUrl];
  for (const url of urls) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname === 'xhslink.com' || hostname.endsWith('.xhslink.com') || hostname === 'xiaohongshu.com' || hostname.endsWith('.xiaohongshu.com')) {
        return '小红书';
      }
      if (hostname === 'douyin.com' || hostname.endsWith('.douyin.com') || hostname === 'iesdouyin.com' || hostname.endsWith('.iesdouyin.com') || hostname === 'v.douyin.com') {
        return '抖音';
      }
    } catch {
      // Fetch validation owns URL safety; this helper only improves platform
      // failure wording when either URL is parseable.
    }
  }
  return '';
}

function restrictedSocialPlatformError(platform: string) {
  return `${platform}没有向网页读取器返回正文；这通常是平台登录、App 跳转或风控限制，不代表链接失效。请让用户贴出正文/截图，或改用标题和关键词搜索结果交叉确认。`;
}

function remotePageUserAgent(rawUrl: string) {
  const platform = restrictedSocialPlatformLabel(rawUrl, rawUrl);
  if (platform === '抖音') {
    return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  }
  return 'Mozilla/5.0 (compatible; PolarisBot/1.0; +https://vercel.app)';
}

function isRestrictedSocialPlatformShell(platform: string, title: string | null, text: string) {
  const content = `${title ?? ''}\n${text}`.trim();
  if (!platform || !content) return false;
  if (platform === '小红书') {
    return /你访问的页面不见了|errorCode=-?510001|404\s*page\s*not\s*found|页面不存在|请稍后重试/i.test(content);
  }
  if (platform === '抖音') {
    return /please\s*wait|页面不存在|内容不存在|登录后观看|安全验证|验证码|404\s*page\s*not\s*found/i.test(content);
  }
  return false;
}

function shouldReturnReadablePlatformShell(platform: string) {
  return platform === '小红书';
}

async function readRemotePage(rawUrl: string, maxChars: number) {
  const { response, finalUrl } = await fetchRemotePageWithSafeRedirects(rawUrl, {
    headers: {
      'User-Agent': remotePageUserAgent(rawUrl),
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  });
  const restrictedPlatform = restrictedSocialPlatformLabel(rawUrl, finalUrl);
  const contentType = response.headers.get('content-type') || '';
  const readableContentType = /text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType);
  if (!response.ok && !(shouldReturnReadablePlatformShell(restrictedPlatform) && readableContentType)) {
    if (restrictedPlatform) {
      throw new Error(restrictedSocialPlatformError(restrictedPlatform));
    }
    throw new Error(`网页读取失败（${response.status}）`);
  }

  if (!readableContentType) {
    throw new Error(`暂时只支持读取文本网页，当前类型是 ${contentType || 'unknown'}。`);
  }

  const body = await response.text();
  const parsed = /text\/plain/i.test(contentType)
    ? { title: null, text: body.replace(/\s+/g, ' ').trim() }
    : htmlToReadableText(body);
  const originalLength = parsed.text.length;
  const text = parsed.text.slice(0, maxChars).trim();

  if (!text) {
    throw new Error('这个网页没有可读取的正文内容。');
  }
  if (
    isRestrictedSocialPlatformShell(restrictedPlatform, parsed.title, text) &&
    !shouldReturnReadablePlatformShell(restrictedPlatform)
  ) {
    throw new Error(restrictedSocialPlatformError(restrictedPlatform));
  }

  return {
    url: finalUrl,
    title: parsed.title,
    text,
    truncated: text.length < originalLength,
    originalLength
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed', type: 'invalid_request' } });
    return;
  }

  const body = req.body || {};
  const userId = getUserId(req);
  const setRateLimitHeaders = (remaining: number) => {
    res.setHeader('X-RateLimit-Limit', String(DAILY_LIMIT));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  };
  try {
    if (body.mode === 'image-import') {
      const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
      if (!rawUrl) {
        res.status(400).json({ error: { message: '缺少图片 URL', type: 'invalid_request' } });
        return;
      }
      const rateLimit = getRateLimitState(userId);
      setRateLimitHeaders(rateLimit.remaining);
      if (!rateLimit.allowed) {
        res.status(429).json({ error: { message: '今天的联网查询次数用完了。', type: 'rate_limit' } });
        return;
      }
      const nextRateLimit = consumeRateLimit(userId);
      setRateLimitHeaders(nextRateLimit.remaining);
      res.status(200).json(await importRemoteImage(rawUrl));
      return;
    }
    if (body.mode === 'read') {
      const url = typeof body.url === 'string' ? body.url.trim() : '';
      const maxChars = Math.max(1000, Math.min(MAX_READ_MAX_CHARS, Number(body.maxChars) || DEFAULT_READ_MAX_CHARS));
      if (!url) {
        res.status(400).json({ error: { message: '缺少 url', type: 'invalid_request' } });
        return;
      }

      const rateLimit = getRateLimitState(userId);
      setRateLimitHeaders(rateLimit.remaining);
      if (!rateLimit.allowed) {
        res.status(429).json({ error: { message: '今天的联网查询次数用完了，明天再来吧。', type: 'rate_limit' } });
        return;
      }

      const page = await readRemotePage(url, maxChars);
      const nextRateLimit = consumeRateLimit(userId);
      setRateLimitHeaders(nextRateLimit.remaining);
      res.status(200).json({
        ...page,
        provider: 'remote-page'
      });
      return;
    }

    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const maxResults = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Number(body.maxResults) || DEFAULT_SEARCH_LIMIT));
    if (!query) {
      res.status(400).json({ error: { message: '缺少 query', type: 'invalid_request' } });
      return;
    }

    const rateLimit = getRateLimitState(userId);
    setRateLimitHeaders(rateLimit.remaining);
    if (!rateLimit.allowed) {
      res.status(429).json({ error: { message: '今天的联网查询次数用完了，明天再来吧。', type: 'rate_limit' } });
      return;
    }

    let provider = '';
    let results: SearchResultItem[] = [];
    if (body.mode === 'image-search') {
      // The default Bing image search does not require a key.
      const imageKey = body.searchProvider === 'brave' && typeof body.searchApiKey === 'string'
        ? body.searchApiKey.trim() : '';
      if (imageKey || process.env.BRAVE_SEARCH_API_KEY?.trim()) {
        try {
          const brave = await runBraveImageSearch(query, maxResults, imageKey);
          if (brave.results.length) { provider = brave.provider; results = brave.results; }
        } catch { /* Try the free providers. */ }
      }
      if (!results.length) {
        try {
          const bing = await runBingImageSearch(query, maxResults);
          if (bing.results.length) { provider = bing.provider; results = bing.results; }
        } catch { /* Bing's HTML layout is not stable. */ }
      }
      if (!results.length) {
        const commons = await runCommonsImageSearch(query, maxResults);
        provider = commons.provider;
        results = commons.results;
      }
      if (!results.length) throw new Error('图片搜索未找到可用的图片，不能把空结果当成成功。');
    } else {
      try {
        const brave = await runBraveSearch(query, maxResults);
        provider = brave.provider;
        results = brave.results;
      } catch {
        const bing = await runBingSearch(query, maxResults);
        provider = bing.provider;
        results = bing.results;
      }
    }

    const nextRateLimit = consumeRateLimit(userId);
    setRateLimitHeaders(nextRateLimit.remaining);
    res.status(200).json({
      query,
      provider,
      results: results.slice(0, maxResults)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '搜索服务失败。';
    setRateLimitHeaders(getRateLimitState(userId).remaining);
    res.status(502).json({ error: { message, type: 'search_error' } });
  }
}
