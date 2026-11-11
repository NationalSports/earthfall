// Export the editable vector repair sources at their exact production dimensions.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { UI_PNG, validatePng } = require('./check-ui-assets.js');
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined),
    headless: true
  });
  try {
    const page = await browser.newPage();
    for (const name of ['texture-enamel', 'topbar', 'card-frame']) {
      const svg = fs.readFileSync(path.join(__dirname, '../assets/ui/source', name + '.svg'), 'utf8');
      const png = await page.evaluate(async svg => {
        const im = new Image(); im.src = 'data:image/svg+xml;base64,' + btoa(svg); await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        c.getContext('2d').drawImage(im, 0, 0);
        return c.toDataURL('image/png').split(',')[1];
      }, svg);
      const data = Buffer.from(png, 'base64'); validatePng(data, UI_PNG[name], name);
      fs.writeFileSync(path.join(__dirname, '../assets/ui', name + '.png'), data);
      console.log('Exported ' + name);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
