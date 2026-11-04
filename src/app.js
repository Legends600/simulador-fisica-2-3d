import {World} from './scene.js';
import {electricAt,capacitor,circuit,rcCircuit,magneticAt,borisStep,lorentzForce,norm,sub,format} from './physics.js';
import {circuitMarkup} from './charts.js';

const $=s=>document.querySelector(s);
const defaults={
  electric:{charges:[{q:4e-9,position:[-1.2,0,0]},{q:-4e-9,position:[1.2,0,0]}],preset:'dipole',lines:true,vectors:false,equipotential:false,level:15,probe:[0,1.5,0],particle:{q:1,mass:1,position:[0,-2,0],velocity:[1.5,.5,0]}},
  capacitor:{area:200,distance:3,dielectric:1,voltage:12},
  circuit:{voltage:12,stages:[[100],[220,330]],mode:'dc',capacitance:1000,tauTime:1,charging:true},
  magnetic:{mode:'field',source:'dipole',strength:5,probe:[1,0,0],ey:0,bz:1,particle:{q:1,mass:1,position:[0,-1,0],velocity:[2,0,.4]}}
};
let state=structuredClone(defaults),active='electric',view='3d',world,simulation=null,rcPlaying=false,lastFrame=0,uiTime=0;
const info={electric:['01','ELECTROSTÁTICA','Haz visible lo invisible.','Explora cómo las cargas transforman el espacio que las rodea.'],capacitor:['02','CAPACITORES Y DIELÉCTRICOS','El espacio también almacena energía.','Experimenta con el área, la separación y el material entre dos placas.'],circuit:['03','CORRIENTE Y LEY DE OHM','Conecta las ideas.','Construye circuitos y descubre cómo se distribuyen el voltaje y la corriente.'],magnetic:['04','FUERZA Y CAMPO MAGNÉTICO','Descubre otra fuerza invisible.','Explora imanes, corrientes y el movimiento de una partícula en campos cruzados.']};
const number=(id,label,value,min,max,step=1,unit='')=>`<label class="field" for="${id}"><span>${label}<span class="unit">${unit}</span></span><input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`;
const range=(id,label,value,min,max,step=1,unit='')=>`<label class="field" for="${id}"><span>${label}<span class="unit">${unit}</span></span><span class="range-row"><input type="range" id="${id}-range" aria-label="${label}, deslizador" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${id}"><input type="number" id="${id}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${value}" required></span></label>`;
const select=(id,label,options,current)=>`<label class="field" for="${id}"><span>${label}</span><select id="${id}">${options.map(([v,l])=>`<option value="${v}" ${v===current?'selected':''}>${l}</option>`).join('')}</select></label>`;
const toggle=(id,label,value)=>`<label class="toggle"><input id="${id}" type="checkbox" ${value?'checked':''}>${label}</label>`;
const coords=(prefix,label,values,min=-5,max=5)=>`<div class="small-note">${label}</div><div class="coordinates">${['x','y','z'].map((a,i)=>number(`${prefix}-${i}`,a,values[i],min,max,.1)).join('')}</div>`;
const section=(title,body,tag='')=>`<div class="panel-section"><div class="section-heading"><h2>${title}</h2>${tag?`<span class="tag">${tag}</span>`:''}</div>${body}</div>`;
const result=(label,value,detail)=>`<article class="result"><div class="result-label">${label}</div><div class="result-value">${value}</div><div class="result-unit">${detail}</div></article>`;
const legend=(color,label,line=false)=>`<span class="legend-item"><i class="${line?'legend-line':'legend-dot'}" style="background:${color}"></i>${label}</span>`;
const explain=(title,body,formula)=>`<div><h2>${title}</h2><p>${body}</p></div><div class="formula">${formula}</div>`;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4500);}
function bind(id,fn,event='input'){const el=$('#'+id);if(!el)return;el.addEventListener(event,()=>{if(el.type==='number'){if(!el.checkValidity()||el.value==='')return;const r=$('#'+id+'-range');if(r)r.value=el.value;}fn(el.type==='checkbox'?el.checked:el.type==='number'?el.valueAsNumber:el.value);});}
function setupRanges(){document.querySelectorAll('[data-range]').forEach(el=>el.addEventListener('input',()=>{const target=$('#'+el.dataset.range);target.value=el.value;target.dispatchEvent(new Event('input',{bubbles:true}));}));}
function setDeepCoords(prefix,target,redraw=true){for(let i=0;i<3;i++)bind(`${prefix}-${i}`,v=>{target[i]=v;if(redraw)draw();else resetSimulation();});}
function download(filename,data,type){const a=document.createElement('a');const url=typeof data==='string'&&data.startsWith('data:')?data:URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=filename;a.click();if(url.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),1000);}
function particleControls(p,isMag){return `${number('particle-q','Carga de la partícula',p.q,-10,10,.1,isMag?'C':'µC')}${number('particle-mass','Masa',p.mass,.1,10,.1,isMag?'kg':'mg')}${coords('particle-pos','Posición inicial (m)',p.position)}${coords('particle-vel','Velocidad inicial (m/s)',p.velocity,-10,10)}<p class="small-note">Partícula de prueba clásica. Las fuentes permanecen fijas.</p><div class="button-row" style="margin-top:13px"><button class="primary-button" id="particle-play">▶ Lanzar</button><button class="secondary-button" id="particle-reset">↺ Borrar</button></div><button class="add-button" id="particle-csv">↓ Exportar trayectoria CSV</button><p id="particle-status" class="small-note">Lista para lanzar · integrador de Boris</p>`;}
function renderControls(){
  const s=state[active];
  if(active==='electric'){
    $('#controls').innerHTML=section('Distribución de cargas',select('electric-preset','Configuración',[['dipole','Dipolo eléctrico'],['single','Carga positiva'],['like','Dos cargas positivas'],['quadrupole','Cuadrupolo'],['custom','Personalizada']],s.preset)+`<div id="charges-list">${s.charges.map((c,i)=>`<div class="charge-row"><div class="charge-top"><span class="charge-sign ${c.q<0?'negative':''}">${c.q<0?'−':'+'}</span><strong>q${i+1}</strong><label class="charge-q"><input aria-label="Carga ${i+1} en nanoculombios" id="charge-q-${i}" type="number" min="-20" max="20" step=".1" required value="${Number((c.q*1e9).toFixed(4))}"> nC</label><button class="icon-button" data-delete-charge="${i}" aria-label="Eliminar carga ${i+1}" ${s.charges.length===1?'disabled':''}>×</button></div><div class="charge-position">${['x','y','z'].map((a,j)=>`<label>${a}<input id="charge-p-${i}-${j}" aria-label="Carga ${i+1}, posición ${a} en metros" type="number" min="-4" max="4" step=".1" required value="${c.position[j]}"></label>`).join('')}</div></div>`).join('')}</div><button class="add-button" id="add-charge" ${s.charges.length>=10?'disabled':''}>＋ Añadir carga</button><p class="small-note">Coordenadas en metros · máximo 10 cargas.</p>`,`${s.charges.length} / 10`)+
      section('Capas de visualización',toggle('show-lines','Líneas de campo',s.lines)+toggle('show-vectors','Vectores del campo en z = 0',s.vectors)+toggle('show-equipotential','Equipotenciales ±V',s.equipotential)+range('potential-level','Nivel de potencial',s.level,2,60,1,'V'))+
      section('Sonda de potencial',coords('probe','Punto P del espacio (m)',s.probe)+`<p class="small-note" id="probe-vector"></p>`,'P')+
      `<details class="panel-section" id="particle-details"><summary>Trayectoria de una partícula</summary>${particleControls(s.particle,false)}</details>`;
    bind('electric-preset',v=>{const presets={single:[{q:4e-9,position:[0,0,0]}],dipole:defaults.electric.charges,like:[{q:4e-9,position:[-1.2,0,0]},{q:4e-9,position:[1.2,0,0]}],quadrupole:[{q:4e-9,position:[-1,-1,0]},{q:-4e-9,position:[1,-1,0]},{q:4e-9,position:[1,1,0]},{q:-4e-9,position:[-1,1,0]}]};s.preset=v;if(presets[v])s.charges=structuredClone(presets[v]);renderControls();draw();},'change');
    s.charges.forEach((c,i)=>{bind(`charge-q-${i}`,v=>{c.q=v*1e-9;s.preset='custom';$('#electric-preset').value='custom';const sign=$(`#charge-q-${i}`).closest('.charge-row').querySelector('.charge-sign');sign.textContent=v<0?'−':'+';sign.classList.toggle('negative',v<0);draw();});for(let j=0;j<3;j++)bind(`charge-p-${i}-${j}`,v=>{c.position[j]=v;s.preset='custom';$('#electric-preset').value='custom';draw();});});
    document.querySelectorAll('[data-delete-charge]').forEach(b=>b.onclick=()=>{s.charges.splice(Number(b.dataset.deleteCharge),1);s.preset='custom';renderControls();draw();});
    $('#add-charge').onclick=()=>{if(s.charges.length>=10)return;s.charges.push({q:2e-9,position:[0,Math.min(3.5,1+s.charges.length*.25),0]});s.preset='custom';renderControls();draw();};
    for(const [id,key] of [['show-lines','lines'],['show-vectors','vectors'],['show-equipotential','equipotential'],['potential-level','level']])bind(id,v=>{s[key]=v;draw();});
    setDeepCoords('probe',s.probe);bindParticles(s.particle,false);
  }else if(active==='capacitor'){
    $('#controls').innerHTML=section('Geometría de las placas',range('cap-area','Área de cada placa',s.area,20,600,10,'cm²')+range('cap-distance','Separación entre placas',s.distance,.5,10,.1,'mm'))+
      section('Material dieléctrico',select('dielectric-material','Medio entre las placas',[['1','Vacío · εr = 1'],['2.1','PTFE · εr ≈ 2.1'],['4','Vidrio · εr ≈ 4'],['6','Mica · εr ≈ 6'],['custom','Personalizado']],['1','2.1','4','6'].includes(String(s.dielectric))?String(s.dielectric):'custom')+range('cap-dielectric','Permitividad relativa',s.dielectric,1,12,.1,'εr')+'<p class="small-note">Valores representativos; dependen del material y la frecuencia.</p>')+
      section('Fuente de voltaje',range('cap-voltage','Diferencia de potencial',s.voltage,0,100,1,'V')+'<p class="small-note">La batería mantiene V constante al cambiar el dieléctrico.</p>')+
      section('Experimento sugerido','<p class="small-note">Duplica el área: C se duplica.<br>Duplica la separación: C se reduce a la mitad.<br>Duplica el voltaje: U se multiplica por cuatro.</p>');
    for(const [id,key] of [['cap-area','area'],['cap-distance','distance'],['cap-dielectric','dielectric'],['cap-voltage','voltage']])bind(id,v=>{s[key]=v;if(key==='dielectric')$('#dielectric-material').value=['1','2.1','4','6'].includes(String(v))?String(v):'custom';draw();});
    bind('dielectric-material',v=>{if(v!=='custom'){s.dielectric=Number(v);renderControls();draw();}},'change');
  }else if(active==='circuit'){
    $('#controls').innerHTML=section('Fuente y configuración',range('circuit-voltage','Voltaje de la fuente',s.voltage,0,48,.5,'V')+`<div class="segmented">${[['series','Serie'],['parallel','Paralelo'],['mixed','Mixto']].map(([v,t])=>`<button data-circuit-preset="${v}">${t}</button>`).join('')}</div>`)+
      section('Constructor de circuitos',`<p class="small-note">Las etapas se conectan en serie. Las ramas de cada etapa, en paralelo.</p>${s.stages.map((stage,i)=>`<div class="stage"><div class="stage-title"><strong>Etapa ${i+1}</strong><button class="icon-button" data-remove-stage="${i}" aria-label="Eliminar etapa ${i+1}" ${s.stages.length===1?'disabled':''}>×</button></div>${stage.map((r,j)=>`<label class="branch">R${i+1}.${j+1}<input id="resistor-${i}-${j}" type="number" min="1" max="100000" step="1" required value="${r}" aria-label="Resistencia ${i+1}.${j+1} en ohmios"> Ω<button class="icon-button" data-remove-branch="${i},${j}" aria-label="Eliminar resistencia ${i+1}.${j+1}" ${stage.length===1?'disabled':''}>×</button></label>`).join('')}<button class="add-button" data-add-branch="${i}" ${stage.length>=4?'disabled':''}>＋ Rama en paralelo</button></div>`).join('')}<button id="add-stage" class="add-button" ${s.stages.length>=4?'disabled':''}>＋ Etapa en serie</button>`)+
      section('Modo de análisis',select('circuit-mode','Tipo de circuito',[['dc','Resistencias · corriente continua'],['rc','Resistencias + capacitor (RC)']],s.mode)+(s.mode==='rc'?range('rc-capacitance','Capacitancia',s.capacitance,100,10000,100,'µF')+select('rc-direction','Proceso',[['charge','Carga desde 0 V'],['discharge','Descarga desde V de la fuente']],s.charging?'charge':'discharge')+range('rc-time','Tiempo normalizado',s.tauTime,0,5,.01,'t / τ')+`<button id="rc-play" class="primary-button">▶ Animar proceso RC</button>`:'<p class="small-note">La gráfica I–V conserva la resistencia equivalente mientras cambia el voltaje.</p>'))+
      section('Resultados por resistencia','<div class="table-wrap" id="branch-results"></div>');
    bind('circuit-voltage',v=>{s.voltage=v;draw();});
    document.querySelectorAll('[data-circuit-preset]').forEach(b=>b.onclick=()=>{s.stages=structuredClone({series:[[100],[220],[330]],parallel:[[100,220,330]],mixed:[[100],[220,330]]}[b.dataset.circuitPreset]);renderControls();draw();});
    s.stages.forEach((stage,i)=>stage.forEach((r,j)=>bind(`resistor-${i}-${j}`,v=>{s.stages[i][j]=v;draw();})));
    document.querySelectorAll('[data-add-branch]').forEach(b=>b.onclick=()=>{s.stages[Number(b.dataset.addBranch)].push(100);renderControls();draw();});
    document.querySelectorAll('[data-remove-branch]').forEach(b=>b.onclick=()=>{const[i,j]=b.dataset.removeBranch.split(',').map(Number);s.stages[i].splice(j,1);renderControls();draw();});
    document.querySelectorAll('[data-remove-stage]').forEach(b=>b.onclick=()=>{s.stages.splice(Number(b.dataset.removeStage),1);renderControls();draw();});
    $('#add-stage').onclick=()=>{s.stages.push([100]);renderControls();draw();};
    bind('circuit-mode',v=>{s.mode=v;rcPlaying=false;renderControls();draw();},'change');
    bind('rc-capacitance',v=>{s.capacitance=v;draw();});bind('rc-time',v=>{s.tauTime=v;draw(false);});bind('rc-direction',v=>{s.charging=v==='charge';s.tauTime=0;renderControls();draw();},'change');
    if($('#rc-play'))$('#rc-play').onclick=()=>{rcPlaying=!rcPlaying;if(s.tauTime>=5)s.tauTime=0;$('#rc-play').textContent=rcPlaying?'Ⅱ Pausar proceso':'▶ Animar proceso RC';};
  }else{
    $('#controls').innerHTML=section('Experimento',`<div class="segmented"><button data-magnetic-mode="field" class="${s.mode==='field'?'active':''}">Campo magnético</button><button data-magnetic-mode="lorentz" class="${s.mode==='lorentz'?'active':''}">Fuerza de Lorentz</button></div>`)+
      (s.mode==='field'?section('Fuente de campo',select('mag-source','Modelo',[['dipole','Imán · dipolo ideal'],['wire','Conductor rectilíneo infinito'],['loop','Espira circular · radio 1 m']],s.source)+range('mag-strength',s.source==='dipole'?'Momento magnético':'Corriente eléctrica',s.strength,-10,10,.5,s.source==='dipole'?'A·m²':'A'))+section('Sonda de campo',coords('mag-probe','Punto P del espacio (m)',s.probe)+'<p class="small-note" id="mag-vector"></p>')+section('Prueba la regla de la mano derecha','<p class="small-note">Invierte el signo de la corriente o del momento: cambia el sentido de las líneas de campo.</p>'):
      section('Campos uniformes cruzados',range('lorentz-e','Campo eléctrico Ey',s.ey,-3,3,.1,'N/C')+range('lorentz-b','Campo magnético Bz',s.bz,-3,3,.1,'T')+'<p class="small-note">E apunta en y; B apunta en z. Son perpendiculares cuando ambos son distintos de cero.</p>')+section('Partícula cargada',particleControls(s.particle,true)));
    document.querySelectorAll('[data-magnetic-mode]').forEach(b=>b.onclick=()=>{s.mode=b.dataset.magneticMode;renderControls();draw();});
    bind('mag-source',v=>{s.source=v;renderControls();draw();},'change');bind('mag-strength',v=>{s.strength=v;draw();});setDeepCoords('mag-probe',s.probe);
    bind('lorentz-e',v=>{s.ey=v;draw();});bind('lorentz-b',v=>{s.bz=v;draw();});if(s.mode==='lorentz')bindParticles(s.particle,true);
  }
  setupRanges();updateResults();
}
function bindParticles(p,isMag){
  bind('particle-q',v=>{p.q=v;resetSimulation();});bind('particle-mass',v=>{p.mass=v;resetSimulation();});setDeepCoords('particle-pos',p.position,false);setDeepCoords('particle-vel',p.velocity,false);
  $('#particle-play').onclick=()=>{
    if(!simulation){simulation={running:true,state:{position:[...p.position],velocity:[...p.velocity],time:0},points:[[...p.position]],samples:[[0,...p.position,...p.velocity]],charge:p.q*(isMag?1:1e-6),mass:p.mass*(isMag?1:1e-6),steps:0};}
    else simulation.running=!simulation.running;
    $('#particle-play').textContent=simulation.running?'Ⅱ Pausar':'▶ Continuar';
  };
  $('#particle-reset').onclick=()=>resetSimulation();
  $('#particle-csv').onclick=()=>{if(!simulation?.samples.length){toast('Lanza una partícula antes de exportar su trayectoria.');return;}download('trayectoria-flux.csv','t_s,x_m,y_m,z_m,vx_m_s,vy_m_s,vz_m_s\n'+simulation.samples.map(a=>a.join(',')).join('\n'),'text/csv;charset=utf-8');};
}
function resetSimulation(){simulation=null;world?.clearParticle();if($('#particle-play'))$('#particle-play').textContent='▶ Lanzar';if($('#particle-status'))$('#particle-status').textContent='Lista para lanzar · integrador de Boris';if(world)updateResults();}
function draw(reset=true){
  if(reset){resetSimulation();rcPlaying=false;if($('#rc-play'))$('#rc-play').textContent='▶ Animar proceso RC';}
  const s=state[active],isCircuit=active==='circuit';
  $('#world').hidden=isCircuit;$('#world').style.display=isCircuit?'none':'block';$('#schematic').hidden=!isCircuit;
  $('#scene').classList.toggle('circuit-scene',isCircuit);
  $('#view-2d').disabled=isCircuit;$('#view-3d').disabled=isCircuit;$('#home-camera').disabled=isCircuit;$('#capture').disabled=isCircuit;
  $('#scene-subtitle').textContent=view==='3d'?'ESPACIO 3D':'VISTA XY';
  $('#scene-hint').textContent=isCircuit?'':view==='2d'?'Vista XY · rueda para acercar · botón derecho para desplazar':'Arrastra para orbitar · Rueda para acercar';
  if(active==='electric'){
    world?.drawElectric(s);$('#scene-title').textContent='Distribución de cargas';
    $('#legend').innerHTML=legend('#f2b564','Carga positiva')+legend('#71a9ff','Carga negativa')+legend('#dbeaff','Sonda P')+(s.equipotential?legend('#87d6c8',`Equipotenciales ±${s.level} V`,true):'');
    $('#scene-overlay').textContent=s.equipotential?(view==='3d'?`Superficies V = ±${s.level} V · malla numérica`:`Curvas V = −${s.level}, 0, +${s.level} V en z = 0`):'1 división = 0.5 m';
    $('#explanation').innerHTML=explain('El campo se suma. El potencial también.','Las líneas indican la dirección de la fuerza sobre una carga positiva. La sonda calcula el campo y el potencial por superposición. Las curvas 2D se evalúan en z = 0.','E = Σ kq r̂ / r²');
  }else if(active==='capacitor'){
    world?.drawCapacitor(s);$('#scene-title').textContent='Capacitor de placas paralelas';$('#legend').innerHTML=legend('#f2b564','Placa positiva')+legend('#71a9ff','Placa a 0 V')+legend('#83c7bd','Dieléctrico')+legend('#b8eee5','Campo eléctrico',true);
    $('#scene-overlay').textContent='Esquema 3D · dimensiones ampliadas para visualización';
    $('#explanation').innerHTML=explain('Más capacidad para la misma diferencia de potencial.','C aumenta con el área y la permitividad; disminuye con la separación. Se desprecia el efecto de borde. La energía almacenada crece con el cuadrado del voltaje.','C = ε₀ εᵣ A / d');
  }else if(active==='circuit'){
    $('#scene-title').textContent=s.mode==='dc'?'Circuito resistivo · ley de Ohm':'Circuito RC · respuesta transitoria';$('#schematic').innerHTML=circuitMarkup(s);$('#scene-overlay').textContent='';$('#legend').innerHTML=legend('#e9b469','Fuente de voltaje')+legend('#83c9bf','Resistencia')+legend('#80d2c5',s.mode==='dc'?'Relación I–V':'Voltaje del capacitor',true);
    $('#explanation').innerHTML=explain(s.mode==='dc'?'La misma física, distintas conexiones.':'El capacitor necesita tiempo para cargarse.',s.mode==='dc'?'La corriente se conserva en cada nodo. Las etapas suman su resistencia; las ramas en paralelo comparten voltaje. La tabla muestra cada componente.':'τ = R equivalente · C. Durante la carga, el capacitor alcanza el 63.2 % de la tensión de la fuente en una constante de tiempo.','V = I R');
  }else{
    world?.drawMagnetic(s);$('#scene-title').textContent=s.mode==='field'?'Líneas de campo magnético':'Trayectoria en campos E y B';$('#legend').innerHTML=s.mode==='field'?legend('#e48b75','Polo norte')+legend('#6496d8','Polo sur')+legend('#82c7bd','Campo B',true):legend('#7396d0','Campo B (z)',true)+legend('#8ad5c8','Campo E (y)',true)+legend('#ffe19a','Trayectoria',true);
    $('#scene-overlay').textContent=s.mode==='field'?{dipole:'Dipolo ideal · representación válida fuera del imán',wire:'Conductor infinito sobre el eje z',loop:'Biot–Savart · integración con 128 segmentos'}[s.source]:'Escala de laboratorio · q en C, m en kg';
    $('#explanation').innerHTML=explain(s.mode==='field'?'El magnetismo tiene dirección.':'Una fuerza que cambia la trayectoria.',s.mode==='field'?'La dirección depende del sentido de la corriente o del momento magnético. Las líneas se dibujan con longitud normalizada: consulta la sonda para conocer la magnitud real.':'La fuerza magnética es perpendicular a la velocidad y no realiza trabajo. Un campo eléctrico puede cambiar la energía cinética. Con E = 0 se obtiene una hélice si vz ≠ 0.','F = q(E + v × B)');
  }
  updateResults();
}
function updateResults(){
  const s=state[active];let html='';
  if(active==='electric'){
    const e=electricAt(s.probe,s.charges,1e-9),total=s.charges.reduce((sum,c)=>sum+c.q,0);
    html=result('Potencial en P',format(e.potential,'V'),'Referencia: V = 0 en el infinito')+result('Magnitud del campo',format(norm(e.field),'N/C'),'Evaluada en el punto P')+result('Carga neta',format(total,'C'),`${s.charges.length} fuentes puntuales`)+result('Tiempo de trayectoria',format(simulation?.state.time||0,'s'),simulation?`Rapidez ${format(norm(simulation.state.velocity),'m/s')}`:'Lanza una partícula para explorar');
    if($('#probe-vector'))$('#probe-vector').textContent=e.singular?'P coincide con una carga: campo y potencial no están definidos.':`E = (${e.field.map(v=>Number(v.toPrecision(3))).join(', ')}) N/C`;
  }else if(active==='capacitor'){
    const c=capacitor(s.area*1e-4,s.distance*1e-3,s.dielectric,s.voltage);
    html=result('Capacitancia',format(c.capacitance,'F'),'C = ε₀ εᵣ A / d')+result('Carga almacenada',format(c.charge,'C'),'Magnitud en cada placa · Q = CV')+result('Energía almacenada',format(c.energy,'J'),'U = ½ CV²')+result('Campo entre placas',format(c.field,'V/m'),'E = V / d · campo ideal');
  }else if(active==='circuit'){
    const c=circuit(s.voltage,s.stages),rc=s.mode==='rc'?rcCircuit(c.resistance,s.capacitance*1e-6,s.voltage,s.tauTime*c.resistance*s.capacitance*1e-6,s.charging):null;
    html=result('Resistencia equivalente',format(c.resistance,'Ω'),'Suma de etapas en serie')+result('Corriente total',format(rc?rc.current:c.current,'A'),rc?'Signo +: carga · signo −: descarga':'I = V / R equivalente')+result(rc?'Voltaje del capacitor':'Potencia total',format(rc?rc.voltage:c.power,rc?'V':'W'),rc?'Respuesta analítica RC':'P = VI = Σ P de resistencias')+result(rc?'Constante de tiempo':'Voltaje de la fuente',format(rc?rc.tau:s.voltage,rc?'s':'V'),rc?`t = ${format(s.tauTime*rc.tau,'s')}`:'Fuente ideal de corriente continua');
    if($('#branch-results')){
      const real=rc?circuit(rc.current*c.resistance,s.stages):c;
      $('#branch-results').innerHTML='<table><thead><tr><th>R</th><th>V (V)</th><th>I (mA)</th><th>P (mW)</th></tr></thead><tbody>'+real.stages.flatMap((stage,i)=>stage.branches.map((b,j)=>`<tr><td>${i+1}.${j+1}</td><td>${Number(b.voltage.toPrecision(3))}</td><td>${Number((b.current*1000).toPrecision(3))}</td><td>${Number((b.power*1000).toPrecision(3))}</td></tr>`)).join('')+'</tbody></table>';
    }
  }else if(s.mode==='field'){
    const b=magneticAt(s.probe,s.source,s.strength),p=s.probe;
    const excluded=(s.source==='dipole'&&norm(p)<.7)||(s.source==='wire'&&Math.hypot(p[0],p[1])<.012)||(s.source==='loop'&&Math.hypot(Math.hypot(p[0],p[1])-1,p[2])<.02);
    html=result('Campo en P',excluded?'No definido':format(norm(b),'T'),excluded?'Sonda dentro de la fuente excluida':'Magnitud del campo magnético')+result('Componente Bx',excluded?'—':format(b[0],'T'),'Eje x')+result('Componente By',excluded?'—':format(b[1],'T'),'Eje y')+result('Componente Bz',excluded?'—':format(b[2],'T'),'Eje z');
    if($('#mag-vector'))$('#mag-vector').textContent=excluded?'Mueve P fuera de la fuente para evaluar el campo ideal.':'Las coordenadas y el tamaño de la fuente están expresados en metros.';
  }else{
    const p=simulation?.state||{velocity:s.particle.velocity,time:0},q=s.particle.q,m=s.particle.mass,f=lorentzForce(q,p.velocity,[0,s.ey,0],[0,0,s.bz]);
    html=result('Fuerza de Lorentz',format(norm(f),'N'),'F = q(E + v × B)')+result('Energía cinética',format(.5*m*norm(p.velocity)**2,'J'),'K = ½ m |v|²')+result('Radio con E = 0',s.bz&&q?format(m*Math.hypot(p.velocity[0],p.velocity[1])/Math.abs(q*s.bz),'m'):'∞',s.ey?'Referencia local; E cambia v⊥':'r = mv⊥ / |qB|')+result('Tiempo simulado',format(p.time||0,'s'),'Integración de Boris · Δt ≤ 0.005 s');
  }
  $('#results').innerHTML=html;
}
function setUnit(unit){if(!info[unit])return;active=unit;resetSimulation();rcPlaying=false;const [n,label,title,desc]=info[unit];$('#breadcrumb-unit').textContent=`Unidad ${n}`;$('#unit-eyebrow').textContent=`UNIDAD ${n} · ${label}`;$('#unit-title').textContent=title;$('#unit-description').textContent=desc;document.querySelectorAll('[data-unit]').forEach(b=>{const on=b.dataset.unit===unit;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});renderControls();$('#controls').scrollTop=0;draw();history.replaceState(null,'',`#${unit}`);}
function tick(now){
  const elapsed=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
  if(simulation?.running){
    const sim=simulation,s=state[active],isMag=active==='magnetic';
    let remaining=elapsed;
    while(remaining>1e-8){
      let dt=Math.min(.005,remaining,.025/Math.max(norm(sim.state.velocity),.01));
      if(isMag)dt=Math.min(dt,.06/(Math.abs(sim.charge*s.bz/sim.mass)+1e-9));
      else{const a=norm(electricAt(sim.state.position,s.charges,.08).field)*Math.abs(sim.charge/sim.mass);dt=Math.min(dt,Math.sqrt(.002/(a+1e-12)));}
      if(!Number.isFinite(dt)||dt<1e-7){stop('La partícula alcanzó una zona singular.');break;}
      const next=borisStep(sim.state,sim.charge,sim.mass,dt,isMag?[0,s.ey,0]:p=>electricAt(p,s.charges,.08).field,isMag?[0,0,s.bz]:[0,0,0]);
      if(!next.position.every(Number.isFinite)||(!isMag&&s.charges.some(c=>norm(sub(c.position,next.position))<.11))){stop('La partícula alcanzó una carga: simulación detenida.');break;}
      sim.state=next;remaining-=dt;sim.steps++;
      if(sim.steps%3===0){sim.points.push([...next.position]);sim.samples.push([next.time,...next.position,...next.velocity]);}
      if(norm(next.position)>8){stop('La partícula salió del dominio de 8 m.');break;}
      if(next.time>=30||sim.samples.length>=20000){stop('Trayectoria completada. Exporta los datos o vuelve a lanzar.');break;}
    }
    world?.updateParticle(sim.state.position,sim.points.slice(-4500));
    if(now-uiTime>120){updateResults();uiTime=now;if(sim.running&&$('#particle-status'))$('#particle-status').textContent=`t = ${sim.state.time.toFixed(2)} s · rapidez ${format(norm(sim.state.velocity),'m/s')}`;}
  }
  if(rcPlaying&&active==='circuit'&&state.circuit.mode==='rc'){
    const s=state.circuit;s.tauTime=Math.min(5,s.tauTime+elapsed*.55);if(now-uiTime>70){$('#rc-time').value=s.tauTime.toFixed(2);$('#rc-time-range').value=s.tauTime;draw(false);uiTime=now;}if(s.tauTime>=5){rcPlaying=false;$('#rc-play').textContent='▶ Animar proceso RC';}
  }
}
function stop(message){if(simulation)simulation.running=false;if($('#particle-play'))$('#particle-play').textContent='▶ Continuar';if($('#particle-status'))$('#particle-status').textContent=message;}

