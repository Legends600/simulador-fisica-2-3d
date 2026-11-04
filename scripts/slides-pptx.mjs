/** Optional artifact-tool runtime: set ARTIFACT_MODULE and PRESENTATION_SKILL_DIR. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {slides} from '../docs/slides-data.js';
const runtime=process.env.CODEX_ARTIFACT_RUNTIME;
const skillDir=process.env.PRESENTATION_SKILL_DIR;
if(!runtime||!skillDir)throw new Error('Para regenerar el PowerPoint, configura CODEX_ARTIFACT_RUNTIME y PRESENTATION_SKILL_DIR. El archivo final ya se incluye en docs/.');
const modulePath=process.env.ARTIFACT_MODULE||path.join(runtime,'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs');
process.env.RUNTIME_NODE_MODULES ||= path.join(runtime,'node/node_modules');
const {Presentation,PresentationFile}=await import(pathToFileURL(modulePath).href);
const {finalizePresentation}=await import(pathToFileURL(path.join(skillDir,'container_tools/artifact_tool_utils.mjs')).href);
const workspaceDir=process.cwd(),build=path.join(workspaceDir,'.qa/deck');
await fs.mkdir(build,{recursive:true});
const deck=Presentation.create({slideSize:{width:1280,height:720}});
const font='Segoe UI';
deck.theme.defaultFont=font;
function text(slide,value,x,y,width,height,size,color='#d8e6f0',bold=false){const box=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width,height},fill:'none',line:{fill:'none',width:0}});box.text=value;box.text.style={typeface:font,fontSize:size,color,bold};return box;}
for(const [i,data] of slides.entries()){
  const slide=deck.slides.add();slide.background.fill='#111e2d';
  if(i===0){
    text(slide,'FLUX',64,110,520,110,88,'#edb96e',true);
    text(slide,data.subtitle,64,240,540,170,35,'#edf4fa');
    data.body.forEach((p,j)=>text(slide,p,64,460+j*42,520,42,24,'#b3cadb'));
  }else{
    text(slide,data.title,64,65,1150,100,44,'#edf4fa',true);
    const contentWidth=data.image?520:1090;
    data.body.forEach((p,j)=>text(slide,p,64,205+j*(data.image?88:86),contentWidth,data.image?83:78,26,'#c3d6e5'));
    if(data.accent)text(slide,data.accent,64,data.image?535:585,data.image?550:1100,80,29,'#edc28a');
  }
  if(data.image){const bytes=await fs.readFile(`assets/figures/${data.image}.png`);slide.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',alt:`Captura del simulador: ${data.title}`,fit:'contain',position:{left:650,top:i===0?195:200,width:566,height:360}});}
  text(slide,`${String(i+1).padStart(2,'0')} / ${slides.length}`,1140,657,80,25,14,'#91aabd');
  slide.speakerNotes.text=data.notes;
  const png=await deck.export({slide,format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
const candidatePath=path.join(build,`candidate-${Date.now()}.pptx`);await(await PresentationFile.exportPptx(deck)).save(candidatePath);
const finalPath=path.join(workspaceDir,'docs/presentacion-flux.pptx');
const result=await finalizePresentation({workspaceDir,candidatePath,finalPath,pythonExecutable:path.join(runtime,'python/python.exe'),integrityValidatorPath:path.join(skillDir,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skillDir,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],fontPolicy:{basis:'design',families:[font]},requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')});
console.log(JSON.stringify(result));
