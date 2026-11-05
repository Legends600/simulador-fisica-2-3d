import * as THREE from 'three';
import {
  electricAt,
  magneticAt,
  traceField,
  equipotentialMesh,
  norm,
  sub,
  unit,
} from '../../core/physics.js';
import { COLORS } from '../palette.js';
import { addFlow } from '../motion.js';
export function drawMagnetic(s) {
  this.clear();
  if (s.mode === 'lorentz') {
    for (let x = -3; x <= 3; x += 1.5)
      for (let y = -3; y <= 3; y += 1.5) {
        if (s.bz) this.arrow([x, y, 0], [0, 0, Math.sign(s.bz) * 0.6], 0x7396d0, 0.12);
        if (s.ey) this.arrow([x, y, 0], [0, Math.sign(s.ey) * 0.5, 0], 0x8ad5c8, 0.1);
      }
    return;
  }
  const field = (p) => magneticAt(p, s.source, s.strength),
    seeds = [],
    flowPaths = [];
  if (s.source === 'dipole') {
    const reversed = s.strength < 0;
    this.box([0, 0.34, 0], [0.6, 0.68, 0.5], reversed ? 0x6496d8 : 0xe48b75);
    this.box([0, -0.34, 0], [0.6, 0.68, 0.5], reversed ? 0xe48b75 : 0x6496d8);
    if (s.strength !== 0) {
      this.label(reversed ? 'S' : 'N', [0, 0.37, 0.3], '#fff1e8', 0.3);
      this.label(reversed ? 'N' : 'S', [0, -0.37, 0.3], '#edf4ff', 0.3);
    }
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      for (const radius of [0.18, 0.38, 0.65])
        seeds.push([Math.cos(a) * radius, 0.72, Math.sin(a) * radius]);
    }
  } else if (s.source === 'wire') {
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xe9b66e, metalness: 0.5, roughness: 0.3 }),
    );
    wire.rotation.x = Math.PI / 2;
    this.content.add(wire);
    this.arrow([0, 0, -2], [0, 0, 4 * Math.sign(s.strength || 1)], 0xf1c580, 0.22);
    this.label('I', [0.3, 0.3, 1.5], '#f2c27e', 0.35);
    for (const z of this.view === '2d' ? [0] : [-1.8, 0, 1.8])
      for (let r = 0.6; r < 3.4; r += 0.55) seeds.push([r, 0, z]);
  } else {
    this.content.add(
      new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.045, 12, 80),
        new THREE.MeshStandardMaterial({ color: 0xe9b66e, metalness: 0.4, roughness: 0.3 }),
      ),
    );
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      for (const radius of [0.2, 0.5, 0.8, 1.3])
        seeds.push([Math.cos(a) * radius, Math.sin(a) * radius, 0.05]);
    }
    this.label('Espira · R = 1 m', [0, -1.4, 0], '#efbc76', 0.3);
  }
  const stop = (p) =>
    s.source === 'loop'
      ? Math.hypot(Math.hypot(p[0], p[1]) - 1, p[2]) < 0.07
      : s.source === 'dipole'
        ? norm(p) < 0.4
        : false;
  if (s.strength !== 0)
    for (const seed of seeds) {
      const options = { maxSteps: 450, bound: 6, step: 0.045, stop },
        forward = traceField(seed, field, options),
        back = s.source === 'wire' ? [] : traceField(seed, field, { ...options, direction: -1 });
      const pts = [...back.reverse(), ...forward];
      this.line(pts, 0x82c7bd, 0.5);
      if (forward.length > 15) {
        const i = Math.floor(forward.length * 0.3);
        this.arrow(
          forward[i],
          sub(forward[i + 1], forward[i]).map((v) => v * 2.5),
          0xb3ebe1,
          0.1,
        );
      }
    }
  for (const object of this.content.children) {
    if (object.isLine) {
      const a = object.geometry.attributes.position;
      if (a?.count > 5) {
        const path = [];
        for (let i = 0; i < a.count; i++) path.push([a.getX(i), a.getY(i), a.getZ(i)]);
        flowPaths.push(path);
      }
    }
  }
  addFlow(this, flowPaths, { color: 0x9fe6d3, count: 3, speed: 0.1 });
  this.probe = this.sphere(s.probe, 0.07, 0xf1f6ff);
  this.label('P', [s.probe[0] + 0.2, s.probe[1] + 0.2, s.probe[2]], '#f1f6ff', 0.25);
}
