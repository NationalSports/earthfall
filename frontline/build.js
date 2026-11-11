// Builds frontline/dist/index.html: one self-contained file (three.js and any art inlined) so it can be opened or shared from a link.
const fs = require('fs'), path = require('path');
const three = [path.join(__dirname, '..', 'node_modules/three/build/three.min.js'), '/home/claude/game/node_modules/three/build/three.min.js'].find(p => fs.existsSync(p));
if (!three) { console.error('three.js not found. Run: npm install three@0.128'); process.exit(1); }
// Art plugs in by file name: frontline/assets/sky-la.jpg becomes FRONTLINE_ASSETS["sky-la"]. See frontline/ART_BRIEF.md.
const assets = {}, dir = path.join(__dirname, 'assets'), mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) { const ext = path.extname(f).toLowerCase(); if (mime[ext]) assets[path.basename(f, ext)] = 'data:' + mime[ext] + ';base64,' + fs.readFileSync(path.join(dir, f)).toString('base64'); }
let html = fs.readFileSync(path.join(__dirname, 'index.tpl.html'), 'utf8');
html = html.replace('/*ASSETS*/', () => 'window.FRONTLINE_ASSETS=' + JSON.stringify(assets) + ';').replace('/*THREE*/', () => fs.readFileSync(three, 'utf8')).replace('/*GAME*/', () => fs.readFileSync(path.join(__dirname, 'src/game.js'), 'utf8'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);
console.log('built frontline/dist/index.html', html.length, 'bytes,', Object.keys(assets).length, 'art files');
