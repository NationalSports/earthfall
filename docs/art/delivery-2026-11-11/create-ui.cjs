// Deterministic, editable graphics extending Earthfall's existing SVG vocabulary.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const deps = path.join(os.homedir(), '.codex/art-tools/earthfall/node_modules');
const sharp = require(path.join(deps, 'sharp'));
const { Resvg } = require(path.join(deps, '@resvg/resvg-js'));
const root = path.resolve(__dirname, '../../..');
const rows = [];
const P = d => '<path d="'+d+'"/>';
const C = (x,y,r) => '<circle cx="'+x+'" cy="'+y+'" r="'+r+'"/>';
const symbols = {
 attack:P('M5 19L19 5M14 5H19V10M5 5L19 19M5 14V19H10'),
 reinforce:C(8,7,3)+P('M2 20V17Q2 12 8 12Q14 12 14 17V20M18 11V21M13 16H23'),
 move:P('M3 7H20L16 3M20 7L16 11M21 17H4L8 13M4 17L8 21'),
 build:P('M4 20L15 9M12 5L16 2L22 8L19 11ZM3 4L20 21M2 8L8 2M16 19L19 16'),
 airlift:P('M12 4V19M8 21H16M7 9H17L15 17H9ZM2 4H8M16 4H22M5 2V6M19 2V6M5 6L9 10M19 6L15 10'),
 team:P('M12 2L21 12L12 22L3 12ZM12 7V17M7 12H17'),
 missiles:P('M4 18L12 5L16 3L17 7L9 20ZM3 21L5 18M11 20L18 9L22 7L22 12L17 21'),
 sabotage:P('M6 10H18V21H6ZM10 10V5H15L18 2M9 15H15M12 12V18'),
 bombers:P('M12 2L15 10L22 15V18L14 16L14 21H10L10 16L2 18V15L9 10Z'),
 details:P('M5 2H16L20 6V22H5ZM15 2V7H20M8 11H17M8 15H17M8 19H14'),
 emp:C(12,12,3)+P('M7 7A7 7 0 0 0 7 17M17 7A7 7 0 0 1 17 17M4 4A11 11 0 0 0 4 20M20 4A11 11 0 0 1 20 20'),
 warhead:C(12,12,2)+P('M10 9L7 3H17L14 9M15 12L21 8L22 17H16M11 15L9 22L2 16L8 12'),
 metal:P('M3 9L8 4H18L22 9L17 19H7ZM3 9H22M8 4L10 9L7 19M18 4L16 9L17 19'),
 fuel:P('M8 3H15V7H8ZM6 7H17L19 10V21H5V10ZM9 12H15V17H9M18 10L22 12V18H19'),
 research:P('M9 2H15M10 2V10L4 20Q4 22 7 22H17Q20 22 20 20L14 10V2M7 16H17')+C(12,14,1),
 uranium:C(12,12,9)+C(12,12,2)+P('M10 9L7 4H17L14 9M15 12L20 9V17H16M11 15L8 21L3 15L8 12'),
 intel:P('M2 12Q12 1 22 12Q12 23 2 12Z')+C(12,12,3),
 salvage:P('M15 3A5 5 0 0 0 9 9L3 15A3 3 0 0 0 9 21L15 15A5 5 0 0 0 21 9L17 12L13 8L16 4Z'),
 reserve:C(8,7,3)+C(18,8,2.5)+P('M2 21V17Q2 12 8 12Q14 12 14 17V21ZM15 13Q22 12 22 18V21H17'),
 held:P('M4 22V3L11 1L20 5V21L13 18L4 22M11 1V18M4 9L11 6L20 10M4 16L11 13L20 17'),
 london:P('M12 7V22M7 22H17M12 2V4M7 5A7 7 0 0 0 7 15M17 5A7 7 0 0 1 17 15M3 2A12 12 0 0 0 3 18M21 2A12 12 0 0 1 21 18'),
 berlin:P('M3 21V12L8 8V12L13 8V12H17V3H21V21ZM7 16V18M12 16V18M17 16V18'),
 saopaulo:P('M3 22V8H9V22M15 22V4H21V22M3 12H9M15 8H21M9 17H15M6 8V3M18 4V1'),
 nairobi:P('M9 2H15M10 2V10L4 20Q4 22 7 22H17Q20 22 20 20L14 10V2M7 16H17'),
 cairo:P('M3 4H9V20H3M15 4H21V20H15M10 7H14M10 12H14M10 17H14M1 22H23'),
 delhi:C(8,6,3)+C(17,7,2.5)+P('M2 20V16Q2 11 8 11Q14 11 14 16V20M17 13V22M13 17H22'),
 denver:P('M1 19L9 4L14 12L17 8L23 19ZM7 19V14H16V19M10 14V11H14V14'),
 moscow:P('M3 21V9H7V13H10V9H14V13H17V9H21V21ZM8 2V6M5 4H11M17 2V6M14 4H20'),
 sydney:P('M3 4Q3 16 16 16L3 4ZM10 15L7 22M15 16L18 22M5 22H21M10 8L18 2M17 2H22V7'),
 butcher:P('M4 3L20 19M3 7L7 3M16 21L21 16M14 3L21 10L16 15L9 8Z'),
 warden:P('M12 2L21 6V13Q21 19 12 23Q3 19 3 13V6ZM12 7V17M7 12H17'),
 ghost:P('M5 21V10Q5 2 12 2Q19 2 19 10V21L15 18L12 21L9 18Z')+C(9,10,1)+C(15,10,1),
 breeder:C(12,12,3)+C(5,5,3)+C(19,5,3)+C(5,19,3)+C(19,19,3)+P('M7 7L10 10M14 10L17 7M7 17L10 14M14 14L17 17'),
 raider:P('M3 3L13 12L3 21M12 3L22 12L12 21'),
 turret:P('M4 22L7 13H17L20 22M8 13V8H17V13ZM13 8V4H22M7 16H17'),
 barrier:P('M3 21L5 6H19L21 21ZM6 14H18M9 6V14M15 6V14'),
 mine:P('M5 19V12L8 8H16L19 12V19ZM12 8V3M9 3H15M3 19H21M7 15H17'),
 railgun:P('M5 22L8 14H17L20 22M7 14V9H17V14M10 9V4H23M10 7H23'),
 strike:P('M5 3L11 9L8 12L14 18M4 16L10 22M13 3L19 9L16 12L22 18'),
 supply:P('M2 6L12 2L22 6V19L12 23L2 19ZM2 6L12 10L22 6M12 10V23M7 4L17 8V13'),
 repair:P('M3 21L10 14M14 3A5 5 0 0 0 9 9L15 15A5 5 0 0 0 21 9L17 12L13 8L16 4')
};
async function writeAsset(rel, svg, w, h, extra={}) {
 const abs=path.join(root,rel);fs.mkdirSync(path.dirname(abs),{recursive:true});
 const png=new Resvg(svg,{fitTo:{mode:'width',value:w}}).render().asPng();
 let im=sharp(png).resize(w,h);
 await im.webp({lossless:true,effort:6}).toFile(abs);
 const src=path.join(__dirname,'source',rel.replaceAll('/','__').replace(/\.webp$/,'.svg'));
 fs.mkdirSync(path.dirname(src),{recursive:true});fs.writeFileSync(src,svg);
 rows.push({path:rel,w,h,alpha:true,method:'native-svg',source:path.relative(root,src),...extra});
}
const wrap = (body,color='#d9bb79') => '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
function frame(w,h,{primary=false,open=false,inset=24}={}) {
 const x=3,y=3,cut=10, gold=primary?'#edce81':'#b99c60';
 const outline=(d)=>'M'+(x+d+cut)+' '+(y+d)+'H'+(w-x-d-cut)+'L'+(w-x-d)+' '+(y+d+cut)+'V'+(h-y-d-cut)+'L'+(w-x-d-cut)+' '+(h-y-d)+'H'+(x+d+cut)+'L'+(x+d)+' '+(h-y-d-cut)+'V'+(y+d+cut)+'Z';
 const fill=open?'none':(primary?'url(#teal)':'url(#enamel)');
 let ornament='';
 // All ornament stays inside the corner inset; middle edges remain straight.
 for(const[a,b,sx,sy]of [[x+12,y+12,1,1],[w-x-12,y+12,-1,1],[x+12,h-y-12,1,-1],[w-x-12,h-y-12,-1,-1]]) {
   ornament+='<path d="M'+a+' '+(b+sy*9)+'V'+b+'H'+(a+sx*9)+'" fill="none" stroke="'+gold+'" stroke-width="1"/>';
   ornament+='<circle cx="'+(a+sx*3)+'" cy="'+(b+sy*3)+'" r="1.4" fill="#f1d89d"/>';
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><defs><linearGradient id="enamel" x2=".5" y2="1"><stop stop-color="#1b303b"/><stop offset=".5" stop-color="#10202b"/><stop offset="1" stop-color="#07111a"/></linearGradient><linearGradient id="teal" x2=".5" y2="1"><stop stop-color="#0c6c73"/><stop offset=".5" stop-color="#123540"/><stop offset="1" stop-color="#081a25"/></linearGradient><linearGradient id="brass" x2="0" y2="1"><stop stop-color="#fff0bb"/><stop offset=".35" stop-color="'+gold+'"/><stop offset="1" stop-color="#70572c"/></linearGradient></defs><path d="'+outline(0)+'" fill="'+fill+'" stroke="#050b10" stroke-width="5"/><path d="'+outline(0)+'" fill="none" stroke="url(#brass)" stroke-width="2"/><path d="'+outline(4)+'" fill="none" stroke="'+gold+'" stroke-opacity=".3"/>'+ornament+'</svg>';
}
async function main(){
 const actions=['attack','reinforce','move','build','airlift','team','missiles','sabotage','bombers','details','emp','warhead'];
 const resources=['metal','fuel','research','uranium','intel','salvage','reserve','held'];
 for(const n of actions)await writeAsset('assets/ui/act-'+n+'.webp',wrap(symbols[n]),128,128,{issue:28});
 for(const n of resources)await writeAsset('assets/ui/res-'+n+'.webp',wrap(symbols[n],'#d7e5df'),96,96,{issue:28});
 for(const n of ['london','berlin','saopaulo','nairobi','cairo','delhi','denver','moscow','sydney'])await writeAsset('assets/ui/perk-'+n+'.webp',wrap(symbols[n]),128,128,{issue:22});
 for(const n of ['butcher','warden','ghost','breeder','raider'])await writeAsset('assets/ui/trait-'+n+'.webp',wrap(symbols[n],'#b995e4'),96,96,{issue:22});
 const frames=[
 ['hud-top',1024,160],['hud-advisor',960,144],['hud-actionbar',960,208],
 ['hud-action',240,160],['hud-action-primary',240,160,true],['hud-chip',192,96],
 ['hud-orders',640,128],['hud-meter',512,64],['hud-panel',512,768],
 ['hud-tab',240,88],['hud-tab-active',240,88,true],
 ['frame-bar',720,200],['frame-coach',720,120],['btn-primary',240,160,true],
 ['btn-plain',240,160],['topbar',1600,160]
 ];
 for(const[n,w,h,primary]of frames)await writeAsset('assets/ui/'+n+'.webp',frame(w,h,{primary}),w,h,{issue:n.startsWith('hud-')?29:28,slice:[24,24,24,24],contentInset:32});
 // Orders pips and meter fills are separate: text and changing game values stay live.
 for(const[n,fill]of [['order-pip-on','#ecc96d'],['order-pip-off','#26323b']]){
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="25" fill="'+fill+'" stroke="#b99c60" stroke-width="3"/><circle cx="32" cy="32" r="21" fill="none" stroke="#fff0bb" stroke-opacity=".3"/></svg>';
 await writeAsset('assets/ui/'+n+'.webp',svg,64,64,{issue:29});
 }
 for(const[n,w,h]of [['health-bar',512,80],['ammo-panel',256,128],['wave-counter',256,96],['build-tile',160,160],['build-tile-active',160,160],['minimap-frame',384,384]]){
 await writeAsset('frontline/public/assets/ui/'+n+'.webp',frame(w,h,{primary:n.endsWith('active'),open:n==='minimap-frame'}),w,h,{slice:[24,24,24,24],issue:'frontline'});
 }
 for(const n of ['turret','barrier','mine','railgun','strike','supply','repair'])await writeAsset('frontline/public/assets/ui/'+n+'.webp',wrap(symbols[n],'#72d8d0'),128,128,{issue:'frontline'});
 const cross='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g stroke="#f4f4df" stroke-width="2"><path d="M32 12V23M32 41V52M12 32H23M41 32H52"/></g><circle cx="32" cy="32" r="2" fill="#72d8d0"/></svg>';
 await writeAsset('frontline/public/assets/ui/crosshair.webp',cross,64,64,{issue:'frontline'});
 fs.writeFileSync(path.join(__dirname,'ui-manifest.json'),JSON.stringify(rows,null,2)+'\n');
 console.log('Created '+rows.length+' native UI assets and editable SVG sources.');
}
main().catch(e=>{console.error(e);process.exit(1)});

