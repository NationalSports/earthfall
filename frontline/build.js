// Builds frontline/dist/index.html: one self-contained file (three.js inlined) so it can be opened or shared from a link.
const fs = require('fs'), path = require('path');
const three = [path.join(__dirname, '..', 'node_modules/three/build/three.min.js'), '/home/claude/game/node_modules/three/build/three.min.js'].find(p => fs.existsSync(p));
if (!three) { console.error('three.js not found. Run: npm install three@0.128'); process.exit(1); }
let html = fs.readFileSync(path.join(__dirname, 'index.tpl.html'), 'utf8');
html = html.replace('/*THREE*/', () => fs.readFileSync(three, 'utf8')).replace('/*GAME*/', () => fs.readFileSync(path.join(__dirname, 'src/game.js'), 'utf8'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);
console.log('built frontline/dist/index.html', html.length, 'bytes');
