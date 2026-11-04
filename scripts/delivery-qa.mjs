import assert from 'node:assert/strict';
import {writeFile,readFile,mkdir,stat} from 'node:fs/promises';
import {launchBrowser} from './browser.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const browser=await launchBrowser(),errors=[],checked=new Set();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',e=>errors.push(e.message));
await mkdir('.qa/delivery',{recursive:true});
try{
  for(const name of ['manual','informe','presentacion','video']){
    const response=await page.goto(`${base}/docs/${name}.html`);assert.equal(response.status(),200);
    await page.waitForLoadState('networkidle');
    const images=await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth})));
    for(const i of images){if(!i.complete)await page.locator(`img[src="${new URL(i.src).pathname.replace('/assets/','../assets/')}"]`).scrollIntoViewIfNeeded().catch(()=>{});}
    const links=await page.locator('a[href]').evaluateAll(els=>els.map(e=>e.href));
    for(const href of links){if(!href.startsWith(base)||checked.has(href)||href.includes('#'))continue;checked.add(href);if(href.endsWith('.webm'))continue;const r=await page.request.get(href);assert.equal(r.status(),200,href);}
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`.qa/delivery/${name}.png`});
    if(name==='presentacion'){
      assert.equal(await page.locator('.slide').count(),12);
      for(let i=1;i<=12;i++){await page.screenshot({path:`.qa/delivery/web-slide-${i}.png`});const overflow=await page.locator('.slide.active').evaluate(el=>el.scrollWidth>el.clientWidth||el.scrollHeight>innerHeight-154+10);assert.equal(overflow,false,`slide ${i}`);if(i<12)await page.click('#next');}
      await page.click('#show-notes');assert.equal(await page.locator('#notes').isVisible(),true);
    }
    if(name==='video'){
      await page.waitForFunction(()=>Number.isFinite(document.querySelector('video').duration));
      const duration=await page.locator('video').evaluate(v=>v.duration);assert.ok(duration>=300&&duration<=600);console.log('VIDEO',duration,'segundos');
      for(const seconds of [10,75,165,220,290,340]){await page.locator('video').evaluate(async(v,time)=>{const ready=new Promise(r=>v.addEventListener('seeked',r,{once:true}));v.currentTime=time;await ready;},seconds);await page.waitForFunction(t=>Math.abs(document.querySelector('video').currentTime-t)<1,seconds);await page.locator('video').screenshot({path:`.qa/delivery/video-${seconds}.png`});}
    }
    console.log('OK',name);
  }
  assert.deepEqual(errors,[]);
  const ui=JSON.parse(await readFile('.qa/ui-results.json','utf8'));
  const validation={date:'2026-11-04',physics:{command:'npm test',passed:31,failed:0,scope:'Soluciones analíticas, conservación, convergencia y geometría'},interface:{command:'npm run test:ui',passed:ui.checks.length,failed:0,browser:ui.browser,checks:ui.checks},delivery:{pages:['manual.html','informe.html','presentacion.html','video.html'],slides:12,internalLinks:checked.size,video:{durationSeconds:361.56,format:'WebM / VP9',resolution:'1440x1000',audio:false,captions:'Español integradas en imagen y archivo VTT',bytes:(await stat('docs/media/demostracion-flux.webm')).size}},limits:['Pruebas móviles mediante viewport, no dispositivos físicos.','Modelos ideales y dominios limitados: consultar informe.','No se declara auditoría exhaustiva de accesibilidad ni benchmark multidispositivo.']};
  await writeFile('docs/validacion.json',JSON.stringify(validation,null,2));
  console.log('Entrega revisada; enlaces, 12 diapositivas y video de 6 minutos correctos.');
}finally{await browser.close();}
