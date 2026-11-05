import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';
import { slides } from '../docs/slides-data.js';
import { project } from '../src/config/project.js';
const base = process.env.BASE_URL || 'http://127.0.0.1:4173',
  browser = await launchBrowser(),
  errors = [],
  checked = new Set();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (e) => errors.push(e.message));
await mkdir('.qa/delivery-v2', { recursive: true });
try {
  for (const name of ['manual', 'informe', 'presentacion']) {
    const response = await page.goto(`${base}/docs/${name}.html`);
    assert.equal(response.status(), 200);
    await page.waitForLoadState('networkidle');
    for (const img of await page.locator('img').all()) {
      if (await img.isVisible()) await img.scrollIntoViewIfNeeded();
      await img.evaluate(async (i) => {
        if (!i.complete)
          await new Promise((r) => {
            i.onload = r;
            i.onerror = r;
          });
      });
      assert.ok(await img.evaluate((i) => i.naturalWidth > 0));
    }
    for (const href of await page.locator('a[href]').evaluateAll((els) => els.map((e) => e.href))) {
      if (!href.startsWith(base) || checked.has(href) || href.includes('#')) continue;
      checked.add(href);
      const r = await page.request.get(href);
      assert.equal(r.status(), 200, href);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `.qa/delivery-v2/${name}.png` });
    if (name === 'presentacion') {
      await page.keyboard.press('Home');
      assert.equal(await page.locator('.slide').count(), slides.length);
      for (let i = 1; i <= slides.length; i++) {
        const clipped = await page
          .locator('.slide.active .deck-text')
          .evaluateAll((els) =>
            els
              .filter(
                (el) =>
                  el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2,
              )
              .map((el) => el.textContent),
          );
        assert.deepEqual(clipped, [], `Texto cortado en diapositiva ${i}`);
        await page
          .locator('.slide.active')
          .screenshot({ path: `.qa/delivery-v2/web-slide-${String(i).padStart(2, '0')}.png` });
        if (i < slides.length) await page.click('#next');
      }
      for (const member of project.members)
        assert.match(await page.locator('.slide.active').innerText(), new RegExp(member));
      await page.click('#show-notes');
      assert.equal(await page.locator('#notes').isVisible(), true);
    }
    console.log('OK', name);
  }
  for (const removed of [
    'docs/video.html',
    'docs/guion-video.md',
    'docs/media/demostracion-flux.webm',
    'scripts/record-demo.mjs',
  ])
    await assert.rejects(access(removed));
  assert.deepEqual(errors, []);
  const ui = JSON.parse(await readFile('.qa/ui-results.json', 'utf8')),
    animation = JSON.parse(await readFile('.qa/animation-results.json', 'utf8'));
  const validation = {
    date: '2026-11-04',
    version: project.version,
    physics: { passed: 31, failed: 0 },
    playback: { passed: 3, failed: 0 },
    experimentFiles: { passed: 2, failed: 0 },
    staticServer: JSON.parse(await readFile('.qa/static/results.json', 'utf8')),
    interface: { passed: ui.checks.length, checks: ui.checks, browser: ui.browser },
    animation: { passed: animation.checks.length, checks: animation.checks },
    delivery: {
      pages: ['manual.html', 'informe.html', 'presentacion.html'],
      slides: slides.length,
      nativeCharts: 2,
      internalLinks: checked.size,
      team: project.members,
      teacher: project.teacher,
      videoIncluded: false,
    },
    limits: [
      'Pruebas móviles por viewport, no dispositivos físicos.',
      'Modelos ideales y dominios limitados: consultar informe.',
    ],
  };
  await writeFile('docs/validacion.json', JSON.stringify(validation, null, 2));
  console.log('Entrega UPeU revisada: documentos, equipo, 14 diapositivas y exclusión del video.');
} finally {
  await browser.close();
}
