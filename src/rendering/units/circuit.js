import * as THREE from 'three';
import { circuit, rcCircuit, format } from '../../core/physics.js';
import { addFlow } from '../motion.js';
import { material, mesh, roundedBox, rod, ring, screw, print } from '../models.js';

const bandColors = [
  0x141414, 0x734222, 0xbd3b35, 0xe58532, 0xe2c54c, 0x358855, 0x366bba, 0x9753b7, 0x80868c,
  0xe8e8dd,
];
function bands(value) {
  let exponent = Math.floor(Math.log10(value)) - 1;
  let digits = Math.round(value / 10 ** exponent);
  if (digits === 100) {
    digits = 10;
    exponent++;
  }
  return [
    bandColors[Math.floor(digits / 10)],
    bandColors[digits % 10],
    exponent < 0 ? (exponent === -1 ? 0xc9a74f : 0xb8c4ca) : bandColors[exponent],
    0xc9a74f,
  ];
}

export function drawCircuit(s) {
  this.clear();
  this.setLaboratory('circuit');
  this.grid.visible = this.axes.visible = false;
  const calc = circuit(s.voltage, s.stages);
  const visual = { current: calc.current, parts: [] };
  const board = roundedBox(
    this.content,
    [0, 0, -0.31],
    [9.6, 6.5, 0.18],
    material(0x123f3c, { roughness: 0.42, metalness: 0.24 }),
    0.1,
  );
  board.name = 'pcb';
  roundedBox(this.content, [0, 0, -0.43], [9.7, 6.6, 0.08], material(0x0b202d), 0.04);
  const copper = material(0xc8a96b, { metalness: 0.9, roughness: 0.3 });
  const silver = material(0xc1d0d1, { metalness: 0.92, roughness: 0.25 });
  const insulator = material(0x293c48, { roughness: 0.4, metalness: 0.1 });
  for (const x of [-4.5, 4.5])
    for (const y of [-2.95, 2.95]) {
      ring(this.content, [x, y, -0.2], 0.14, 0.035, copper);
      screw(this.content, [x, y, -0.16], 0.08);
    }
  print(this.content, 'UPeU  /  FÍSICA II', [-2.4, 2.92, -0.2], 2.7, 0.2, {
    color: '#8eb9ae',
    align: 'left',
  });
  print(
    this.content,
    s.mode === 'rc' ? 'LAB 03 · RESPUESTA RC' : 'LAB 03 · CORRIENTE CONTINUA',
    [2.4, 2.92, -0.2],
    3.1,
    0.17,
    { color: '#8eb9ae' },
  );
  // Silkscreen guide marks and real copper pads, not an unconnected decoration network.
  for (let x = -3.8; x <= 3.8; x += 0.35) {
    for (const y of [-2.8, 2.65])
      this.line(
        [
          [x, y, -0.205],
          [x + 0.045, y, -0.205],
        ],
        0x44685d,
        0.5,
      );
  }
  const wire = (a, b) => {
    if (new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)) > 1e-6)
      rod(this.content, a, b, 0.029, copper, 10);
  };
  const route = (points) => {
    for (let i = 1; i < points.length; i++) wire(points[i - 1], points[i]);
  };
  const pad = (x, y) => {
    ring(this.content, [x, y, -0.17], 0.092, 0.031, copper);
    mesh(this.content, new THREE.SphereGeometry(0.065, 12, 8), silver, [x, y, -0.1]).scale.z = 0.45;
  };
  // The source and RC component break the wire; no visual bypass through a component.
  route([
    [-4, 1.7, -0.08],
    [-4, 0.47, -0.08],
  ]);
  route([
    [-4, -1.04, -0.08],
    [-4, -2.2, -0.08],
    [-0.5, -2.2, -0.08],
  ]);
  route([
    [0.5, -2.2, -0.08],
    [4, -2.2, -0.08],
    [4, 1.7, -0.08],
  ]);
  if (s.mode !== 'rc') wire([-0.5, -2.2, -0.08], [0.5, -2.2, -0.08]);
  const battery = roundedBox(
    this.content,
    [-4, -0.3, 0.16],
    [0.75, 1.4, 0.56],
    material(0x223b50, { metalness: 0.45, roughness: 0.25 }),
    0.07,
  );
  battery.name = 'battery';
  battery.userData.component = { source: true };
  roundedBox(this.content, [-4, 0.25, 0.16], [0.77, 0.27, 0.58], silver, 0.04);
  print(this.content, 'CC', [-4, -0.2, 0.45], 0.54, 0.24, { color: '#eed499', font: '700' });
  print(this.content, `${s.voltage} V`, [-4, -0.56, 0.45], 0.6, 0.22, { color: '#dce7ee' });
  print(this.content, '+', [-4, 0.24, 0.46], 0.2, 0.2, { color: '#fce2af', font: '700' });
  for (const y of [0.47, -1.04]) pad(-4, y);
  const lamp = mesh(
    this.content,
    new THREE.SphereGeometry(0.045, 12, 8),
    material(0x5affe0, { emissive: 0x38d9b3, emissiveIntensity: s.voltage ? 1.3 : 0 }),
    [-4, -0.85, 0.46],
  );
  this.label(
    s.mode === 'rc' && !s.charging ? 'Fuente desconectada' : 'Pulsa para encender / apagar',
    [-3.65, -1.4, 0.1],
    '#a0c6c5',
    0.19,
  );

  const gap = 8 / s.stages.length;
  s.stages.forEach((stage, i) => {
    const x0 = -4 + i * gap,
      x1 = x0 + gap,
      mid = (x0 + x1) / 2;
    stage.forEach((resistance, j) => {
      const y = 1.7 + (j - (stage.length - 1) / 2) * 0.92;
      route([
        [x0, 1.7, -0.08],
        [x0 + 0.13, 1.7, -0.08],
        [x0 + 0.13, y, -0.08],
        [mid - 0.47, y, -0.08],
      ]);
      route([
        [mid + 0.47, y, -0.08],
        [x1 - 0.13, y, -0.08],
        [x1 - 0.13, 1.7, -0.08],
        [x1, 1.7, -0.08],
      ]);
      for (const sign of [-1, 1]) {
        pad(mid + sign * 0.47, y);
        rod(
          this.content,
          [mid + sign * 0.47, y, -0.08],
          [mid + sign * 0.3, y, 0.14],
          0.025,
          silver,
        );
      }
      const part = rod(
        this.content,
        [mid - 0.3, y, 0.14],
        [mid + 0.3, y, 0.14],
        0.115,
        material(0xd6be8e, { roughness: 0.42, metalness: 0.02 }),
        20,
      );
      part.name = 'resistor';
      part.userData.component = { stage: i, branch: j };
      bands(resistance).forEach((color, band) =>
        ring(
          this.content,
          [mid - 0.19 + band * 0.12, y, 0.14],
          0.115,
          0.017,
          material(color, { roughness: 0.4 }),
          [0, Math.PI / 2, 0],
        ),
      );
      this.label(`R${i + 1}.${j + 1} · ${resistance} Ω`, [mid, y + 0.31, 0.16], '#d2ece0', 0.21);
      // Update the measurement without rebuilding the complete PCB each RC frame.
      const amp = print(this.content, '', [mid, y - 0.29, -0.19], 1.0, 0.2, { color: '#c5d6b9' });
      visual.parts.push({ part, amp, resistance, stage: i });
      if (Math.abs(calc.current) > 1e-12) {
        const points = [
          [x0, 1.7, 0.025],
          [x0 + 0.13, y, 0.025],
          [mid - 0.35, y, 0.14],
          [mid + 0.35, y, 0.14],
          [x1 - 0.13, y, 0.025],
          [x1, 1.7, 0.025],
        ];
        if (s.mode === 'rc' && !s.charging) points.reverse();
        addFlow(this, [points], { color: 0xffe4a0, speed: 0.18, count: 5 });
      }
    });
  });
  if (Math.abs(calc.current) > 1e-12) {
    const points = [
      [4, 1.7, 0.025],
      [4, -2.2, 0.025],
      [0.5, -2.2, 0.025],
      [-0.5, -2.2, 0.025],
      [-4, -2.2, 0.025],
      [-4, 1.7, 0.025],
    ];
    if (s.mode === 'rc' && !s.charging) points.reverse();
    addFlow(this, [points], { color: 0xffe4a0, speed: 0.1, count: 16 });
  }
  if (s.mode === 'rc') {
    for (const sign of [-1, 1]) {
      pad(sign * 0.5, -2.2);
      rod(this.content, [sign * 0.5, -2.2, -0.08], [sign * 0.17, -2.2, 0.21], 0.025, silver);
    }
    const cap = rod(
      this.content,
      [0, -2.2, 0.03],
      [0, -2.2, 0.85],
      0.36,
      material(0x285571, { roughness: 0.24, metalness: 0.6 }),
      40,
    );
    cap.name = 'electrolytic-capacitor';
    ring(this.content, [0, -2.2, 0.84], 0.33, 0.025, silver);
    mesh(this.content, new THREE.CircleGeometry(0.32, 40), silver, [0, -2.2, 0.856]);
    print(this.content, `${s.capacitance} µF`, [0, -2.2, 0.86], 0.56, 0.19, {
      color: '#153342',
      font: '700',
    });
    print(this.content, '−', [0.22, -2.5, 0.76], 0.16, 0.17, { color: '#e0ebe9' });
    print(this.content, 'C', [0, -2.93, -0.2], 0.5, 0.19, { color: '#a8c6b8' });
  }
  roundedBox(this.content, [0.7, -0.5, -0.02], [3.8, 1.25, 0.2], insulator, 0.08);
  print(
    this.content,
    s.mode === 'rc' ? 'RESPUESTA TRANSITORIA' : 'MEDICIÓN · LEY DE OHM',
    [0.7, -0.17, 0.09],
    3.3,
    0.16,
    { color: '#7baaa4' },
  );
  const readout = print(this.content, '', [0.7, -0.55, 0.09], 3.3, 0.32, {
    color: '#99ffe1',
    background: '#071e24',
    font: '600',
  });
  print(this.content, 'Selecciona un componente para editarlo', [0.7, -0.94, 0.09], 3.3, 0.15, {
    color: '#9dbfbb',
  });
  visual.update = (state) => {
    const rc =
      state.mode === 'rc'
        ? rcCircuit(
            calc.resistance,
            state.capacitance * 1e-6,
            state.voltage,
            state.tauTime * calc.resistance * state.capacitance * 1e-6,
            state.charging,
          )
        : null;
    visual.current = rc ? rc.current : calc.current;
    visual.parts.forEach(({ part, amp, resistance, stage }) => {
      const branchI = (visual.current * calc.stages[stage].resistance) / resistance;
      amp.userData.setText(format(branchI, 'A'));
      part.material.emissive.set(0xce692e);
    });
    readout.userData.setText(
      rc
        ? `Vc ${format(rc.voltage, 'V')}   ·   ${format(visual.current, 'A')}`
        : `I ${format(visual.current, 'A')}   ·   ${format(calc.resistance, 'Ω')}`,
    );
    lamp.material.emissiveIntensity = state.voltage && !(rc && !state.charging) ? 1.3 : 0;
  };
  visual.update(s);
  this.circuitVisual = visual;
  this.motions.push((time) =>
    visual.parts.forEach(({ part }) => {
      part.material.emissiveIntensity =
        Math.abs(visual.current) > 1e-12
          ? Math.min(0.2, Math.abs(visual.current) * 1.6) * (0.7 + Math.sin(time * 2) * 0.15)
          : 0;
    }),
  );
}
