'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/theme-format.js');
const ThemeModel = require('../js/theme-model.js');
const starter = require('../js/starter-theme.js');
const starterSix = require('../js/starter-theme-6.js');
const versions = require('../js/versions.js');

test('Original starter includes all window and arranger colors and round-trips', () => {
  const source = starter.source(), model = new ThemeModel(F.parseTheme(source));
  assert.equal(model.document.entries.length, 248);
  assert.equal(Object.keys(JSON.parse(source).window).length, 182);
  assert.equal(Object.keys(JSON.parse(source).arranger).length, 66);
  assert.deepEqual(JSON.parse(model.export()), JSON.parse(source));
  assert.equal(model.dirty, false);
  const theme = JSON.parse(source);
  assert.equal(theme.window['Window background'], '#2E2E2E');
  assert.equal(theme.window['Light Text'], '#FFFFFF');
  assert.equal(theme.window['Panel body'], '#535353');
  assert.equal(theme.window.On, '#FF8713');
  const bindings = require('../vendor/bitwig-preview/colors.js');
  for (const binding of bindings) assert.equal(theme[binding.group][binding.name], binding.default.toUpperCase());
});

test('randomization preserves alpha, metadata, protected colors and overrides in one undo step', () => {
  const model = new ThemeModel(F.parseTheme('{"window":{"Gray":"#80808040","Meter Red":"#FF000080","Accent":"#12345600","Custom":"#987654"},"version":3}'));
  const [gray, red, accent, custom] = model.document.entries;
  model.edit(state => {
    state.global.excludeGrays = true;
    state.global.excludeNames = true;
    state.overrides[custom.id] = '#ABCDEF12';
  });
  const before = model.export(), history = model.past.length;
  model.randomize(() => 0.7);
  const after = model.export();
  assert.equal(model.past.length, history + 1);
  assert.equal(model.result(gray), '#80808040');
  assert.equal(model.result(red), '#FF000080');
  assert.equal(model.result(custom), '#ABCDEF12');
  assert.notEqual(model.result(accent), '#12345600');
  assert.equal(F.parseColor(model.result(accent)).a, 0);
  assert.equal(JSON.parse(after).version, 3);
  model.undo(); assert.equal(model.export(), before);
  model.redo(); assert.equal(model.export(), after);
});

test('randomized complete themes keep every alpha value and export valid colors', () => {
  const model = new ThemeModel(F.parseTheme(starter.source()));
  for (const random of [() => 0, () => 0.5, () => 0.999999]) {
    model.randomize(random);
    F.parseColor(model.state.global.target);
    for (const entry of model.document.entries) assert.equal(F.parseColor(model.result(entry)).a, entry.color.a);
    assert.equal(F.parseTheme(model.export()).entries.length, 248);
  }
});

test('Bitwig 6.x starter is a flat BTE palette that round-trips', () => {
  const source = starterSix.source(), palette = starterSix.palette();
  const names = Object.keys(palette);
  assert.equal(names.length, 355);
  assert.equal(source.split('\n').length, 356);
  const model = new ThemeModel(F.parseTheme(source));
  assert.equal(model.document.entries.length, 355);
  assert.equal(model.document.format, 'bte');
  assert.equal(model.document.settings.length, 0);
  assert.equal(model.export(), source);
  assert.equal(model.dirty, false);
  assert.equal(palette['Window background'], '#2E2E2E');
  assert.equal(palette['Light Text'], '#D2D2D2');
  assert.equal(palette['Panel body'], '#464646');
  assert.equal(palette['Display Background'], '#1F1F1F');
  assert.equal(palette['Device Header'], '#3C3C3C');
  assert.equal(palette['Error Text'], '#FF3232C8');
  // Names that contain no BTE syntax still parse back unchanged.
  for (const name of ['Inspector Style / Push Button / Stroke Color', 'Frame color of selection cursor in the tree.']) assert.equal(F.parseTheme(`${name}: #ABCDEF\n`).entries[0].name, name);
});

test('version registry exposes the preview palette and starter for each version', () => {
  assert.deepEqual(versions.list.map(version => version.id), ['6', '5']);
  assert.equal(versions.defaultId, '6');
  assert.equal(versions.get('6').format, 'bte');
  assert.equal(versions.get('6').fileName, 'new-theme.bte');
  assert.equal(versions.get('6').reference, '6.1.4');
  assert.equal(versions.get('5').format, 'json');
  assert.equal(versions.get('5').fileName, 'new-theme.json');
  assert.equal(versions.get('unknown'), versions.get('6'));
  assert.equal(Object.keys(versions.get('5').palette).length, 248);
  assert.equal(Object.keys(versions.get('6').palette).length, 355);
  const document = F.parseTheme('Panel body: #111111\nHitech background: #222222\nGradient: true');
  assert.deepEqual(versions.unknown(document, '6').map(entry => entry.name), ['Hitech background']);
  assert.deepEqual(versions.unknown(document, '5'), []);
});
