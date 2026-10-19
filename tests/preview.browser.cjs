/* Run with the same Playwright installation as tests/browser.cjs. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const bindings = require('../vendor/bitwig-preview/colors.js');
const launch = { headless: true };
if (process.env.THEME_CHROMIUM) launch.executablePath = process.env.THEME_CHROMIUM;
(async () => {
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  const variable = name => bindings.find(b => b.name === name).variable;
  const value = name => page.locator('#previewScene').evaluate((node, key) => node.style.getPropertyValue(key), variable(name));
  async function paste(source) {
    await page.locator('#pasteOpen').click(); await page.locator('#sourceText').fill(source); await page.locator('#pasteForm button[type=submit]').click();
  }
  async function choose(name) { await page.locator('#previewColor').selectOption(variable(name)); }
  async function hex(text) { await page.locator('#hexInput').fill(text); await page.locator('#hexInput').press('Enter'); }
  async function settle(name, expected) { await page.waitForFunction(([key, expected]) => document.getElementById('previewScene').style.getPropertyValue(key) === expected, [variable(name), expected]); }
  try {
    await page.goto(pathToFileURL(path.resolve(__dirname, '../main.html')).href);
    assert.equal(await page.locator('#previewDetails').getAttribute('open'), '');
    assert.match(await page.locator('#previewCoverage').textContent(), /27\/27/);
    assert.equal(await page.locator('#previewVersion').textContent(), 'Bitwig 6.x');
    // This suite drives the 5.x reference bindings; the 6.x pass runs at the end.
    await page.locator('#bitwigVersion').selectOption('5');
    await page.locator('#newTheme').click();
    assert.equal(await page.locator('.color-row').count(), 248);
    assert.equal(await page.locator('#previewVersion').textContent(), 'Bitwig 5.x');
    await page.locator('#previewScene #top_bar').click({ position: { x: 150, y: 8 } });
    assert.equal(await page.locator('#selectedName').textContent(), 'Window background');
    const fixture = {};
    for (const b of bindings) (fixture[b.group] ||= {})[b.name] = b.default;
    fixture.window['Window background'] = '#12345680'; fixture.window['Custom color'] = '#ff0000';
    await paste(JSON.stringify(fixture));
    assert.match(await page.locator('#previewCoverage').textContent(), /27\/27/);
    assert.equal(await value('Window background'), '#12345680');
    // Actual scaled SVG/HTML surface selection, followed by keyboard activation.
    await page.locator('#previewScene #top_bar').click({ position: { x: 150, y: 8 } });
    assert.equal(await page.locator('#selectedName').textContent(), 'Window background');
    await hex('#abcdef40'); await settle('Window background', '#ABCDEF40');
    assert.equal(await page.locator('#previewScene #bitwig').evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(171, 205, 239, 0.25)');
    await page.locator('#compare').check(); await settle('Window background', '#12345680');
    await page.locator('#compare').uncheck(); await settle('Window background', '#ABCDEF40');
    await page.locator('#undo').click(); await settle('Window background', '#12345680');
    await page.locator('#redo').click(); await settle('Window background', '#ABCDEF40');
    await page.locator('#resetColor').click(); await settle('Window background', '#12345680');
    const textSurface = page.locator(`#previewScene [data-preview-color="${variable('Light Text')}"][tabindex="0"]`).first();
    await textSurface.focus(); await textSurface.press('Enter');
    assert.equal(await page.locator('#selectedName').textContent(), 'Light Text');
    await textSurface.press('Space'); assert.equal(await page.locator('#selectedName').textContent(), 'Light Text');
    assert.ok(await page.locator('#previewScene .bw-selected').count() > 0);
    await choose('Button background'); await hex('#22334400');
    assert.equal(await page.locator('#previewScene').evaluate(node => node.style.getPropertyValue('--bw-button-gradient')), '#22334400');
    // Global transforms reach the preview, and reset returns imported values.
    await page.locator('#brightness').evaluate(node => { node.dispatchEvent(new Event('pointerdown')); node.value = 30; node.dispatchEvent(new Event('input')); node.dispatchEvent(new Event('change')); });
    await page.waitForFunction(() => document.getElementById('previewScene').style.getPropertyValue('--bw-0') !== '#12345680');
    await page.locator('#resetAll').click(); await settle('Window background', '#12345680');
    await page.locator('.color-row').filter({ has: page.locator('.color-name', { hasText: /^Custom color$/ }) }).click();
    assert.match(await page.locator('#previewSelectedHint').textContent(), /no matching area/);
    // The dropdown reaches even small border properties.
    for (const name of ['Button stroke', 'Panel stroke', 'Active Panel stroke', 'Monitoring buttons color', 'Timeline Primary Grid']) {
      await choose(name); assert.equal(await page.locator('#selectedName').textContent(), name);
    }
    for (const width of [1440, 1000, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('#previewSize').selectOption('native');
      assert.equal(await page.locator('#previewViewport').evaluate(node => node.scrollWidth > node.clientWidth), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#previewSize').selectOption('fit');
      await page.waitForFunction(() => { const node = document.getElementById('previewViewport'); return node.scrollWidth <= node.clientWidth + 1; });
      await page.locator('#previewDetails summary').click(); assert.equal(await page.locator('#previewViewport').isVisible(), false);
      await page.locator('#previewDetails summary').click(); assert.equal(await page.locator('#previewViewport').isVisible(), true);
      if (process.env.THEME_SCREENSHOT_DIR) {
        await fs.mkdir(process.env.THEME_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.THEME_SCREENSHOT_DIR, `preview-${width}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await paste('Panel body: #111111\nPanel body: #222222\nCustom color: #333333');
    assert.match(await page.locator('#previewColor option:checked').textContent(), /choose source|not imported/);
    assert.equal(await value('Panel body'), '#535353');
    await choose('Panel body'); assert.equal(await page.locator('#previewChoiceDialog').isVisible(), true);
    await page.locator('#previewChoices button').nth(1).click();
    assert.equal(await page.locator('#selectedPath').textContent(), 'Line 2'); assert.equal(await value('Panel body'), '#222222');
    await hex('#abcdef'); await settle('Panel body', '#ABCDEF');
    await page.locator('#exportOpen').click();
    assert.equal(await page.locator('#exportText').inputValue(), 'Panel body: #111111\nPanel body: #ABCDEF\nCustom color: #333333');
    await page.locator('[data-close=exportDialog]').click();
    await choose('Hole (dark)'); assert.match(await page.locator('#previewMessage').textContent(), /Not imported/);
    assert.equal(await page.locator('.color-row').count(), 3);
    await paste('{"a":{"window":{"Panel body":"#112233"}},"b":{"window":{"Panel body":"#445566"}}}');
    await choose('Panel body');
    assert.match(await page.locator('#previewChoices button').nth(0).textContent(), /\$\["a"\]\["window"\]\["Panel body"\]/);
    await page.locator('#previewChoices button').nth(1).click(); assert.equal(await value('Panel body'), '#445566');
    // A later import must discard a previously chosen source.
    await paste('{"window":{"Panel body":"#aabbcc"}}'); assert.equal(await value('Panel body'), '#AABBCC');
    // Bitwig 6.x reference values, plus the color that replaced the Hitech background.
    await page.locator('#bitwigVersion').selectOption('6');
    await page.locator('#newTheme').click();
    assert.equal(await page.locator('#previewVersion').textContent(), 'Bitwig 6.x');
    assert.match(await page.locator('#previewCoverage').textContent(), /27\/27/);
    assert.equal(await value('Light Text'), '#D2D2D2');
    assert.equal(await value('Panel body'), '#464646');
    assert.equal(await value('Hitech background'), '#2B2B2B');
    await page.locator('#previewColor').selectOption('--bw-13');
    await page.locator('#previewSelectColor').click();
    assert.equal(await page.locator('#selectedName').textContent(), 'Nested Device Hole');
    await paste('Panel body: #101010');
    assert.equal(await value('Panel body'), '#101010');
    assert.equal(await value('Light Text'), '#D2D2D2');
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    console.log('Preview browser integration passed: full reference, selection, keyboard, alpha, transforms, history, comparison, source choices, missing colors, export isolation, responsive scaling and local-only operation.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
