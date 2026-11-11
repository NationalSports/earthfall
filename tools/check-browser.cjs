const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.REVIEW_SCREENSHOTS || path.join(root, 'dist/qa'));
fs.mkdirSync(output, {recursive:true});
const stage = 'final';
async function checkImages(page) {
 const names = Object.keys(require('./check-ui-assets.js').UI_PNG);
 const result = await page.evaluate(async names => {
  const checks = {};
  for (const name of names) {
   const value = getComputedStyle(document.documentElement).getPropertyValue('--ui-'+name);
   const image = new Image(); image.src = value.trim().replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
   await image.decode();
   const c=document.createElement('canvas'); c.width=image.width; c.height=image.height;
   const g=c.getContext('2d');g.drawImage(image,0,0);const d=g.getImageData(0,0,c.width,c.height).data;
   const pixel=(x,y)=>Array.from(d.slice((y*c.width+x)*4,(y*c.width+x)*4+4)).join(',');
   let bad=0;
   if(name==='texture-enamel') for(let n=0;n<512;n++) if(pixel(0,n)!==pixel(511,n)||pixel(n,0)!==pixel(n,511))bad++;
   if(name==='topbar') for(let y=0;y<64;y++) for(let x=0;x<512;x++) if([0,1,2,3].some(k=>Math.abs(d[(y*512+x)*4+k]-d[y*512*4+k])>1))bad++;
   if(name==='card-frame') for(let y=10;y<150;y++) for(let x=10;x<150;x++) if(d[(y*160+x)*4+3]!==0)bad++;
   checks[name]={size:[image.width,image.height],bad};
  }
  return checks;
 },names);
 for (const [name, check] of Object.entries(result)) {
  assert.deepEqual(check.size,require('./check-ui-assets.js').UI_PNG[name]);
  assert.equal(check.bad,0,name+': seam, divider, and alpha checks');
 }
}
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROME_BIN || (process.platform==='darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined),headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  const sizes = [[1280,800],[820,1180],[390,780],[780,390]];
  for (const [width,height] of sizes.filter(s=>!process.env.REVIEW_WIDTH || s[0]===+process.env.REVIEW_WIDTH)) {
   const webgl1 = width===390;
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   if(webgl1) await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t==='webgl2'?null:get.call(this,t,...a)};});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.goto(pathToFileURL(root+'/dist/test.html').href);
   await page.waitForFunction(()=>window.__g,{timeout:45000});
   await page.locator('[data-a="start"][data-id="assault"]').click();
   await checkImages(page);
   const initial=await page.evaluate(()=>({orders:__g.S.orders,combat:!!window.EARTHFALL_FX?.combat,shader:!!window.EARTHFALL_FX?.infestation,icons:document.querySelectorAll('#top .ic').length}));
   assert.equal(initial.orders,6);assert.equal(initial.combat,true);assert.equal(initial.shader,true);assert.equal(initial.icons,8);
   const rules=await page.evaluate(()=>{const {L}=__g;const s=L.newGame('engineer','normal');const b=L.build(s,'la','works');const m=L.move(s,'la','vancouver',2);return {b:b.ok,m:m.ok,orders:s.orders,job:s.terr.la.job?.doneAt,eta:s.cols[0]?.eta};});
   assert.equal(rules.b,true);assert.equal(rules.m,true);assert.equal(rules.orders,4);assert.equal(rules.job,16);assert.ok(rules.eta>0);
   await page.evaluate(()=>{__g.act('tutSkip');__g.act('sel','la');__g.V.focus('la',false);__g.V.cam.dist=14;});
   await page.waitForFunction(()=>!!__g.V.city,{timeout:30000});
   for(const tab of ['command','arsenal','intel','territory']) await page.evaluate(t=>__g.act('tab',t),tab);
   await page.evaluate(()=>{__g.V.fit();__g.V.missile('la','tokyo');__g.V.missile('la','beijing','emp');__g.V.missile('la','sydney','nuke');__g.V.flash('la');});
   await page.waitForTimeout(2800);
   await page.evaluate(()=>{__g.act('globe');__g.V.missile('la','tokyo','nuke');});
   await page.waitForTimeout(2400);
   await page.evaluate(()=>{__g.act('globe');__g.act('help');});
   await page.locator('[data-a="closeModal"]').click();
   await page.evaluate(()=>{__g.act('sel','london');});
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<39.5}).map(b=>b.dataset.a)}));
   assert.equal(layout.overflow,false);assert.deepEqual(layout.small,[], 'All visible buttons need at least 40px height');assert.deepEqual(errors,[]);
   await page.screenshot({animations:'disabled',path:path.join(output, width+'.png')});
   console.log(JSON.stringify({stage,width,height,webgl1,initial,rules,layout,errors}));
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
