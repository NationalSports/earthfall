const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const sharp = require(path.join(os.homedir(),'.codex/art-tools/earthfall/node_modules/sharp'));
const dir=__dirname, root=path.resolve(dir,'../../..');
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const write=(n,v)=>fs.writeFileSync(path.join(dir,n),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
async function main(){
 const raster=read('raster-manifest.json'),ui=read('ui-manifest.json');
 for(const t of raster){
  const source=t.source;
  if(source&&fs.existsSync(source)){
   const meta=await sharp(source).metadata();
   t.generatedDimensions=[meta.width,meta.height];
   t.source='generated_images/'+path.basename(source);
  }
  if(t.reference)t.reference=path.relative(root,t.reference);
  t.method='built-in image_gen';
  if(!t.prompt)t.prompt=t.subject;
 }
 write('raster-manifest.json',raster);
 const aliases=[];
 for(const n of ['vanguard','cipher','engineer']){
  const from='assets/cards/portrait-'+n+'.webp',dest='assets/cards/'+n+'.webp';
  fs.copyFileSync(path.join(root,from),path.join(root,dest));
  aliases.push({path:dest,w:480,h:600,alpha:false,method:'alias',source:from});
 }
 write('aliases.json',aliases);
 const all=[...raster,...ui,...aliases];
 const assets=[];const failures=[];
 for(const t of all){
  const file=path.join(root,t.path), m=await sharp(file).metadata();
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let zero=0,full=0;
  for(let i=3;i<data.length;i+=4){if(data[i]===0)zero++;if(data[i]===255)full++;}
  if(m.width!==t.w||m.height!==t.h)failures.push(t.path+': wrong dimensions');
  if(t.alpha&&!zero)failures.push(t.path+': missing transparency');
  if(!t.alpha&&zero)failures.push(t.path+': unexpected transparency');
  let edge;
  if(t.style==='texture'||t.id==='frontline-sky'){
   let lr=0,tb=0,inside=0;
   for(let y=0;y<info.height;y++)for(let c=0;c<3;c++){
    lr+=Math.abs(data[(y*info.width)*4+c]-data[(y*info.width+info.width-1)*4+c]);
    inside+=Math.abs(data[(y*info.width+Math.floor(info.width/2))*4+c]-data[(y*info.width+Math.floor(info.width/2)-1)*4+c]);
   }
   for(let x=0;x<info.width;x++)for(let c=0;c<3;c++)tb+=Math.abs(data[x*4+c]-data[((info.height-1)*info.width+x)*4+c]);
   edge={leftRightMeanDelta:+(lr/(info.height*3)).toFixed(2),topBottomMeanDelta:+(tb/(info.width*3)).toFixed(2),interiorColumnMeanDelta:+(inside/(info.height*3)).toFixed(2)};
  }
  const corners=[3,(info.width-1)*4+3,(info.height-1)*info.width*4+3,data.length-1].map(i=>data[i]);
  assets.push({path:t.path,width:m.width,height:m.height,bytes:fs.statSync(file).size,alpha:m.hasAlpha,transparentPixels:zero,opaquePixels:full,corners,...(edge?{edge}:{}),...(t.generatedDimensions?{generatedDimensions:t.generatedDimensions}:{})});
 }
 const report={count:assets.length,failures,assets};write('validation.json',report);
 const groups=[
 ['HUD mockups',raster.filter(t=>t.style==='ui')],
 ['Portraits',raster.filter(t=>t.path.includes('/portrait-')||t.id.startsWith('enemy-'))],
 ['Cities',raster.filter(t=>t.path.startsWith('assets/city/'))],
 ['Defense battle',raster.filter(t=>t.path.startsWith('assets/battle/'))],
 ['Command cards and remaining illustrations',raster.filter(t=>t.id.startsWith('card-')||['emp','warhead','breakout'].includes(t.id))],
 ['How to play',raster.filter(t=>t.id.startsWith('help-'))],
 ['Opening guide',raster.filter(t=>t.id.startsWith('guide-'))],
 ['Earthfall UI',ui.filter(t=>t.path.startsWith('assets/'))],
 ['Frontline',raster.filter(t=>t.id.startsWith('frontline-'))],
 ['Frontline UI',ui.filter(t=>t.path.startsWith('frontline/'))]
 ];
 const rel=p=>'../../../'+p;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sections=groups.map(([title,items],index)=>'<section id="g'+index+'"><h2>'+title+' <small>'+items.length+'</small></h2><div class="grid">'+items.map(t=>{
  const icon=/(act-|res-|perk-|trait-|ui\/(turret|barrier|mine|railgun|strike|supply|repair|crosshair))/.test(t.path);
  return '<article data-search="'+esc((title+' '+t.path).toLowerCase())+'"><a class="thumb '+(icon?'icon':'')+' '+(t.style==='ui'?'mockup':'')+'" href="'+rel(t.path)+'"><img loading="eager" src="'+rel(t.path)+'" alt="'+esc(t.id||path.basename(t.path))+'"></a><div class="caption"><strong>'+esc(path.basename(t.path))+'</strong><span>'+t.w+' × '+t.h+(t.alpha?' · alpha':'')+'</span><code>'+esc(t.path)+'</code></div></article>';
 }).join('')+'</div></section>').join('');
 const textures=raster.filter(t=>t.style==='texture').map(t=>'<article><h3>'+esc(path.basename(t.path))+'</h3><div class="tile" style="background-image:url('+rel(t.path)+')"></div></article>').join('');
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Earthfall art review</title><style>'+
 '*{box-sizing:border-box}body{margin:0;background:#09131d;color:#eceddc;font:16px/1.5 system-ui,sans-serif}header,main{max-width:1440px;margin:auto;padding:32px}header{padding-top:56px}h1{font:52px/1.1 Georgia,serif;letter-spacing:.02em;margin:12px 0 20px}h2{font:30px Georgia,serif;margin:52px 0 22px;color:#e6c47c}h2 small{font:14px system-ui;color:#8caaa9}p{color:#b1c6c8;max-width:800px}.eyebrow{color:#71d9d2;letter-spacing:.2em;font-size:12px}nav{display:flex;flex-wrap:wrap;gap:12px}nav a{color:#90d8d1;text-decoration:none;border-bottom:1px solid #305058;padding:4px 0}.tools{display:flex;gap:12px;position:sticky;top:0;z-index:2;padding:14px 0;background:#09131df2}input,button{font:inherit;border:1px solid #425963;border-radius:8px;background:#122431;color:#f3f0dc;padding:12px}input{flex:1;min-width:0}button{cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}article{min-width:0;border:1px solid #263c47;border-radius:12px;overflow:hidden;background:#10212e}.thumb{display:flex;align-items:center;justify-content:center;height:240px;padding:12px;background-color:#172934;background-image:linear-gradient(45deg,#223641 25%,transparent 25%),linear-gradient(-45deg,#223641 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#223641 75%),linear-gradient(-45deg,transparent 75%,#223641 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.thumb img{max-width:100%;max-height:100%;object-fit:contain}.thumb.icon img{width:96px;height:96px;image-rendering:auto}.thumb.mockup{height:390px}.caption{padding:14px}.caption strong,.caption span,.caption code{display:block;overflow-wrap:anywhere}.caption strong{font-size:15px}.caption span{color:#92b1b7;font-size:13px;margin:5px 0}.caption code{font-size:11px;color:#78989f}.plain .thumb{background:#182a36}.tile{height:400px;background-size:200px 200px}.sprite-stage{height:320px;display:flex;align-items:center;justify-content:center;background:#203b40;border-radius:12px}.blast{width:256px;height:256px;background-image:url(../../../assets/battle/blast.webp);animation:blast 1s steps(4) infinite}@keyframes blast{from{background-position:0 0}to{background-position:-1024px 0}}.small-icons{display:flex;align-items:center;gap:24px;flex-wrap:wrap;padding:28px;background:#122632;border-radius:12px}.small-icons img{width:28px;height:28px}.small-icons .tiny{width:16px;height:16px}[hidden]{display:none!important}footer{padding:40px 0;color:#8eaaad;font-size:13px}@media(max-width:600px){header,main{padding:20px}h1{font-size:36px}.grid{grid-template-columns:1fr}.tools{flex-wrap:wrap}.thumb.mockup{height:480px}}@media(prefers-reduced-motion:reduce){.blast{animation:none}}'+
 '</style><header><div class="eyebrow">ART DELIVERY · 11 NOVEMBER 2026</div><h1>Earthfall & Frontline</h1><p>134 original artwork and interface assets, plus three portrait aliases for the existing game. Select an image to view its full export. HUD images are design proposals; the new UI, city and battle assets are supplied for developer integration.</p><nav>'+groups.map(([n],i)=>'<a href="#g'+i+'">'+n+'</a>').join('')+'<a href="#inspection">Inspection</a></nav></header><main><div class="tools"><input id="filter" aria-label="Filter assets" placeholder="Find an asset or filename"><button id="background">Toggle checkerboard</button></div>'+sections+
 '<section id="inspection"><h2>Inspection</h2><h3>Icons at 28px, research and salvage also at 16px</h3><div class="small-icons">'+['attack','reinforce','move','build','airlift','team','missiles','sabotage','bombers','details','emp','warhead'].map(n=>'<img src="../../../assets/ui/act-'+n+'.webp" alt="'+n+'">').join('')+'<img class="tiny" src="../../../assets/ui/res-research.webp" alt="research 16px"><img class="tiny" src="../../../assets/ui/res-salvage.webp" alt="salvage 16px"></div><h3>Explosion animation · four frames</h3><div class="sprite-stage"><div class="blast" role="img" aria-label="Four-frame explosion animation"></div></div><h3>Texture repeat at 200px per tile</h3><div class="grid">'+textures+'</div></section><footer>Built-in image_gen for painted artwork. Editable SVG for UI graphics. Requested export sizes, prompts, slice insets and validation results accompany this gallery.</footer></main><script>document.querySelector("#filter").addEventListener("input",e=>{for(const a of document.querySelectorAll("[data-search]"))a.hidden=!a.dataset.search.includes(e.target.value.toLowerCase())});document.querySelector("#background").onclick=()=>document.body.classList.toggle("plain");</script></html>';
 write('index.html',html);
 write('asset-paths.txt',all.map(t=>t.path).join('\n')+'\n');
 console.log(JSON.stringify({count:all.length,failures,bytes:assets.reduce((s,a)=>s+a.bytes,0),edges:assets.filter(x=>x.edge).map(x=>({path:x.path,...x.edge})),alphaCorners:assets.filter(a=>a.alpha&&a.corners.some(v=>v>0))},null,2));
 if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exit(1)});

