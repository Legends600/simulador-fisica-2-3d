export const defaults = {
  electric: {
    charges: [
      { q: 4e-9, position: [-1.2, 0, 0] },
      { q: -4e-9, position: [1.2, 0, 0] },
    ],
    preset: 'dipole',
    lines: true,
    vectors: false,
    equipotential: false,
    level: 15,
    probe: [0, 1.5, 0],
    particle: { q: 1, mass: 1, position: [0, -2, 0], velocity: [1.5, 0.5, 0] },
  },
  capacitor: { area: 200, distance: 3, dielectric: 1, voltage: 12, chargeResistance: 100e6 },
  circuit: {
    voltage: 12,
    stages: [[100], [220, 330]],
    mode: 'dc',
    capacitance: 1000,
    tauTime: 1,
    charging: true,
  },
  magnetic: {
    mode: 'field',
    source: 'dipole',
    strength: 5,
    probe: [1, 0, 0],
    ey: 0,
    bz: 1,
    particle: { q: 1, mass: 1, position: [0, 1, 0], velocity: [2, 0, 0.4] },
  },
};
export const info = {
  electric: [
    '01',
    'ELECTROSTÁTICA',
    'Campo eléctrico y potencial',
    'Explora cómo las cargas transforman el espacio que las rodea.',
  ],
  capacitor: [
    '02',
    'CAPACITORES Y DIELÉCTRICOS',
    'Capacitores y dieléctricos',
    'Experimenta con el área, la separación y el material entre dos placas.',
  ],
  circuit: [
    '03',
    'CORRIENTE Y LEY DE OHM',
    'Circuitos y ley de Ohm',
    'Construye circuitos y descubre cómo se distribuyen el voltaje y la corriente.',
  ],
  magnetic: [
    '04',
    'FUERZA Y CAMPO MAGNÉTICO',
    'Campo magnético y fuerza de Lorentz',
    'Explora imanes, corrientes y el movimiento de una partícula en campos cruzados.',
  ],
};
