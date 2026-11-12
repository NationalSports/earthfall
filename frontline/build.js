// Builds frontline/dist/index.html: one self-contained file (three.js and any art inlined) so it can be opened or shared from a link.
const fs = require('fs'), path = require('path');
// The game is written as ES modules against three.js r180 and bundled into one script.
const game = require('esbuild').buildSync({ entryPoints: [path.join(__dirname, 'src/game.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' }).outputFiles[0].text.replace(/<\/script/g, '<\\/script');
// Art plugs in by file name: frontline/assets/sky-la.jpg becomes FRONTLINE_ASSETS["sky-la"]. See frontline/ART_BRIEF.md.
const assets = {}, dir = path.join(__dirname, 'assets'), mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) { const ext = path.extname(f).toLowerCase(); if (mime[ext]) assets[path.basename(f, ext)] = 'data:' + mime[ext] + ';base64,' + fs.readFileSync(path.join(dir, f)).toString('base64'); }
let html = fs.readFileSync(path.join(__dirname, 'index.tpl.html'), 'utf8');
html = html.replace('/*ASSETS*/', () => 'window.FRONTLINE_ASSETS=' + JSON.stringify(assets) + ';').replace('/*GAME*/', () => game);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);
console.log('built frontline/dist/index.html', html.length, 'bytes,', Object.keys(assets).length, 'art files');
