import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../../i18n';
import { buildVisibleCollectionShelfNavItems } from './collectionShelfNav';

describe('buildVisibleCollectionShelfNavItems', () => {
  const { t } = createTranslator('zh-CN');

  it('keeps dialogue as the primary collection page and information as the last utility page', () => {
    const items = buildVisibleCollectionShelfNavItems(
      {
        dialogue: true,
        album: false,
        info: true,
        code: true,
        project: true,
        image: false
      },
      t
    );

    expect(items.map((item) => item.shelf)).toEqual(['dialogue', 'project', 'code', 'info']);
  });

  it('reveals shelves only when their real content exists', () => {
    const items = buildVisibleCollectionShelfNavItems(
      {
        dialogue: true,
        album: true,
        info: true,
        code: true,
        project: true,
        image: true
      },
      t
    );

    expect(items.map((item) => item.shelf)).toEqual(['dialogue', 'album', 'project', 'code', 'image', 'info']);
  });
  it('supports an archive without a dialogue-history tab', () => {
    const items = buildVisibleCollectionShelfNavItems(
      { dialogue: false, album: true, info: true, code: true, project: true, image: true },
      t
    );
    expect(items.map((item) => item.shelf)).toEqual(['album', 'project', 'code', 'image', 'info']);
  });

});
