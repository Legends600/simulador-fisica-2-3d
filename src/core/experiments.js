import { defaults, info } from '../config/experiments.js';
/** Strict import whitelist. No imported text reaches HTML; reject unsupported values. */
export function validateExperiment(data) {
  if (
    data?.schema !== 'flux-experiment-v1' ||
    !info[data.active] ||
    !['2d', '3d'].includes(data.view)
  )
    throw new Error('Formato de experimento no compatible.');
  const clean = structuredClone(defaults);
  const num = (v, min, max) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
      throw new Error('El archivo contiene un número fuera de rango.');
    return v;
  };
  const vec = (v, min, max) => {
    if (!Array.isArray(v) || v.length !== 3) throw new Error('Vector inválido.');
    return v.map((n) => num(n, min, max));
  };
  const bool = (v) => {
    if (typeof v !== 'boolean') throw new Error('Opción inválida.');
    return v;
  };
  const choice = (v, values) => {
    if (!values.includes(v)) throw new Error('Configuración desconocida.');
    return v;
  };
  const particle = (p) => ({
    q: num(p.q, -10, 10),
    mass: num(p.mass, 0.1, 10),
    position: vec(p.position, -5, 5),
    velocity: vec(p.velocity, -10, 10),
  });
  const e = data.state.electric,
    c = data.state.capacitor,
    r = data.state.circuit,
    m = data.state.magnetic;
  if (!Array.isArray(e.charges) || e.charges.length < 1 || e.charges.length > 10)
    throw new Error('Se permiten entre 1 y 10 cargas.');
  clean.electric = {
    charges: e.charges.map((ch) => ({
      q: num(ch.q, -20e-9, 20e-9),
      position: vec(ch.position, -4, 4),
    })),
    preset: choice(e.preset, ['single', 'dipole', 'like', 'quadrupole', 'custom']),
    lines: bool(e.lines),
    vectors: bool(e.vectors),
    equipotential: bool(e.equipotential),
    level: num(e.level, 2, 60),
    probe: vec(e.probe, -5, 5),
    particle: particle(e.particle),
  };
  clean.capacitor = {
    chargeResistance: num(c.chargeResistance ?? defaults.capacitor.chargeResistance, 1e6, 500e6),
    area: num(c.area, 20, 600),
    distance: num(c.distance, 0.5, 10),
    dielectric: num(c.dielectric, 1, 12),
    voltage: num(c.voltage, 0, 100),
  };
  if (!Array.isArray(r.stages) || r.stages.length < 1 || r.stages.length > 4)
    throw new Error('Número de etapas inválido.');
  clean.circuit = {
    voltage: num(r.voltage, 0, 48),
    stages: r.stages.map((stage) => {
      if (!Array.isArray(stage) || stage.length < 1 || stage.length > 4)
        throw new Error('Número de ramas inválido.');
      return stage.map((v) => num(v, 1, 100000));
    }),
    mode: choice(r.mode, ['dc', 'rc']),
    capacitance: num(r.capacitance, 100, 10000),
    tauTime: num(r.tauTime, 0, 5),
    charging: bool(r.charging),
  };
  clean.magnetic = {
    mode: choice(m.mode, ['field', 'lorentz']),
    source: choice(m.source, ['dipole', 'wire', 'loop']),
    strength: num(m.strength, -10, 10),
    probe: vec(m.probe, -5, 5),
    ey: num(m.ey, -3, 3),
    bz: num(m.bz, -3, 3),
    particle: particle(m.particle),
  };
  return { state: clean, active: data.active, view: data.view };
}
