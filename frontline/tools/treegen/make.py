import base64, json
from playwright.sync_api import sync_playwright
V = {
 'tree-oak':   ('Oak Medium', 11, "o=>{ o.leaves.size*=1.6; o.leaves.count=Math.round(o.leaves.count*1.2); }"),
 'tree-ash':   ('Ash Medium', 23, "o=>{ o.leaves.size*=1.7; o.leaves.count=Math.round(o.leaves.count*1.2); }"),
 'tree-aspen': ('Aspen Medium', 5, "o=>{ o.leaves.size*=1.5; o.leaves.count=Math.round(o.leaves.count*1.6); }"),
 'tree-pine':  ('Pine Medium', 8, "o=>{}"),
 'tree-bush':  ('Bush 2', 3, "o=>{}"),
 'tree-alien': ('Ash Medium', 77, "o=>{ o.branch.twist={0:0.6,1:0.9,2:0.6,3:0.3}; o.branch.gnarliness={0:0.15,1:0.3,2:0.35,3:0.3}; o.branch.force.strength=-0.035; o.leaves.tint=0xc28bff; o.bark.tint=0x6a5a7a; o.leaves.size*=1.9; }"),
 'tree-alien2':('Aspen Medium', 31, "o=>{ o.branch.twist={0:1.2,1:0.8,2:0.4,3:0}; o.branch.gnarliness={0:0.2,1:0.35,2:0.3,3:0.2}; o.leaves.tint=0x6fffe0; o.bark.tint=0x4a5a66; o.branch.force.strength=-0.02; o.leaves.size*=1.5; o.leaves.count=Math.round(o.leaves.count*1.6); }"),
}
LOW = "o=>{ for (const k of ['0','1','2','3']) { if (o.branch.segments[k] > 4) o.branch.segments[k] = Math.max(4, Math.round(o.branch.segments[k]*0.7)); if (o.branch.sections[k] > 4) o.branch.sections[k] = Math.max(4, Math.round(o.branch.sections[k]*0.75)); } }"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.goto('file:///home/claude/treegen/index.html'); pg.wait_for_timeout(1500)
    for name,(pr,seed,tw) in V.items():
        r=pg.evaluate("async (a)=>{ const tw=eval(a[2]), low=eval(a[3]); const {t,info}=window.makeTree(a[0],a[1],o=>{tw(o);low(o);}); await new Promise(r=>setTimeout(r,300)); const b64=await window.exportGlb(t); return {info, b64}; }",[pr,seed,tw,LOW])
        open('/home/claude/treegen/%s.glb'%name,'wb').write(base64.b64decode(r['b64'])); print(name, r['info'])
    print(errs[:3]); b.close()
