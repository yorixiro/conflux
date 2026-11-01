import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MessageTokenUsage } from './MessageTokenUsage';

describe('message usage visibility', () => {
  it('keeps the user timestamp without a token control, even with legacy usage data', () => {
    const html = renderToStaticMarkup(<MessageTokenUsage message={{
      id: 'user', role: 'user', content: 'hello', timestamp: 1, tokenCount: 123
    }} />);
    expect(html).toContain('<time');
    expect(html).not.toContain('message-token-trigger');
    expect(html).not.toContain('123');
  });

  it('keeps the assistant usage button and ACP report label', () => {
    const html = renderToStaticMarkup(<MessageTokenUsage message={{
      id: 'assistant', role: 'assistant', content: 'hello', timestamp: 1,
      model: 'Devin ACP', acpTokenReport: { totalTokens: 26693 }
    }} />);
    expect(html).toContain('message-token-trigger');
    expect(html).toContain('ACP 报告');
    expect(html).toContain('26,693');
  });
});
