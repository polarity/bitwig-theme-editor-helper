/* Optional integration suite: requires Playwright and its Chromium browser.
 * Set THEME_CHROMIUM to the path of an installed Chrome/Chromium to reuse it
 * instead of downloading Playwright's own browser. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const launch = { headless: true };
if (process.env.THEME_CHROMIUM) launch.executablePath = process.env.THEME_CHROMIUM;

(async () => {
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], network = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'theme-helper-test-'));
  async function paste(source) {
    await page.locator('#pasteOpen').click(); await page.locator('#sourceText').fill(source);
    await page.locator('#pasteForm button[type=submit]').click();
  }
  async function changeRange(id, values) {
    await page.locator('#' + id).evaluate((input, values) => {
      input.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      for (const value of values) { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, values);
    await page.waitForFunction(([id, value]) => document.getElementById(id + 'Value').value === value, [id, values.at(-1) + (id === 'hue' ? '°' : '%')]);
  }
  async function exportText() { await page.locator('#exportOpen').click(); return page.locator('#exportText').inputValue(); }
  async function closeExport() { await page.locator('[data-close=exportDialog]').click(); }
  try {
    await page.goto(pathToFileURL(path.resolve(__dirname, '../main.html')).href);
    assert.equal(await page.title(), 'Bitwig Theme Editor Helper');
    // New themes follow the version selector. This suite drives the 5.x JSON flow;
    // the 6.x BTE flow is checked at the end.
    assert.equal(await page.locator('#bitwigVersion').inputValue(), '6');
    await page.locator('#bitwigVersion').selectOption('5');
    await page.locator('#newTheme').click();
    assert.equal(await page.locator('#exportOpen').isDisabled(), false);
    assert.equal(await page.locator('.color-row').count(), 248);
    const starter = JSON.parse(await exportText()); await closeExport();
    assert.equal(Object.keys(starter.window).length, 182);
    assert.equal(Object.keys(starter.arranger).length, 66);
    assert.equal(starter.window['Window background'], '#2E2E2E');
    assert.equal(starter.window['Light Text'], '#FFFFFF');
    assert.equal(starter.window.On, '#FF8713');
    await page.locator('#randomizeColors').click();
    const randomized = JSON.parse(await exportText()); await closeExport();
    assert.notDeepEqual(randomized, starter);
    assert.equal(randomized.window['Audio Event Boundary'].slice(-2), '7B');
    assert.equal(await page.locator('#dirty').textContent(), 'Edited');
    await page.locator('#undo').click();
    assert.deepEqual(JSON.parse(await exportText()), starter); await closeExport();
    await page.locator('#redo').click();
    assert.deepEqual(JSON.parse(await exportText()), randomized); await closeExport();
    await page.locator('#newTheme').click();
    assert.deepEqual(JSON.parse(await exportText()), starter); await closeExport();
    assert.equal(await page.locator('#undo').isDisabled(), true);
    const source = '// Header\r\nGradient: true // setting\r\nButton text: #ff000080 // keep\r\nButton background: #202020\r\nUnknown: custom data\r\n';
    await page.locator('#fileInput').setInputFiles({ name: 'test.bte', mimeType: 'text/plain', buffer: Buffer.from(source) });
    await page.waitForFunction(() => document.querySelectorAll('.color-row').length === 2);
    assert.equal(await exportText(), source.replace(/\r\n/g, '\n'));
    const originalDownloadPromise = page.waitForEvent('download'); await page.locator('#downloadExport').click();
    const originalDownload = await originalDownloadPromise;
    const originalPath = path.join(temp, 'original.bte'); await originalDownload.saveAs(originalPath);
    assert.equal(await fs.readFile(originalPath, 'utf8'), source, 'BTE download must preserve CRLF independently of textarea normalization');
    await closeExport();
    await page.locator('.color-row').filter({ hasText: 'Button text' }).click();
    await changeRange('hue', [20, 40, 120]);
    await page.waitForFunction(() => document.getElementById('resultHex').textContent === '#00FF0080');
    await page.locator('#undo').click();
    assert.equal(await page.locator('#hue').inputValue(), '0');
    await page.locator('#redo').click();
    assert.equal(await page.locator('#hue').inputValue(), '120');
    await page.locator('#hexInput').fill('#12345640'); await page.locator('#hexInput').press('Enter');
    await changeRange('hue', [-120]);
    assert.equal(await page.locator('#resultHex').textContent(), '#12345640');
    await page.locator('#compare').check();
    await page.waitForFunction(() => document.getElementById('resultHex').textContent === '#FF000080');
    assert.equal(await page.locator('#colorPicker').isDisabled(), true);
    await page.locator('#compare').uncheck();
    await page.waitForFunction(() => document.getElementById('resultHex').textContent === '#12345640');
    await page.locator('#resetColor').click();
    assert.equal(await page.locator('#resultHex').textContent(), '#0000FF80');
    await page.locator('#alpha').focus(); await page.locator('#alpha').press('ArrowLeft');
    await page.waitForFunction(() => document.getElementById('alphaValue').value === '127');
    await page.locator('#alpha').press('Control+z');
    assert.equal(await page.locator('#resultHex').textContent(), '#0000FF80');
    await page.locator('#hexInput').fill('#zzzz'); await page.locator('#hexInput').press('Enter');
    assert.equal(await page.locator('#hexInput').getAttribute('aria-invalid'), 'true');
    await page.locator('#search').fill('text');
    await page.waitForFunction(() => [...document.querySelectorAll('.color-row')].filter(e => !e.hidden).length === 1);
    assert.equal(await page.locator('#hue').inputValue(), '-120');
    const transformed = await exportText(); await closeExport();
    assert.match(transformed, /Button text: #0000FF80 \/\/ keep/); assert.match(transformed, /Unknown: custom data/);
    await paste('Button: #invalid');
    assert.match(await page.locator('#pasteError').textContent(), /Line 1/);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await exportText(), transformed); await closeExport();
    await paste(transformed);
    assert.equal(await page.locator('#hue').inputValue(), '0');
    assert.equal(await exportText(), transformed); await closeExport();
    await page.locator('#gradientSettings input').uncheck();
    assert.match(await exportText(), /Gradient: false \/\/ setting/); await closeExport();
    await page.locator('#resetAll').click();
    assert.equal(await page.locator('#dirty').textContent(), 'Original');
    const nested = '{"window":{"Accent":"#ff000080","Gradient":false},"arranger":{"Accent":"#00ff00"},"author":"Robert","version":3}';
    await paste(nested);
    assert.equal(await page.locator('.color-row').count(), 2);
    assert.equal(await page.locator('#gradientSettings input').isChecked(), false);
    await changeRange('blue', [100]);
    const jsonText = await exportText();
    const json = JSON.parse(jsonText); assert.equal(json.author, 'Robert'); assert.equal(json.version, 3);
    const downloadPromise = page.waitForEvent('download'); await page.locator('#downloadExport').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'theme-edited.json');
    const downloadPath = path.join(temp, download.suggestedFilename()); await download.saveAs(downloadPath);
    assert.equal(await fs.readFile(downloadPath, 'utf8'), jsonText);
    await closeExport();
    await page.locator('#fileInput').setInputFiles(downloadPath);
    await page.waitForFunction(() => document.getElementById('fileName').textContent === 'theme-edited.json');
    assert.deepEqual(JSON.parse(await exportText()), json); await closeExport();
    // Drop import exercises the actual browser File/DataTransfer path.
    await page.evaluate(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['Accent: #abcdef\nText: #12345678'], 'drop.bte', { type: 'text/plain' })); window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer })); });
    await page.waitForFunction(() => document.getElementById('fileName').textContent === 'drop.bte');
    await page.locator('#group').selectOption('Text');
    await page.waitForFunction(() => [...document.querySelectorAll('.color-row')].filter(e => !e.hidden).length === 1);
    await page.locator('#group').selectOption('');
    await page.locator('#modifiedOnly').check();
    await page.waitForFunction(() => !document.getElementById('noResults').hidden);
    await page.locator('#modifiedOnly').uncheck();
    // The palette nodes survive global changes.
    await page.locator('.color-row').first().evaluate(node => { node.dataset.retained = 'yes'; });
    await changeRange('contrast', [10, 20, 30]);
    assert.equal(await page.locator('.color-row').first().getAttribute('data-retained'), 'yes');
    // Keyboard range operation and undo from its focused control.
    await page.locator('#contrast').focus(); await page.locator('#contrast').press('ArrowRight');
    await page.locator('#contrast').press('Control+z'); assert.equal(await page.locator('#contrast').inputValue(), '30');
    await page.locator('#resetGlobal').click();
    assert.equal(await page.locator('#contrast').inputValue(), '0');
    // Bitwig 6.x starter: flat BTE palette exported as new-theme.bte.
    await page.locator('#bitwigVersion').selectOption('6');
    assert.equal(await page.locator('#previewVersion').textContent(), 'Bitwig 6.x');
    await page.locator('#newTheme').click();
    assert.equal(await page.locator('#fileName').textContent(), 'new-theme.bte');
    assert.equal(await page.locator('.color-row').count(), 355);
    assert.equal(await page.locator('#previewScene').evaluate(node => node.style.getPropertyValue('--bw-1')), '#D2D2D2');
    const sixText = await exportText();
    assert.match(sixText, /^Window background: #2E2E2E$/m);
    assert.match(sixText, /^Display Background: #1F1F1F$/m);
    assert.equal(sixText.trimEnd().split('\n').length, 355);
    assert.equal(await page.locator('#exportName').inputValue(), 'new-theme-edited.bte');
    await closeExport();
    await page.locator('#bitwigVersion').selectOption('5');
    assert.equal(await page.locator('#previewScene').evaluate(node => node.style.getPropertyValue('--bw-1')), '#D2D2D2');
    assert.match(await page.locator('#status').textContent(), /not in the Bitwig 5\.x palette/);
    // Check both layouts for horizontal overflow and inspector visibility.
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${viewport.width}`);
      await page.locator('.color-row').first().click();
      await page.locator('#inspectorContent').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#inspectorContent').isVisible(), true);
      if (process.env.THEME_SCREENSHOT_DIR) { await fs.mkdir(process.env.THEME_SCREENSHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.THEME_SCREENSHOT_DIR, `theme-${viewport.width}.png`), fullPage: true }); }
    }
    assert.deepEqual(errors, []); assert.deepEqual(network, []);
    console.log('Browser integration passed: file://, import/drop/paste, export/download/reimport, history, transforms, overrides, settings, filters, keyboard and responsive layouts. No external requests or browser errors.');
  } finally { await browser.close(); await fs.rm(temp, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
