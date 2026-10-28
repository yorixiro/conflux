import type { BookLayout, LayoutPreset, LayoutSpec, Rect } from './layout';

// Conflux adapter for Sasshi's ContentSource. The booklet and sleeve rendering
// stay in Sasshi's FlatBook; only the item source comes from Conflux LocalData.
export type SlotCell = {
  side: number;
  slot: number;
  index: number;
  face: 'front' | 'back';
  mirrored: boolean;
  pocket: Rect;
  place: Rect & { tilt: number; r: number };
  seed: number;
};

export type AlbumImageItem = { id: string; label: string; src?: string; href?: string };

export type ContentSource = {
  readonly items: readonly AlbumImageItem[];
  readonly layout: LayoutPreset | LayoutSpec;
  sources: (index: number, face: 'front' | 'back') => readonly string[];
  paintSlot: (context: CanvasRenderingContext2D, cell: SlotCell, env: {
    layout: BookLayout;
    pxPerMm: number;
    font: string;
    image: (src: string) => CanvasImageSource | null;
  }) => void;
};

export function createAlbumImageContent(items: readonly AlbumImageItem[]): ContentSource {
  return {
    items,
    layout: 'idCard2x4',
    sources(index, face) {
      const src = items[index]?.src;
      return face === 'front' && src ? [src] : [];
    },
    paintSlot(ctx, cell, env) {
      const item = items[cell.index];
      if (!item) return;
      const { x, y, w, h, r, tilt } = cell.place;
      const picture = item.src ? env.image(item.src) : null;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(tilt);
      ctx.translate(-w / 2, -h / 2);
      ctx.shadowColor = 'rgba(18, 26, 32, 0.22)';
      ctx.shadowBlur = 1.6;
      ctx.shadowOffsetY = 0.7;
      ctx.fillStyle = '#f7f7f5';
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.clip();
      if (picture) {
        // The preview is a photograph, so fill the sleeve without distorting its ratio.
        const dimensions = picture as HTMLImageElement;
        const imageWidth = dimensions.naturalWidth || dimensions.width || w;
        const imageHeight = dimensions.naturalHeight || dimensions.height || h;
        const scale = Math.max(w / imageWidth, h / imageHeight);
        const drawWidth = imageWidth * scale;
        const drawHeight = imageHeight * scale;
        ctx.drawImage(picture, (w - drawWidth) / 2, (h - drawHeight) / 2, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = '#9ca5aa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `500 6px ${env.font}`;
        ctx.fillText(item.label.slice(0, 18), w / 2, h / 2, w - 12);
      }
      ctx.restore();
    }
  };
}
