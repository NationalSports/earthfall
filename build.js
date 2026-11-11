// Builds dist/index.html: one self-contained page with all art embedded.
// Usage: node build.js
const fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const uri = (f, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
const dir = (d, mime) => Object.fromEntries(fs.readdirSync(path.join(__dirname, d)).filter(f => f.endsWith('.webp')).sort().map(f => [f.replace(/\.webp$/, ''), uri(d + '/' + f, mime)]));
const assets = 'const ART = { map: ' + JSON.stringify(uri('assets/board/map-world.jpg', 'image/jpeg')) + ', mask: ' + JSON.stringify(uri('assets/board/land-mask.png', 'image/png')) + ', globe: ' + JSON.stringify(uri('assets/board/globe-color.jpg', 'image/jpeg')) + (fs.existsSync(path.join(__dirname, 'assets/board/infestation.jpg')) ? ', infest: ' + JSON.stringify(uri('assets/board/infestation.jpg', 'image/jpeg')) : '') + ' };\n' +
  'const ANCHORS = ' + r('assets/board/anchors.json') + ';\n' +
  'const PIECES = ' + JSON.stringify(dir('assets/pieces', 'image/webp')) + ';\n' +
  'const CARDS = ' + JSON.stringify(dir('assets/cards', 'image/webp')) + ';\n';
const js = [assets, r('src/logic.js').replace(/if \(typeof module[^\n]*\n?/, ''), r('src/battle.js').replace(/if \(typeof module[^\n]*\n?/, ''), r('src/view3d.js'), r('src/ui.js')].join('\n');
// The theme is layered over the base stylesheet. If theme.css still carries a copy of the base rules,
// only the part after its "replacement theme" marker is used, so newer base rules are not overridden by a stale copy.
let theme = fs.existsSync(path.join(__dirname, 'theme/theme.css')) ? r('theme/theme.css') : '';
{ const m = theme.indexOf('/* Earthfall concept HUD'); if (m > 0) theme = theme.slice(m); }
const page = r('src/index.tpl.html').replace('/*CSS*/', () => r('src/style.css') + '\n' + theme).replace('/*JS*/', () => js);
const cdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), page.replace('<!--THREE-->', cdn));
// Offline copy for local testing (needs `npm install` for three)
const local = path.join(__dirname, 'node_modules/three/build/three.min.js');
if (fs.existsSync(local)) fs.writeFileSync(path.join(__dirname, 'dist/test.html'), page.replace('<!--THREE-->', () => '<script>' + fs.readFileSync(local, 'utf8') + '</script>').replace(/<link[^>]*>/g, ''));
console.log('built dist/index.html', fs.statSync(path.join(__dirname, 'dist/index.html')).size, 'bytes');
