import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { StampFoilEngine } from './stampFoilEngine';
import './stamp-gallery.css';

type StampFinish = 'paper' | 'pearl' | 'gold' | 'silver';
type Stamp = {
  id: string;
  title: string;
  image: string;
  finish: StampFinish;
  x: number;
  y: number;
  angle: number;
};

// The artwork stays on its creator's site; no third-party image is bundled into Conflux.
export const STAMP_GALLERY: readonly Stamp[] = [
  { id: 'specimen', title: 'Specimen', image: 'https://billguo.me/stamps/specimen.avif', finish: 'gold', x: 24, y: 62, angle: -17 },
  { id: 'kensho', title: 'Kensho Technologies', image: 'https://billguo.me/stamps/kensho.avif', finish: 'paper', x: 26, y: 34, angle: -11 },
  { id: 'ncs', title: 'New Craft Society', image: 'https://billguo.me/stamps/ncs.avif', finish: 'pearl', x: 48, y: 30, angle: 12 },
  { id: 'motion', title: 'Motion', image: 'https://billguo.me/stamps/motion.avif', finish: 'pearl', x: 75, y: 53, angle: -14 },
  { id: 'gao-han', title: 'Design Hero · GAO HAN', image: 'https://billguo.me/stamps/gao-han.avif', finish: 'paper', x: 54, y: 69, angle: 8 },
  { id: 'lunar-gala', title: 'Lunar Gala', image: 'https://billguo.me/stamps/lunar-gala.avif', finish: 'silver', x: 79, y: 26, angle: 17 },
];

type Pose = { x: number; y: number; tiltX: number; tiltY: number; lightX: number; lightY: number };
type Drag = { index: number; pointerId: number; startX: number; startY: number; originX: number; originY: number };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const zeroPose = (): Pose => ({ x: 0, y: 0, tiltX: 0, tiltY: 0, lightX: 0, lightY: 0 });

