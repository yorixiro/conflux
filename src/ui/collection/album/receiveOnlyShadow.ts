import type { Mesh } from 'three';

const guarded = new WeakSet<Mesh>();

/** VSM also submits receivers. These meshes already use a depth material that writes nothing: skip its vertices too. */
export function skipReceiveOnlyShadowDraw(mesh: Mesh) {
  if (guarded.has(mesh)) return;
  guarded.add(mesh);
  const before = mesh.onBeforeShadow;
  const after = mesh.onAfterShadow;
  let start = 0;
  let count = Infinity;
  mesh.onBeforeShadow = function (...args) {
    before.apply(this, args);
    const geometry = args[4];
    start = geometry.drawRange.start;
    count = geometry.drawRange.count;
    geometry.setDrawRange(0, 0);
  };
  mesh.onAfterShadow = function (...args) {
    args[4].setDrawRange(start, count);
    after.apply(this, args);
  };
}
