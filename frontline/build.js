// Builds frontline/dist/index.html: one self-contained file (three.js and any art inlined) so it can be opened or shared from a link.
const fs = require('fs'), path = require('path');
// The game is written as ES modules against three.js r180 and bundled into one script.
const game = require('esbuild').buildSync({ entryPoints: [path.join(__dirname, 'src/game.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' }).outputFiles[0].text.replace(/<\/script/g, '<\\/script');
// Art plugs in by file name: frontline/assets/sky-la.jpg becomes FRONTLINE_ASSETS["sky-la"]. See frontline/ART_BRIEF.md.
const assets = {}, mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
// The five Earth-region kits (about 20 MB) stay out of the page until the territory map can send you to those regions.
const REGION_KIT = /^(ground-(cobble|paver|redearth|sand|snow)|facade-(desert|tropic|europe|north|asia)-)/;
const walk = dir => { if (!fs.existsSync(dir)) return; for (const f of fs.readdirSync(dir)) { const full = path.join(dir, f), ext = path.extname(f).toLowerCase(); if (fs.statSync(full).isDirectory()) walk(full); else if (mime[ext] && !/\/(ui|weapons|props)\//.test(full.replace(/\\/g, '/')) && !REGION_KIT.test(f)) assets[path.basename(f, ext)] = 'data:' + mime[ext] + ';base64,' + fs.readFileSync(full).toString('base64'); } };
walk(path.join(__dirname, 'public/assets')); walk(path.join(__dirname, 'assets')); if (process.env.FRONTLINE_ART) walk(process.env.FRONTLINE_ART);
// The art kit's own file names stand in for the names the game asks for.
for (const [want, have] of [['ground-la', 'ground-grass'], ['facade', 'facade-art-deco'], ['sky-la', 'los-angeles-panorama']]) if (!assets[want] && assets[have]) assets[want] = assets[have];
let html = fs.readFileSync(path.join(__dirname, 'index.tpl.html'), 'utf8');
// Scanned 3D models ride along the same way: public/assets/models/soldier.glb becomes FRONTLINE_MODELS.soldier.
// The models go in a second file beside the page (dist/models.js): together they are too big for hosts that cap one file.
const SPLIT = true, OUT = path.join(__dirname, 'dist');
const models = {}, mdir = path.join(__dirname, 'public/assets/models'); if (fs.existsSync(mdir)) for (const f of fs.readdirSync(mdir)) if (/\.glb$/i.test(f)) models[path.basename(f, path.extname(f))] = 'data:model/gltf-binary;base64,' + fs.readFileSync(path.join(mdir, f)).toString('base64');
const modelJs = 'window.FRONTLINE_MODELS=' + JSON.stringify(models) + ';';
html = html.replace('/*ASSETS*/', () => 'window.FRONTLINE_ASSETS=' + JSON.stringify(assets) + ';' + (SPLIT ? '</script><script src="models.js">' : modelJs)).replace('/*GAME*/', () => game);
fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'index.html'), html);
if (SPLIT) fs.writeFileSync(path.join(OUT, 'models.js'), modelJs);
console.log('built ' + path.relative(path.dirname(__dirname), OUT) + '/index.html', html.length, 'bytes,', Object.keys(assets).length, 'art files');
