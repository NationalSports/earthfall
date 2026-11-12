// Export only: resize generated artwork to requested dimensions and encode it.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(path.join(require('node:os').homedir(), '.codex/art-tools/earthfall/node_modules/sharp'));
async function main() {
  const [input, output, width, height, alpha] = process.argv.slice(2);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const strip = /assets\/battle\/(wall|blast)\.webp$/.test(output);
  let im = sharp(input).rotate().resize(+width, +height, { fit: strip ? 'fill' : 'cover', position: 'centre', kernel: 'lanczos3' });
  if (output.endsWith('/assets/battle/wall.webp')) im = sharp(input).trim({ threshold: 1 }).resize(+width - 8, +height, { fit: 'fill' }).extend({ left: 4, right: 4, top: 0, bottom: 0, background: '#00000000' });
  if (alpha !== 'true') im = im.flatten({ background: '#101b25' });
  const ext = path.extname(output);
  if (ext === '.webp') im = im.webp({ quality: 92, alphaQuality: 100, effort: 6 });
  else if (ext === '.jpg') im = im.jpeg({ quality: 94, chromaSubsampling: '4:4:4' });
  else im = im.png();
  await im.toFile(output);
  const meta = await sharp(output).metadata();
  console.log(JSON.stringify({ output, width: meta.width, height: meta.height, alpha: meta.hasAlpha, bytes: fs.statSync(output).size }));
}
main().catch(e => { console.error(e); process.exit(1); });
