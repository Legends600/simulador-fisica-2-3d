import * as THREE from 'three';
import { circuit, rcCircuit, format } from '../../core/physics.js';
import { addFlow } from '../motion.js';

export function drawCircuit(s) {
  this.clear();
  this.grid.visible = false;
  this.axes.visible = false;
  const calc = circuit(s.voltage, s.stages);
  const rc =
    s.mode === 'rc'
      ? rcCircuit(
          calc.resistance,
          s.capacitance * 1e-6,
          s.voltage,
          s.tauTime * calc.resistance * s.capacitance * 1e-6,
          s.charging,
        )
      : null;
  const current = rc ? rc.current : calc.current;
  this.box([0, 0, -0.25], [9.4, 6.4, 0.12], 0x1a3850);
  const wire = (a, b) => {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      length = start.distanceTo(end);
    if (!length) return;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, length, 8),
      new THREE.MeshStandardMaterial({ color: 0x8fbaca, metalness: 0.65, roughness: 0.3 }),
    );
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    this.content.add(mesh);
  };
  const route = (points) => {
    for (let i = 1; i < points.length; i++) wire(points[i - 1], points[i]);
  };
  route([
    [-4, 1.7, 0],
    [-4, -2.2, 0],
    [4, -2.2, 0],
    [4, 1.7, 0],
  ]);
  const battery = this.box(
    [-4, -0.3, 0.15],
    [0.5, 1.1, 0.35],
    rc && !s.charging ? 0x557083 : 0xe2ad48,
  );
  battery.userData.component = { source: true };
  this.label(
    rc && !s.charging ? 'Desconectada' : `${s.voltage} V`,
    [-4, -1.1, 0.2],
    '#f1c66e',
    0.32,
  );
  this.label('+', [-4, 0.5, 0.3], '#fff0c0', 0.35);
  const gap = 8 / s.stages.length;
  s.stages.forEach((stage, i) => {
    const x0 = -4 + i * gap,
      x1 = x0 + gap,
      mid = (x0 + x1) / 2;
    stage.forEach((resistance, j) => {
      const y = 1.7 + (j - (stage.length - 1) / 2) * 0.92;
      route([
        [x0, 1.7, 0],
        [x0 + 0.14, 1.7, 0],
        [x0 + 0.14, y, 0],
        [mid - 0.29, y, 0],
      ]);
      route([
        [mid + 0.29, y, 0],
        [x1 - 0.14, y, 0],
        [x1 - 0.14, 1.7, 0],
        [x1, 1.7, 0],
      ]);
      const part = this.box([mid, y, 0.1], [0.58, 0.24, 0.27], 0x5aafa6);
      part.userData.component = { stage: i, branch: j };
      part.material.emissive.set(0xdb7a32);
      part.material.emissiveIntensity = s.voltage ? 0.12 : 0;
      this.label(`R${i + 1}.${j + 1} · ${resistance} Ω`, [mid, y + 0.38, 0.12], '#d2e6e9', 0.23);
      const branchI = (current * calc.stages[i].resistance) / resistance;
      this.label(format(branchI, 'A'), [mid, y - 0.35, 0.1], '#f2cd85', 0.23);
      if (Math.abs(branchI) > 1e-12) {
        const points = [
          [x0, 1.7, 0.09],
          [x0 + 0.14, y, 0.09],
          [mid, y, 0.28],
          [x1 - 0.14, y, 0.09],
          [x1, 1.7, 0.09],
        ];
        if (branchI < 0) points.reverse();
        addFlow(this, [points], {
          color: 0xffdc80,
          speed: Math.sign(1) * Math.min(0.8, 0.12 + Math.abs(branchI) * 3),
          count: 5,
        });
      }
      this.motions.push((time) => {
        part.material.emissiveIntensity =
          Math.abs(current) > 1e-12 ? 0.12 + 0.09 * (1 + Math.sin(time * 2)) : 0;
      });
    });
  });
  if (Math.abs(current) > 1e-12) {
    const points = [
      [4, 1.7, 0.08],
      [4, -2.2, 0.08],
      [-4, -2.2, 0.08],
      [-4, 1.7, 0.08],
    ];
    if (current < 0) points.reverse();
    addFlow(this, [points], { color: 0xffdc80, speed: 0.1, count: 15 });
  }
  if (rc) {
    this.box([-0.13, -2.2, 0.2], [0.07, 0.65, 0.6], 0xe4b04f);
    this.box([0.13, -2.2, 0.2], [0.07, 0.65, 0.6], 0x6b9edb);
    this.label(`C · ${format(rc.voltage, 'V')}`, [0, -2.95, 0.15], '#dfd4ae', 0.32);
  }
  this.label('Corriente convencional · escala visual', [0, -0.5, 0], '#8eaebc', 0.32);
  this.label('Pulsa una resistencia para editarla', [0, -1.1, 0], '#b7cdd6', 0.28);
}
