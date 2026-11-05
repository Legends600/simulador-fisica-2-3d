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
export function drawCapacitor(s) {
  this.clear();
  this.axes.visible = false;
  const side = Math.sqrt(s.area / 200) * 3.5,
    d = 0.7 + s.distance * 0.16;
  this.box([0, d / 2, 0], [side, 0.09, side], COLORS.positive);
  this.box([0, -d / 2, 0], [side, 0.09, side], COLORS.negative);
  if (s.dielectric > 1) this.box([0, 0, 0], [side * 0.96, d - 0.1, side * 0.96], 0x64b4aa, 0.17);
  for (let x = -0.35; x <= 0.36; x += 0.35)
    for (let z = -0.35; z <= 0.36; z += 0.35) {
      if (s.voltage !== 0)
        this.arrow([x * side, d / 2 - 0.14, z * side], [0, -d + 0.3, 0], 0xb8eee5, 0.1);
    }
  this.label(`Fuente: ${s.voltage} V`, [0, d / 2 + 0.45, 0], '#f1bd73', 0.38);
  this.label('Placa de referencia', [0, -d / 2 - 0.45, 0], '#8db4f1', 0.32);
  this.label(`A = ${s.area} cm²`, [side / 2 + 0.6, 0.1, 0], '#bcd0e0', 0.28);
  this.label(`d = ${s.distance} mm`, [-side / 2 - 0.7, 0, 0], '#bcd0e0', 0.28);
  this.label(`εr = ${s.dielectric}`, [0, 0, side / 2 + 0.4], '#96dad0', 0.28);
  const plates = [];
  for (const sign of [-1, 1])
    for (let x = -2; x <= 2; x++)
      for (let z = -2; z <= 2; z++) {
        const mark = this.sphere(
          [x * side * 0.17, sign * (d / 2 + 0.09), z * side * 0.17],
          0.035,
          sign > 0 ? COLORS.positive : COLORS.negative,
        );
        plates.push(mark);
      }
  const dipoles = [];
  if (s.dielectric > 1)
    for (let x = -1; x <= 1; x++)
      for (let z = -1; z <= 1; z++) {
        const group = new THREE.Group();
        group.position.set(x * side * 0.24, 0, z * side * 0.24);
        for (const sign of [-1, 1]) {
          const bead = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 10, 8),
            new THREE.MeshBasicMaterial({ color: sign < 0 ? COLORS.positive : COLORS.negative }),
          );
          bead.position.y = sign * 0.13;
          group.add(bead);
        }
        this.content.add(group);
        dipoles.push(group);
      }
  if (s.voltage > 0)
    addFlow(
      this,
      [-0.26, 0, 0.26].map((x) => [
        [x * side, d / 2 - 0.12, 0],
        [x * side, -d / 2 + 0.12, 0],
      ]),
      { color: 0x9be1d5, speed: 0.22, count: 3 },
    );
  this.capacitorVisual = { plates, dipoles };
  this.motions.push((time) =>
    dipoles.forEach((g, i) => {
      g.rotation.z = 0.9 * Math.exp(-time * 1.8) * Math.sin(i + 1);
    }),
  );
}
