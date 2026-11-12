// Builds dist/index.html: one self-contained page with all art embedded.
// Usage: node build.js
const fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const uri = (f, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
const dir = (d, mime) => Object.fromEntries(fs.readdirSync(path.join(__dirname, d)).filter(f => f.endsWith('.webp')).sort().map(f => [f.replace(/\.webp$/, ''), uri(d + '/' + f, mime)]));
// Art delivery of 11 Nov (pull request #33), reviewed image by image.
// Not embedded: portrait-* (byte-for-byte copies of vanguard, cipher and engineer) and the nine wide guide-* pictures,
// which belong to the step-by-step guide that is not on main yet. guide-orders is used by the How to play screen.
// When the guide lands, delete the guide- part of SKIP_CARD.
const SKIP_CARD = k => /^portrait-/.test(k) || (/^guide-/.test(k) && k !== 'guide-orders');
const has2 = f => fs.existsSync(path.join(__dirname, f));
// Defense battle art (#21) and the action, city and trait emblems (#22, #28). Listed by name or prefix: only reviewed files are embedded.
const BATTLE_ART = ['field.jpg', 'squad.webp', 'team.webp', 'swarm-1.webp', 'swarm-2.webp', 'swarm-3.webp', 'wall.webp', 'blast.webp'];
const assets = 'const ART = { map: ' + JSON.stringify(uri('assets/board/map-world.jpg', 'image/jpeg')) + ', mask: ' + JSON.stringify(uri('assets/board/land-mask.png', 'image/png')) + ', globe: ' + JSON.stringify(uri('assets/board/globe-color.jpg', 'image/jpeg')) + (fs.existsSync(path.join(__dirname, 'assets/board/infestation.jpg')) ? ', infest: ' + JSON.stringify(uri('assets/board/infestation.jpg', 'image/jpeg')) : '') + ' };\n' +
  'const ANCHORS = ' + r('assets/board/anchors.json') + ';\n' +
  'const PIECES = ' + JSON.stringify(dir('assets/pieces', 'image/webp')) + ';\n' +
  'const CARDS = ' + JSON.stringify(Object.fromEntries(Object.entries(dir('assets/cards', 'image/webp')).filter(([k]) => !SKIP_CARD(k)))) + ';\n' +
  'const BATTLE = ' + JSON.stringify(Object.fromEntries(BATTLE_ART.filter(f => has2('assets/battle/' + f)).map(f => [f.replace(/\.\w+$/, ''), uri('assets/battle/' + f, f.endsWith('.jpg') ? 'image/jpeg' : 'image/webp')]))) + ';\n' +
  'const UIX = ' + JSON.stringify(Object.fromEntries(Object.entries(dir('assets/ui', 'image/webp')).filter(([k]) => /^(act|perk|trait|res)-/.test(k)))) + ';\n' +
  // Painted city plates and building miniatures for the close-up city (#20).
  'const CITY = ' + JSON.stringify(has2('assets/city') ? dir('assets/city', 'image/webp') : {}) + ';\n';
// Delivered, reviewed scripts and the icon sprite. Files are listed by name on purpose: nothing in assets/ is embedded without a review.
const has = f => fs.existsSync(path.join(__dirname, f));
// assets/fx/infestation.js: the revision from #25 passed review in #16 (painting stays visible), so it is switched on.
const fxJs = ['assets/fx/infestation.js', 'assets/fx/combat.js'].filter(has).map(r).join('\n');
const defs = has('assets/ui/icons.svg') ? (r('assets/ui/icons.svg').match(/<defs>[\s\S]*<\/defs>/) || [''])[0].replace(/\bid="/g, 'id="ic-') : '';
const icons = 'const UI_ICONS = ' + JSON.stringify(defs ? '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">' + defs + '</svg>' : '') + ';\n';
const js = [assets, icons, fxJs, r('src/logic.js').replace(/if \(typeof module[^\n]*\n?/, ''), r('src/battle.js').replace(/if \(typeof module[^\n]*\n?/, ''), r('src/view3d.js'), r('src/ui.js')].join('\n');
// The theme is layered over the base stylesheet. If theme.css still carries a copy of the base rules,
// only the part after its "replacement theme" marker is used, so newer base rules are not overridden by a stale copy.
let theme = fs.existsSync(path.join(__dirname, 'theme/theme.css')) ? r('theme/theme.css') : '';
{ const m = theme.indexOf('/* Earthfall concept HUD'); if (m > 0) theme = theme.slice(m); }
// Painted frames and button plates from assets/ui/ (art request #11). Listed by name on purpose: only reviewed files are embedded.
// Each becomes a CSS variable (--ui-dialog-frame and so on) that src/frames.css uses; frames.css comes after the theme so it wins.
const { UI_PNG, validatePng } = require('./tools/check-ui-assets.js');
const uiPng = Object.keys(UI_PNG).filter(n => has('assets/ui/' + n + '.png'));
for (const n of uiPng) validatePng(fs.readFileSync(path.join(__dirname, 'assets/ui/' + n + '.png')), UI_PNG[n], n);
const frames = uiPng.length ? ':root{' + uiPng.map(n => '--ui-' + n + ':url("' + uri('assets/ui/' + n + '.png', 'image/png') + '")').join(';') + '}\n' + r('src/frames.css') : '';
// HUD redesign (#29) with the stretchable plates from #28. Listed by name on purpose: only reviewed files are embedded.
// Each becomes a CSS variable (--w-hud-orders and so on) that src/hud.css uses; hud.css comes last so it wins.
const HUD_WEBP = ['topbar', 'frame-bar', 'frame-coach', 'btn-plain', 'btn-primary', 'hud-orders', 'hud-tab', 'hud-tab-active', 'hud-panel', 'order-pip-on', 'order-pip-off'].filter(n => has('assets/ui/' + n + '.webp'));
const hud = ':root{' + HUD_WEBP.map(n => '--w-' + n + ':url("' + uri('assets/ui/' + n + '.webp', 'image/webp') + '")').join(';') + '}\n' + r('src/hud.css');
const page = r('src/index.tpl.html').replace('/*CSS*/', () => r('src/style.css') + '\n' + theme + '\n' + frames + '\n' + hud).replace('/*JS*/', () => js);
const cdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), page.replace('<!--THREE-->', cdn));
// Offline copy for local testing (needs `npm install` for three)
const local = path.join(__dirname, 'node_modules/three/build/three.min.js');
if (fs.existsSync(local)) fs.writeFileSync(path.join(__dirname, 'dist/test.html'), page.replace('<!--THREE-->', () => '<script>' + fs.readFileSync(local, 'utf8') + '</script>').replace(/<link[^>]*>/g, ''));
console.log('built dist/index.html', fs.statSync(path.join(__dirname, 'dist/index.html')).size, 'bytes');
