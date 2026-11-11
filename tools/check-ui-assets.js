// Validate actual PNG payloads before embedding them in the self-contained game.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const UI_PNG = {
  'dialog-frame': [256, 256], 'panel-frame': [192, 192], 'card-frame': [160, 160],
  'button-neutral': [288, 72], 'button-teal': [288, 72], 'button-gold': [288, 72],
  'button-violet': [288, 72], 'button-cyan': [288, 72], 'button-danger': [288, 72],
  topbar: [512, 64], 'texture-enamel': [512, 512]
};
function crc32(data) {
  let c = 0xffffffff;
  for (const byte of data) { c ^= byte; for (let n = 0; n < 8; n++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); }
  return (c ^ 0xffffffff) >>> 0;
}
function validatePng(data, expected, name) {
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', name + ': PNG signature');
  let pos = 8, header, ended = false; const idat = [];
  while (pos + 12 <= data.length) {
    const len = data.readUInt32BE(pos), end = pos + 8 + len;
    assert.ok(end + 4 <= data.length, name + ': truncated chunk');
    const type = data.toString('ascii', pos + 4, pos + 8), bytes = data.subarray(pos + 8, end);
    assert.equal(crc32(data.subarray(pos + 4, end)), data.readUInt32BE(end), name + ': ' + type + ' checksum');
    if (type === 'IHDR') header = bytes;
    if (type === 'IDAT') idat.push(bytes);
    pos = end + 4;
    if (type === 'IEND') { ended = true; break; }
  }
  assert.ok(header && header.length === 13 && ended && idat.length, name + ': complete PNG');
  assert.equal(pos, data.length, name + ': trailing payload');
  assert.deepEqual([header.readUInt32BE(0), header.readUInt32BE(4)], expected, name + ': dimensions');
  assert.equal(header[12], 0, name + ': non-interlaced PNG expected');
  const channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[header[9]];
  assert.ok(channels, name + ': supported color type');
  const rowBytes = Math.ceil(expected[0] * header[8] * channels / 8);
  assert.equal(zlib.inflateSync(Buffer.concat(idat)).length, expected[1] * (rowBytes + 1), name + ': decoded scanlines');
}
if (require.main === module) {
  for (const [name, size] of Object.entries(UI_PNG)) {
    validatePng(fs.readFileSync(path.join(__dirname, '../assets/ui', name + '.png')), size, name);
    console.log(name + ': checksums, dimensions, and compressed payload valid');
  }
}
module.exports = { UI_PNG, validatePng };
