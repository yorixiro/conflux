export type PublicImageSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

type CommonsImageInfo = {
  url?: string;
  mime?: string;
  size?: number;
  descriptionurl?: string;
  extmetadata?: { LicenseShortName?: { value?: string } };
};
type CommonsResponse = {
  query?: { pages?: Record<string, { title?: string; imageinfo?: CommonsImageInfo[] }> };
};

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export function publicImageSearchTerms(query: string) {
  const original = query.trim();
  const stripped = original.replace(/表情包|表情|贴纸|动图|图片/gi, ' ').trim();
  const words = [original];
  if (stripped && stripped !== original) words.push(stripped);
  const terms: Array<[RegExp, string]> = [
    [/猫咪|猫/, 'cat'],
    [/柴犬/, 'shiba inu'],
    [/狗狗|小狗|犬/, 'dog'],
    [/兔子|兔/, 'rabbit'],
    [/熊猫/, 'panda']
  ];
  const animal = terms.find(([pattern]) => pattern.test(stripped))?.[1];
  if (animal) words.push(animal + ' gif', animal);
  return [...new Set(words.filter(Boolean))].slice(0, 4);
}

export async function searchPublicImages(
  query: string,
  maxResults: number,
  fetcher: typeof fetch = fetch
): Promise<{ provider: string; results: PublicImageSearchResult[] }> {
  const limit = Math.max(1, Math.min(20, Math.floor(maxResults)));
  for (const searchTerm of publicImageSearchTerms(query)) {
    const apiUrl = new URL('https://commons.wikimedia.org/w/api.php');
    apiUrl.searchParams.set('action', 'query');
    apiUrl.searchParams.set('format', 'json');
    apiUrl.searchParams.set('generator', 'search');
    apiUrl.searchParams.set('gsrsearch', searchTerm);
    apiUrl.searchParams.set('gsrnamespace', '6');
    apiUrl.searchParams.set('gsrlimit', String(Math.min(50, limit * 4)));
    apiUrl.searchParams.set('prop', 'imageinfo');
    apiUrl.searchParams.set('iiprop', 'url|mime|size|extmetadata');
    apiUrl.searchParams.set('iiextmetadatafilter', 'LicenseShortName');

    const response = await fetcher(apiUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Conflux/1.0 (personal image search; https://github.com/yorixiro/conflux)'
      },
      signal: AbortSignal.timeout(12_000)
    });
    if (!response.ok) throw new Error('公开图片库请求失败（' + response.status + '）');
    const data = await response.json() as CommonsResponse;
    const pages = Object.values(data.query?.pages ?? {});
    const seen = new Set<string>();
    const results: PublicImageSearchResult[] = pages.flatMap((page) => {
      const info = page.imageinfo?.[0];
      const imageUrl = info?.url?.trim() ?? '';
      if (!imageUrl.startsWith('https://') || !IMAGE_MIMES.has(info?.mime ?? '')
        || (typeof info?.size === 'number' && info.size > MAX_IMAGE_BYTES)
        || seen.has(imageUrl)) return [];
      seen.add(imageUrl);
      const sourcePage = info?.descriptionurl?.startsWith('https://') ? info.descriptionurl : '';
      const license = info?.extmetadata?.LicenseShortName?.value?.replace(/<[^>]+>/g, '').trim();
      return [{
        title: page.title?.replace(/^File:/, '') ?? '图片',
        url: imageUrl,
        snippet: [sourcePage ? '来源：' + sourcePage : '', license ? '授权：' + license : '']
          .filter(Boolean).join('；'),
        source: 'Wikimedia Commons'
      }];
    }).slice(0, limit);
    if (results.length) return { provider: 'Wikimedia Commons', results };
  }
  return { provider: 'Wikimedia Commons', results: [] };
}
