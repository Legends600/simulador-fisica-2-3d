import * as THREE from 'three';
import { electricAt, traceField, equipotentialMesh, norm, sub, unit } from '../../core/physics.js';
import { COLORS } from '../palette.js';
import { addFlow } from '../motion.js';
import { material, ring, glow, platform, print } from '../models.js';
export function drawElectric(s) {
  this.clear();
  this.setLaboratory('electric');
  platform(this, -2.9, 2.9);
  const charges = s.charges,
    positivePaths = [],
    negativePaths = [];
  charges.forEach((c, i) => {
    const color = c.q >= 0 ? COLORS.positive : COLORS.negative;
    const charge = this.sphere(c.position, 0.22, color);
    charge.userData.chargeIndex = i;
    charge.name = 'electrode';
    ring(
      charge,
      [0, 0, 0],
      0.26,
      0.012,
      material(color, { emissive: color, emissiveIntensity: 0.6 }),
      [Math.PI / 2, 0, 0],
    );
    glow(charge, [0, 0, 0], color, 1.1);
    print(charge, c.q > 0 ? '+' : c.q < 0 ? '−' : '0', [0, 0, 0.227], 0.22, 0.22, {
      color: '#fff6dd',
      font: '700',
    });
    this.label(
      `${c.q >= 0 ? '+' : ''}${Number((c.q * 1e9).toFixed(2))} nC`,
      [c.position[0], c.position[1] + 0.42, c.position[2]],
      c.q >= 0 ? '#f4bf76' : '#91bdff',
      0.34,
    );
  });
  const field = (p) => electricAt(p, charges, 0.1).field;
  if (s.lines)
    for (const c of charges) {
      if (c.q === 0) continue;
      const count = this.view === '2d' ? 20 : 28;
      for (let i = 0; i < count; i++) {
        let offset;
        if (this.view === '2d')
          offset = [Math.cos((i / count) * 2 * Math.PI), Math.sin((i / count) * 2 * Math.PI), 0];
        else {
          const y = 1 - (2 * (i + 0.5)) / count,
            r = Math.sqrt(1 - y * y),
            a = i * 2.399963;
          offset = [Math.cos(a) * r, y, Math.sin(a) * r];
        }
        const seed = c.position.map((v, j) => v + offset[j] * 0.2),
          direction = c.q > 0 ? 1 : -1;
        const points = traceField(seed, field, {
          direction,
          stop: (p) => charges.some((ch) => norm(sub(p, ch.position)) < 0.16),
        });
        this.fieldLine(points, c.q > 0 ? COLORS.positive : COLORS.negative, 0.62);
        if (c.q > 0) positivePaths.push(points);
        else negativePaths.push([...points].reverse());
        if (points.length > 12) {
          const idx = Math.min(points.length - 2, Math.floor(points.length * 0.33));
          this.arrow(
            points[idx],
            sub(points[idx + (direction > 0 ? 1 : -1)], points[idx]).map((v) => v * 2.9),
            c.q > 0 ? COLORS.positive : COLORS.negative,
            0.09,
          );
        }
      }
    }
  if (s.vectors)
    for (let x = -3.5; x <= 3.5; x += 1.17)
      for (let y = -3.5; y <= 3.5; y += 1.17) {
        const p = [x, y, 0],
          e = field(p),
          mag = norm(e);
        if (Number.isFinite(mag) && mag > 1e-10)
          this.arrow(
            p,
            unit(e).map((v) => v * (0.18 + Math.min(0.37, Math.log10(1 + mag) * 0.15))),
            0x8bd1cb,
            0.1,
          );
      }
  if (s.equipotential) {
    for (const level of [-s.level, s.level]) {
      const color = level > 0 ? COLORS.positive : COLORS.negative;
      if (this.view === '2d') this.contours(charges, level, color);
      else {
        const vertices = equipotentialMesh(charges, level);
        if (vertices.length) {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
          geometry.computeVertexNormals();
          this.content.add(
            new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color,
                opacity: 0.17,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                roughness: 0.6,
              }),
            ),
          );
        }
      }
    }
    if (this.view === '2d') this.contours(charges, 0, 0x9acfc5);
  }
  addFlow(this, positivePaths, { color: COLORS.positive, count: 2 });
  addFlow(this, negativePaths, { color: COLORS.negative, count: 2 });
  this.probe = this.measurementProbe(s.probe);
  this.label('P', [s.probe[0] + 0.18, s.probe[1] + 0.2, s.probe[2]], '#e4f1ff', 0.26);
}