export function StampGallery() {
  const stageRef = useRef<HTMLDivElement>(null);
  const stampsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const poses = useRef(STAMP_GALLERY.map(zeroPose));
  const dragging = useRef<Drag | null>(null);
  const active = useRef<number | null>(null);
  const foil = useRef<StampFoilEngine | null>(null);
  const frame = useRef<number | null>(null);
  const order = useRef(10);
  const [selected, setSelected] = useState<number | null>(null);

  const paintPose = (index: number) => {
    const el = stampsRef.current[index];
    if (!el) return;
    const pose = poses.current[index];
    el.style.setProperty('--move-x', `${pose.x}px`);
    el.style.setProperty('--move-y', `${pose.y}px`);
    el.style.setProperty('--tilt-x', `${pose.tiltX}deg`);
    el.style.setProperty('--tilt-y', `${pose.tiltY}deg`);
    el.style.setProperty('--light-x', `${(pose.lightX + 0.5) * 100}%`);
    el.style.setProperty('--light-y', `${(pose.lightY + 0.5) * 100}%`);
  };

  const drawActive = () => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const index = active.current;
      if (index === null || !foil.current) return;
      const canvas = canvasesRef.current[index];
      const element = stampsRef.current[index];
      if (!canvas || !element) return;
      const { lightX, lightY } = poses.current[index];
      if (foil.current.draw(canvas, STAMP_GALLERY[index], lightX, lightY)) {
        element.classList.add('has-foil-render');
      }
    });
  };

  useEffect(() => {
    let disposed = false;
    // The 3D engine is loaded only while the stamp page is open; the book's
    // WebGL scene is unmounted, so the two do not compete on Android.
    void import('./stampFoilEngine').then(({ createStampFoilEngine }) => {
      if (disposed) return;
      const engine = createStampFoilEngine();
      foil.current = engine;
      for (const stamp of STAMP_GALLERY) {
        void engine.prepare(stamp.image).then(() => {
          if (!disposed) drawActive();
        }).catch(() => { /* Plain artwork remains visible when offline. */ });
      }
    }).catch(() => { /* CSS highlight is the no-WebGL fallback. */ });
    return () => {
      disposed = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      foil.current?.dispose();
      foil.current = null;
    };
  }, []); // The gallery owns one engine for its entire mounted lifetime.

  const activate = (index: number) => {
    if (active.current !== null && active.current !== index) {
      stampsRef.current[active.current]?.classList.remove('has-foil-render', 'is-active');
    }
    active.current = index;
    const element = stampsRef.current[index];
    if (element) {
      element.style.zIndex = String(++order.current);
      element.classList.add('is-active');
    }
    drawActive();
  };
  const updateLight = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = clamp((event.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5);
    const py = clamp((event.clientY - bounds.top) / bounds.height - 0.5, -0.5, 0.5);
    const pose = poses.current[index];
    pose.lightX = px;
    pose.lightY = py;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pose.tiltX = reduced ? 0 : -py * 12;
    pose.tiltY = reduced ? 0 : px * 12;
    paintPose(index);
    drawActive();
  };
  const pointerDown = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    activate(index);
    const pose = poses.current[index];
    dragging.current = {
      index, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      originX: pose.x, originY: pose.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
    updateLight(index, event);
  };
  const pointerMove = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragging.current;
    if (drag && drag.index === index && drag.pointerId === event.pointerId) {
      const stage = stageRef.current?.getBoundingClientRect();
      const bounds = event.currentTarget.getBoundingClientRect();
      if (stage) {
        const pose = poses.current[index];
        const stamp = STAMP_GALLERY[index];
        const halfW = bounds.width / 2;
        const halfH = bounds.height / 2;
        const baseX = stage.width * stamp.x / 100;
        const baseY = stage.height * stamp.y / 100;
        pose.x = clamp(drag.originX + event.clientX - drag.startX, halfW - baseX, stage.width - halfW - baseX);
        pose.y = clamp(drag.originY + event.clientY - drag.startY, halfH - baseY, stage.height - halfH - baseY);
      }
    }
    updateLight(index, event);
  };
  const pointerEnd = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    if (dragging.current?.pointerId !== event.pointerId) return;
    dragging.current = null;
    event.currentTarget.classList.remove('is-dragging');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const deactivate = (index: number) => {
    if (dragging.current?.index === index) return;
    poses.current[index].tiltX = 0;
    poses.current[index].tiltY = 0;
    paintPose(index);
    stampsRef.current[index]?.classList.remove('is-active', 'has-foil-render');
    if (active.current === index) active.current = null;
  };
  const reset = () => {
    poses.current = STAMP_GALLERY.map(zeroPose);
    STAMP_GALLERY.forEach((_, index) => paintPose(index));
    setSelected(null);
  };

  return (
    <section className="conflux-stamp-gallery" aria-label="邮票收藏内页">
      <div className="conflux-stamp-gallery__heading">
        <span>COLLECTION / 001</span>
        <strong>邮票藏页</strong>
        <span>六枚 · 纸与金属箔</span>
      </div>
      <div ref={stageRef} className="conflux-stamp-gallery__stage">
        {STAMP_GALLERY.map((stamp, index) => (
          <button
            key={stamp.id}
            ref={(element) => { stampsRef.current[index] = element; }}
            type="button"
            className={`conflux-stamp-gallery__stamp is-${stamp.finish}`}
            style={{ left: `${stamp.x}%`, top: `${stamp.y}%`, '--base-angle': `${stamp.angle}deg` } as CSSProperties}
            aria-label={`${stamp.title}，拖动调整位置，双击复位`}
            onPointerEnter={() => activate(index)}
            onPointerDown={(event) => pointerDown(index, event)}
            onPointerMove={(event) => pointerMove(index, event)}
            onPointerUp={(event) => pointerEnd(index, event)}
            onPointerCancel={(event) => pointerEnd(index, event)}
            onPointerLeave={() => deactivate(index)}
            onFocus={() => activate(index)}
            onBlur={() => deactivate(index)}
            onClick={() => setSelected(index)}
            onDoubleClick={() => { poses.current[index] = zeroPose(); paintPose(index); }}
            onKeyDown={(event) => {
              const delta = event.shiftKey ? 24 : 10;
              const pose = poses.current[index];
              if (event.key === 'ArrowLeft') pose.x -= delta;
              else if (event.key === 'ArrowRight') pose.x += delta;
              else if (event.key === 'ArrowUp') pose.y -= delta;
              else if (event.key === 'ArrowDown') pose.y += delta;
              else return;
              event.preventDefault();
              paintPose(index);
            }}
          >
            <img src={stamp.image} alt="" draggable={false} referrerPolicy="no-referrer" />
            <canvas ref={(element) => { canvasesRef.current[index] = element; }} aria-hidden="true" />
            <span className="conflux-stamp-gallery__shine" aria-hidden="true" />
          </button>
        ))}
      </div>
      <footer className="conflux-stamp-gallery__footer">
        <span>{selected === null ? '按住邮票拖动 · 移动光线观察反射' : STAMP_GALLERY[selected].title}</span>
        <button type="button" onClick={reset}>重新排放</button>
        <a href="https://billguo.me/" target="_blank" rel="noopener noreferrer">邮票原作 · Bill Guo</a>
      </footer>
    </section>
  );
}
