import {launchBrowser} from './browser.mjs';
import {mkdir} from 'node:fs/promises';
await mkdir('.qa',{recursive:true});
const browser=await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>console.error('PAGEERROR',e.message));
  page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
  await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(()=>window.FLUX?.getRenderInfo()?.calls>0);
  console.log(await page.title(),await page.locator('#results').innerText());
  await page.screenshot({path:'.qa/initial.png',fullPage:true});
  console.log('RENDER',await page.evaluate(()=>FLUX.getRenderInfo()));
}finally{await browser.close();}
