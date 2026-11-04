import {launchBrowser} from './browser.mjs';
import {mkdir,rename,writeFile,stat} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
await mkdir('docs/media',{recursive:true});await mkdir('.qa/recordings',{recursive:true});
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir:'.qa/recordings',size:{width:1440,height:1000}}});
const page=await context.newPage();
const video=page.video(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const input=async(id,value)=>{await page.locator('#'+id).fill(String(value));await page.locator('#'+id).dispatchEvent('input');};
const unit=async name=>{await page.click(`[data-unit="${name}"]`);await page.click('#reset');};
const select=async(id,value)=>page.selectOption('#'+id,value);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const rotate=async()=>{const box=await page.locator('#world').boundingBox();const x=box.x+box.width*.55,y=box.y+box.height*.45;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+90,y+25,{steps:40});await page.mouse.up();};
const chapters=[
  {start:0,title:'FLUX · Laboratorio de Física II',caption:'Cuatro unidades para experimentar con electricidad y magnetismo. Los controles cambian el modelo y los resultados se calculan en tiempo real.',action:async()=>{await rotate();}},
  {start:20,title:'01 · Una carga puntual',caption:'Una carga de +1 nC situada en el origen genera 8.99 N/C y un potencial de 8.99 V a un metro. La sonda P permite evaluar cualquier punto dentro del dominio.',action:async()=>{await select('electric-preset','single');await input('charge-q-0',1);await input('probe-0',1);await input('probe-1',0);}},
  {start:35,title:'01 · Dependencia con la distancia',caption:'Al duplicar la distancia a dos metros, el campo cae a la cuarta parte y el potencial a la mitad: E ∝ 1/r² y V ∝ 1/r.',action:async()=>{await input('probe-0',2);}},
  {start:50,title:'01 · Superposición de campos',caption:'En el centro de un dipolo el potencial puede ser cero aunque el campo no lo sea. El potencial suma escalares; el campo suma vectores.',action:async()=>{await page.click('#reset');await input('probe-1',0);await page.check('#show-vectors');}},
  {start:65,title:'01 · Equipotenciales en 2D',caption:'Las curvas representan V = −15, 0 y +15 V en el plano z = 0. El campo eléctrico es perpendicular a las equipotenciales.',action:async()=>{await page.check('#show-equipotential');await page.click('#view-2d');}},
  {start:80,title:'01 · Superficies equipotenciales 3D',caption:'La misma distribución produce superficies en tres dimensiones. Puedes rotar la escena, cambiar la posición de las cargas y usar hasta diez fuentes.',action:async()=>{await page.click('#view-3d');await page.uncheck('#show-vectors');await rotate();}},
  {start:95,title:'01 · Trayectoria eléctrica',caption:'Una partícula de prueba responde a F = qE. Su trayectoria se integra numéricamente; cerca de una carga o al salir del dominio se detiene. Los datos pueden exportarse a CSV.',action:async()=>{await page.uncheck('#show-equipotential');await page.locator('#particle-details summary').click();await page.click('#particle-play');}},
  {start:115,title:'02 · Capacitor de placas paralelas',caption:'Con 200 cm² de área, 3 mm de separación y 12 V: C ≈ 59 pF. La batería mantiene el voltaje constante. El dibujo amplía las dimensiones para hacerlas visibles.',action:async()=>{await unit('capacitor');await rotate();}},
  {start:135,title:'02 · Geometría del capacitor',caption:'Duplicar el área a 400 cm² duplica la capacitancia a 118 pF. En cambio, aumentar la separación reduce la capacitancia: C = ε₀ εr A/d.',action:async()=>{await input('cap-area',400);}},
  {start:150,title:'02 · Dieléctrico y energía almacenada',caption:'Con εr = 4, la capacitancia aumenta a 472 pF. Al subir el voltaje de 12 a 24 V, la energía crece de 34 a 136 nJ: U = ½CV².',action:async()=>{await select('dielectric-material','4');await pause(5000);await input('cap-voltage',24);}},
  {start:170,title:'03 · Circuito mixto',caption:'Una resistencia de 100 Ω en serie con 220 Ω y 330 Ω en paralelo equivale a 232 Ω. A 12 V circulan 51.7 mA. Cada rama muestra su voltaje, corriente y potencia.',action:async()=>{await unit('circuit');}},
  {start:190,title:'03 · Serie, paralelo y ley de Ohm',caption:'Las configuraciones se construyen con etapas en serie y ramas en paralelo. La gráfica I–V muestra una recta cuya pendiente es 1/R equivalente.',action:async()=>{await page.click('[data-circuit-preset="series"]');await pause(5000);await page.click('[data-circuit-preset="parallel"]');}},
  {start:205,title:'03 · Carga y descarga RC',caption:'Con un capacitor aparece una respuesta transitoria. En t = τ, la carga alcanza el 63.2 % del valor final. Durante la descarga la fuente se desconecta y la corriente cambia de signo.',action:async()=>{await page.click('#reset');await select('circuit-mode','rc');await input('rc-time',0);await page.click('#rc-play');await pause(9500);await select('rc-direction','discharge');await page.click('#rc-play');}},
  {start:225,title:'04 · Campo de un imán',caption:'El imán se aproxima mediante un dipolo magnético ideal. Las líneas exteriores salen del norte y regresan al sur. La sonda muestra las tres componentes de B.',action:async()=>{await unit('magnetic');await rotate();}},
  {start:245,title:'04 · Campo de una corriente rectilínea',caption:'Un conductor infinito con 5 A genera aproximadamente 1 µT a un metro. Invertir la corriente invierte el campo: es la regla de la mano derecha.',action:async()=>{await select('mag-source','wire');await pause(5000);await input('mag-strength',-5);}},
  {start:260,title:'04 · Campo de una espira',caption:'Una espira de radio 1 m con 5 A produce 3.14 µT en el centro. El programa integra la ley de Biot–Savart con 128 segmentos.',action:async()=>{await select('mag-source','loop');await input('mag-strength',5);await input('mag-probe-0',0);}},
  {start:280,title:'04 · Fuerza de Lorentz',caption:'Con E = 0, Bz = 1 T, q = 1 C y m = 1 kg, el movimiento tiene radio 2 m. La componente vz forma una hélice; la energía cinética se mantiene en 2.08 J.',action:async()=>{await page.click('[data-magnetic-mode="lorentz"]');await page.click('#particle-play');}},
  {start:305,title:'04 · Selector de velocidades',caption:'Cuando Ey = 2 N/C, Bz = 1 T y vx = 2 m/s, la fuerza eléctrica cancela a la magnética. La partícula avanza sin desviarse porque v = E/B.',action:async()=>{await input('lorentz-e',2);await input('particle-vel-2',0);await page.click('#particle-play');}},
  {start:325,title:'04 · Campos cruzados sin equilibrio',caption:'Al bajar Ey a 0.5 N/C se rompe la compensación. La trayectoria se curva y la energía puede cambiar: el campo eléctrico sí realiza trabajo.',action:async()=>{await input('lorentz-e',.5);await page.click('#particle-play');}},
  {start:345,title:'Experimentos reproducibles y documentación',caption:'Guarda un experimento en JSON y exporta su trayectoria a CSV. El repositorio incluye código, pruebas, manual, informe técnico y presentación para la defensa.',action:async()=>{await page.click('#export-state');await page.click('#particle-csv');}}
];
const timestamp=seconds=>`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}.000`;
try{
  await page.goto(base);await page.waitForFunction(()=>window.FLUX?.getRenderInfo()?.calls>0);
  await page.evaluate(()=>{const caption=document.createElement('div');caption.id='demo-caption';caption.className='demo-caption';caption.setAttribute('aria-live','polite');document.body.append(caption);});
  const started=Date.now();
  for(const chapter of chapters){
    await pause(Math.max(0,started+chapter.start*1000-Date.now()));
    await page.evaluate(({title,caption})=>{const box=document.querySelector('#demo-caption');box.replaceChildren();const label=document.createElement('small');label.textContent=title;box.append(label,document.createTextNode(caption));},{title:chapter.title,caption:chapter.caption});
    console.log(`${timestamp(chapter.start)} ${chapter.title}`);
    await chapter.action();
    await page.evaluate(()=>{scrollTo(0,0);document.querySelector('#toast').hidden=true;document.activeElement?.blur();});
  }
  await pause(Math.max(0,started+360000-Date.now()));
  if(errors.length)throw new Error(errors.join('\n'));
  await page.close();await context.close();
  await video.saveAs('docs/media/demostracion-flux.webm');
  const info=await stat('docs/media/demostracion-flux.webm');
  const vtt='WEBVTT\n\n'+chapters.map((c,i)=>`${i+1}\n${timestamp(c.start)} --> ${timestamp(chapters[i+1]?.start||360)}\n${c.title}\n${c.caption}\n`).join('\n');
  await writeFile('docs/media/subtitulos-es.vtt',vtt);
  await writeFile('docs/media/capitulos.json',JSON.stringify(chapters.map(({start,title,caption})=>({start,title,caption})),null,2));
  await writeFile('docs/guion-video.md','# Guion del video demostrativo\n\nDuración del recorrido: 6 minutos. Grabación de la aplicación real; subtítulos integrados en español, sin pista de audio.\n\n'+chapters.map((c,i)=>`## ${timestamp(c.start).slice(3,8)} — ${c.title}\n\n${c.caption}\n`).join('\n'));
  console.log(`Video guardado: ${(info.size/1024/1024).toFixed(1)} MB; sin errores JavaScript.`);
}finally{await browser.close();}
