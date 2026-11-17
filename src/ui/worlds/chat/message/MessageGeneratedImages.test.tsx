import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChatAttachment } from '../../../../types/domain';
import { MessageGeneratedImages } from './MessageGeneratedImages';

function createImageAttachment(overrides: Partial<ChatAttachment> = {}): ChatAttachment {
  return {
    id: 'att-1',
    assetId: 'asset-1',
    kind: 'image',
    name: '星夜.png',
    mimeType: 'image/png',
    size: 204800,
    ...overrides
  };
}

describe('MessageGeneratedImages', () => {
  it('renders a showcase card with name, size, and a save button', () => {
    const html = renderToStaticMarkup(createElement(MessageGeneratedImages, {
      attachments: [createImageAttachment()],
      onSave: () => {}
    }));

    expect(html).toContain('generated-image-card');
    expect(html).toContain('星夜.png');
    expect(html).toContain('200 KB');
    expect(html).toContain('attachment-save-btn');
  });

  it('marks cleared images and hides the save button', () => {
    const html = renderToStaticMarkup(createElement(MessageGeneratedImages, {
      attachments: [createImageAttachment({ clearedAt: 5 })],
      onSave: () => {}
    }));

    expect(html).toContain('is-cleared');
    expect(html).not.toContain('attachment-save-btn');
  });

  it('renders stickers as a bare small square without caption or save button', () => {
    const html = renderToStaticMarkup(createElement(MessageGeneratedImages, {
      attachments: [createImageAttachment({ presentation: 'sticker' })],
      onSave: () => {}
    }));

    expect(html).toContain('generated-image-sticker');
    expect(html).toContain('sticker-only');
    expect(html).not.toContain('generated-image-caption');
    expect(html).not.toContain('attachment-save-btn');
  });

  it('keeps cleared sticker placeholders readable and mixed ordinary images as showcase cards', () => {
    const html = renderToStaticMarkup(createElement(MessageGeneratedImages, {
      attachments: [createImageAttachment({ presentation: 'sticker', clearedAt: 5 }), createImageAttachment({ id: 'ordinary' })]
    }));
    expect(html).toContain('is-cleared');
    expect(html).toContain('generated-image-caption');
    expect(html).not.toContain('sticker-only');
  });

  it('renders nothing without attachments', () => {
    const html = renderToStaticMarkup(createElement(MessageGeneratedImages, {
      attachments: []
    }));
    expect(html).toBe('');
  });
});
