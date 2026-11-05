import * as THREE from 'three';
import { COLORS } from '../palette.js';
import { addFlow } from '../motion.js';
import { material, mesh, roundedBox, rod, cable, ring, print } from '../models.js';

export function drawCapacitor(s) {
  this.clear();
  this.setLaboratory('capacitor');
  this.axes.visible = this.grid.visible = false;
  const side = Math.sqrt(s.area / 200) * 3.5,
    d = 0.7 + s.distance * 0.16;
  const floor = -d / 2 - 0.68,
    sourceX = -side / 2 - 1.15;
  const silver = material(0xc8d8dd, { metalness: 0.92, roughness: 0.24 });
  const dark = material(0x112f42, { metalness: 0.5, roughness: 0.32 });
  const gold = material(0xe0b66a, { metalness: 0.88, roughness: 0.2 });
  const blue = material(0x729fc4, { metalness: 0.86, roughness: 0.24 });
  const ceramic = material(0xd4e3e0, { roughness: 0.25, metalness: 0 });
  const redCable = material(0xba4942, { roughness: 0.42, metalness: 0 });
  const blueCable = material(0x286da4, { roughness: 0.42, metalness: 0 });
  roundedBox(this.content, [-0.3, floor, 0], [side + 3.3, 0.22, side + 1.1], dark, 0.12);
  roundedBox(
    this.content,
    [-0.3, floor + 0.13, 0],
    [side + 3.1, 0.05, side + 0.9],
    material(0x1e4354, { roughness: 0.5 }),
    0.02,
  );
  for (const x of [-side / 2 + 0.18, side / 2 - 0.18]) {
    for (const z of [-side / 2 + 0.18, side / 2 - 0.18]) {
      rod(this.content, [x, floor + 0.14, z], [x, -d / 2 - 0.1, z], 0.07, ceramic);
      if (z < 0) {
        rod(this.content, [x, floor + 0.14, z - 0.32], [x, d / 2 + 0.24, z - 0.32], 0.045, silver);
        for (const y of [-d / 2, d / 2])
          rod(this.content, [x, y, z - 0.32], [x, y, z], 0.065, ceramic);
        ring(this.content, [x, d / 2 + 0.21, z - 0.32], 0.1, 0.025, gold, [Math.PI / 2, 0, 0]);
      }
    }
  }
  for (const sign of [-1, 1]) {
    const plate = roundedBox(
      this.content,
      [0, (sign * d) / 2, 0],
      [side, 0.11, side],
      sign > 0 ? gold : blue,
      0.045,
    );
    plate.name = sign > 0 ? 'positive-plate' : 'reference-plate';
    for (const z of [-side / 2, side / 2])
      rod(
        this.content,
        [-side / 2 + 0.05, (sign * d) / 2, z],
        [side / 2 - 0.05, (sign * d) / 2, z],
        0.025,
        silver,
      );
    rod(
      this.content,
      [-side / 2 - 0.2, (sign * d) / 2, 0],
      [-side / 2 + 0.1, (sign * d) / 2, 0],
      0.09,
      silver,
    );
  }
  if (s.dielectric > 1) {
    const glass = material(0x74e4d5, {
      metalness: 0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      clearcoat: 1,
      side: THREE.DoubleSide,
    });
    const dielectric = roundedBox(
      this.content,
      [0, 0, 0],
      [side * 0.94, d - 0.18, side * 0.94],
      glass,
      0.06,
    );
    dielectric.name = 'dielectric';
    dielectric.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(dielectric.geometry, 25),
        new THREE.LineBasicMaterial({ color: 0x76d5c8, transparent: true, opacity: 0.45 }),
      ),
    );
  }
  const sourceZ = 0.2;
  roundedBox(
    this.content,
    [sourceX, floor + 0.62, sourceZ],
    [1.25, 1.05, 1.2],
    material(0xd4dfe1, { roughness: 0.32, metalness: 0.4 }),
    0.09,
  );
  roundedBox(this.content, [sourceX, floor + 0.7, sourceZ + 0.61], [1.1, 0.7, 0.025], dark, 0.015);
  print(
    this.content,
    `${s.voltage.toFixed(1)} V`,
    [sourceX, floor + 0.83, sourceZ + 0.63],
    0.85,
    0.27,
    { color: '#92ffdc', background: '#061a21', font: '600' },
  );
  print(this.content, 'FUENTE CC', [sourceX, floor + 1.01, sourceZ + 0.63], 0.9, 0.12, {
    color: '#bdccd2',
  });
  for (const sign of [-1, 1]) {
    const terminalX = sourceX + sign * 0.32,
      terminalY = floor + 0.45,
      terminalZ = sourceZ + 0.69;
    rod(
      this.content,
      [terminalX, terminalY, terminalZ - 0.1],
      [terminalX, terminalY, terminalZ + 0.04],
      0.09,
      sign > 0 ? redCable : blueCable,
    );
    cable(
      this.content,
      [
        [terminalX, terminalY, terminalZ + 0.05],
        [sourceX - 0.4, floor + 0.22, side / 2 + 0.25 + (sign < 0 ? 0.1 : 0)],
        [-side / 2 - 0.55, (sign * d) / 2, 0.65],
        [-side / 2 - 0.15, (sign * d) / 2, 0],
      ],
      sign > 0 ? redCable : blueCable,
      0.042,
    );
  }
  const plates = [],
    dipoles = [];
  for (const sign of [-1, 1]) {
    for (let x = -2; x <= 2; x++)
      for (let z = -2; z <= 2; z++) {
        const charge = this.sphere(
          [x * side * 0.17, sign * (d / 2 - 0.075), z * side * 0.17],
          0.035,
          sign > 0 ? COLORS.positive : COLORS.negative,
        );
        charge.material.emissiveIntensity = 0.65;
        plates.push(charge);
      }
  }
  for (let x = -0.29; x <= 0.3; x += 0.29)
    for (let z = -0.29; z <= 0.3; z += 0.29) {
      if (s.voltage)
        this.arrow([x * side, d / 2 - 0.18, z * side], [0, -d + 0.36, 0], 0x93e8d9, 0.12);
    }
  if (s.dielectric > 1) {
    for (let x = -1; x <= 1; x++)
      for (let z = -1; z <= 1; z++) {
        const group = new THREE.Group();
        group.position.set(x * side * 0.23, 0, z * side * 0.23);
        rod(group, [0, -0.11, 0], [0, 0.11, 0], 0.012, silver);
        for (const sign of [-1, 1])
          mesh(
            group,
            new THREE.SphereGeometry(0.05, 12, 8),
            material(sign < 0 ? COLORS.positive : COLORS.negative),
            [0, sign * 0.13, 0],
          );
        this.content.add(group);
        dipoles.push(group);
      }
  }
  if (s.voltage > 0)
    addFlow(
      this,
      [-0.29, 0, 0.29].map((x) => [
        [x * side, d / 2 - 0.16, 0],
        [x * side, -d / 2 + 0.16, 0],
      ]),
      { color: 0xb9fff0, speed: 0.22, count: 3 },
    );
  const dimensionX = side / 2 + 0.45;
  this.line(
    [
      [dimensionX, -d / 2, 0],
      [dimensionX, d / 2, 0],
    ],
    0xb9cbd8,
    0.8,
  );
  for (const sign of [-1, 1])
    this.line(
      [
        [dimensionX - 0.1, (sign * d) / 2, 0],
        [dimensionX + 0.1, (sign * d) / 2, 0],
      ],
      0xb9cbd8,
    );
  this.label(`d = ${s.distance} mm`, [dimensionX + 0.55, 0, 0], '#d1e7ef', 0.26);
  this.label(`A = ${s.area} cm²`, [0.1, d / 2 + 0.4, 0], '#f6d59d', 0.28);
  this.label(
    s.dielectric > 1 ? `Dieléctrico · εr = ${s.dielectric}` : 'Vacío · εr = 1',
    [0.3, -0.05, side / 2 + 0.35],
    '#a7ede0',
    0.27,
  );
  const badge = print(
    this.content,
    'CAPACITOR DE PLACAS PARALELAS',
    [0.3, floor + 0.135, side / 2 + 0.22],
    Math.min(side + 0.4, 4.2),
    0.22,
    { color: '#81afb9' },
  );
  badge.rotation.x = -Math.PI / 2;
  this.capacitorVisual = { plates, dipoles };
  this.frameModel(true);
  this.motions.push((time) =>
    dipoles.forEach((group, i) => {
      group.rotation.z = 0.9 * Math.exp(-time * 1.8) * Math.sin(i + 1);
    }),
  );
}
