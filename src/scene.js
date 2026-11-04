import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {electricAt, magneticAt, traceField, equipotentialMesh, norm, sub, unit} from './physics.js';

const COLORS={positive:0xf2b564,negative:0x71a9ff,line:0x8edbd4,particle:0xffe19a};
export class World {
  constructor(canvas) {
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setClearColor(0x101c2c,0);
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(43,1,.03,150);
    this.controls=new OrbitControls(this.camera,canvas);
    this.controls.enableDamping=true;this.controls.dampingFactor=.08;
    this.controls.minDistance=2;this.controls.maxDistance=35;
    this.content=new THREE.Group();this.scene.add(this.content);
    this.scene.add(new THREE.AmbientLight(0xe3f0ff,2));
    const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,8,10);this.scene.add(light);
    this.grid=new THREE.GridHelper(12,24,0x3a5065,0x263b50);this.grid.rotation.x=Math.PI/2;this.grid.position.z=-.035;this.grid.material.transparent=true;this.grid.material.opacity=.46;this.scene.add(this.grid);
    this.axes=new THREE.Group();this.scene.add(this.axes);
    for(const [end,text,color] of [[[5.6,0,0],'x (m)',0xbc8d7f],[[0,5.6,0],'y (m)',0x83b69e],[[0,0,5.6],'z (m)',0x81a7cc]]) {
      this.arrow([0,0,0],end,color,.08,this.axes);this.label(text,end,'#91a7ba',.35,this.axes);
    }
    this.view='3d';this.home();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();
    this.renderer.setAnimationLoop(()=>{this.controls.update();if(this.onFrame)this.onFrame();this.renderer.render(this.scene,this.camera);});
  }
  resize(){const {clientWidth:w,clientHeight:h}=this.canvas.parentElement;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  home(){this.controls.target.set(0,0,0);this.camera.up.set(0,1,0);this.camera.position.set(...(this.view==='2d'?[0,0,13.6]:[5,3.5,10.5]));this.controls.enableRotate=this.view!=='2d';this.controls.update();}
  setView(view){this.view=view;this.grid.visible=true;this.home();}
  disposeObject(obj){obj.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.map?.dispose();m.dispose();}}});}
  clear(){for(const o of [...this.content.children]){this.disposeObject(o);this.content.remove(o);}this.particle=null;this.trail=null;this.grid.visible=true;this.axes.visible=true;}
  line(points,color=COLORS.line,opacity=.7,parent=this.content){if(points.length<2)return;const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const object=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity}));parent.add(object);return object;}
  arrow(origin,vector,color=COLORS.line,head=.13,parent=this.content){const len=norm(vector);if(!Number.isFinite(len)||len<1e-8)return;const arrow=new THREE.ArrowHelper(new THREE.Vector3(...vector).normalize(),new THREE.Vector3(...origin),len,color,Math.min(head,len*.35),Math.min(head*.48,len*.16));parent.add(arrow);return arrow;}
  sphere(position,radius,color){const obj=new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.25}));obj.position.set(...position);this.content.add(obj);return obj;}
  box(position,size,color,opacity=1){const obj=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.2,transparent:opacity<1,opacity,depthWrite:opacity===1}));obj.position.set(...position);this.content.add(obj);return obj;}
  label(text,position,color='#d9e5f0',size=.38,parent=this.content){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.font='500 62px Segoe UI, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,48);const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(size*768/96,size,1);sprite.position.set(...position);parent.add(sprite);return sprite;}
  drawElectric(s){
    this.clear(); const charges=s.charges;
    charges.forEach((c,i)=>{this.sphere(c.position,.16,c.q>=0?COLORS.positive:COLORS.negative);this.label(`${c.q>=0?'+':''}${Number((c.q*1e9).toFixed(2))} nC`,[c.position[0],c.position[1]+.42,c.position[2]],c.q>=0?'#f4bf76':'#91bdff',.29);});
    const field=p=>electricAt(p,charges,.10).field;
    if(s.lines) for(const c of charges){
      if(c.q===0)continue;
      const count=this.view==='2d'?20:28;
      for(let i=0;i<count;i++){
        let offset;
        if(this.view==='2d')offset=[Math.cos(i/count*2*Math.PI),Math.sin(i/count*2*Math.PI),0];
        else{const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*2.399963;offset=[Math.cos(a)*r,y,Math.sin(a)*r];}
        const seed=c.position.map((v,j)=>v+offset[j]*.2),direction=c.q>0?1:-1;
        const points=traceField(seed,field,{direction,stop:p=>charges.some(ch=>norm(sub(p,ch.position))<.16)});
        this.line(points,c.q>0?COLORS.positive:COLORS.negative,.46);
        if(points.length>12){const idx=Math.min(points.length-2,Math.floor(points.length*.33));this.arrow(points[idx],sub(points[idx+(direction>0?1:-1)],points[idx]).map(v=>v*2.9),c.q>0?COLORS.positive:COLORS.negative,.09);}
      }
    }
    if(s.vectors)for(let x=-3.5;x<=3.5;x+=1.17)for(let y=-3.5;y<=3.5;y+=1.17){const p=[x,y,0],e=field(p),mag=norm(e);if(Number.isFinite(mag)&&mag>1e-10)this.arrow(p,unit(e).map(v=>v*(.18+Math.min(.37,Math.log10(1+mag)*.15))),0x8bd1cb,.1);}
    if(s.equipotential){
      for(const level of [-s.level,s.level]){
        const color=level>0?COLORS.positive:COLORS.negative;
        if(this.view==='2d')this.contours(charges,level,color);
        else{const vertices=equipotentialMesh(charges,level);if(vertices.length){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.computeVertexNormals();this.content.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,opacity:.17,transparent:true,side:THREE.DoubleSide,depthWrite:false,roughness:.6})));}}
      }
      if(this.view==='2d')this.contours(charges,0,0x9acfc5);
    }
    this.probe=this.sphere(s.probe,.065,0xeef6ff);this.label('P',[s.probe[0]+.18,s.probe[1]+.2,s.probe[2]],'#e4f1ff',.26);
  }
  contours(charges,level,color){
    const size=5,n=72,step=size*2/n,values=[];
    for(let x=0;x<=n;x++){values[x]=[];for(let y=0;y<=n;y++)values[x][y]=electricAt([-size+x*step,-size+y*step,0],charges,.08).potential;}
    const segments=[];
    for(let x=0;x<n;x++)for(let y=0;y<n;y++){
      const p=[[-size+x*step,-size+y*step,0],[-size+(x+1)*step,-size+y*step,0],[-size+(x+1)*step,-size+(y+1)*step,0],[-size+x*step,-size+(y+1)*step,0]],v=[values[x][y],values[x+1][y],values[x+1][y+1],values[x][y+1]];
      if(!v.every(Number.isFinite))continue;
      // Triangulation resolves the ambiguous marching-squares saddle consistently.
      for(const t of [[0,1,2],[0,2,3]]){const hit=[];for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3];if((v[a]>=level)===(v[b]>=level))continue;const f=(level-v[a])/(v[b]-v[a]);hit.push(p[a].map((q,j)=>q+f*(p[b][j]-q)));}if(hit.length===2)segments.push(...hit.flat());}
    }
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));this.content.add(new THREE.LineSegments(geom,new THREE.LineBasicMaterial({color,transparent:true,opacity:.7})));
  }
  drawCapacitor(s){
    this.clear();this.axes.visible=false;
    const side=Math.sqrt(s.area/200)*2.5,d=.5+s.distance*.13;
    this.box([0,d/2,0],[side,.09,side],COLORS.positive);
    this.box([0,-d/2,0],[side,.09,side],COLORS.negative);
    if(s.dielectric>1)this.box([0,0,0],[side*.96,d-.1,side*.96],0x64b4aa,.17);
    for(let x=-.35;x<=.36;x+=.35)for(let z=-.35;z<=.36;z+=.35){if(s.voltage!==0)this.arrow([x*side,d/2-.14,z*side],[0,-d+.3,0],0xb8eee5,.1);}
    this.label(`+ ${s.voltage} V`,[0,d/2+.38,0],'#f1bd73',.38);this.label('0 V',[0,-d/2-.38,0],'#8db4f1',.38);
    this.label(`A = ${s.area} cm²`,[side/2+.6,.1,0],'#bcd0e0',.28);
    this.label(`d = ${s.distance} mm`,[-side/2-.7,0,0],'#bcd0e0',.28);
    this.label(`εr = ${s.dielectric}`,[0,0,side/2+.4],'#96dad0',.28);
  }
  drawMagnetic(s){
    this.clear();
    if(s.mode==='lorentz'){
      for(let x=-3;x<=3;x+=1.5)for(let y=-3;y<=3;y+=1.5){if(s.bz)this.arrow([x,y,0],[0,0,Math.sign(s.bz)*.6],0x7396d0,.12);if(s.ey)this.arrow([x,y,0],[0,Math.sign(s.ey)*.5,0],0x8ad5c8,.1);}
      return;
    }
    const field=p=>magneticAt(p,s.source,s.strength),seeds=[];
    if(s.source==='dipole'){
      const reversed=s.strength<0;
      this.box([0,.34,0],[.6,.68,.5],reversed?0x6496d8:0xe48b75);this.box([0,-.34,0],[.6,.68,.5],reversed?0xe48b75:0x6496d8);
      if(s.strength!==0){this.label(reversed?'S':'N',[0,.37,.3],'#fff1e8',.3);this.label(reversed?'N':'S',[0,-.37,.3],'#edf4ff',.3);}
      for(let i=0;i<20;i++){const a=i/20*Math.PI*2;for(const radius of [.18,.38,.65])seeds.push([Math.cos(a)*radius,.72,Math.sin(a)*radius]);}
    }else if(s.source==='wire'){
      const wire=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,8,16),new THREE.MeshStandardMaterial({color:0xe9b66e,metalness:.5,roughness:.3}));wire.rotation.x=Math.PI/2;this.content.add(wire);
      this.arrow([0,0,-2],[0,0,4*Math.sign(s.strength||1)],0xf1c580,.22);this.label('I',[.3,.3,1.5],'#f2c27e',.35);
      for(const z of (this.view==='2d'?[0]:[-1.8,0,1.8]))for(let r=.6;r<3.4;r+=.55)seeds.push([r,0,z]);
    }else{
      this.content.add(new THREE.Mesh(new THREE.TorusGeometry(1,.045,12,80),new THREE.MeshStandardMaterial({color:0xe9b66e,metalness:.4,roughness:.3})));
      for(let i=0;i<10;i++){const a=i/10*Math.PI*2;for(const radius of [.2,.5,.8,1.3])seeds.push([Math.cos(a)*radius,Math.sin(a)*radius,.05]);}
      this.label('Espira · R = 1 m',[0,-1.4,0],'#efbc76',.3);
    }
    const stop=p=>s.source==='loop'?Math.hypot(Math.hypot(p[0],p[1])-1,p[2])<.07:s.source==='dipole'?norm(p)<.4:false;
    if(s.strength!==0)for(const seed of seeds){const options={maxSteps:450,bound:6,step:.045,stop},forward=traceField(seed,field,options),back=s.source==='wire'?[]:traceField(seed,field,{...options,direction:-1});const pts=[...back.reverse(),...forward];this.line(pts,0x82c7bd,.5);if(forward.length>15){const i=Math.floor(forward.length*.3);this.arrow(forward[i],sub(forward[i+1],forward[i]).map(v=>v*2.5),0xb3ebe1,.1);}}
    this.probe=this.sphere(s.probe,.07,0xf1f6ff);this.label('P',[s.probe[0]+.2,s.probe[1]+.2,s.probe[2]],'#f1f6ff',.25);
  }
  updateParticle(position,points){
    if(!this.particle)this.particle=this.sphere(position,.085,COLORS.particle);
    this.particle.position.set(...position);
    if(this.trail){this.content.remove(this.trail);this.disposeObject(this.trail);}
    this.trail=this.line(points,COLORS.particle,.95);
  }
  clearParticle(){for(const o of [this.particle,this.trail])if(o){this.content.remove(o);this.disposeObject(o);}this.particle=null;this.trail=null;}
  saveImage(){this.renderer.render(this.scene,this.camera);return this.canvas.toDataURL('image/png');}
}
