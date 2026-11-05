import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launchBrowser } from './browser.mjs';

// Deliberately plain HTTP: no vendor aliases, bundler or access to node_modules.
const root = resolve(process.argv.includes('--dist') ? 'dist' : '.');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/project/')) throw new Error('Prefix');
    const relative = decodeURIComponent(url.pathname.slice('/project/'.length)) || 'index.html';
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep) || relative.split('/').includes('node_modules'))
      throw new Error('Path');
    const bytes = await readFile(file);
    res
      .writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
      .end(bytes);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/project/`;
const browser = await launchBrowser();
await mkdir('.qa/static', { recursive: true });
const checks = [],
  pass = (name) => {
    checks.push(name);
    console.log('PASS', name);
  };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [],
    failed = [],
    dependencies = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  page.on('request', (r) => {
    if (r.url().includes('/node_modules/') || !r.url().startsWith(base)) dependencies.push(r.url());
  });
  await page.goto(base);
  await page.waitForFunction(() => document.body.dataset.appState === 'ready');
  assert.equal(await page.locator('#startup-status').isVisible(), false);
  assert.match(await page.locator('#results').innerText(), /12.2 N\/C/);
  pass('Inicio desde servidor estático en subcarpeta, sin node_modules ni rutas especiales');
  for (const unit of ['electric', 'capacitor', 'circuit', 'magnetic']) {
    await page.click(`[data-unit="${unit}"]`);
    assert.equal((await page.evaluate(() => FLUX.getState())).active, unit);
    assert.ok((await page.locator('#controls input').count()) > 0);
    assert.ok((await page.evaluate(() => FLUX.getRenderInfo())).objects > 0);
  }
  pass('Las cuatro unidades cargan sus controles y escenas');
  await page.click('[data-unit="electric"]');
  await page.selectOption('#electric-preset', 'single');
  assert.equal((await page.evaluate(() => FLUX.getState())).state.electric.charges.length, 1);
  await page.click('#view-2d');
  assert.equal(await page.locator('#view-2d').getAttribute('aria-pressed'), 'true');
  const t = (await page.evaluate(() => FLUX.getAnimationState())).time;
  await page.waitForFunction((time) => FLUX.getAnimationState().time > time + 0.1, t);
  pass('Interacción y animación operativas en el servidor estático');
  await page.click('#reset');
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
      `${width}px`,
    );
    await page.screenshot({ path: `.qa/static/layout-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  assert.deepEqual(dependencies, []);
  pass('Recursos locales sin fallos y diseño sin desbordamiento en cinco tamaños');

  const broken = await browser.newPage();
  await broken.route('**/vendor/three/three.module.js', (route) =>
    route.fulfill({ status: 404, contentType: 'text/plain', body: 'No encontrado' }),
  );
  await broken.goto(base);
  await broken.waitForFunction(() => document.body.dataset.appState === 'error');
  assert.equal(await broken.locator('#startup-status').isVisible(), true);
  assert.match(await broken.locator('#startup-status').innerText(), /carpeta completa/);
  assert.equal(await broken.getByRole('button', { name: 'Volver a intentar' }).isVisible(), true);
  pass('Un recurso ausente muestra recuperación y evita la pantalla vacía');
  await writeFile(
    '.qa/static/results.json',
    JSON.stringify(
      {
        target: root.endsWith('dist') ? 'distribution' : 'source',
        checks,
        errors,
        failed,
        dependencies,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
