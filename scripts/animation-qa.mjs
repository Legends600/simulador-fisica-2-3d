import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';
const browser = await launchBrowser(),
  checks = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const pass = (name) => {
  checks.push(name);
  console.log('PASS', name);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4173');
  await page.waitForFunction(() => window.FLUX?.getRenderInfo()?.calls > 0);
  for (const unit of ['electric', 'capacitor', 'circuit', 'magnetic']) {
    await page.click(`[data-unit="${unit}"]`);
    await page.click('#reset');
    if (!(await page.evaluate(() => FLUX.getAnimationState().playing)))
      await page.click('#animation-play');
    await page.waitForFunction(() => FLUX.getAnimationState().sample.length > 0);
    const before = await page.evaluate(() => FLUX.getAnimationState());
    await page.waitForFunction((t) => FLUX.getAnimationState().time > t + 0.2, before.time);
    const moving = await page.evaluate(() => FLUX.getAnimationState());
    assert.notDeepEqual(before.sample, moving.sample);
    await page.click('#animation-play');
    await wait(120);
    const paused = await page.evaluate(() => FLUX.getAnimationState());
    await wait(220);
    assert.deepEqual(await page.evaluate(() => FLUX.getAnimationState()), paused);
    await page.click('#animation-step');
    const stepped = await page.evaluate(() => FLUX.getAnimationState());
    assert.ok(Math.abs(stepped.time - paused.time - 0.05) < 1e-8);
    assert.notDeepEqual(stepped.sample, paused.sample);
    await page.selectOption('#animation-speed', '2');
    await page.click('#animation-step');
    assert.ok(
      Math.abs((await page.evaluate(() => FLUX.getAnimationState().time)) - stepped.time - 0.1) <
        1e-8,
    );
    await page.selectOption('#animation-speed', '1');
    pass(`Animación real, pausa, paso y velocidad · ${unit}`);
  }
  await page.click('[data-unit="electric"]');
  await page.click('#reset');
  await page.click('#view-2d');
  const target = (await page.evaluate(() => FLUX.getInteractiveTargets())).find(
    (t) => t.chargeIndex === 0,
  );
  const before = await page.evaluate(() => FLUX.getState().state.electric.charges[0].position);
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.mouse.move(target.x + 55, target.y - 25, { steps: 15 });
  await page.mouse.up();
  const after = await page.evaluate(() => FLUX.getState().state.electric.charges[0].position);
  assert.notDeepEqual(before, after);
  assert.equal((await page.evaluate(() => FLUX.getState())).state.electric.preset, 'custom');
  pass('Arrastre directo de una carga actualiza el modelo físico');
  await page.click('[data-unit="capacitor"]');
  await page.click('#reset');
  await page.click('#cap-charge');
  await page.click('#animation-play');
  await page.click('#animation-restart');
  for (let i = 0; i < 40; i++) await page.click('#animation-step');
  const vc = await page.evaluate(() => FLUX.getCapacitorVoltage());
  assert.ok(Math.abs(vc - 12 * (1 - Math.exp(-1))) < 1e-8);
  pass('Capacitor 3D: evolución RC y avance exacto hasta una constante de tiempo');
  await page.click('[data-unit="circuit"]');
  await page.click('#reset');
  await page.click('#view-3d');
  const resistor = (await page.evaluate(() => FLUX.getInteractiveTargets())).find(
    (t) => t.component?.stage === 0,
  );
  await page.mouse.click(resistor.x, resistor.y);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'resistor-0-0');
  const source = (await page.evaluate(() => FLUX.getInteractiveTargets())).find(
    (t) => t.component?.source,
  );
  await page.mouse.click(source.x, source.y);
  assert.equal((await page.evaluate(() => FLUX.getState())).state.circuit.voltage, 0);
  assert.equal((await page.evaluate(() => FLUX.getAnimationState())).sample.length, 0);
  await page.mouse.click(source.x, source.y);
  assert.equal((await page.evaluate(() => FLUX.getState())).state.circuit.voltage, 12);
  pass('Circuito 3D: seleccionar resistencia, apagar fuente y eliminar la corriente');
  await page.click('[data-unit="magnetic"]');
  await page.click('[data-magnetic-mode="lorentz"]');
  await page.click('#particle-play');
  await page.waitForFunction(() => FLUX.getSimulation()?.state.time > 0.2);
  await page.click('#animation-play');
  const sim = await page.evaluate(() => FLUX.getSimulation());
  await wait(180);
  assert.deepEqual(await page.evaluate(() => FLUX.getSimulation()), sim);
  await page.click('#animation-step');
  assert.ok((await page.evaluate(() => FLUX.getSimulation())).state.time > sim.state.time);
  pass('Pausa y paso controlan también el tiempo físico de Lorentz');
  for (const name of ['Omar Tineo', 'Anthuanet Reynoso', 'Moises Morales', 'Ramiro Manrique Rua'])
    assert.match(await page.locator('#project-team').innerText(), new RegExp(name));
  assert.equal(await page.locator('a[href*="video"]').count(), 0);
  pass('Equipo correcto e interfaz sin enlaces al video');
  await page.click('#particle-reset');
  await page.click('#particle-play');
  await page.waitForFunction(() => FLUX.getSimulation()?.state.time > 6.2);
  await page.click('#particle-play');
  await page.locator('#scene').screenshot({ path: 'assets/figures/lorentz-orbita.png' });
  await page.locator('#lorentz-e').fill('2');
  await page.locator('#lorentz-e').dispatchEvent('input');
  await page.locator('#particle-vel-2').fill('0');
  await page.locator('#particle-vel-2').dispatchEvent('input');
  await page.click('#particle-play');
  await page.waitForFunction(() => FLUX.getSimulation()?.state.time > 1.5);
  await page.click('#particle-play');
  await page.locator('#scene').screenshot({ path: 'assets/figures/selector.png' });
  assert.deepEqual(errors, []);
  await mkdir('.qa', { recursive: true });
  await writeFile('.qa/animation-results.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(`${checks.length} comprobaciones de animación aprobadas.`);
} finally {
  await browser.close();
}
