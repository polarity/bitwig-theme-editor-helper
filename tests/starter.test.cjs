'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/theme-format.js');
const ThemeModel = require('../js/theme-model.js');
const starter = require('../js/starter-theme.js');

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
