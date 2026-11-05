import test from 'node:test';
import assert from 'node:assert/strict';
import {
  K,
  EPS0,
  MU0,
  electricAt,
  capacitor,
  circuit,
  rcCircuit,
  magneticAt,
  borisStep,
  lorentzForce,
  norm,
  sub,
  traceField,
  equipotentialMesh,
} from '../src/core/physics.js';
const close = (actual, expected, tol = 1e-10) =>
  assert.ok(
    Math.abs(actual - expected) <= tol * Math.max(Math.abs(expected), 1e-20),
    `${actual} ≠ ${expected}`,
  );
const vclose = (a, b, tol = 1e-10) =>
  a.forEach((v, i) =>
    Math.abs(b[i]) < 1e-15 ? assert.ok(Math.abs(v) < tol) : close(v, b[i], tol),
  );
test('Coulomb: 1 nC a 1 m produce aproximadamente 8.98755 N/C y V', () => {
  const r = electricAt([1, 0, 0], [{ q: 1e-9, position: [0, 0, 0] }]);
  close(r.potential, 8.987551792261171, 1e-9);
  vclose(r.field, [K * 1e-9, 0, 0]);
});
test('Ley inversa del cuadrado y potencial inverso de la distancia', () => {
  const c = [{ q: 1e-9, position: [0, 0, 0] }],
    a = electricAt([1, 0, 0], c),
    b = electricAt([2, 0, 0], c);
  close(a.field[0] / b.field[0], 4);
  close(a.potential / b.potential, 2);
});
test('Dipolo: V=0 y E distinto de cero en el punto medio', () => {
  const r = electricAt(
    [0, 0, 0],
    [
      { q: 1e-9, position: [-1, 0, 0] },
      { q: -1e-9, position: [1, 0, 0] },
    ],
  );
  assert.equal(r.potential, 0);
  vclose(r.field, [2 * K * 1e-9, 0, 0]);
});
test('Cargas iguales: campo nulo en el punto medio', () => {
  const r = electricAt(
    [0, 0, 0],
    [
      { q: 1e-9, position: [-1, 0, 0] },
      { q: 1e-9, position: [1, 0, 0] },
    ],
  );
  vclose(r.field, [0, 0, 0]);
  close(r.potential, 2 * K * 1e-9);
});
test('E coincide con −grad(V) por diferencia central en un punto 3D', () => {
  const c = [
      { q: 3e-9, position: [-0.5, 1, 0] },
      { q: -2e-9, position: [1, -0.2, 0.4] },
    ],
    p = [0.2, 0.7, 1.1],
    e = electricAt(p, c).field,
    h = 1e-5;
  for (let i = 0; i < 3; i++) {
    const a = [...p],
      b = [...p];
    a[i] += h;
    b[i] -= h;
    close(e[i], -(electricAt(a, c).potential - electricAt(b, c).potential) / (2 * h), 1e-7);
  }
});
test('Una sonda en una carga devuelve singularidad explícita', () => {
  const r = electricAt([0, 0, 0], [{ q: 1, position: [0, 0, 0] }]);
  assert.equal(r.singular, true);
  assert.ok(Number.isNaN(r.potential));
});
test('Una fuente con carga cero no introduce singularidades artificiales', () => {
  const r = electricAt([0, 0, 0], [{ q: 0, position: [0, 0, 0] }]);
  assert.equal(r.singular, false);
  assert.equal(r.potential, 0);
  vclose(r.field, [0, 0, 0]);
});
test('Diez cargas cumplen superposición', () => {
  const c = Array.from({ length: 10 }, (_, i) => ({
      q: (i % 2 ? -1 : 1) * 1e-9,
      position: [i * 0.2, 0, 0],
    })),
    p = [1, 2, 3];
  close(
    electricAt(p, c).potential,
    c.reduce((s, q) => s + electricAt(p, [q]).potential, 0),
  );
});
test('Capacitor: 200 cm², 3 mm, 12 V', () => {
  const c = capacitor(0.02, 0.003, 1, 12);
  close(c.capacitance, 59.027918752e-12);
  close(c.field, 4000);
  close(c.energy, 0.5 * c.capacitance * 144);
  close(c.charge, c.capacitance * 12);
});
test('Capacitor: duplicar εr o A duplica C; duplicar d reduce C a la mitad', () => {
  const base = capacitor(0.02, 0.003, 1, 12).capacitance;
  close(capacitor(0.04, 0.003, 1, 12).capacitance, 2 * base);
  close(capacitor(0.02, 0.003, 2, 12).capacitance, 2 * base);
  close(capacitor(0.02, 0.006, 1, 12).capacitance, base / 2);
});
test('Capacitor: energía cuadrática en V y cero sin voltaje', () => {
  close(capacitor(1, 0.1, 1, 20).energy / capacitor(1, 0.1, 1, 10).energy, 4);
  assert.equal(capacitor(1, 1, 1, 0).energy, 0);
});
test('Dimensiones o resistencias no físicas son rechazadas', () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => capacitor(bad, 0.1, 1, 2), RangeError);
    assert.throws(() => circuit(12, [[bad]]), RangeError);
    assert.throws(() => rcCircuit(100, bad, 12, 1), RangeError);
  }
});
test('Serie: R=650 Ω, I=12/650 A', () => {
  const c = circuit(12, [[100], [220], [330]]);
  close(c.resistance, 650);
  close(c.current, 12 / 650);
  close(
    c.stages.reduce((s, r) => s + r.voltage, 0),
    12,
  );
});
test('Paralelo: dos resistencias de 100 Ω equivalen a 50 Ω', () => {
  const c = circuit(12, [[100, 100]]);
  close(c.resistance, 50);
  close(c.current, 0.24);
  close(c.stages[0].branches[0].current, 0.12);
});
test('Mixto: 100 + (220 || 330) = 232 Ω', () => {
  const c = circuit(12, [[100], [220, 330]]);
  close(c.resistance, 232);
  close(c.current, 12 / 232);
  close(
    c.stages[1].branches.reduce((s, b) => s + b.current, 0),
    c.current,
  );
});
test('Conservación de potencia y leyes de Kirchhoff para 16 resistencias', () => {
  const c = circuit(24, [
    [10, 20, 40, 80],
    [15, 30, 60, 120],
    [11, 22, 33, 44],
    [100, 200, 300, 400],
  ]);
  close(
    c.power,
    c.stages.flatMap((s) => s.branches).reduce((s, b) => s + b.power, 0),
  );
  close(
    c.stages.reduce((s, b) => s + b.voltage, 0),
    24,
  );
  for (const stage of c.stages)
    close(
      stage.branches.reduce((s, b) => s + b.current, 0),
      c.current,
    );
});
test('Circuito a 0 V: corriente y potencia nulas', () => {
  const c = circuit(0, [[100], [200, 300]]);
  assert.equal(c.current, 0);
  assert.equal(c.power, 0);
});
test('RC: en una constante de tiempo carga 63.212 %', () => {
  const r = rcCircuit(1000, 0.001, 12, 1);
  close(r.tau, 1);
  close(r.voltage / 12, 1 - Math.exp(-1));
  close(r.current, 0.012 / Math.E);
});
test('RC: descarga con corriente negativa y condiciones iniciales correctas', () => {
  assert.equal(rcCircuit(100, 0.01, 12, 0).voltage, 0);
  assert.equal(rcCircuit(100, 0.01, 12, 0, false).voltage, 12);
  close(rcCircuit(100, 0.01, 12, 1, false).voltage, 12 / Math.E);
  assert.ok(rcCircuit(100, 0.01, 12, 1, false).current < 0);
});
test('Conductor infinito: B=µ₀I/(2πr), orientación derecha y corriente invertida', () => {
  vclose(magneticAt([1, 0, 0], 'wire', 5), [0, (MU0 * 5) / (2 * Math.PI), 0]);
  vclose(magneticAt([1, 0, 0], 'wire', -5), [0, (-MU0 * 5) / (2 * Math.PI), 0]);
  close(norm(magneticAt([2, 0, 0], 'wire', 5)), norm(magneticAt([1, 0, 0], 'wire', 5)) / 2);
});
test('Espira: campo central y campo sobre el eje coinciden con solución analítica', () => {
  for (const z of [0, 0.5, 1, 2]) {
    const b = magneticAt([0, 0, z], 'loop', 5);
    close(b[2], (MU0 * 5) / (2 * (1 + z * z) ** 1.5), 1e-12);
    assert.ok(Math.abs(b[0]) < 1e-18);
    assert.ok(Math.abs(b[1]) < 1e-18);
  }
});
test('Dipolo: campo axial es el doble del ecuatorial a igual distancia', () => {
  close(norm(magneticAt([0, 2, 0], 'dipole', 5)), 2 * norm(magneticAt([2, 0, 0], 'dipole', 5)));
  assert.ok(magneticAt([0, 2, 0], 'dipole', 5)[1] > 0);
  assert.ok(magneticAt([2, 0, 0], 'dipole', 5)[1] < 0);
});
test('Lorentz: v en x, B en z y q positiva producen fuerza en −y', () => {
  vclose(lorentzForce(2, [3, 0, 0], [0, 0, 0], [0, 0, 4]), [0, -24, 0]);
});
test('Boris con E uniforme reproduce aceleración y posición analíticas', () => {
  let s = { position: [0, 0, 0], velocity: [1, 0, 0], time: 0 };
  for (let i = 0; i < 100; i++) s = borisStep(s, 2, 1, 0.01, [0, 3, 0], [0, 0, 0]);
  vclose(s.position, [1, 3, 0]);
  vclose(s.velocity, [1, 6, 0]);
});
test('Boris: conservación de rapidez durante 10 000 pasos magnéticos', () => {
  let s = { position: [0, 0, 0], velocity: [2, 0, 0.5], time: 0 };
  const initial = norm(s.velocity);
  for (let i = 0; i < 10000; i++) s = borisStep(s, 1, 1, 0.005, [0, 0, 0], [0, 0, 1]);
  close(norm(s.velocity), initial, 1e-11);
  close(s.position[2], 25, 1e-11);
});
test('Órbita magnética: radio 2 m y cierre de una revolución', () => {
  let s = { position: [0, 0, 0], velocity: [2, 0, 0], time: 0 },
    dt = (2 * Math.PI) / 2000;
  for (let i = 0; i < 2000; i++) s = borisStep(s, 1, 1, dt, [0, 0, 0], [0, 0, 1]);
  assert.ok(norm(s.position) < 2e-5);
  assert.ok(norm(sub(s.velocity, [2, 0, 0])) < 2e-5);
});
test('Boris converge con orden dos al reducir el paso', () => {
  const error = (dt) => {
    let s = { position: [0, 0, 0], velocity: [2, 0, 0], time: 0 };
    for (let i = 0; i < Math.round(1 / dt); i++) s = borisStep(s, 1, 1, dt, [0, 0, 0], [0, 0, 1]);
    return norm(sub(s.velocity, [2 * Math.cos(1), -2 * Math.sin(1), 0]));
  };
  const ratio = error(0.02) / error(0.01);
  assert.ok(ratio > 3.9 && ratio < 4.1);
});
test('Selector de velocidades E/B: fuerza nula si v×B = −E', () => {
  let s = { position: [0, 0, 0], velocity: [2, 0, 0], time: 0 };
  for (let i = 0; i < 100; i++) s = borisStep(s, 1, 1, 0.01, [0, 2, 0], [0, 0, 1]);
  vclose(s.velocity, [2, 0, 0]);
  vclose(s.position, [2, 0, 0]);
});
test('Partícula neutra conserva velocidad y no siente E ni B', () => {
  const s = borisStep(
    { position: [0, 0, 0], velocity: [1, 2, 3] },
    0,
    1,
    0.1,
    [100, 100, 100],
    [3, 3, 3],
  );
  vclose(s.velocity, [1, 2, 3]);
  vclose(s.position, [0.1, 0.2, 0.3]);
});
test('Líneas de campo de una carga aislada son radiales', () => {
  const points = traceField(
    [0.2, 0, 0],
    (p) => electricAt(p, [{ q: 1e-9, position: [0, 0, 0] }]).field,
  );
  assert.ok(points.length > 20);
  for (const p of points) {
    assert.ok(Math.abs(p[1]) < 1e-12);
    assert.ok(Math.abs(p[2]) < 1e-12);
  }
  assert.ok(points.at(-1)[0] > 5);
});
test('Isosuperficie esférica: radio de 1 m con error de malla menor a 5 %', () => {
  const q = 1e-9,
    mesh = equipotentialMesh([{ q, position: [0, 0, 0] }], K * q, { size: 2, cells: 24 });
  assert.ok(mesh.length > 500);
  for (let i = 0; i < mesh.length; i += 3) {
    const r = norm([mesh[i], mesh[i + 1], mesh[i + 2]]);
    assert.ok(Math.abs(r - 1) < 0.05, `radio ${r}`);
  }
});
