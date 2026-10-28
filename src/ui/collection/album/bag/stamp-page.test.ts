import { describe, expect, it } from 'vitest';
import { composeDeal, footprintsTouch } from './compose';
import { STAMP_BODY } from './objects/stamp';

describe('postage pocket layout', () => {
  it('keeps all six physical stamps separated within the zipper sleeve', () => {
    const kinds = Array(6).fill('stamp') as ('stamp')[];
    const bodies = kinds.map((_, i) => ({ id: `stamp:${i}`, ...STAMP_BODY }));
    for (const turn of [0, 1]) {
      const stamps = composeDeal(kinds, bodies, 7)(turn);
      expect(stamps).toHaveLength(6);
      const positions = stamps.map((p) => {
        expect(p).not.toBeNull();
        expect(Math.abs(p!.x) + STAMP_BODY.w / 2).toBeLessThan(0.115);
        expect(Math.abs(p!.y) + STAMP_BODY.h / 2).toBeLessThan(0.16);
        return { x: p!.x, y: p!.y, angle: p!.angle, w: STAMP_BODY.w, h: STAMP_BODY.h };
      });
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          expect(footprintsTouch(positions[i]!, positions[j]!, 0)).toBe(false);
        }
      }
    }
  });
});
