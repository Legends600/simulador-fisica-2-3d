import * as THREE from 'three';
import { magneticAt, traceField, norm, sub } from '../../core/physics.js';
import { COLORS } from '../palette.js';
import { addFlow } from '../motion.js';
import { material, mesh, roundedBox, rod, ring, platform, print } from '../models.js';
export function drawMagnetic(s) {
  this.clear();
  this.setLaboratory('magnetic');
  const silver = material(0xc1d5dc, { metalness: 0.9, roughness: 0.24 });
  const copper = material(0xcf8d51, { metalness: 0.88, roughness: 0.23 });
  const black = material(0x162d3b, { roughness: 0.32, metalness: 0.4 });
  if (s.mode === 'lorentz') {
    this.grid.visible = this.axes.visible = false;
    platform(this, -3.55, 4.6);
    // Open pole frames keep the trajectory visible. The computed field is uniform and ideal.
    for (const sign of [-1, 1]) {
      const surface = material(sign < 0 ? 0xaf4d48 : 0x376caa, { metalness: 0.6, roughness: 0.28 });
      for (const x of [-3.5, 3.5])
        roundedBox(this.content, [x, 0, sign * 1.9], [0.22, 6.2, 0.2], surface);
      for (const y of [-3, 3])
        roundedBox(this.content, [0, y, sign * 1.9], [7.2, 0.22, 0.2], surface);
      print(
        this.content,
        sign * s.bz > 0 ? 'S' : 'N',
        [-3.48, 2.55, sign * 1.9 + 0.12],
        0.2,
        0.25,
        { color: '#f0e9db', font: '700' },
      );
    }
    for (const x of [-3.5, 3.5])
      for (const y of [-3, 3]) rod(this.content, [x, y, -1.9], [x, y, 1.9], 0.035, silver);
    if (s.ey)
      for (const sign of [-1, 1])
        roundedBox(
          this.content,
          [0, sign * 2.9, 0],
          [6.5, 0.06, 3.3],
          material(sign * s.ey < 0 ? 0xc0a76e : 0x6cabb6, { metalness: 0.85 }),
          0.02,
        );
    print(this.content, 'CÁMARA DE CAMPOS CRUZADOS', [0, -3.04, 2.03], 3.5, 0.2, {
      color: '#92baca',
    });
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
    platform(this, -2.75, 2.75);
    const reversed = s.strength < 0;
    for (const sign of [-1, 1]) {
      const north = reversed ? sign < 0 : sign > 0;
      const magnet = roundedBox(
        this.content,
        [0, sign * 0.34, 0],
        [0.6, 0.68, 0.5],
        material(north ? 0xc54f48 : 0x376fb0, { metalness: 0.48, roughness: 0.24, clearcoat: 0.8 }),
        0.045,
      );
      magnet.name = 'bar-magnet';
      roundedBox(this.content, [0, sign * 0.68, 0], [0.59, 0.025, 0.49], silver, 0.007);
      if (s.strength)
        print(this.content, north ? 'N' : 'S', [0, sign * 0.35, 0.26], 0.4, 0.4, {
          color: '#fff5e6',
          font: '700',
        });
    }
    roundedBox(this.content, [0, 0, 0], [0.605, 0.025, 0.505], silver, 0.006);
    rod(this.content, [0, -2.63, 0], [0, -0.76, 0], 0.08, black);
    roundedBox(this.content, [0, -0.77, 0], [0.9, 0.13, 0.8], black);
    if (s.strength !== 0) {
      this.label('Imán de barra · dipolo ideal', [0, -1.25, 0.3], '#b0cedd', 0.25);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      for (const radius of [0.18, 0.38, 0.65])
        seeds.push([Math.cos(a) * radius, 0.72, Math.sin(a) * radius]);
    }
  } else if (s.source === 'wire') {
    platform(this, -2.75, 3.8);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7.2, 24), copper);
    wire.rotation.x = Math.PI / 2;
    this.content.add(wire);
    wire.name = 'copper-conductor';
    wire.castShadow = true;
    for (const z of [-3.4, 3.4]) {
      rod(this.content, [0, 0, z - 0.15], [0, 0, z + 0.15], 0.13, black);
      ring(this.content, [0, 0, z + 0.16], 0.13, 0.025, silver);
      rod(this.content, [0, -2.63, z], [0, -0.2, z], 0.045, silver);
    }
    if (s.strength)
      addFlow(
        this,
        [
          s.strength > 0
            ? [
                [0, 0, -3.5],
                [0, 0, 3.5],
              ]
            : [
                [0, 0, 3.5],
                [0, 0, -3.5],
              ],
        ],
        { color: 0xffd796, speed: 0.18, count: 10 },
      );
    this.arrow([0, 0, -2], [0, 0, 4 * Math.sign(s.strength || 1)], 0xf1c580, 0.22);
    this.label('I', [0.3, 0.3, 1.5], '#f2c27e', 0.35);
    for (const z of this.view === '2d' ? [0] : [-1.8, 0, 1.8])
      for (let r = 0.6; r < 3.4; r += 0.55) seeds.push([r, 0, z]);
  } else {
    platform(this, -2.75, 2.75);
    this.content.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.065, 16, 128), copper));
    this.content.children.at(-1).name = 'copper-loop';
    rod(this.content, [0, -2.63, 0], [0, -1.15, 0], 0.07, black);
    roundedBox(this.content, [0, -1.12, 0], [0.65, 0.18, 0.4], black);
    if (s.strength) {
      const currentPath = Array.from({ length: 97 }, (_, i) => {
        const a = (((s.strength > 0 ? 1 : -1) * i) / 96) * Math.PI * 2;
        return [Math.cos(a), Math.sin(a), 0.07];
      });
      addFlow(this, [currentPath], { color: 0xffd796, speed: 0.2, count: 12 });
    }
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
      this.fieldLine(pts, 0x68d8c6, 0.65);
      flowPaths.push(pts);
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
  addFlow(this, flowPaths, { color: 0x9fe6d3, count: 3, speed: 0.1 });
  this.probe = this.measurementProbe(s.probe);
  this.label('P', [s.probe[0] + 0.2, s.probe[1] + 0.2, s.probe[2]], '#f1f6ff', 0.25);
}
