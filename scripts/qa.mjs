import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
await mkdir('.qa', { recursive: true });
await mkdir('assets/screenshots', { recursive: true });
await mkdir('assets/figures', { recursive: true });
const browser = await launchBrowser(),
  checks = [],
  errors = [],
  failedRequests = [];
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
});
const pass = (name) => {
  checks.push(name);
  console.log('PASS', name);
};
const input = async (id, value) => {
  await page.locator('#' + id).fill(String(value));
  await page.locator('#' + id).dispatchEvent('input');
};
const shot = async (name) => {
  await page.evaluate(() => {
    scrollTo(0, 0);
    document.querySelector('#toast').hidden = true;
    document.activeElement?.blur();
  });
  await page.screenshot({ path: `assets/screenshots/${name}.png`, fullPage: false });
  await page.locator('#scene').screenshot({ path: `assets/figures/${name}.png` });
};
try {
  await page.goto(base);
  await page.waitForFunction(() => window.FLUX?.getRenderInfo()?.calls > 0);
  pass('WebGL inicia y renderiza la escena');
  await shot('campo-electrico');
  await page.selectOption('#electric-preset', 'single');
  await input('charge-q-0', 1);
  await input('probe-0', 1);
  await input('probe-1', 0);
  assert.match(await page.locator('#results').innerText(), /8.99 V/);
  assert.match(await page.locator('#results').innerText(), /8.99 N\/C/);
  pass('Sonda reproduce 1 nC a 1 m');
  await input('probe-0', 0);
  assert.match(await page.locator('#results').innerText(), /No definido/);
  pass('La singularidad de una carga se muestra sin resultados falsos');
  for (let i = 0; i < 9; i++) await page.click('#add-charge');
  assert.equal(await page.locator('.charge-row').count(), 10);
  assert.equal(await page.locator('#add-charge').isDisabled(), true);
  await page.click('[data-delete-charge="9"]');
  assert.equal(await page.locator('.charge-row').count(), 9);
  pass('Edición, límite de 10 cargas y eliminación');
  await page.click('#reset');
  await page.check('#show-equipotential');
  assert.ok((await page.evaluate(() => FLUX.getRenderInfo())).objects > 100);
  await shot('equipotenciales');
  await page.click('#view-2d');
  await shot('vista-2d');
  assert.equal(await page.locator('#view-2d').getAttribute('aria-pressed'), 'true');
  pass('Equipotenciales y cambio 2D/3D');
  await page.click('#view-3d');
  await page.locator('#particle-details summary').click();
  await page.click('#particle-play');
  await page.waitForFunction(() => FLUX.getSimulation()?.state.time > 0.3);
  await page.click('#particle-play');
  const trajectory = await page.evaluate(() => FLUX.getSimulation());
  assert.ok(trajectory.samples > 1);
  assert.equal(trajectory.running, false);
  const csvPromise = page.waitForEvent('download');
  await page.click('#particle-csv');
  const csv = await csvPromise;
  await csv.saveAs('.qa/trajectory.csv');
  assert.match(
    await readFile('.qa/trajectory.csv', 'utf8'),
    /^t_s,x_m,y_m,z_m,vx_m_s,vy_m_s,vz_m_s/,
  );
  pass('Trayectoria eléctrica, pausa y CSV con unidades');
  await page.click('[data-unit="capacitor"]');
  assert.match(await page.locator('#results').innerText(), /59 pF/);
  await input('cap-area', 400);
  assert.match(await page.locator('#results').innerText(), /118 pF/);
  await page.selectOption('#dielectric-material', '4');
  assert.match(await page.locator('#results').innerText(), /472 pF/);
  await shot('capacitor');
  pass('Capacitancia cambia con área y dieléctrico');
  await input('cap-distance', 0);
  assert.equal(await page.locator('#cap-distance').evaluate((e) => e.checkValidity()), false);
  assert.ok((await page.evaluate(() => FLUX.getState())).state.capacitor.distance > 0);
  await input('cap-distance', 3);
  pass('Entrada no física no contamina el estado');
  await page.click('[data-unit="circuit"]');
  assert.match(await page.locator('#results').innerText(), /232 Ω/);
  await shot('circuitos');
  await page.click('[data-circuit-preset="parallel"]');
  assert.ok((await page.evaluate(() => FLUX.getState())).state.circuit.stages[0].length === 3);
  await page.click('[data-add-branch="0"]');
  assert.equal((await page.evaluate(() => FLUX.getState())).state.circuit.stages[0].length, 4);
  await page.click('[data-remove-branch="0,3"]');
  pass('Circuitos serie/paralelo/mixto y edición de ramas');
  await page.click('#reset');
  await page.selectOption('#circuit-mode', 'rc');
  await input('rc-time', 1);
  assert.match(await page.locator('#results').innerText(), /7.59 V/);
  await page.click('#rc-play');
  await page.waitForFunction(() => FLUX.getState().state.circuit.tauTime > 1.1);
  await page.click('#rc-play');
  await shot('circuito-rc');
  pass('Carga RC al 63.2 % y animación temporal');
  await page.click('[data-unit="magnetic"]');
  await shot('iman');
  await page.selectOption('#mag-source', 'wire');
  assert.match(await page.locator('#results').innerText(), /1 µT/);
  await input('mag-strength', -5);
  assert.match(await page.locator('#results').innerText(), /\-1 µT/);
  await shot('conductor');
  await page.selectOption('#mag-source', 'loop');
  await input('mag-probe-0', 0);
  assert.match(await page.locator('#results').innerText(), /3.14 µT/);
  await shot('espira');
  pass('Imán, hilo y espira con magnitud y signo correctos');
  await page.click('[data-magnetic-mode="lorentz"]');
  await page.click('#particle-play');
  await page.waitForFunction(() => FLUX.getSimulation()?.state.time > 1);
  await page.click('#particle-play');
  let sim = await page.evaluate(() => FLUX.getSimulation());
  assert.ok(Math.abs(Math.hypot(...sim.state.velocity) - Math.hypot(2, 0, 0.4)) < 1e-9);
  await shot('lorentz');
  pass('Trayectoria de Lorentz conserva rapidez con E=0');
  await input('lorentz-e', 2);
  await input('particle-vel-2', 0);
  await page.click('#particle-play');
  await page.waitForFunction(() => FLUX.getSimulation()?.state.time > 0.4);
  await page.click('#particle-play');
  sim = await page.evaluate(() => FLUX.getSimulation());
  assert.ok(Math.abs(sim.state.velocity[1]) < 1e-10);
  pass('Campos cruzados: selector E/B sin desviación');
  const original = await page.evaluate(() => FLUX.getState()),
    jsonPromise = page.waitForEvent('download');
  await page.click('#export-state');
  await (await jsonPromise).saveAs('.qa/experiment.json');
  await page.click('#reset');
  await page.setInputFiles('#import-state', '.qa/experiment.json');
  await page.waitForFunction(
    () => document.querySelector('#toast').textContent === 'Experimento abierto.',
  );
  assert.deepEqual(await page.evaluate(() => FLUX.getState()), original);
  pass('Guardar y abrir restituye el experimento completo');
  const bad = structuredClone(original);
  bad.state.electric.charges[0].q = Infinity;
  await writeFile('.qa/invalid.json', JSON.stringify(bad));
  await page.setInputFiles('#import-state', '.qa/invalid.json');
  await page.waitForFunction(() =>
    document.querySelector('#toast').textContent.includes('No se pudo abrir'),
  );
  assert.deepEqual(await page.evaluate(() => FLUX.getState()), original);
  pass('Importación inválida rechazada sin modificar el experimento');
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
  ]) {
    await page.setViewportSize({ width, height });
    for (const unit of ['electric', 'capacitor', 'circuit', 'magnetic']) {
      await page.click(`[data-unit="${unit}"]`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, `overflow ${unit} ${width}`);
    }
    await page.screenshot({ path: `.qa/responsive-${width}.png`, fullPage: true });
  }
  pass('Cuatro unidades sin desbordamiento a 390 y 768 px');
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  pass('Sin errores de JavaScript ni recursos fallidos');
  const report = {
    date: '2026-11-04',
    browser: await browser.version(),
    url: base,
    checks: checks.map((name) => ({ name, status: 'passed' })),
    errors,
    failedRequests,
  };
  await writeFile('.qa/ui-results.json', JSON.stringify(report, null, 2));
  console.log(`${checks.length} comprobaciones de interfaz aprobadas.`);
} finally {
  await browser.close();
}