/** Strict import whitelist. No imported text reaches HTML; reject unsupported values. */
export function validateExperiment(data){
  if(data?.schema!=='flux-experiment-v1'||!info[data.active]||!['2d','3d'].includes(data.view))throw new Error('Formato de experimento no compatible.');
  const clean=structuredClone(defaults);
  const num=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error('El archivo contiene un número fuera de rango.');return v;};
  const vec=(v,min,max)=>{if(!Array.isArray(v)||v.length!==3)throw new Error('Vector inválido.');return v.map(n=>num(n,min,max));};
  const bool=v=>{if(typeof v!=='boolean')throw new Error('Opción inválida.');return v;};
  const choice=(v,values)=>{if(!values.includes(v))throw new Error('Configuración desconocida.');return v;};
  const particle=p=>({q:num(p.q,-10,10),mass:num(p.mass,.1,10),position:vec(p.position,-5,5),velocity:vec(p.velocity,-10,10)});
  const e=data.state.electric,c=data.state.capacitor,r=data.state.circuit,m=data.state.magnetic;
  if(!Array.isArray(e.charges)||e.charges.length<1||e.charges.length>10)throw new Error('Se permiten entre 1 y 10 cargas.');
  clean.electric={charges:e.charges.map(ch=>({q:num(ch.q,-20e-9,20e-9),position:vec(ch.position,-4,4)})),preset:choice(e.preset,['single','dipole','like','quadrupole','custom']),lines:bool(e.lines),vectors:bool(e.vectors),equipotential:bool(e.equipotential),level:num(e.level,2,60),probe:vec(e.probe,-5,5),particle:particle(e.particle)};
  clean.capacitor={area:num(c.area,20,600),distance:num(c.distance,.5,10),dielectric:num(c.dielectric,1,12),voltage:num(c.voltage,0,100)};
  if(!Array.isArray(r.stages)||r.stages.length<1||r.stages.length>4)throw new Error('Número de etapas inválido.');
  clean.circuit={voltage:num(r.voltage,0,48),stages:r.stages.map(stage=>{if(!Array.isArray(stage)||stage.length<1||stage.length>4)throw new Error('Número de ramas inválido.');return stage.map(v=>num(v,1,100000));}),mode:choice(r.mode,['dc','rc']),capacitance:num(r.capacitance,100,10000),tauTime:num(r.tauTime,0,5),charging:bool(r.charging)};
  clean.magnetic={mode:choice(m.mode,['field','lorentz']),source:choice(m.source,['dipole','wire','loop']),strength:num(m.strength,-10,10),probe:vec(m.probe,-5,5),ey:num(m.ey,-3,3),bz:num(m.bz,-3,3),particle:particle(m.particle)};
  return {state:clean,active:data.active,view:data.view};
}
try{world=new World($('#world'));world.onFrame=()=>tick(performance.now());}catch(error){console.error(error);$('#scene').insertAdjacentHTML('beforeend','<div class="error-box" style="position:absolute;inset:30px">No se pudo iniciar WebGL. Activa la aceleración gráfica o prueba un navegador actualizado. Las calculadoras y el módulo de circuitos siguen disponibles.</div>');const loop=t=>{tick(t);requestAnimationFrame(loop);};requestAnimationFrame(loop);}
document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>setUnit(b.dataset.unit));
for(const v of ['2d','3d'])$('#view-'+v).onclick=()=>{view=v;world?.setView(v);for(const other of ['2d','3d']){$('#view-'+other).classList.toggle('active',other===v);$('#view-'+other).setAttribute('aria-pressed',String(other===v));}draw();};
$('#home-camera').onclick=()=>world?.home();
$('#capture').onclick=()=>{if(world)download(`flux-${active}.png`,world.saveImage(),'image/png');};
$('#reset').onclick=()=>{state[active]=structuredClone(defaults[active]);renderControls();draw();world?.home();toast('Unidad reiniciada.');};
$('#export-state').onclick=()=>{download('experimento-flux.json',JSON.stringify({schema:'flux-experiment-v1',active,view,state},null,2),'application/json');toast('Experimento guardado como JSON.');};
$('#import-state').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>200000)throw new Error('El archivo supera el límite de 200 kB.');const imported=validateExperiment(JSON.parse(await file.text()));state=imported.state;view=imported.view;world?.setView(view);for(const v of ['2d','3d']){$('#view-'+v).classList.toggle('active',v===view);$('#view-'+v).setAttribute('aria-pressed',String(v===view));}setUnit(imported.active);toast('Experimento abierto.');}catch(error){toast('No se pudo abrir: '+error.message);}event.target.value='';};
setUnit(location.hash.slice(1)||'electric');
// Local automation and reproducible teaching demos. No network or account data.
window.FLUX={getState:()=>structuredClone({schema:'flux-experiment-v1',active,view,state}),getSimulation:()=>simulation?structuredClone({state:simulation.state,running:simulation.running,samples:simulation.samples.length}):null,getRenderInfo:()=>world?{geometries:world.renderer.info.memory.geometries,calls:world.renderer.info.render.calls,objects:world.content.children.length}:null,setUnit,validateExperiment,reset:()=>$('#reset').click()};
