import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const root=resolve(process.argv.includes('--dist')?'dist':'.');
const sourceMode=!process.argv.includes('--dist') && existsSync(resolve(root,'node_modules/three/build'));
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8','.md':'text/plain; charset=utf-8','.pdf':'application/pdf','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
http.createServer(async(req,res)=>{
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.split('/').some(part=>part.startsWith('.'))){res.writeHead(403).end();return;}
    if(sourceMode) pathname=pathname.replace(/^\/vendor\/three\//,'/node_modules/three/build/').replace(/^\/vendor\/addons\//,'/node_modules/three/examples/jsm/');
    let file=resolve(root,`.${pathname}`);
    if(file!==root&&!file.startsWith(root+sep)) {res.writeHead(403).end();return;}
    if((await stat(file)).isDirectory()) file=resolve(file,'index.html');
    const metadata=await stat(file),headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    const range=req.headers.range;
    let start=0,end=metadata.size-1,status=200;
    if(range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${metadata.size}`}).end();return;}
      if(!match[1])start=Math.max(0,metadata.size-Number(match[2]));
      else{start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}
      if(start>end||start>=metadata.size){res.writeHead(416,{'Content-Range':`bytes */${metadata.size}`}).end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${metadata.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD'||metadata.size===0){res.end();return;}
    const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Archivo no encontrado');}
}).listen(port,'127.0.0.1',()=>console.log(`Laboratorio disponible en http://127.0.0.1:${port}`));
