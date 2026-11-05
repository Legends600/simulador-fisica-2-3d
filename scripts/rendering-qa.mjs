import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';

const browser = await launchBrowser(),
  checks = [],
  errors = [];
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const pass = (name) => {
  checks.push(name);
  console.log('PASS', name);
};
await mkdir('.qa/rendering', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(base);
  await page.waitForFunction(() => window.FLUX?.getRenderInfo()?.calls > 0);
  for (const [unit, model] of [
    ['electric', 'electrode'],
    ['capacitor', 'positive-plate'],
    ['circuit', 'resistor'],
    ['magnetic', 'bar-magnet'],
  ]) {
    await page.click(`[data-unit="${unit}"]`);
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => FLUX.getRenderInfo());
    assert.ok(info.models.includes(model), unit);
    assert.equal(info.quality, 'studio');
    assert.ok(info.studio && info.shadows);
    assert.ok(info.triangles > 1000);
    await page.locator('#scene').screenshot({ path: `.qa/rendering/${unit}.png` });
  }
  pass('Los cuatro montajes se renderizan con materiales, iluminación, sombras y posprocesado');
  await page.click('[data-unit="capacitor"]');
  await page.click('#animation-play');
  const detailed = await page.locator('#world').screenshot();
  await page.selectOption('#render-quality', 'light');
  await page.waitForFunction(() => !FLUX.getRenderInfo().shadows);
  assert.equal((await page.evaluate(() => FLUX.getRenderInfo())).quality, 'light');
  const light = await page.locator('#world').screenshot();
  assert.notDeepEqual(detailed, light);
  await page.locator('#cap-area').fill('600');
  await page.locator('#cap-area').dispatchEvent('input');
  await page.locator('#cap-distance').fill('10');
  await page.locator('#cap-distance').dispatchEvent('input');
  await page.selectOption('#dielectric-material', '4');
  await page.click('#home-camera');
  await page.locator('#scene').screenshot({ path: '.qa/rendering/capacitor-limits.png' });
  assert.ok((await page.evaluate(() => FLUX.getRenderInfo())).models.includes('dielectric'));
  pass(
    'Render ligero operativo y capacitor editable en los límites de área, separación y dieléctrico',
  );
  await page.selectOption('#render-quality', 'studio');
  await page.click('[data-unit="circuit"]');
  await page.selectOption('#circuit-mode', 'rc');
  await page.click('#rc-play');
  await page.waitForFunction(() => FLUX.getState().state.circuit.tauTime > 1.1);
  const before = await page.evaluate(() => FLUX.getRenderInfo());
  await page.waitForFunction(() => FLUX.getState().state.circuit.tauTime > 1.35);
  const after = await page.evaluate(() => FLUX.getRenderInfo());
  assert.equal(after.geometries, before.geometries);
  assert.equal(after.textures, before.textures);
  assert.ok(after.models.includes('electrolytic-capacitor'));
  await page.click('#rc-play');
  await page.locator('#scene').screenshot({ path: '.qa/rendering/circuit-rc.png' });
  pass('La carga RC actualiza el visor sin recrear geometrías ni texturas');
  const download = page.waitForEvent('download');
  await page.click('#capture');
  await (await download).saveAs('.qa/rendering/capture.png');
  pass('La captura PNG utiliza el mismo renderizado que la escena');
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(base);
  await mobile.waitForFunction(() => document.body.dataset.appState === 'ready');
  assert.equal((await mobile.evaluate(() => FLUX.getRenderInfo())).quality, 'light');
  assert.equal(
    await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
  );
  pass('Móvil inicia con render ligero y sin desbordamiento horizontal');
  assert.deepEqual(errors, []);
  await writeFile('.qa/rendering/results.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(`${checks.length} comprobaciones de renderizado aprobadas.`);
} finally {
  await browser.close();
}
