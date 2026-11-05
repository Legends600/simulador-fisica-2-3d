/** SI throughout. UI converts nC, cm², mm, pF and µF at the boundary. */
export const EPS0 = 8.8541878128e-12;
export const K = 1 / (4 * Math.PI * EPS0);
export const MU0 = 1.25663706212e-6;
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const scale = (a, s) => a.map((v) => v * s);
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const norm = (a) => Math.hypot(...a);
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const unit = (a) => (norm(a) > 1e-20 ? scale(a, 1 / norm(a)) : [0, 0, 0]);
const finite = (n, name) => {
  if (!Number.isFinite(n)) throw new RangeError(`${name}: introduce un número finito.`);
  return n;
};
const positive = (n, name) => {
  finite(n, name);
  if (n <= 0) throw new RangeError(`${name} debe ser mayor que cero.`);
  return n;
};
export function electricAt(point, charges, exclusion = 1e-9) {
  let field = [0, 0, 0],
    potential = 0;
  for (const c of charges) {
    if (c.q === 0) continue;
    const r = sub(point, c.position),
      d = norm(r);
    if (d <= exclusion) return { field: [NaN, NaN, NaN], potential: NaN, singular: true };
    field = add(field, scale(r, (K * c.q) / (d * d * d)));
    potential += (K * c.q) / d;
  }
  return { field, potential, singular: false };
}
export function capacitor(area, distance, dielectric, voltage) {
  positive(area, 'Área');
  positive(distance, 'Separación');
  positive(dielectric, 'Permitividad relativa');
  finite(voltage, 'Voltaje');
  const capacitance = (EPS0 * dielectric * area) / distance;
  return {
    capacitance,
    charge: capacitance * voltage,
    energy: 0.5 * capacitance * voltage ** 2,
    field: voltage / distance,
  };
}
/** Network = series of stages; each stage contains parallel resistors. */
export function circuit(voltage, stages) {
  finite(voltage, 'Voltaje');
  if (
    !Array.isArray(stages) ||
    !stages.length ||
    stages.some((s) => !Array.isArray(s) || !s.length)
  )
    throw new RangeError('El circuito debe tener al menos una etapa y una rama.');
  const equivalents = stages.map(
    (stage) => 1 / stage.reduce((s, r) => s + 1 / positive(r, 'Resistencia'), 0),
  );
  const resistance = equivalents.reduce((a, b) => a + b, 0),
    current = voltage / resistance;
  const details = stages.map((stage, i) => ({
    resistance: equivalents[i],
    voltage: current * equivalents[i],
    branches: stage.map((r) => ({
      resistance: r,
      current: (current * equivalents[i]) / r,
      voltage: current * equivalents[i],
      power: (current * equivalents[i]) ** 2 / r,
    })),
  }));
  return { resistance, current, power: voltage * current, stages: details };
}
export function rcCircuit(resistance, capacitance, voltage, time, charging = true) {
  positive(resistance, 'Resistencia');
  positive(capacitance, 'Capacitancia');
  finite(voltage, 'Voltaje');
  finite(time, 'Tiempo');
  if (time < 0) throw new RangeError('El tiempo no puede ser negativo.');
  const tau = resistance * capacitance,
    decay = Math.exp(-time / tau);
  const vc = voltage * (charging ? 1 - decay : decay);
  return {
    tau,
    voltage: vc,
    current: (voltage / resistance) * decay * (charging ? 1 : -1),
    charge: capacitance * vc,
    energy: 0.5 * capacitance * vc * vc,
  };
}
export function magneticAt(point, kind, strength = 5) {
  if (kind === 'wire') {
    const [x, y] = point,
      r2 = x * x + y * y;
    if (r2 < 0.012 ** 2) return [0, 0, 0]; // finite wire core excluded from field tracing
    return scale([-y, x, 0], (MU0 * strength) / (2 * Math.PI * r2));
  }
  if (kind === 'loop') {
    // Midpoint Biot–Savart quadrature: radius 1 m, loop in XY, current in A.
    let b = [0, 0, 0];
    const n = 128,
      da = (2 * Math.PI) / n;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) * da,
        source = [Math.cos(a), Math.sin(a), 0],
        dl = [-Math.sin(a) * da, Math.cos(a) * da, 0];
      const r = sub(point, source),
        d = norm(r);
      if (d < 0.02) continue;
      b = add(b, scale(cross(dl, r), (MU0 * strength) / (4 * Math.PI * d ** 3)));
    }
    return b;
  }
  // Ideal magnetic dipole on Y. strength is magnetic moment, A m².
  const d = norm(point);
  if (d < 0.3) return [0, 0, 0];
  const m = [0, strength, 0],
    rh = scale(point, 1 / d);
  return scale(sub(scale(rh, 3 * dot(m, rh)), m), MU0 / (4 * Math.PI * d ** 3));
}
export function lorentzForce(charge, velocity, electric, magnetic) {
  return scale(add(electric, cross(velocity, magnetic)), charge);
}
/** Symmetric drift–Boris–drift. Positions and velocities are at the same time. */
export function borisStep(state, charge, mass, dt, electric, magnetic) {
  positive(mass, 'Masa');
  positive(dt, 'Paso temporal');
  const halfPosition = add(state.position, scale(state.velocity, dt / 2));
  const e = typeof electric === 'function' ? electric(halfPosition) : electric;
  const b = typeof magnetic === 'function' ? magnetic(halfPosition) : magnetic;
  const h = (charge * dt) / (2 * mass),
    minus = add(state.velocity, scale(e, h));
  const t = scale(b, h),
    s = scale(t, 2 / (1 + dot(t, t)));
  const prime = add(minus, cross(minus, t));
  const plus = add(minus, cross(prime, s));
  const velocity = add(plus, scale(e, h));
  return {
    position: add(halfPosition, scale(velocity, dt / 2)),
    velocity,
    time: (state.time || 0) + dt,
  };
}
/** RK4 integration in arc length; only geometry, never particle dynamics. */
export function traceField(
  seed,
  field,
  { step = 0.07, maxSteps = 280, bound = 5.8, direction = 1, stop = () => false } = {},
) {
  const f = (p) => scale(unit(field(p)), direction);
  const points = [seed];
  let p = seed;
  for (let i = 0; i < maxSteps; i++) {
    const k1 = f(p);
    if (norm(k1) < 0.5 || !k1.every(Number.isFinite)) break;
    const k2 = f(add(p, scale(k1, step / 2))),
      k3 = f(add(p, scale(k2, step / 2))),
      k4 = f(add(p, scale(k3, step)));
    const next = add(p, scale(add(add(k1, scale(k2, 2)), add(scale(k3, 2), k4)), step / 6));
    if (!next.every(Number.isFinite) || norm(next) > bound || stop(next)) break;
    points.push(next);
    p = next;
    if (i > 35 && norm(sub(p, seed)) < step * 0.8) break;
  }
  return points;
}
/** Piecewise-linear V=level via marching tetrahedra (6 tetrahedra/cube). */
export function equipotentialMesh(charges, level, { size = 4, cells = 22 } = {}) {
  const result = [],
    n = cells + 1,
    dx = (2 * size) / cells,
    values = new Float64Array(n * n * n);
  const id = (x, y, z) => (x * n + y) * n + z;
  const pt = (x, y, z) => [-size + x * dx, -size + y * dx, -size + z * dx];
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++)
      for (let z = 0; z < n; z++) values[id(x, y, z)] = electricAt(pt(x, y, z), charges).potential;
  const corners = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ];
  const tetra = [
    [0, 5, 1, 6],
    [0, 1, 2, 6],
    [0, 2, 3, 6],
    [0, 3, 7, 6],
    [0, 7, 4, 6],
    [0, 4, 5, 6],
  ];
  for (let x = 0; x < cells; x++)
    for (let y = 0; y < cells; y++)
      for (let z = 0; z < cells; z++) {
        const p = corners.map((c) => pt(x + c[0], y + c[1], z + c[2])),
          v = corners.map((c) => values[id(x + c[0], y + c[1], z + c[2])]);
        if (v.some((a) => !Number.isFinite(a))) continue;
        for (const t of tetra) {
          const inside = t.filter((i) => v[i] >= level),
            outside = t.filter((i) => v[i] < level);
          if (!inside.length || !outside.length) continue;
          const interp = (i, j) =>
            add(p[i], scale(sub(p[j], p[i]), (level - v[i]) / (v[j] - v[i])));
          if (inside.length === 1 || outside.length === 1) {
            const a = inside.length === 1 ? inside : outside,
              b = inside.length === 1 ? outside : inside;
            for (const i of b) result.push(...interp(a[0], i));
          } else {
            const [a, b] = inside,
              [c, d] = outside,
              ac = interp(a, c),
              ad = interp(a, d),
              bc = interp(b, c),
              bd = interp(b, d);
            result.push(...ac, ...ad, ...bc, ...ad, ...bd, ...bc);
          }
        }
      }
  return new Float32Array(result);
}
export function format(value, unitName = '', digits = 3) {
  if (!Number.isFinite(value)) return 'No definido';
  if (value === 0) return `0 ${unitName}`.trim();
  const abs = Math.abs(value),
    prefixes = [
      [1e9, 'G'],
      [1e6, 'M'],
      [1e3, 'k'],
      [1, ''],
      [1e-3, 'm'],
      [1e-6, 'µ'],
      [1e-9, 'n'],
      [1e-12, 'p'],
    ];
  const [factor, prefix] = prefixes.find(([f]) => abs >= f) || [1, ''];
  return `${Number((value / factor).toPrecision(digits))} ${prefix}${unitName}`.trim();
}
