/* Earthfall combat FX — Three.js r128, no imports, no timers. */
window.EARTHFALL_FX = window.EARTHFALL_FX || {};
(function(){
const T=window.THREE;
function group(){return new T.Group()}
function mat(color,opacity=1){return new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide})}
function sphere(r,color,opacity=1){return new T.Mesh(new T.SphereBufferGeometry(r,12,8),mat(color,opacity))}
function ring(radius,tube,color,opacity=1){const o=new T.Mesh(new T.RingBufferGeometry(radius-tube,radius+tube,48),mat(color,opacity));o.rotation.x=-Math.PI/2;return o}
function particles(n,color,size){const geo=new T.BufferGeometry(),a=new Float32Array(n*3);geo.setAttribute('position',new T.BufferAttribute(a,3));const obj=new T.Points(geo,new T.PointsMaterial({color,size,transparent:true,opacity:1,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true}));return {obj,a,n}}
function dispose(root){root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}})}
function clamp(t){return Math.max(0,Math.min(1,t))}
function fade(o,v){o.material.opacity=Math.max(0,v)}
function explosion(opts={}){
 const g=group(),s=opts.size||1,flash=sphere(s*.7,0xffefbc),fire=sphere(s*.4,0xff6337),smoke=ring(s*.5,s*.16,0x9e5144,.48),embers=particles(80,0xffa352,s*.10);
 g.add(flash,fire,smoke,embers.obj);smoke.position.y=.08;
 const seed=Array.from({length:80},(_,i)=>{let a=i*2.39996;return [Math.cos(a),Math.sin(a),((i*37)%101)/101]});
 return {object:g,duration:1.5,update(t){const p=clamp(t/1.5);flash.scale.setScalar(1+p*3);fade(flash,Math.max(0,1-t*7));fire.scale.setScalar(1+2*p);fade(fire,Math.max(0,1-p*1.4));smoke.scale.setScalar(1+4*p);fade(smoke,.48*(1-p));for(let i=0;i<80;i++){const [x,z,h]=seed[i],j=i*3;embers.a[j]=x*s*p*(1+h*2);embers.a[j+1]=s*(.1+2*h*p-1.8*p*p);embers.a[j+2]=z*s*p*(1+h*2)}embers.obj.geometry.attributes.position.needsUpdate=true;fade(embers.obj,1-p)},dispose(){dispose(g)}}
}
function empRing(opts={}){
 const g=group(),r=opts.radius||6,outer=ring(1,.09,0x26b2b0),inner=ring(1,.20,0x9bffff,.5),crackle=particles(64,0x83ffff,.13);g.add(outer,inner,crackle.obj);outer.position.y=.07;inner.position.y=.09;
 return {object:g,duration:2,update(t){const p=clamp(t/2),rad=Math.max(.02,r*p);outer.scale.setScalar(rad);inner.scale.setScalar(rad*.93);fade(outer,.95*(1-p));fade(inner,.5*(1-p));for(let i=0;i<64;i++){let a=i*2.399963,j=i*3;crackle.a[j]=Math.cos(a)*rad;crackle.a[j+1]=.11+.09*Math.sin(i*13+t*28);crackle.a[j+2]=Math.sin(a)*rad}crackle.obj.geometry.attributes.position.needsUpdate=true;fade(crackle.obj,1-p)},dispose(){dispose(g)}}
}
function missileTrail(opts={}){
 const g=group(),from=(opts.from||new T.Vector3(-4,0,0)).clone(),to=(opts.to||new T.Vector3(4,0,0)).clone(),head=sphere(.22,0xffdd8a),trail=particles(90,0xff7845,.18),impact=sphere(.4,0xffe5a6,0);g.add(head,trail.obj,impact);impact.position.copy(to);
 function pos(p){return from.clone().lerp(to,p).add(new T.Vector3(0,Math.sin(Math.PI*p)*Math.max(2,from.distanceTo(to)*.27),0))}
 return {object:g,duration:1.65,update(t){let p=clamp(t/1.35);head.position.copy(pos(p));fade(head,p<1?1:0);for(let i=0;i<90;i++){let q=p-i*.007,j=i*3;if(q>=0&&q<=1){let v=pos(q);trail.a[j]=v.x;trail.a[j+1]=v.y;trail.a[j+2]=v.z}else{trail.a[j]=trail.a[j+1]=trail.a[j+2]=9999}}trail.obj.geometry.attributes.position.needsUpdate=true;fade(trail.obj,p<1?1:.1);if(p>=1){let z=clamp((t-1.35)/.30);impact.scale.setScalar(1+z*4);fade(impact,1-z)}},dispose(){dispose(g)}}
}
function nukeFlash(opts={}){
 const g=group(),flash=sphere(2,0xffffff),column=new T.Mesh(new T.CylinderBufferGeometry(.8,1.3,1,20,1,true),mat(0xffc071,.6)),cap=sphere(1,0xffd27a,.7),shock=ring(1,.1,0xffe4a5,.8),embers=particles(120,0xffae61,.22);
 g.add(flash,column,cap,shock,embers.obj);shock.position.y=.06;
 return {object:g,duration:4.6,update(t){let p=clamp(t/4.6);flash.scale.setScalar(1+t*4);fade(flash,Math.max(0,1-t*2.8));column.position.y=Math.min(8,t*2.1)/2;column.scale.set(1+t*.55,Math.max(.01,t*2.1),1+t*.55);fade(column,.65*(1-p));cap.position.y=Math.min(8,t*2.1);cap.scale.setScalar(1+t*.8);fade(cap,.8*(1-p));shock.scale.setScalar(1+t*5);fade(shock,.85*(1-p));for(let i=0;i<120;i++){let a=i*2.39996,h=(i*31%101)/101,j=i*3;embers.a[j]=Math.cos(a)*t*(1+h);embers.a[j+1]=h*6*p;embers.a[j+2]=Math.sin(a)*t*(1+h)}embers.obj.geometry.attributes.position.needsUpdate=true;fade(embers.obj,1-p)},dispose(){dispose(g)}}
}
window.EARTHFALL_FX.combat={missileTrail,explosion,empRing,nukeFlash};
})();