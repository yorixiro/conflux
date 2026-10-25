import { describe, expect, it } from 'vitest';
import { createAlbumImageContent } from '../content';
import { sameGrid } from './grid';

describe('Conflux album content updates', () => {
  it('paints newly loaded local photos without rebuilding the 3D book', () => {
    const before = createAlbumImageContent([{ id: 'one', label: '纪念' }]);
    const after = createAlbumImageContent([{ id: 'one', label: '纪念', src: 'blob:local-preview' }]);
    expect(sameGrid(before, after)).toBe(true);
    expect(after.sources(0, 'front')).toEqual(['blob:local-preview']);
  });

  it('rebuilds when the cards themselves change', () => {
    const before = createAlbumImageContent([{ id: 'one', label: '第一张' }]);
    const after = createAlbumImageContent([{ id: 'two', label: '第二张' }]);
    expect(sameGrid(before, after)).toBe(false);
  });
});
